import AppKit

let lines = CommandLine.arguments.dropFirst(2).first == "ip" ? [
  "server 192.168.1.10",
  "Host 10.0.0.1 up",
  "Gateway 192. 168. 1. 20 ready",
  "192.168.10.20",
  "Invalid 999.1.1.1",
] : [
  "4111 1111 1111 1111 Exp 12/29",
  "+1 415 555 0123 Ticket 123456789",
  "Call 415 555 0123 987654321",
  "4155550123 2125559876",
  "4155550123 192.168.10.20",
  "4111.1111.1111.1111",
]
let height = lines.count * 110 - 10
let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: 1400, pixelsHigh: height,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
  isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.white.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1400, height: height)).fill()
for (index, line) in lines.enumerated() {
  (line as NSString).draw(at: NSPoint(x: 40, y: height - 90 - index * 110), withAttributes: [
    .font: NSFont.monospacedSystemFont(ofSize: 38, weight: .regular), .foregroundColor: NSColor.black,
  ])
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
