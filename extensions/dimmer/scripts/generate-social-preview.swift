import AppKit
import Foundation

guard CommandLine.arguments.count == 4 else {
    FileHandle.standardError.write(
        Data("Usage: generate-social-preview.swift <background> <icon> <output>\n".utf8)
    )
    exit(64)
}

let backgroundURL = URL(fileURLWithPath: CommandLine.arguments[1])
let iconURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

guard
    let background = NSImage(contentsOf: backgroundURL),
    let icon = NSImage(contentsOf: iconURL)
else {
    fatalError("Unable to load the background or icon")
}

let width = 1280
let height = 640
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fatalError("Unable to create output bitmap")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSGraphicsContext.current?.imageInterpolation = .high

let canvas = NSRect(x: 0, y: 0, width: width, height: height)
background.draw(in: canvas, from: .zero, operation: .copy, fraction: 1)

let readabilityGradient = NSGradient(colorsAndLocations:
    (NSColor.clear, 0.0),
    (NSColor(calibratedWhite: 0.01, alpha: 0.18), 0.42),
    (NSColor(calibratedWhite: 0.01, alpha: 0.45), 1.0)
)!
readabilityGradient.draw(in: canvas, angle: 0)

let iconRect = NSRect(x: 680, y: 371, width: 112, height: 112)
icon.draw(in: iconRect, from: .zero, operation: .sourceOver, fraction: 1)

let wordmarkAttributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 78, weight: .bold),
    .foregroundColor: NSColor.white,
    .kern: -2.2,
]
("Dimmer" as NSString).draw(
    in: NSRect(x: 822, y: 379, width: 390, height: 100),
    withAttributes: wordmarkAttributes
)

let taglineAttributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 29, weight: .medium),
    .foregroundColor: NSColor(calibratedRed: 0.72, green: 0.78, blue: 0.89, alpha: 1),
    .kern: -0.3,
]
("Dim beyond the minimum." as NSString).draw(
    in: NSRect(x: 684, y: 292, width: 500, height: 48),
    withAttributes: taglineAttributes
)

let segmentSize: CGFloat = 16
let segmentGap: CGFloat = 14
for index in 0..<10 {
    let x = 684 + CGFloat(index) * (segmentSize + segmentGap)
    let segment = NSBezierPath(ovalIn: NSRect(x: x, y: 232, width: segmentSize, height: segmentSize))
    if index < 4 {
        NSColor(calibratedRed: 0.51, green: 0.70, blue: 0.96, alpha: 1).setFill()
        segment.fill()
    } else {
        NSColor(calibratedRed: 0.36, green: 0.42, blue: 0.55, alpha: 0.75).setStroke()
        segment.lineWidth = 2
        segment.stroke()
    }
}

let eyebrowAttributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 17, weight: .semibold),
    .foregroundColor: NSColor(calibratedRed: 0.51, green: 0.70, blue: 0.96, alpha: 0.9),
    .kern: 2.0,
]
("OPEN-SOURCE RAYCAST EXTENSION" as NSString).draw(
    in: NSRect(x: 684, y: 174, width: 460, height: 30),
    withAttributes: eyebrowAttributes
)

NSGraphicsContext.restoreGraphicsState()

guard let jpeg = bitmap.representation(
    using: .jpeg,
    properties: [.compressionFactor: 0.84]
) else {
    fatalError("Unable to encode social preview")
}

try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)
try jpeg.write(to: outputURL, options: .atomic)
