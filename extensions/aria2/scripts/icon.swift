import AppKit

let output = CommandLine.arguments[1]
let size = NSSize(width: 512, height: 512)
let image = NSImage(size: size, flipped: true) { rect in
  NSColor(calibratedRed: 0.15, green: 0.45, blue: 0.98, alpha: 1).setFill()
  NSBezierPath(roundedRect: rect.insetBy(dx: 28, dy: 28), xRadius: 108, yRadius: 108).fill()

  NSColor.white.setFill()
  NSColor.white.setStroke()

  let cx: CGFloat = 256
  let arrow = NSBezierPath()
  arrow.move(to: NSPoint(x: cx, y: 318))
  arrow.line(to: NSPoint(x: cx + 92, y: 226))
  arrow.line(to: NSPoint(x: cx + 42, y: 226))
  arrow.line(to: NSPoint(x: cx + 42, y: 148))
  arrow.line(to: NSPoint(x: cx - 42, y: 148))
  arrow.line(to: NSPoint(x: cx - 42, y: 226))
  arrow.line(to: NSPoint(x: cx - 92, y: 226))
  arrow.close()
  arrow.fill()

  let tray = NSBezierPath()
  tray.lineWidth = 32
  tray.lineCapStyle = .round
  tray.lineJoinStyle = .round
  tray.move(to: NSPoint(x: 156, y: 352))
  tray.line(to: NSPoint(x: 156, y: 398))
  tray.line(to: NSPoint(x: 356, y: 398))
  tray.line(to: NSPoint(x: 356, y: 352))
  tray.stroke()
  return true
}

guard let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:])
else {
  fputs("failed to encode icon\n", stderr)
  exit(1)
}

try png.write(to: URL(fileURLWithPath: output))
