import AppKit

let size = NSSize(width: 512, height: 512)
let image = NSImage(size: size)
image.lockFocus()

NSColor(calibratedRed: 0.08, green: 0.11, blue: 0.12, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: 512, height: 512), xRadius: 112, yRadius: 112).fill()

func roundedBar(x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: NSRect(x: x, y: y, width: width, height: height), xRadius: height / 2, yRadius: height / 2).fill()
}

let mint = NSColor(calibratedRed: 0.36, green: 0.91, blue: 0.69, alpha: 1)
let track = NSColor(calibratedWhite: 1, alpha: 0.12)
for (y, width) in [(CGFloat(244), CGFloat(242)), (CGFloat(146), CGFloat(150))] {
    roundedBar(x: 86, y: y, width: 340, height: 30, color: track)
    roundedBar(x: 86, y: y, width: width, height: 30, color: mint)
}

let title = "USAGE" as NSString
title.draw(at: NSPoint(x: 86, y: 335), withAttributes: [
    .font: NSFont.systemFont(ofSize: 44, weight: .bold),
    .foregroundColor: NSColor.white,
    .kern: 5
])

image.unlockFocus()
let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: 512, pixelsHigh: 512,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
image.draw(in: NSRect(origin: .zero, size: size))
NSGraphicsContext.restoreGraphicsState()
let png = bitmap.representation(using: .png, properties: [:])!
try FileManager.default.createDirectory(atPath: "assets", withIntermediateDirectories: true)
try png.write(to: URL(fileURLWithPath: "assets/icon.png"))
