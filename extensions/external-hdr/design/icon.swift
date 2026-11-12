// Renders the External HDR app icon.
// Usage: swift design/icon.swift <output.png> [monitor|sun|word]
//
// monitor: a display split at 42%, slate for SDR, white for HDR.
// sun:     a half-disc rising over a horizon, split down the middle.
// word:    "HDR" set in the system font at maximum weight.
//
// Everything is geometry and system type, so the result is reproducible and
// stays legible at 64 px. No image model involved.

import AppKit

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "assets/icon.png"
let variant = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "monitor"
let side: CGFloat = 1024
let radius: CGFloat = 224

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
  NSColor(
    srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: alpha
  )
}

guard
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(side), pixelsHigh: Int(side),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
  ),
  let graphics = NSGraphicsContext(bitmapImageRep: rep)
else {
  FileHandle.standardError.write(Data("icon: could not create bitmap context\n".utf8))
  exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics
let ctx = graphics.cgContext
ctx.setShouldAntialias(true)
ctx.interpolationQuality = .high

func rounded(_ rect: CGRect, _ r: CGFloat) -> CGPath {
  CGPath(roundedRect: rect, cornerWidth: r, cornerHeight: r, transform: nil)
}

func fill(_ rect: CGRect, r: CGFloat, _ fillColor: NSColor) {
  ctx.addPath(rounded(rect, r))
  ctx.setFillColor(fillColor.cgColor)
  ctx.fillPath()
}

func fillAll(_ rect: CGRect, _ fillColor: NSColor) {
  ctx.setFillColor(fillColor.cgColor)
  ctx.fill(rect)
}

// Shared charcoal tile with a faint light spill from the right.
func drawTile(spillCenter: CGPoint, spillRadius: CGFloat, spillAlpha: CGFloat) {
  ctx.saveGState()
  ctx.addPath(rounded(CGRect(x: 0, y: 0, width: side, height: side), radius))
  ctx.clip()

  let tile = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [color(0x1B1F25).cgColor, color(0x0B0D10).cgColor] as CFArray,
    locations: [0, 1]
  )!
  ctx.drawLinearGradient(tile, start: CGPoint(x: 0, y: side), end: CGPoint(x: 0, y: 0), options: [])

  let spill = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [color(0xFFFFFF, spillAlpha).cgColor, color(0xFFFFFF, 0).cgColor] as CFArray,
    locations: [0, 1]
  )!
  ctx.drawRadialGradient(
    spill,
    startCenter: spillCenter, startRadius: 0,
    endCenter: spillCenter, endRadius: spillRadius,
    options: []
  )
  ctx.restoreGState()
}

// MARK: - monitor

func drawMonitor() {
  drawTile(spillCenter: CGPoint(x: 690, y: 545), spillRadius: 360, spillAlpha: 0.10)

  fill(CGRect(x: 196, y: 340, width: 632, height: 420), r: 36, color(0x2A3038))
  fill(CGRect(x: 492, y: 296, width: 40, height: 48), r: 6, color(0x2A3038))
  fill(CGRect(x: 388, y: 260, width: 248, height: 40), r: 20, color(0x2A3038))

  let screen = CGRect(x: 214, y: 358, width: 596, height: 384)
  ctx.saveGState()
  ctx.addPath(rounded(screen, 22))
  ctx.clip()

  let split = screen.minX + screen.width * 0.42
  fillAll(CGRect(x: screen.minX, y: screen.minY, width: split - screen.minX, height: screen.height), color(0x414B59))
  fillAll(CGRect(x: split, y: screen.minY, width: screen.maxX - split, height: screen.height), .white)

  let glow = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [color(0xFFFFFF, 0).cgColor, color(0xF4F8FF, 0.55).cgColor] as CFArray,
    locations: [0, 1]
  )!
  ctx.drawLinearGradient(
    glow,
    start: CGPoint(x: split, y: 0),
    end: CGPoint(x: screen.maxX, y: 0),
    options: []
  )
  ctx.restoreGState()
}

// MARK: - sun

func drawSun() {
  drawTile(spillCenter: CGPoint(x: 560, y: 520), spillRadius: 420, spillAlpha: 0.08)

  let horizon: CGFloat = 438
  let center = CGPoint(x: 512, y: horizon)
  let sunRadius: CGFloat = 218

  // The disc, clipped to the sky so it reads as rising.
  ctx.saveGState()
  ctx.clip(to: CGRect(x: 0, y: horizon, width: side, height: side - horizon))
  ctx.addEllipse(in: CGRect(
    x: center.x - sunRadius, y: center.y - sunRadius,
    width: sunRadius * 2, height: sunRadius * 2
  ))
  ctx.clip()
  fillAll(CGRect(x: 0, y: horizon, width: center.x, height: side - horizon), color(0x414B59))
  fillAll(CGRect(x: center.x, y: horizon, width: side - center.x, height: side - horizon), .white)
  ctx.restoreGState()

  // Horizon line.
  fill(CGRect(x: 128, y: horizon - 5, width: side - 256, height: 10), r: 5, color(0x2F3640))
}

// MARK: - word

func drawWord() {
  drawTile(spillCenter: CGPoint(x: 512, y: 560), spillRadius: 460, spillAlpha: 0.06)

  let text = "HDR"
  let maxWidth: CGFloat = 748

  var fontSize: CGFloat = 360
  var font = NSFont.systemFont(ofSize: fontSize, weight: .black)
  while fontSize > 80 {
    let width = (text as NSString).size(withAttributes: [.font: font]).width
    if width <= maxWidth { break }
    fontSize -= 8
    font = NSFont.systemFont(ofSize: fontSize, weight: .black)
  }

  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center

  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white,
    .kern: -fontSize * 0.02,
    .paragraphStyle: paragraph,
  ]

  let height = (text as NSString).size(withAttributes: attributes).height
  (text as NSString).draw(
    in: NSRect(x: 0, y: (side - height) / 2, width: side, height: height),
    withAttributes: attributes
  )
}

// MARK: - run

switch variant {
case "sun":
  drawSun()
case "word":
  drawWord()
default:
  drawMonitor()
}

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
  FileHandle.standardError.write(Data("icon: could not encode PNG\n".utf8))
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: output))
  print("wrote \(output) (\(rep.pixelsWide)x\(rep.pixelsHigh), \(variant))")
} catch {
  FileHandle.standardError.write(Data("icon: \(error)\n".utf8))
  exit(1)
}
