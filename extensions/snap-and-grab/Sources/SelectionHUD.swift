import AppKit
import ImageIO

private final class PassivePanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

final class SelectionHUD {
    let panel: NSPanel
    private let title = NSTextField(labelWithString: "")
    private let detail = NSTextField(labelWithString: "")
    private let previews = NSStackView()
    var previewsEnabled = true
    private var thumbnails: [URL: NSImage] = [:]

    init() {
        panel = PassivePanel(contentRect: NSRect(x: 0, y: 0, width: 408, height: 174), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.ignoresMouseEvents = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.animationBehavior = .none

        let effect = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: 408, height: 174))
        effect.material = .hudWindow
        effect.state = .active
        effect.blendingMode = .behindWindow
        effect.appearance = NSAppearance(named: .darkAqua)
        effect.wantsLayer = true
        effect.layer?.cornerRadius = 18
        effect.layer?.backgroundColor = NSColor(calibratedWhite: 0.13, alpha: 0.96).cgColor
        effect.layer?.masksToBounds = true
        effect.layer?.borderWidth = 0.5
        effect.layer?.borderColor = NSColor.white.withAlphaComponent(0.18).cgColor
        panel.contentView = effect

        title.font = .systemFont(ofSize: 18, weight: .semibold)
        title.textColor = .labelColor
        title.frame = NSRect(x: 20, y: 132, width: 368, height: 24)
        detail.font = .systemFont(ofSize: 12)
        detail.textColor = .secondaryLabelColor
        detail.frame = NSRect(x: 20, y: 18, width: 368, height: 17)
        detail.lineBreakMode = .byTruncatingTail
        previews.orientation = .horizontal
        previews.alignment = .centerY
        previews.spacing = 10
        previews.frame = NSRect(x: 20, y: 51, width: 368, height: 66)
        effect.addSubview(title)
        effect.addSubview(previews)
        effect.addSubview(detail)
    }

    func update(files: [URL], available: Int, modifiersLabel: String = "⌃⌘", message: String? = nil) {
        let count = files.count
        title.stringValue = "\(count) screenshot\(count == 1 ? "" : "s") selected"
        panel.setAccessibilityLabel(title.stringValue)
        detail.stringValue = message ?? (count >= available
            ? "No older screenshots · Release \(modifiersLabel) to copy"
            : "Press again for older · Release \(modifiersLabel) to copy")
        for view in previews.arrangedSubviews { previews.removeArrangedSubview(view); view.removeFromSuperview() }
        // Keep the latest-added screenshot visible as the selected count grows.
        let start = max(0, files.count - 4)
        for (offset, file) in (previewsEnabled ? Array(files.suffix(4)) : []).enumerated() {
            let tile = NSView(frame: NSRect(x: 0, y: 0, width: 82, height: 64))
            tile.wantsLayer = true
            tile.layer?.cornerRadius = 7
            tile.layer?.backgroundColor = NSColor.white.withAlphaComponent(0.08).cgColor
            tile.layer?.borderWidth = 1
            tile.layer?.borderColor = NSColor.white.withAlphaComponent(0.18).cgColor
            let imageView = NSImageView(frame: NSRect(x: 4, y: 4, width: 74, height: 56))
            imageView.imageScaling = .scaleProportionallyUpOrDown
            imageView.image = thumbnail(file)
            imageView.setAccessibilityLabel("Selected screenshot \(start + offset + 1)")
            tile.addSubview(imageView)
            let number = NSTextField(labelWithString: "\(start + offset + 1)")
            number.font = .monospacedDigitSystemFont(ofSize: 10, weight: .semibold)
            number.textColor = .white
            number.backgroundColor = NSColor.black.withAlphaComponent(0.75)
            number.drawsBackground = true
            number.alignment = .center
            number.frame = NSRect(x: 5, y: 44, width: 22, height: 15)
            tile.addSubview(number)
            tile.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([tile.widthAnchor.constraint(equalToConstant: 82), tile.heightAnchor.constraint(equalToConstant: 64)])
            previews.addArrangedSubview(tile)
        }
    }

    func updateCopied(files: [URL]) {
        update(files: files, available: files.count)
        title.stringValue = "\(files.count) screenshot\(files.count == 1 ? "" : "s") copied"
        detail.stringValue = "Ready in your clipboard · Press ⌘V to paste"
        panel.setAccessibilityLabel(title.stringValue + ". " + detail.stringValue)
    }

    func updateFailure(title message: String, detail explanation: String) {
        for view in previews.arrangedSubviews { previews.removeArrangedSubview(view); view.removeFromSuperview() }
        title.stringValue = message
        detail.stringValue = explanation
        panel.setAccessibilityLabel(message + ". " + explanation)
    }

    func show() {
        let mouse = NSEvent.mouseLocation
        let screen = NSScreen.screens.first(where: { $0.frame.contains(mouse) }) ?? NSScreen.main
        if let area = screen?.visibleFrame {
            panel.setFrameOrigin(NSPoint(x: area.midX - panel.frame.width / 2, y: area.minY + 48))
        }
        panel.orderFrontRegardless()
    }

    func hide() { panel.orderOut(nil) }

    private func thumbnail(_ file: URL) -> NSImage? {
        if let image = thumbnails[file] { return image }
        guard let source = CGImageSourceCreateWithURL(file as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
              let cg = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 180
              ] as CFDictionary) else { return NSImage(systemSymbolName: "photo", accessibilityDescription: "Screenshot preview unavailable") }
        let image = NSImage(cgImage: cg, size: NSSize(width: cg.width, height: cg.height))
        thumbnails[file] = image
        return image
    }
}
