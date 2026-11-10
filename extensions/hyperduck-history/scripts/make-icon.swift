// Draws the extension icon: a white link above a white tray on a flat violet squircle.
// Usage: swift scripts/make-icon.swift /tmp/icon.png && sips -z 512 512 /tmp/icon.png --out assets/<icon-file>.png
import AppKit

let S: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S), bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                           bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

func c(_ hex: UInt32) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
}

// Background: one soft violet gradient.
let bgRect = NSRect(x: 40, y: 40, width: S - 80, height: S - 80)
NSGradient(starting: c(0x7C4DFF), ending: c(0x4B23C9))!
  .draw(in: NSBezierPath(roundedRect: bgRect, xRadius: 220, yRadius: 220), angle: -90)

// Tray: one white U line.
let tray = NSBezierPath()
tray.move(to: NSPoint(x: 260, y: 430))
tray.line(to: NSPoint(x: 260, y: 330))
tray.appendArc(withCenter: NSPoint(x: 340, y: 330), radius: 80, startAngle: 180, endAngle: 270)
tray.line(to: NSPoint(x: 684, y: 250))
tray.appendArc(withCenter: NSPoint(x: 684, y: 330), radius: 80, startAngle: 270, endAngle: 360)
tray.line(to: NSPoint(x: 764, y: 430))
tray.lineWidth = 64; tray.lineCapStyle = .round; tray.lineJoinStyle = .round
NSColor.white.setStroke(); tray.stroke()

// Link: white SF Symbol above the tray.
let cfg = NSImage.SymbolConfiguration(pointSize: 300, weight: .bold).applying(.init(paletteColors: [.white]))
if let sym = NSImage(systemSymbolName: "link", accessibilityDescription: nil)?.withSymbolConfiguration(cfg) {
  let sz = sym.size
  sym.draw(in: NSRect(x: 512 - sz.width / 2, y: 590 - sz.height / 2, width: sz.width, height: sz.height))
}

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
