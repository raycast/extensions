// Renders the SF Symbols Rex uses for hosts as 256 px black alpha masks (Raycast tints them).
// Usage: swift render-symbols.swift <output-dir>
import AppKit
import Foundation

let outDir = URL(fileURLWithPath: CommandLine.arguments[1])
let symbols = ["macbook", "macmini", "macstudio", "desktopcomputer", "macpro.gen3", "server.rack", "cloud", "globe", "laptopcomputer"]
let size = 256
for name in symbols {
    guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil) else { print("missing \(name)"); continue }
    let config = NSImage.SymbolConfiguration(pointSize: CGFloat(size) * 0.72, weight: .regular)
    guard let image = base.withSymbolConfiguration(config) else { continue }
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let aspect = image.size.width / image.size.height
    var w = CGFloat(size) * 0.92, h = CGFloat(size) * 0.92
    if aspect > 1 { h = w / aspect } else { w = h * aspect }
    let rect = NSRect(x: (CGFloat(size) - w) / 2, y: (CGFloat(size) - h) / 2, width: w, height: h)
    NSColor.black.set()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    let pixels = rep.bitmapData!
    for y in 0..<size { for x in 0..<size { let p = pixels + y * rep.bytesPerRow + x * 4; p[0] = 0; p[1] = 0; p[2] = 0 } }
    try rep.representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent("\(name).png"))
    print("rendered \(name)")
}
