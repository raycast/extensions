// Captures the Weather app icon at 1024x1024 (512pt @2x) as PNG.
// Usage: capture_icon <output_path>
//
// Compile: clang -framework AppKit -framework Foundation -fobjc-arc -o capture_icon capture_icon.m

#import <AppKit/AppKit.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc < 2) {
            fprintf(stderr, "Usage: capture_icon <output_path>\n");
            return 1;
        }

        NSString *outputPath = [NSString stringWithUTF8String:argv[1]];
        NSString *appPath = @"/System/Applications/Weather.app";
        int ptSize = 512;
        int pxSize = ptSize * 2; // @2x

        NSImage *icon = [[NSWorkspace sharedWorkspace] iconForFile:appPath];
        icon.size = NSMakeSize(ptSize, ptSize);

        NSBitmapImageRep *rep = [[NSBitmapImageRep alloc]
            initWithBitmapDataPlanes:NULL
            pixelsWide:pxSize
            pixelsHigh:pxSize
            bitsPerSample:8
            samplesPerPixel:4
            hasAlpha:YES
            isPlanar:NO
            colorSpaceName:NSDeviceRGBColorSpace
            bytesPerRow:0
            bitsPerPixel:0];
        rep.size = NSMakeSize(ptSize, ptSize);

        [NSGraphicsContext saveGraphicsState];
        NSGraphicsContext *ctx = [NSGraphicsContext graphicsContextWithBitmapImageRep:rep];
        [NSGraphicsContext setCurrentContext:ctx];
        [icon drawInRect:NSMakeRect(0, 0, ptSize, ptSize)
               fromRect:NSZeroRect
              operation:NSCompositingOperationSourceOver
               fraction:1.0];
        [NSGraphicsContext restoreGraphicsState];

        NSData *pngData = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [pngData writeToFile:outputPath atomically:YES];

        printf("Saved %s (%lu bytes)\n", argv[1], (unsigned long)pngData.length);
    }
    return 0;
}
