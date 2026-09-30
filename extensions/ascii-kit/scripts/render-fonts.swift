// Draws a text file in several monospace fonts and line heights, side by side, to a PNG.
// For judging glyph designs (arrows, banners, toggles) across fonts before shipping them.
// Usage: npm run render-fonts -- input.txt output.png
// Fonts missing on the machine fall back to the system monospace font.
import AppKit

let args = CommandLine.arguments
let text = try! String(contentsOfFile: args[1], encoding: .utf8)
let out = args[2]
let fonts = ["Menlo", "Monaco", "SF Mono", "Geist Mono"]
let lineHeights: [CGFloat] = [1.2, 1.618]
let size: CGFloat = 15
let lines = text.components(separatedBy: "\n")
let cols = lines.map { $0.count }.max() ?? 1

let colWidth = CGFloat(cols) * size * 0.62 + 40
let panelHeights = lineHeights.map { CGFloat(lines.count) * size * $0 + 50 }
let width = colWidth * CGFloat(fonts.count)
let height = panelHeights.reduce(0, +)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(width * 2), pixelsHigh: Int(height * 2),
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
  bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: width, height: height)
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor(calibratedRed: 0.16, green: 0.17, blue: 0.2, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

var top = height
for (li, lh) in lineHeights.enumerated() {
  for (fi, name) in fonts.enumerated() {
    let font = NSFont(name: name, size: size) ?? NSFont(name: name.replacingOccurrences(of: " ", with: ""), size: size) ?? NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
    let x = CGFloat(fi) * colWidth + 16
    let label = "\(name) · line height \(lh)" as NSString
    label.draw(at: NSPoint(x: x, y: top - 22), withAttributes: [.font: NSFont.systemFont(ofSize: 11), .foregroundColor: NSColor.systemOrange])
    for (i, line) in lines.enumerated() {
      let y = top - 40 - CGFloat(i + 1) * size * lh
      (line as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [.font: font, .foregroundColor: NSColor(white: 0.85, alpha: 1)])
    }
  }
  top -= panelHeights[li]
}
NSGraphicsContext.current = nil
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
