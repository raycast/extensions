import AppKit

// Original timer mark; no Raycast branding or third-party artwork.
let size = NSSize(width: 512, height: 512)
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 512, pixelsHigh: 512,
                             bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                             isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
let tile = NSBezierPath(roundedRect: NSRect(origin: .zero, size: size), xRadius: 110, yRadius: 110)
NSGradient(starting: NSColor(srgbRed: 0.32, green: 0.08, blue: 0.14, alpha: 1),
           ending: NSColor(srgbRed: 0.10, green: 0.08, blue: 0.11, alpha: 1))!.draw(in: tile, angle: -65)
NSColor(srgbRed: 0.77, green: 0.29, blue: 0.37, alpha: 1).setStroke()
let ring = NSBezierPath(ovalIn: NSRect(x: 127, y: 109, width: 258, height: 258))
ring.lineWidth = 20
ring.stroke()
NSColor(srgbRed: 0.98, green: 0.89, blue: 0.89, alpha: 1).setStroke()
let hands = NSBezierPath()
hands.lineWidth = 20
hands.lineCapStyle = .round
hands.lineJoinStyle = .round
hands.move(to: NSPoint(x: 256, y: 321))
hands.line(to: NSPoint(x: 256, y: 238))
hands.line(to: NSPoint(x: 305, y: 204))
hands.stroke()
let crown = NSBezierPath()
crown.lineWidth = 20
crown.lineCapStyle = .round
crown.move(to: NSPoint(x: 232, y: 402))
crown.line(to: NSPoint(x: 280, y: 402))
crown.stroke()
NSGraphicsContext.restoreGraphicsState()
guard CommandLine.arguments.count == 2 else { fatalError("Pass the output PNG path") }
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
