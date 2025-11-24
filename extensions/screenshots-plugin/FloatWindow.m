#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>
#import <QuartzCore/QuartzCore.h>
#import <Vision/Vision.h>
#import <ImageIO/ImageIO.h>
#import <objc/runtime.h>

// Forward declaration
@class TextButton;

@interface TextActionHandler : NSObject
@property (nonatomic, copy) NSString *recognizedText;
@property (nonatomic, assign) NSView *panelView;
@property (nonatomic, assign) NSWindow *window;
@property (nonatomic, assign) CGFloat panelWidth;
@property (nonatomic, assign) CGFloat gap;
@property (nonatomic, assign) BOOL isPanelOpen;
@property (nonatomic, assign) NSSize imageSize;
@property (nonatomic, assign) TextButton *toggleButton;

- (instancetype)initWithText:(NSString *)text window:(NSWindow *)window panel:(NSView *)panel imageSize:(NSSize)size;
- (void)copyText:(id)sender;
- (void)pasteText:(id)sender;
- (void)togglePanel:(id)sender;
@end

@interface TextButton : NSButton
@property (nonatomic, assign) BOOL isActive;
@end

@implementation TextButton

- (instancetype)initWithFrame:(NSRect)frameRect {
    self = [super initWithFrame:frameRect];
    if (self) {
        self.wantsLayer = YES;
        self.layer.cornerRadius = frameRect.size.width / 2.0; // Circular
        self.layer.masksToBounds = YES;
        self.bordered = NO;
        self.title = @"";
        self.target = nil;
        self.action = nil;
        self.alphaValue = 1.0; // Always visible
    }
    return self;
}

- (void)drawRect:(NSRect)dirtyRect {
    // Background
    if (self.isActive) {
        [[NSColor systemBlueColor] setFill];
    } else {
        [[NSColor colorWithRed:0.2 green:0.2 blue:0.2 alpha:0.9] setFill]; // Dark gray
    }
    [[NSBezierPath bezierPathWithOvalInRect:self.bounds] fill];
    
    [[NSColor whiteColor] setStroke];
    
    NSBezierPath *path = [NSBezierPath bezierPath];
    [path setLineWidth:2.0];
    [path setLineCapStyle:NSLineCapStyleRound];
    [path setLineJoinStyle:NSLineJoinStyleRound];
    
    NSRect bounds = self.bounds;
    CGFloat w = bounds.size.width;
    CGFloat h = bounds.size.height;
    
    // Icon sizing
    CGFloat iconSize = w * 0.55;
    CGFloat originX = (w - iconSize) / 2.0;
    CGFloat originY = (h - iconSize) / 2.0;
    NSRect iconRect = NSMakeRect(originX, originY, iconSize, iconSize);
    
    // Viewfinder corners
    CGFloat cornerLen = iconSize * 0.3;
    
    // Top-Left
    [path moveToPoint:NSMakePoint(NSMinX(iconRect), NSMaxY(iconRect) - cornerLen)];
    [path lineToPoint:NSMakePoint(NSMinX(iconRect), NSMaxY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMinX(iconRect) + cornerLen, NSMaxY(iconRect))];
    
    // Top-Right
    [path moveToPoint:NSMakePoint(NSMaxX(iconRect) - cornerLen, NSMaxY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMaxX(iconRect), NSMaxY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMaxX(iconRect), NSMaxY(iconRect) - cornerLen)];
    
    // Bottom-Right
    [path moveToPoint:NSMakePoint(NSMaxX(iconRect), NSMinY(iconRect) + cornerLen)];
    [path lineToPoint:NSMakePoint(NSMaxX(iconRect), NSMinY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMaxX(iconRect) - cornerLen, NSMinY(iconRect))];
    
    // Bottom-Left
    [path moveToPoint:NSMakePoint(NSMinX(iconRect) + cornerLen, NSMinY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMinX(iconRect), NSMinY(iconRect))];
    [path lineToPoint:NSMakePoint(NSMinX(iconRect), NSMinY(iconRect) + cornerLen)];
    
    [path stroke];
    
    // Text lines inside
    NSBezierPath *linesPath = [NSBezierPath bezierPath];
    [linesPath setLineWidth:2.0];
    [linesPath setLineCapStyle:NSLineCapStyleRound];
    
    CGFloat centerX = w / 2.0;
    CGFloat centerY = h / 2.0;
    CGFloat lineSpacing = iconSize * 0.25;
    
    // Top line (Long)
    CGFloat topLineW = iconSize * 0.6;
    [linesPath moveToPoint:NSMakePoint(centerX - topLineW/2, centerY + lineSpacing)];
    [linesPath lineToPoint:NSMakePoint(centerX + topLineW/2, centerY + lineSpacing)];
    
    // Middle line (Long)
    CGFloat midLineW = iconSize * 0.6;
    [linesPath moveToPoint:NSMakePoint(centerX - midLineW/2, centerY)];
    [linesPath lineToPoint:NSMakePoint(centerX + midLineW/2, centerY)];
    
    // Bottom line (Short)
    CGFloat botLineW = iconSize * 0.35;
    [linesPath moveToPoint:NSMakePoint(centerX - botLineW/2, centerY - lineSpacing)];
    [linesPath lineToPoint:NSMakePoint(centerX + botLineW/2, centerY - lineSpacing)];
    
    [linesPath stroke];
}

