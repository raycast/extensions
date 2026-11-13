import AppKit

let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: 640, pixelsHigh: 240,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
  isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.white.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 640, height: 240)).fill()
for (index, line) in ["sample@example.com", "Invoice INV-12345"].enumerated() {
  (line as NSString).draw(
    at: NSPoint(x: 20, y: 170 - index * 50),
    withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 14, weight: .regular), .foregroundColor: NSColor.black]
  )
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
