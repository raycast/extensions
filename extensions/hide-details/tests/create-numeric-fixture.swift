import AppKit

let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: 1400, pixelsHigh: 650,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
  isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.white.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1400, height: 650)).fill()
let lines = [
  "4111 1111 1111 1111 Exp 12/29",
  "+1 415 555 0123 Ticket 123456789",
  "Call 415 555 0123 987654321",
  "4155550123 2125559876",
  "4155550123 192.168.10.20",
  "4111.1111.1111.1111",
]
for (index, line) in lines.enumerated() {
  (line as NSString).draw(at: NSPoint(x: 40, y: 560 - index * 110), withAttributes: [
    .font: NSFont.monospacedSystemFont(ofSize: 38, weight: .regular), .foregroundColor: NSColor.black,
  ])
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
