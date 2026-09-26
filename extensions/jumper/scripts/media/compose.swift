// Composites a window capture (PNG with shadow, from `screencapture -l`) onto a 2000x1250
// gradient background, the size Raycast requires for Store screenshots.
// Usage: swift compose.swift <window.png> <out.png>
import AppKit

let args = CommandLine.arguments
guard args.count == 3, let window = NSImage(contentsOfFile: args[1]),
  let rep = window.representations.first
else {
  FileHandle.standardError.write("usage: compose.swift <window.png> <out.png>\n".data(using: .utf8)!)
  exit(2)
}

let canvas = NSSize(width: 2000, height: 1250)
let out = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: Int(canvas.width), pixelsHigh: Int(canvas.height), bitsPerSample: 8,
  samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)

// Background: diagonal purple gradient to match the extension icon, plus a soft glow behind the window.
let rect = NSRect(origin: .zero, size: canvas)
NSGradient(
  colors: [
    NSColor(srgbRed: 0.18, green: 0.09, blue: 0.40, alpha: 1),
    NSColor(srgbRed: 0.42, green: 0.25, blue: 0.78, alpha: 1),
    NSColor(srgbRed: 0.80, green: 0.52, blue: 0.93, alpha: 1),
  ])!.draw(in: rect, angle: -35)
NSGradient(colors: [NSColor(white: 1, alpha: 0.18), NSColor(white: 1, alpha: 0)])!
  .draw(in: rect, relativeCenterPosition: NSPoint(x: 0, y: 0.1))

// Window: native pixel size, scaled down only if it would not fit with a margin.
let px = NSSize(width: rep.pixelsWide, height: rep.pixelsHigh)
let scale = min(1, (canvas.width - 200) / px.width, (canvas.height - 100) / px.height)
let size = NSSize(width: px.width * scale, height: px.height * scale)
let origin = NSPoint(x: (canvas.width - size.width) / 2, y: (canvas.height - size.height) / 2)
window.draw(in: NSRect(origin: origin, size: size), from: .zero, operation: .sourceOver, fraction: 1)

NSGraphicsContext.current = nil
try! out.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
