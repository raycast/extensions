import AppKit

let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: 1200, pixelsHigh: 600,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
  isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.white.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1200, height: 600)).fill()

let lines = [
  "sample@example.com",
  "+1 415 555 0123",
  "4111 1111 1111 1111",
  "sk_live_AbcDef1234567890",
  "192.168.10.20",
  "ProjectNebula",
]
for (index, line) in lines.enumerated() {
  (line as NSString).draw(
    at: NSPoint(x: 60, y: 520 - index * 80),
    withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 32, weight: .regular), .foregroundColor: NSColor.black]
  )
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
