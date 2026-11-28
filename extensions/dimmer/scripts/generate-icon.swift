import AppKit
import Foundation

let pixelSize = 512
let size = NSSize(width: pixelSize, height: pixelSize)
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: pixelSize,
    pixelsHigh: pixelSize,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fatalError("Unable to create bitmap")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

let background = NSBezierPath(roundedRect: NSRect(origin: .zero, size: size), xRadius: 112, yRadius: 112)
let gradient = NSGradient(
    starting: NSColor(calibratedRed: 0.08, green: 0.11, blue: 0.20, alpha: 1),
    ending: NSColor(calibratedRed: 0.02, green: 0.03, blue: 0.07, alpha: 1)
)!
gradient.draw(in: background, angle: -90)

let glowRect = NSRect(x: 116, y: 96, width: 280, height: 320)
NSColor(calibratedRed: 0.48, green: 0.67, blue: 1.0, alpha: 1).setFill()
NSBezierPath(ovalIn: glowRect).fill()

let cutoutRect = NSRect(x: 210, y: 166, width: 248, height: 278)
NSColor(calibratedRed: 0.035, green: 0.05, blue: 0.10, alpha: 1).setFill()
NSBezierPath(ovalIn: cutoutRect).fill()

NSGraphicsContext.restoreGraphicsState()

guard
    let png = bitmap.representation(using: .png, properties: [:])
else {
    fatalError("Unable to render icon")
}

let output = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "assets/icon.png")
try png.write(to: output, options: .atomic)
