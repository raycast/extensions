import AppKit
import Foundation

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let folder = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("tests/hud/fixtures")
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
var files: [URL] = []
for i in 0..<5 {
    let image = NSImage(size: NSSize(width: 320, height: 180))
    image.lockFocus()
    NSColor(calibratedHue: CGFloat(i) / 6, saturation: 0.45, brightness: 0.36, alpha: 1).setFill()
    NSBezierPath(rect: NSRect(x: 0, y: 0, width: 320, height: 180)).fill()
    NSColor.white.withAlphaComponent(0.85).setFill()
    NSBezierPath(roundedRect: NSRect(x: 22, y: 122, width: 180, height: 18), xRadius: 4, yRadius: 4).fill()
    NSColor.white.withAlphaComponent(0.25).setFill()
    NSBezierPath(roundedRect: NSRect(x: 22, y: 80, width: 260, height: 16), xRadius: 3, yRadius: 3).fill()
    NSBezierPath(roundedRect: NSRect(x: 22, y: 42, width: 210, height: 16), xRadius: 3, yRadius: 3).fill()
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    let file = folder.appendingPathComponent("Screenshot fixture \(i).png")
    try bitmap.representation(using: .png, properties: [:])!.write(to: file)
    files.append(file)
}
let hud = SelectionHUD()
for count in [1,2,3,5] {
    hud.update(files: Array(files.prefix(count)), available: 5)
    guard !hud.panel.canBecomeKey && !hud.panel.canBecomeMain && hud.panel.ignoresMouseEvents else {
        fatalError("HUD must never take focus or intercept input")
    }
    let content = hud.panel.contentView!
    content.layoutSubtreeIfNeeded()
    guard let bitmap = content.bitmapImageRepForCachingDisplay(in: content.bounds) else { fatalError("HUD render failed") }
    content.cacheDisplay(in: content.bounds, to: bitmap)
    try bitmap.representation(using: .png, properties: [:])!.write(to: folder.appendingPathComponent("hud-\(count).png"))
}
print("PASS: nonactivating HUD renders 1, 2, 3, and 5 selected screenshots with synthetic thumbnails")

func labelTexts(_ view: NSView) -> [String] {
    let own = (view as? NSTextField).map { [$0.stringValue] } ?? []
    return own + view.subviews.flatMap { labelTexts($0) }
}
for count in [1,3] {
    hud.updateCopied(files: Array(files.prefix(count)))
    let content = hud.panel.contentView!
    let labels = labelTexts(content)
    guard labels.contains("\(count) screenshot\(count == 1 ? "" : "s") copied"),
          labels.contains("Ready in your clipboard · Press ⌘V to paste") else { fatalError("Copy confirmation must show singular/plural count and paste instructions") }
    content.layoutSubtreeIfNeeded()
    let bitmap = content.bitmapImageRepForCachingDisplay(in: content.bounds)!
    content.cacheDisplay(in: content.bounds, to: bitmap)
    try bitmap.representation(using: .png, properties: [:])!.write(to: folder.appendingPathComponent("copied-\(count).png"))
}
hud.update(files: Array(files.prefix(2)), available: 5, modifiersLabel: "⇧⌘")
guard labelTexts(hud.panel.contentView!).contains("Press again for older · Release ⇧⌘ to copy") else { fatalError("HUD must follow custom modifier keys") }
print("PASS: copy confirmation count, clipboard instructions, and custom shortcut labels")
hud.updateFailure(title: "Screenshot wasn't saved", detail: "Check the screenshot folder or disk space.")
let failureLabels = labelTexts(hud.panel.contentView!)
guard failureLabels.contains("Screenshot wasn't saved"), failureLabels.contains("Check the screenshot folder or disk space."), !failureLabels.contains(where: { $0.hasSuffix(" copied") }) else { fatalError("Failure HUD must explain the problem without claiming success") }
print("PASS: failure HUD explains the error without a copied confirmation")
