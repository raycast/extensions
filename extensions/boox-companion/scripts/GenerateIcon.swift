import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else { exit(2) }
let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let size = 512
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else { exit(3) }

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

let body = NSBezierPath(roundedRect: NSRect(x: 34, y: 34, width: 444, height: 444), xRadius: 96, yRadius: 96)
NSColor(calibratedWhite: 0.08, alpha: 1).setFill()
body.fill()

let screen = NSBezierPath(roundedRect: NSRect(x: 105, y: 76, width: 302, height: 360), xRadius: 28, yRadius: 28)
NSColor(calibratedWhite: 0.96, alpha: 1).setFill()
screen.fill()

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 176, weight: .black),
    .foregroundColor: NSColor(calibratedWhite: 0.08, alpha: 1),
    .paragraphStyle: paragraph,
]
"B".draw(in: NSRect(x: 105, y: 156, width: 302, height: 220), withAttributes: attributes)

NSColor(calibratedWhite: 0.08, alpha: 1).setStroke()
for (index, radius) in [46.0, 72.0, 98.0].enumerated() {
    let arc = NSBezierPath()
    arc.appendArc(withCenter: NSPoint(x: 256, y: 130), radius: radius, startAngle: 35, endAngle: 145)
    arc.lineWidth = CGFloat(8 - index)
    arc.lineCapStyle = .round
    arc.stroke()
}

NSGraphicsContext.restoreGraphicsState()
guard let data = bitmap.representation(using: .png, properties: [:]) else { exit(4) }
try data.write(to: outputURL, options: .atomic)
