import AppKit

/// Swallows all key input so an unhandled keyDown never triggers NSBeep.
/// The event tap sees every keystroke independently of the responder
/// chain, so nothing needs to reach here for the visualization to work —
/// this view's only job is to stay silent.
private final class SwallowingContentView: NSView {
    override var acceptsFirstResponder: Bool { true }
    override func keyDown(with event: NSEvent) {}
    override func keyUp(with event: NSEvent) {}
    override func flagsChanged(with event: NSEvent) {}
}

/// Handles ⌘W (close) / ⌘Q (quit) directly. Needed because `.accessory`
/// activation policy ships no menu bar, so there's no default menu item to
/// wire these to.
private final class KeyProbeWindow: NSWindow {
    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        if event.modifierFlags.contains(.command) {
            switch event.charactersIgnoringModifiers {
            case "w":
                close()
                return true
            case "q":
                NSApp.terminate(nil)
                return true
            default:
                break
            }
        }
        return super.performKeyEquivalent(with: event)
    }
}

/// Owns the window, the keyboard board, and the toolbar (reset button +
/// unmapped-key readout). Closing the window quits the whole helper —
/// there's no background persistence once the window goes away.
final class KeyProbeWindowController: NSObject, NSWindowDelegate {
    static let shared = KeyProbeWindowController()

    private var window: KeyProbeWindow?
    private var keyboardView: KeyboardView?

    func show(layout: Layout) {
        let toolbarHeight: CGFloat = 40
        let padding: CGFloat = 16
        let boardWidth = layout.width * layout.unit
        let boardHeight = layout.height * layout.unit
        // Some bundled boards (nafuda, setta21) are narrower than the toolbar
        // itself, which would push the Layout button to a negative x.
        let resetButtonWidth: CGFloat = 80
        let layoutButtonWidth: CGFloat = 100
        let buttonGap: CGFloat = 8
        let labelGap: CGFloat = 8
        let buttonsWidth = resetButtonWidth + buttonGap + layoutButtonWidth
        let labelMinWidth: CGFloat = 120
        let toolbarMinWidth: CGFloat = padding * 2 + buttonsWidth + labelGap + labelMinWidth
        let contentWidth = max(boardWidth + padding * 2, toolbarMinWidth)
        let contentSize = NSSize(width: contentWidth, height: boardHeight + toolbarHeight + padding * 2)
        let contentRect = NSRect(origin: .zero, size: contentSize)

        let window = KeyProbeWindow(
            contentRect: contentRect,
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isOpaque = false
        window.backgroundColor = .clear
        window.isMovableByWindowBackground = true
        window.delegate = self
        // Forced, not inherited: key colors are tuned for dark glass, and
        // .hudWindow blends light in Light Mode.
        window.appearance = NSAppearance(named: .darkAqua)

        let visualEffect = NSVisualEffectView(frame: contentRect)
        visualEffect.material = .hudWindow
        visualEffect.blendingMode = .behindWindow
        visualEffect.state = .active
        visualEffect.autoresizingMask = [.width, .height]

        let contentView = SwallowingContentView(frame: contentRect)
        contentView.addSubview(visualEffect)

        // Tint rather than a more opaque material, so the glass stays see-through.
        let scrim = NSView(frame: contentRect)
        scrim.wantsLayer = true
        scrim.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.2).cgColor
        scrim.autoresizingMask = [.width, .height]
        contentView.addSubview(scrim)

        let unmappedLabel = NSTextField(labelWithString: "")
        unmappedLabel.font = .systemFont(ofSize: 11)
        unmappedLabel.textColor = .secondaryLabelColor
        unmappedLabel.lineBreakMode = .byTruncatingTail
        let labelWidth = contentWidth - padding * 2 - buttonsWidth - labelGap
        unmappedLabel.frame = NSRect(
            x: padding, y: contentSize.height - toolbarHeight - padding / 2,
            width: labelWidth, height: 20
        )
        unmappedLabel.autoresizingMask = [.width]
        contentView.addSubview(unmappedLabel)

        let keyboardView = KeyboardView(layout: layout, unmappedLabel: unmappedLabel)
        keyboardView.frame.origin = NSPoint(x: (contentWidth - boardWidth) / 2, y: padding)
        contentView.addSubview(keyboardView)
        self.keyboardView = keyboardView

        let resetButton = NSButton(title: "Reset", target: self, action: #selector(resetTapped))
        resetButton.bezelStyle = .rounded
        resetButton.frame = NSRect(
            x: contentSize.width - resetButtonWidth - padding, y: contentSize.height - toolbarHeight - padding / 2,
            width: resetButtonWidth, height: 24
        )
        resetButton.autoresizingMask = [.minXMargin]
        contentView.addSubview(resetButton)

        // Opens the "Select Keyboard Layout" Raycast command via deeplink
        // instead of duplicating its search UI natively. search-layout.tsx
        // restarts this window itself once a new layout is picked there.
        let layoutButton = NSButton(title: "Layout…", target: self, action: #selector(layoutTapped))
        layoutButton.bezelStyle = .rounded
        layoutButton.frame = NSRect(
            x: contentSize.width - buttonsWidth - padding, y: contentSize.height - toolbarHeight - padding / 2,
            width: layoutButtonWidth, height: 24
        )
        layoutButton.autoresizingMask = [.minXMargin]
        contentView.addSubview(layoutButton)

        window.contentView = contentView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        self.window = window
    }

    @objc private func resetTapped() {
        keyboardView?.resetAll()
    }

    @objc private func layoutTapped() {
        guard let url = URL(string: "raycast://extensions/yuzukq/keyprobe/search-layout") else { return }
        NSWorkspace.shared.open(url)
    }

    func handleDown(keycode: Int64) {
        keyboardView?.handleDown(keycode: keycode)
    }

    func handleUp(keycode: Int64) {
        keyboardView?.handleUp(keycode: keycode)
    }

    func bringToFront() {
        guard let window = window else { return }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func windowWillClose(_ notification: Notification) {
        NSApp.terminate(nil)
    }
}
