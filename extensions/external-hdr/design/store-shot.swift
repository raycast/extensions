// Composites a 1500x950 window capture onto Raycast's 2000x1250 store canvas.
// Usage: swift design/store-shot.swift <input.png> <output.png>
//
// Raycast requires 2000x1250 (16:10) PNG screenshots. A window captured at 2x on
// a Retina display is 1500x950, which lands exactly on that canvas with 250px
// side margins and 150px top/bottom margins — no scaling, no loss of sharpness.

import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write(Data("usage: store-shot.swift <input.png> <output.png>\n".utf8))
  exit(1)
}

let canvasWidth: CGFloat = 2000
let canvasHeight: CGFloat = 1250

func color(_ hex: UInt32) -> NSColor {
  NSColor(
    srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: 1
  )
}

guard let source = NSImage(contentsOfFile: args[1]),
  let cgImage = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  FileHandle.standardError.write(Data("store-shot: cannot read \(args[1])\n".utf8))
  exit(1)
}

guard
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasWidth), pixelsHigh: Int(canvasHeight),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
  ),
  let graphics = NSGraphicsContext(bitmapImageRep: rep)
else {
  FileHandle.standardError.write(Data("store-shot: cannot create canvas\n".utf8))
  exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics
let ctx = graphics.cgContext
ctx.setShouldAntialias(true)
ctx.interpolationQuality = .high

// Backdrop: the same shallow gradient for every shot.
let backdrop = CGGradient(
  colorsSpace: CGColorSpaceCreateDeviceRGB(),
  colors: [color(0x15181D).cgColor, color(0x08090B).cgColor] as CFArray,
  locations: [0, 1]
)!
ctx.drawLinearGradient(
  backdrop,
  start: CGPoint(x: 0, y: canvasHeight),
  end: CGPoint(x: 0, y: 0),
  options: []
)

// Drop shadow, then the window at native pixels.
let width = CGFloat(cgImage.width)
let height = CGFloat(cgImage.height)
let origin = CGPoint(x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2)

ctx.saveGState()
ctx.setShadow(
  offset: CGSize(width: 0, height: -12),
  blur: 48,
  color: color(0x000000).withAlphaComponent(0.55).cgColor
)
ctx.draw(cgImage, in: CGRect(x: origin.x, y: origin.y, width: width, height: height))
ctx.restoreGState()

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
  FileHandle.standardError.write(Data("store-shot: cannot encode PNG\n".utf8))
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: args[2]))
  print("wrote \(args[2]) (\(rep.pixelsWide)x\(rep.pixelsHigh))")
} catch {
  FileHandle.standardError.write(Data("store-shot: \(error)\n".utf8))
  exit(1)
}