@end

@implementation TextActionHandler

- (instancetype)initWithText:(NSString *)text window:(NSWindow *)window panel:(NSView *)panel imageSize:(NSSize)size {
    self = [super init];
    if (self) {
        _recognizedText = [text copy];
        _window = window;
        _panelView = panel;
        _imageSize = size;
        _gap = 12.0;
        _panelWidth = panel.frame.size.width;
        _isPanelOpen = NO;
        
        // Initially hide panel
        _panelView.hidden = YES;
        _panelView.alphaValue = 0.0;
    }
    return self;
}

- (void)copyText:(id)sender {
    if (self.recognizedText.length == 0) return;
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
    [pasteboard clearContents];
    [pasteboard setString:self.recognizedText forType:NSPasteboardTypeString];
}

- (void)pasteText:(id)sender {
    if (self.recognizedText.length == 0) return;
    [self copyText:nil];
    
    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);
    if (!source) return;
    CGEventRef keyDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)kVK_ANSI_V, true);
    CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);
    CGEventRef keyUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)kVK_ANSI_V, false);
    CGEventSetFlags(keyUp, kCGEventFlagMaskCommand);
    
    CGEventPost(kCGAnnotatedSessionEventTap, keyDown);
    CGEventPost(kCGAnnotatedSessionEventTap, keyUp);
    
    CFRelease(keyDown);
    CFRelease(keyUp);
    CFRelease(source);
}

- (void)togglePanel:(id)sender {
    self.isPanelOpen = !self.isPanelOpen;
    
    // Update button state
    if (self.toggleButton) {
        self.toggleButton.isActive = self.isPanelOpen;
        [self.toggleButton setNeedsDisplay:YES];
    }
    
    NSRect currentFrame = self.window.frame;
    NSRect newFrame = currentFrame;
    NSRect screenFrame = self.window.screen.frame;
    
    CGFloat expandWidth = self.gap + self.panelWidth;
    
    if (self.isPanelOpen) {
        // Expand
        newFrame.size.width += expandWidth;
        
        // Check right boundary
        if (NSMaxX(newFrame) > NSMaxX(screenFrame)) {
            // Shift left
            newFrame.origin.x -= (NSMaxX(newFrame) - NSMaxX(screenFrame)) + 20.0;
        }
        // Check left boundary
        if (newFrame.origin.x < NSMinX(screenFrame)) {
            newFrame.origin.x = NSMinX(screenFrame) + 20.0;
        }
        
        // Show panel
        self.panelView.hidden = NO;
        [[self.panelView animator] setAlphaValue:1.0];
        
    } else {
        // Collapse
        newFrame.size.width -= expandWidth;
        
        // Hide panel
        [[self.panelView animator] setAlphaValue:0.0];
    }
    
    [self.window setFrame:newFrame display:YES animate:YES];
}

@end

