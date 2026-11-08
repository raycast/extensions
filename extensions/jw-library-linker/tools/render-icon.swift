// Original vector drawing for this extension. Run from the repository root:
// swift -module-cache-path /tmp/jw-icon-swift-cache tools/render-icon.swift assets/icon.png
import AppKit

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "assets/icon.png"
let size = 512
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
    bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let purple = CGColor(red: 0.26, green: 0.12, blue: 0.38, alpha: 1)
context.setFillColor(purple)
context.addPath(CGPath(roundedRect: CGRect(x: 24, y: 24, width: 464, height: 464),
    cornerWidth: 104, cornerHeight: 104, transform: nil))
context.fillPath()
context.setStrokeColor(CGColor(gray: 1, alpha: 1))
context.setLineWidth(15)
context.setLineCap(.round)
context.setLineJoin(.round)

let book = CGMutablePath()
book.move(to: CGPoint(x: 256, y: 340))
book.addCurve(to: CGPoint(x: 112, y: 358), control1: CGPoint(x: 209, y: 371), control2: CGPoint(x: 158, y: 379))
book.addLine(to: CGPoint(x: 112, y: 185))
book.addCurve(to: CGPoint(x: 256, y: 166), control1: CGPoint(x: 160, y: 205), control2: CGPoint(x: 211, y: 195))
book.addCurve(to: CGPoint(x: 400, y: 185), control1: CGPoint(x: 301, y: 195), control2: CGPoint(x: 352, y: 205))
book.addLine(to: CGPoint(x: 400, y: 358))
book.addCurve(to: CGPoint(x: 256, y: 340), control1: CGPoint(x: 354, y: 379), control2: CGPoint(x: 303, y: 371))
book.addLine(to: CGPoint(x: 256, y: 166))
context.addPath(book)
context.strokePath()
for y in [306, 269, 232] {
    context.move(to: CGPoint(x: 151, y: y + 7))
    context.addLine(to: CGPoint(x: 213, y: y - 4))
    context.move(to: CGPoint(x: 298, y: y - 4))
    context.addLine(to: CGPoint(x: 361, y: y + 7))
    context.strokePath()
}
context.saveGState()
context.translateBy(x: 329, y: 154)
context.rotate(by: .pi / 4)
for stroke in [(purple, CGFloat(35)), (CGColor(gray: 1, alpha: 1), CGFloat(15))] {
    context.setStrokeColor(stroke.0)
    context.setLineWidth(stroke.1)
    for x in [-77, -3] {
        context.addPath(CGPath(roundedRect: CGRect(x: x, y: -27, width: 81, height: 54), cornerWidth: 27, cornerHeight: 27, transform: nil))
        context.strokePath()
    }
}
context.restoreGState()
let image = context.makeImage()!
let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])!
try png.write(to: URL(fileURLWithPath: output))
print("Wrote original 512×512 icon to \(output)")
