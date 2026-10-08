import AppKit
import Foundation

let canvasSize = 512.0
let image = NSImage(size: NSSize(width: canvasSize, height: canvasSize))

image.lockFocus()

NSColor(calibratedRed: 19 / 255, green: 16 / 255, blue: 16 / 255, alpha: 1).setFill()
NSBezierPath(
    roundedRect: NSRect(x: 0, y: 0, width: canvasSize, height: canvasSize),
    xRadius: 104,
    yRadius: 104
).fill()

NSColor(calibratedRed: 248 / 255, green: 247 / 255, blue: 247 / 255, alpha: 1).setStroke()

func strokePath(_ points: [NSPoint]) {
    guard let firstPoint = points.first else { return }

    let path = NSBezierPath()
    path.lineWidth = 58
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.move(to: firstPoint)
    for point in points.dropFirst() {
        path.line(to: point)
    }
    path.stroke()
}

strokePath([
    NSPoint(x: 112, y: 340),
    NSPoint(x: 400, y: 340)
])

strokePath([
    NSPoint(x: 112, y: 256),
    NSPoint(x: 400, y: 256)
])

strokePath([
    NSPoint(x: 330, y: 302),
    NSPoint(x: 400, y: 256),
    NSPoint(x: 330, y: 210)
])

strokePath([
    NSPoint(x: 112, y: 172),
    NSPoint(x: 256, y: 172)
])

image.unlockFocus()

guard
    let tiff = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let png = bitmap.representation(using: .png, properties: [:])
else {
    fputs("Unable to render extension icon.\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: "assets/extension-icon.png"))