static NSString *RecognizedTextFromImage(NSImage *image) {
    if (!image) return nil;
    
    CGImageRef cgImage = [image CGImageForProposedRect:NULL context:nil hints:nil];
    BOOL shouldReleaseCGImage = NO;
    if (!cgImage) {
        NSData *tiffData = [image TIFFRepresentation];
        if (tiffData) {
            CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)tiffData, NULL);
            if (source) {
                cgImage = CGImageSourceCreateImageAtIndex(source, 0, NULL);
                shouldReleaseCGImage = (cgImage != NULL);
                CFRelease(source);
            }
        }
    }
    
    if (!cgImage) return nil;
    
    VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
    request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
    request.usesLanguageCorrection = YES;
    request.recognitionLanguages = @[@"zh-Hans", @"zh-Hant", @"en-US", @"en-GB"];
    request.minimumTextHeight = 0;
    
    NSError *visionError = nil;
    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
    BOOL success = [handler performRequests:@[request] error:&visionError];
    
    if (!success || visionError) {
        if (shouldReleaseCGImage && cgImage) CGImageRelease(cgImage);
        return nil;
    }
    
    NSMutableString *recognized = [NSMutableString string];
    for (VNRecognizedTextObservation *observation in request.results) {
        NSArray *candidates = [observation topCandidates:3];
        if (candidates.count > 0) {
            VNRecognizedText *topCandidate = candidates[0];
            if (topCandidate.confidence > 0.1) {
                if (recognized.length > 0) [recognized appendString:@"\n"];
                [recognized appendString:topCandidate.string];
            }
        }
    }
    
    if (shouldReleaseCGImage && cgImage) CGImageRelease(cgImage);
    
    NSString *trimmed = [recognized stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    return trimmed.length > 0 ? trimmed : nil;
}

@interface FloatingWindow : NSWindow
@end

@implementation FloatingWindow
- (BOOL)canBecomeKeyWindow { return NO; }
- (BOOL)canBecomeMainWindow { return NO; }
- (void)mouseDown:(NSEvent *)event {
    if ([event modifierFlags] & NSEventModifierFlagCommand) {
        [self performWindowDragWithEvent:event];
    }
}
@end

@interface ClickThroughImageView : NSImageView
@end

@implementation ClickThroughImageView
- (NSView *)hitTest:(NSPoint)point {
    return nil;
}
@end

