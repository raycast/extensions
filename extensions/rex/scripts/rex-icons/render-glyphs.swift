// Renders Rex's block glyphs (vector template images in SuperBlockIcons) as 512 px alpha masks.
// Usage: swift render-glyphs.swift <definitions.json> <output-dir>
import AppKit
import Foundation

let args = CommandLine.arguments
let defsURL = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let bundlePath = "/Applications/Rex Beta.app/Contents/Resources/SuperBlockIcons_SuperBlockIcons.bundle"
guard let bundle = Bundle(path: bundlePath) else { fatalError("bundle not found") }
let defs = try JSONSerialization.jsonObject(with: Data(contentsOf: defsURL)) as! [[String: Any]]
var names = defs.map { $0["glyph"] as! String }.map { "block-glyph-\($0)" }
names.append("block-silhouette-modal")
names.append("block-glyph-placeholder")
let size = 512
var rendered = 0
for name in names {
    guard let image = bundle.image(forResource: name) else { print("missing \(name)"); continue }
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let aspect = image.size.width / image.size.height
    var w = CGFloat(size), h = CGFloat(size)
    if aspect > 1 { h = w / aspect } else { w = h * aspect }
    let rect = NSRect(x: (CGFloat(size) - w) / 2, y: (CGFloat(size) - h) / 2, width: w, height: h)
    // template images draw black; isTemplate just marks them. Draw in black explicitly via tint.
    image.isTemplate = false
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    // Force to black + alpha (some glyphs carry colour)
    let pixels = rep.bitmapData!
    let rowBytes = rep.bytesPerRow
    for y in 0..<size {
        for x in 0..<size {
            let p = pixels + y * rowBytes + x * 4
            p[0] = 0; p[1] = 0; p[2] = 0
        }
    }
    let png = rep.representation(using: .png, properties: [:])!
    let short = name.replacingOccurrences(of: "block-glyph-", with: "")
    try png.write(to: outDir.appendingPathComponent("\(short).png"))
    rendered += 1
}
print("rendered \(rendered) glyphs at \(size)px")
