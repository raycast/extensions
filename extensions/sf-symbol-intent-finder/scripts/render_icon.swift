import AppKit

let size: CGFloat = 512
let outPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "assets/command-icon.png"

let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

// Rounded gradient background.
let bgRect = NSRect(x: 0, y: 0, width: size, height: size)
let path = NSBezierPath(roundedRect: bgRect, xRadius: 112, yRadius: 112)
path.addClip()
let gradient = NSGradient(colors: [
  NSColor(srgbRed: 0.45, green: 0.36, blue: 0.96, alpha: 1),
  NSColor(srgbRed: 0.61, green: 0.26, blue: 0.83, alpha: 1),
])!
gradient.draw(in: bgRect, angle: -90)

// White SF Symbol centered.
let config = NSImage.SymbolConfiguration(pointSize: 300, weight: .semibold)
if let symbol = NSImage(systemSymbolName: "sparkle.magnifyingglass", accessibilityDescription: nil)?
  .withSymbolConfiguration(config) {
  let s = symbol.size
  let tinted = NSImage(size: s)
  tinted.lockFocus()
  symbol.draw(at: .zero, from: NSRect(origin: .zero, size: s), operation: .sourceOver, fraction: 1)
  NSColor.white.set()
  NSRect(origin: .zero, size: s).fill(using: .sourceAtop)
  tinted.unlockFocus()

  let rect = NSRect(x: (size - s.width) / 2, y: (size - s.height) / 2, width: s.width, height: s.height)
  tinted.draw(in: rect)
}

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let png = rep.representation(using: .png, properties: [:])
else {
  FileHandle.standardError.write("Failed to render PNG\n".data(using: .utf8)!)
  exit(1)
}
try png.write(to: URL(fileURLWithPath: outPath))
print("Wrote \(outPath)")