int main(int argc, const char * argv[]) {
    if (argc < 2) {
        fprintf(stderr, "用法: FloatWindow <图片路径> [截图X坐标] [截图Y坐标] [截图宽度] [截图高度]\n");
        return 1;
    }
    
    @autoreleasepool {
        NSString *imagePath = [NSString stringWithUTF8String:argv[1]];
        NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
        
        if (!image) {
            fprintf(stderr, "无法加载图片: %s\n", argv[1]);
            return 1;
        }
        
        NSSize imageSize = [image size];
        NSSize pixelSize = imageSize;
        for (NSImageRep *rep in [image representations]) {
            if ([rep isKindOfClass:[NSBitmapImageRep class]]) {
                pixelSize.width = [(NSBitmapImageRep *)rep pixelsWide];
                pixelSize.height = [(NSBitmapImageRep *)rep pixelsHigh];
                break;
            }
        }
        
        NSScreen *screen = [NSScreen mainScreen];
        CGFloat scaleFactor = screen ? [screen backingScaleFactor] : 1.0;
        if (scaleFactor <= 0.0) scaleFactor = 1.0;
        
        NSSize imageDisplaySize = NSMakeSize(pixelSize.width / scaleFactor, pixelSize.height / scaleFactor);
        NSRect screenFrame = screen ? [screen frame] : NSMakeRect(0, 0, 1920, 1080);
        
        // OCR Panel config
        CGFloat gap = 12.0;
        CGFloat panelWidth = 280.0;
        CGFloat panelHeight = MIN(400.0, imageDisplaySize.height);
        if (panelHeight < 200.0) panelHeight = 200.0;
        
        // Initial window size = Image size (Panel hidden by default)
        CGFloat totalWidth = imageDisplaySize.width; 
        CGFloat totalHeight = MAX(imageDisplaySize.height, panelHeight);
        if (panelHeight > totalHeight) totalHeight = panelHeight;
        
        CGFloat windowX, windowY;
        
        if (argc >= 6) {
            CGFloat screenshotX = atof(argv[2]);
            CGFloat screenshotY = atof(argv[3]);
            CGFloat screenshotHeight = atof(argv[5]);
            
            windowX = screenshotX;
            windowY = screenshotY + screenshotHeight - imageDisplaySize.height;
            
            if (windowX + totalWidth > screenFrame.size.width) {
                windowX = screenFrame.size.width - totalWidth - 20.0;
            }
            if (windowX < 0) windowX = 0;
            if (windowY < 0) windowY = 0;
            if (windowY + totalHeight > screenFrame.size.height) {
                windowY = screenFrame.size.height - totalHeight;
            }
        } else {
            windowX = (screenFrame.size.width - totalWidth) / 2;
            windowY = (screenFrame.size.height - totalHeight) / 2;
        }
        
        NSRect windowRect = NSMakeRect(windowX, windowY, totalWidth, totalHeight);
        
        FloatingWindow *window = [[FloatingWindow alloc] 
            initWithContentRect:windowRect
            styleMask:NSWindowStyleMaskBorderless
            backing:NSBackingStoreBuffered
            defer:NO];
        
        [window setLevel:NSFloatingWindowLevel];
        [window setOpaque:NO];
        [window setBackgroundColor:[NSColor clearColor]];
        [window setHasShadow:YES];
        [window setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorStationary];
        
        NSView *containerView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, totalWidth, totalHeight)];
        containerView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        
        CGFloat imageY = (totalHeight - imageDisplaySize.height) / 2.0;
        ClickThroughImageView *imageView = [[ClickThroughImageView alloc] initWithFrame:NSMakeRect(0, imageY, imageDisplaySize.width, imageDisplaySize.height)];
        [imageView setImage:image];
        [imageView setImageScaling:NSImageScaleAxesIndependently];
        [imageView setEditable:NO];
        
        // Drag Area - Now covers the entire image
        NSView *dragArea = [[NSView alloc] initWithFrame:imageView.frame];
        [dragArea setWantsLayer:YES];
        dragArea.layer.backgroundColor = [[NSColor clearColor] CGColor];
        
        // OCR Panel (Initially hidden, positioned to right)
        CGFloat panelX = imageDisplaySize.width + gap;
        CGFloat panelY = (totalHeight - panelHeight) / 2.0;
        
        NSVisualEffectView *panel = [[NSVisualEffectView alloc] initWithFrame:NSMakeRect(panelX, panelY, panelWidth, panelHeight)];
        [panel setMaterial:NSVisualEffectMaterialHUDWindow];
        [panel setBlendingMode:NSVisualEffectBlendingModeBehindWindow];
        [panel setState:NSVisualEffectStateActive];
        [panel setWantsLayer:YES];
        panel.layer.cornerRadius = 10.0;
        panel.layer.masksToBounds = YES;
        panel.hidden = YES;
        panel.alphaValue = 0.0;
        
        NSString *recognizedText = RecognizedTextFromImage(image);
        TextActionHandler *textHandler = nil;
        
        if (recognizedText && recognizedText.length > 0) {
            textHandler = [[TextActionHandler alloc] initWithText:recognizedText window:window panel:panel imageSize:imageDisplaySize];
            objc_setAssociatedObject(window, "TextActionHandler", textHandler, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
            
            // Panel Content
            NSTextField *titleLabel = [[NSTextField alloc] initWithFrame:NSMakeRect(12.0, panelHeight - 32.0, panelWidth - 24.0, 20.0)];
            [titleLabel setStringValue:@"识别结果"];
            [titleLabel setEditable:NO];
            [titleLabel setBordered:NO];
            [titleLabel setDrawsBackground:NO];
            [titleLabel setFont:[NSFont boldSystemFontOfSize:13.0]];
            [titleLabel setTextColor:[NSColor labelColor]];
            [panel addSubview:titleLabel];
            
            NSScrollView *scrollView = [[NSScrollView alloc] initWithFrame:NSMakeRect(12.0, 44.0, panelWidth - 24.0, panelHeight - 80.0)];
            scrollView.hasVerticalScroller = YES;
            scrollView.drawsBackground = NO;
            
            NSTextView *textView = [[NSTextView alloc] initWithFrame:scrollView.bounds];
            [textView setString:recognizedText];
            [textView setEditable:NO];
            [textView setFont:[NSFont systemFontOfSize:12.0]];
            [textView setBackgroundColor:[NSColor clearColor]];
            [textView setTextColor:[NSColor labelColor]];
            textView.textContainer.lineFragmentPadding = 0;
            textView.textContainerInset = NSMakeSize(0, 0);
            textView.verticallyResizable = YES;
            textView.horizontallyResizable = NO;
            [textView.textContainer setWidthTracksTextView:YES];
            [scrollView setDocumentView:textView];
            [panel addSubview:scrollView];
            
            CGFloat buttonWidth = (panelWidth - 30.0) / 2.0;
            NSButton *copyButton = [NSButton buttonWithTitle:@"复制" target:textHandler action:@selector(copyText:)];
            [copyButton setFrame:NSMakeRect(12.0, 10.0, buttonWidth, 26.0)];
            [copyButton setBezelStyle:NSBezelStyleRounded];
            
            NSButton *pasteButton = [NSButton buttonWithTitle:@"粘贴" target:textHandler action:@selector(pasteText:)];
            [pasteButton setFrame:NSMakeRect(18.0 + buttonWidth, 10.0, buttonWidth, 26.0)];
            [pasteButton setBezelStyle:NSBezelStyleRounded];
            
            [panel addSubview:copyButton];
            [panel addSubview:pasteButton];
            
            // Toggle Button
            TextButton *toggleButton = [[TextButton alloc] initWithFrame:NSMakeRect(imageDisplaySize.width - 36.0, imageY + 6.0, 30.0, 30.0)];
            [toggleButton setTarget:textHandler];
            [toggleButton setAction:@selector(togglePanel:)];
            textHandler.toggleButton = toggleButton;
            
            // Add subviews in correct Z-order (Bottom to Top)
            [containerView addSubview:imageView];
            [containerView addSubview:dragArea positioned:NSWindowAbove relativeTo:imageView];
            [containerView addSubview:toggleButton positioned:NSWindowAbove relativeTo:dragArea];
        } else {
            [containerView addSubview:imageView];
            [containerView addSubview:dragArea positioned:NSWindowAbove relativeTo:imageView];
        }
        
        [containerView addSubview:panel positioned:NSWindowAbove relativeTo:dragArea];
        
        [window setContentView:containerView];
        [window setIgnoresMouseEvents:NO];
        [window makeKeyAndOrderFront:nil];
        
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app activateIgnoringOtherApps:YES];
        
        __block BOOL isDragging = NO;
        __block NSPoint dragOffset = NSZeroPoint;
        
        NSTimer *eventTimer = [NSTimer scheduledTimerWithTimeInterval:0.01 repeats:YES block:^(NSTimer * _Nonnull timer) {
            if (CGEventSourceKeyState(kCGEventSourceStateCombinedSessionState, kVK_Escape)) {
                [app terminate:nil];
                return;
            }
            
            BOOL leftDown = CGEventSourceButtonState(kCGEventSourceStateCombinedSessionState, kCGMouseButtonLeft);
            NSPoint mouseLocation = [NSEvent mouseLocation];
            NSRect windowFrame = [window frame];
            NSPoint locationInWindow = NSMakePoint(mouseLocation.x - windowFrame.origin.x, mouseLocation.y - windowFrame.origin.y);
            
            if (!isDragging) {
                if (leftDown && NSPointInRect(mouseLocation, windowFrame)) {
                    NSRect imageRectInWindow = imageView.frame;
                    BOOL isCommandPressed = ([NSEvent modifierFlags] & NSEventModifierFlagCommand) != 0;
                    
                    if (NSPointInRect(locationInWindow, imageRectInWindow)) {
                        // Don't drag if clicking on the toggle button
                        if (textHandler && textHandler.toggleButton && NSPointInRect(locationInWindow, textHandler.toggleButton.frame)) {
                            return;
                        }
                        
                        // Allow dragging anywhere on the image
                        isDragging = YES;
                        dragOffset = NSMakePoint(mouseLocation.x - windowFrame.origin.x, mouseLocation.y - windowFrame.origin.y);
                    }
                }
            }
            
            if (isDragging) {
                if (leftDown) {
                    NSPoint newOrigin = NSMakePoint(mouseLocation.x - dragOffset.x, mouseLocation.y - dragOffset.y);
                    [window setFrameOrigin:newOrigin];
                } else {
                    isDragging = NO;
                }
            }
        }];
        
        [[NSRunLoop mainRunLoop] addTimer:eventTimer forMode:NSRunLoopCommonModes];
        [app run];
    }
    return 0;
}

