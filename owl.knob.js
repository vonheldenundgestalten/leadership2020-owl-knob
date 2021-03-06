/**
 * Knob Plugin
 * @version 0.1
 * @author Norman Wink
 * @license The MIT License (MIT)
 * @since 2.3.3
 */
 
;(function ( $, window, document, undefined ) {
	/**
	 * Allows navigating with a draggable knob.
	 * @class Knob
	 * @param {Owl} scope - The Owl Carousel
	 */
	
	var Knob = function(scope) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		 
		this.owl = scope;
		this.owl._options = $.extend({}, Knob.Defaults, this.owl.options);
		
		// default values
		this.Defaults = {
			knobTransition: '200ms cubic-bezier(0.645, 0.045, 0.355, 1)',
			knobEasing: function(d) {return d < 0 ? -(d * d) : (d * d)}, // sensitivity curve
			knobFPS: 60,
			knobSpeed: 120, // pixel per tick at max velocity
			hiSpeed: 'hi-speed', // element gets this class when fast
			triggerSpeedClass: 0.7, // add hi-speed class at which velocity?
			bounceDistance: 400, // px
			trackActive: true, // disable to increase performance
		}
		
		// variables to work with
		// NOT config
		this.isDragging = false;
		this.dragStart = 0;
		this.knobSlide = 0;
		this.bounds = {
			left: 0,
			right: 0
		}
		this.velocity = 0;
		this.current = 0;
		this.currX = 0;
		this.max = 0;
		
		// all event handlers
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function(event) {
				this.owl.$element.append('<div class="owl-knob"><div class="owl-knob-klickbox"><div class="owl-knob-button"></div></div></div>');
				
				this.$knobWrap = this.owl.$element.find('.owl-knob');
				this.$knob = this.owl.$element.find('.owl-knob-klickbox');
				
				// take measurements
				this.measure()
				
				this.$knob.on('mousedown touchstart', $.proxy(function(e) {
					e.preventDefault ? e.preventDefault() : (event.returnValue = false);
					this.isDragging = true;
					this.$knob.css('transition', 'none');
					this.owl.$stage.css('transition', 'none');
					this.dragStart = e.pageX;
					this.owl.$element.addClass(this.owl.options.grabClass);
					
					// schedule first animation frame
					this.animate();
				}, this));
				
				$(window).on('mouseup touchend', $.proxy(function(e) {
					this.isDragging = false;
					this.owl.$element.removeClass(this.owl.options.grabClass);
				}, this));
				
				$(window).on('mousemove touchmove', $.proxy(function(e) {
					if (this.isDragging) e.preventDefault ? e.preventDefault() : (event.returnValue = false);
					this.update(e);
				}, this));
				
			}, this),
			
			'resized.owl.carousel': $.proxy(function(e) {
				// take measurements
				this.measure();
			}, this),
			
			'changed.owl.carousel': $.proxy(function(e) {
				this.current = e.item.index;
			}, this),
		}
		
		// execute while dragging
		// update knob position
		this.update = $.proxy(function(e) {
			if (this.isDragging) {
				
				var draggedDistance = e.pageX - this.dragStart;
				
				// limit drag distance within boundaries of the knob
				var limitDrag = Math.max(this.bounds.left, Math.min(draggedDistance, this.bounds.right));
				this.velocity = limitDrag / this.bounds.right;
				
				// add or remove the hi-speed class
				if (Math.abs(this.velocity) > this.Defaults.triggerSpeedClass) {
					this.owl.$element.addClass(this.Defaults.hiSpeed);
				} else {
					this.owl.$element.removeClass(this.Defaults.hiSpeed);
				}
				
				this.$knob.css('transform', 'translateX(' + limitDrag + 'px)');
			}
		}, this);
		
		// animate slider
		this.animate = $.proxy(function() {
			
			// var currX = this.current == 0 ? 0 : this.owl._coordinates[this.current - 1];
			var currVelocity = this.Defaults.knobEasing(this.velocity);
			this.currX = this.getX();
			
			var movingLeft = currVelocity < 0;
			var movingRight = currVelocity > 0;
			var leftEnd = this.currX > 0;
			var rightEnd = this.currX < this.max;
			
			if ((leftEnd && movingLeft) || (rightEnd && movingRight) ) {
				// add increasing resistance at end of slider
				if (rightEnd) {
					this.currX += ((this.max - this.Defaults.bounceDistance) - this.currX) * (currVelocity * 0.1);
				} else {
					this.currX -= (this.Defaults.bounceDistance - this.currX) * (currVelocity * 0.1);
				}
			} else {
				this.currX -= currVelocity * this.Defaults.knobSpeed;
			}
			
			this.owl.$stage.css('transform', 'translate3d(' + this.currX + 'px, 0, 0)');
			
			// find active while dragging
			if (this.Defaults.trackActive) {
				
				// find current slide by floating coordinate
				var i = 0;
				var coord = 0;
				while ((this.currX + (0.5 * this.owl._width)) < coord) {
					coord = this.owl._coordinates[i];
					i++;
				}
				
				if (i >= this.owl._coordinates.length) {
					i = this.owl._coordinates.length - 1;
				}
				
				// apply current
				this.current = i;
				this.owl.$element.find('.active').removeClass('active');
				this.owl.$element.find('.owl-item').eq(i).addClass('active');
				this.owl.$element.find('.owl-dot').eq(i).addClass('active');
			}
			
			// schedule next animation frame
			if (this.isDragging) {
				window.requestAnimationFrame(this.animate);
			} else {
				this.snap();
			}
			
		}, this);
		
		// snap the knob back to place
		// move slide to next
		this.snap = $.proxy(function() {
			this.$knob.css('transition', 'transform ' + this.Defaults.knobTransition);
			this.$knob.css('transform', 'translateX(0px)');
			this.owl.$stage.css('transition', this.owl._options.smartSpeed + 'ms');
			
			var leftEnd = this.currX > 0;
			var rightEnd = this.currX < this.max;
			var dir = 'left';
			
			// move slide some random place to force retriggering
			this.owl.to(2);
			
			// determine direction
			if (leftEnd) {
				dir = 'right';
			} else if (rightEnd) {
				dir = 'left';
			} else {
				dir = this.velocity < 0 ? 'right': 'left';
			}
			var closer = this.owl.closest(this.currX, dir);
			this.owl.to(closer);
			
			this.velocity = 0;
			
			// this.owl.$stage.css('transform', 'translate3d(' + this.owl._coordinates[1] + 'px, 0, 0)');
		}, this);
		
		// take measurements
		this.measure = $.proxy(function() {
			this.knobSlide = this.$knobWrap.outerWidth();
			this.bounds = {
				left: this.knobSlide * -0.5,
				right: this.knobSlide * 0.5
			};
			this.max = this.owl._coordinates[this.owl._coordinates.length - 2];
		}, this);
		
		this.getX = $.proxy(function() {
			var matrix = this.owl.$stage.css('transform').replace(/[^0-9\-.,]/g, '').split(',');
			var x = matrix[12] || matrix[4];
			return parseInt(x);
		}, this);
		
		// register the event handlers
		this.owl.$element.on(this._handlers);
		
		// destroy
		this.destroy = function() {
			var handler, property;
	
			$(window).off('owl.knob');
	
			for (handler in this._handlers) {
				this.owl.$element.off(handler, this._handlers[handler]);
			}
			for (property in Object.getOwnPropertyNames(this)) {
				typeof this[property] != 'function' && (this[property] = null);
			}
		};
		
		console.log(this.owl);
	}
	
	$.fn.owlCarousel.Constructor.Plugins.Knob = Knob;
	
})( window.Zepto || window.jQuery, window, document );