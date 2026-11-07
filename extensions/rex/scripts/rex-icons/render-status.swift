// Renders Rex's program-status art (Settings "Program Activity" icons) in light and dark appearance.
// Usage: swift render-status.swift <output-dir>
import AppKit
import Foundation

let outDir = URL(fileURLWithPath: CommandLine.arguments[1])
guard let bundle = Bundle(path: "/Applications/Rex Beta.app") else { fatalError("app not found") }
let names: [(String, String)] = [("SettingsIconNotiProgress", "working"), ("SettingsIconNotiBlocked", "blocked"),
                                 ("SettingsIconNotiDone", "done"), ("SettingsIconNotiError", "error")]
let size = 112
for (asset, state) in names {
    guard let image = bundle.image(forResource: asset) else { print("missing \(asset)"); continue }
    for (appearance, suffix) in [(NSAppearance.Name.aqua, ""), (NSAppearance.Name.darkAqua, "@dark")] {
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                                   samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                   colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        NSAppearance(named: appearance)!.performAsCurrentDrawingAppearance {
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
            NSGraphicsContext.current?.imageInterpolation = .high
            image.draw(in: NSRect(x: 0, y: 0, width: size, height: size), from: .zero, operation: .sourceOver, fraction: 1.0)
            NSGraphicsContext.restoreGraphicsState()
        }
        try rep.representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent("\(state)\(suffix).png"))
    }
    print("rendered \(state) from \(asset) \(image.size)")
}
