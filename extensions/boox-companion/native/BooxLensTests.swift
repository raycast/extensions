import AppKit
import Foundation

@main
enum BooxLensTests {
    static func main() {
        let width = 120
        let height = 80
        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ), let cgImage = context.makeImage() else { fatalError("Could not create fixture") }

        let image = NSImage(cgImage: cgImage, size: NSSize(width: width, height: height))
        assertPixels(image, width: 120, height: 80)
        assertEncodedPixels(image, width: 120, height: 80)

        let fullImageRect = NSRect(x: 10, y: 20, width: 240, height: 160)
        guard let fullCrop = crop(image: image, selection: fullImageRect, displayedIn: fullImageRect) else {
            fatalError("Could not crop full fixture")
        }
        assertPixels(fullCrop, width: 120, height: 80)
        assertEncodedPixels(fullCrop, width: 120, height: 80)

        let rotated = rotate(image: image, counterClockwise: false)
        assertPixels(rotated, width: 80, height: 120)
        assertEncodedPixels(rotated, width: 80, height: 120)

        let imageRect = fullImageRect
        let selection = NSRect(x: 70, y: 60, width: 120, height: 80)
        guard let expectedRect = cropPixelRect(image: image, selection: selection, displayedIn: imageRect),
              let cropped = crop(image: image, selection: selection, displayedIn: imageRect) else {
            fatalError("Could not crop fixture")
        }
        precondition(Int(expectedRect.width) == 60 && Int(expectedRect.height) == 40)
        assertPixels(cropped, width: Int(expectedRect.width), height: Int(expectedRect.height))
        assertEncodedPixels(cropped, width: Int(expectedRect.width), height: Int(expectedRect.height))
    }

    private static func assertPixels(_ image: NSImage, width: Int, height: Int) {
        let size = pixelSize(image)
        precondition(size.width == width && size.height == height, "Expected \(width)×\(height), got \(size.width)×\(size.height)")
    }

    private static func assertEncodedPixels(_ image: NSImage, width: Int, height: Int) {
        guard let data = pngData(image), let representation = NSBitmapImageRep(data: data) else {
            fatalError("Could not encode fixture")
        }
        precondition(representation.pixelsWide == width && representation.pixelsHigh == height)
    }
}
