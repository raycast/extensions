//@osa-lang:JavaScript
function run(argv) {
	const outputPath = argv[2] // Path to output a .png to
	const windowOnly = argv[3] // Whether to screenshot just the frontmost window (true/false)

	ObjC.import('/System/Library/Frameworks/ScreenCaptureKit.framework');
	ObjC.import('CoreMedia');
	ObjC.import('CoreGraphics');
	ObjC.import('CoreImage');
	ObjC.import('dispatch');
	ObjC.import('objc');

	// Get frontmost window name
	const app = Application('System Events');

	let result = undefined;
	let stream = null;

	if (!$["SCStreamOutput"]) {
   		ObjC.registerSubclass({
   	  		name: "SCStreamOutput",
   	   		superclass: "NSObject",
   	   		protocols: ["SCStreamOutput"],
   	   		methods: {
    	    	"stream:didOutputSampleBuffer:ofType:": {
    	      		types: ["void", ["id", "id*", "long"]],
    	      		implementation: function (stream, buffer, type) {
						// Convert buffer to image and write to disk
						const buf = ObjC.castRefToObject(buffer);
						const imageBuffer = ObjC.castRefToObject($.CMSampleBufferGetImageBuffer(buf))
						if (imageBuffer.js != undefined) {
							const outputCIImage = $.CIImage.imageWithCVPixelBufferOptions(imageBuffer, $.NSDictionary.alloc.init);
							const colorspace = $.CGColorSpaceCreateWithName($.kCGColorSpaceSRGB);
							const outputURL = $.NSURL.alloc.initFileURLWithPath(outputPath);
							const context = $.CIContext.alloc.init;
							context.writePNGRepresentationOfImageToURLFormatColorSpaceOptionsError(outputCIImage, outputURL, $.kCIFormatRGBA8, colorspace, $.NSDictionary.alloc.init, null);

							stream.stopCaptureWithCompletionHandler((error) => null);
							result = ""; // This will end the screen capture (we only want to capture 1 frame)
						}
    	      		},
    	    	},
    	  	},
    	});
  	}

	// Setup and begin screen capture
	const frontWindowName = app.processes.whose({frontmost: {'=': true}}).windows.first.title()
	const availableContent = $.SCShareableContent.getShareableContentWithCompletionHandler((content, error) => {
		const display = content.displays.objectAtIndex(0);
		let filter = $.SCContentFilter.alloc.initWithDisplayExcludingWindows(display, []);
		const config = $.SCStreamConfiguration.alloc.init;
		if (windowOnly == "true") {
			const window = content.windows.js.filter((w) => w.title.js == frontWindowName).at(0)
			if (window) {
				config.sourceRect = window.frame
				config.width = window.frame.size.width * 2
				config.height = window.frame.size.height * 2
				filter = $.SCContentFilter.alloc.initWithDisplayIncludingWindows(display, $.NSMutableArray.alloc.initWithObject(window));
			}
		} else {
			config.width = 3024
			config.height = 1964
		}
		stream = $.SCStream.alloc.initWithFilterConfigurationDelegate(filter, config, null);

		const output = $.SCStreamOutput.alloc.init;
		stream.addStreamOutputTypeSampleHandlerQueueError(output, $.SCStreamOutputTypeScreen, $.dispatch_get_global_queue($.QOS_CLASS_USER_INITIATED, 0), null);
		stream.startCaptureWithCompletionHandler((error) => null);
	})

	// Run until we have a "result" (empty string is still a result)
	while (result == undefined) {
    	runLoop = $.NSRunLoop.currentRunLoop;
		today = $.NSDate.dateWithTimeIntervalSinceNow(0.1);
		runLoop.runUntilDate(today);
	}
}