// Shared with the Dock Cleanup menu bar app: https://github.com/alaramartin/dock-cleanup/blob/main/Sources/DockCleanup/Shared/Sweep.swift

import AppKit

/// One drag-to-select session: overlay windows on every screen, the rectangle, the highlights and the confirm panel.
final class Sweep {
    /// Dock app icons, re-read at every press and release: the Dock can change during a sweep (an app launches,
    /// a Handoff icon appears, the icons shrink to fit), and selection must match what's on screen.
    private var items: [DockItem]
    private var windows: [OverlayWindow] = []
    private var panel: ConfirmPanel?
    /// The app to give focus back to when the sweep ends.
    private let previousApp: NSRunningApplication?
    private let isProtected: (DockItem) -> Bool
    /// Called when the overlay closes.
    private let onFinish: (Sweep) -> Void
    /// Called when everything is done: after the selected apps have quit and left the Dock, or right after a cancel.
    private let onComplete: () -> Void

    /// The drag rectangle in global Cocoa coordinates, while the mouse is down.
    private(set) var rect: NSRect?
    private(set) var selected: [DockItem] = []
    private(set) var protectedHits: [DockItem] = []
    var isConfirming: Bool { panel != nil }

    init(previousApp: NSRunningApplication?, isProtected: @escaping (DockItem) -> Bool,
         onFinish: @escaping (Sweep) -> Void = { _ in }, onComplete: @escaping () -> Void = {}) {
        self.previousApp = previousApp
        self.isProtected = isProtected
        items = Dock.appItems().filter(\.isRemovable)
        self.onFinish = onFinish
        self.onComplete = onComplete
    }

    /// The area covered by the Dock's app icons.
    var dockFrame: NSRect? { items.dropFirst().reduce(items.first?.frame) { $0?.union($1.frame) } }

    /// The screen showing the Dock, used for the hint and the confirm panel.
    var dockScreen: NSScreen? {
        guard let f = items.first?.frame else { return NSScreen.main }
        return NSScreen.screens.first { $0.frame.intersects(f) } ?? NSScreen.main
    }

    func start() {
        for screen in NSScreen.screens {
            let w = OverlayWindow(screen: screen, sweep: self)
            windows.append(w)
            w.orderFrontRegardless()
        }
        NSApp.activate(ignoringOtherApps: true)
        windows.first { $0.screen == dockScreen }?.makeKey()
        updateCursor()
    }

    /// Crosshair while selecting, arrow while the confirm panel is up.
    /// Set directly (not with cursor rects) because cursor rects only apply once the app is active,
    /// and the click on the menu bar icon doesn't always leave it active.
    func updateCursor() { (isConfirming ? NSCursor.arrow : NSCursor.crosshair).set() }

    // MARK: - Drag

    private var anchor: NSPoint?

    func mouseDown(at p: NSPoint) {
        if isConfirming { cancel(); return }
        items = Dock.appItems().filter(\.isRemovable)
        anchor = p
        update(to: p)
    }

    func mouseDragged(to p: NSPoint) { update(to: p) }

    func mouseUp(at p: NSPoint) {
        guard anchor != nil else { return }
        items = Dock.appItems().filter(\.isRemovable)
        update(to: p)
        anchor = nil
        rect = nil
        redraw()
        if selected.isEmpty { cancel() } else { confirm() }
    }

    private func update(to p: NSPoint) {
        guard let a = anchor else { return }
        let r = NSRect(x: min(a.x, p.x), y: min(a.y, p.y), width: abs(a.x - p.x), height: abs(a.y - p.y))
        rect = r
        let hits = items.filter { $0.frame.intersects(r) || $0.frame.contains(a) }
        selected = hits.filter { !isProtected($0) }
        protectedHits = hits.filter { isProtected($0) }
        redraw()
    }

    private func redraw() { windows.forEach { $0.contentView?.needsDisplay = true } }

    // MARK: - Confirm

    private func confirm() {
        let p = ConfirmPanel(items: selected, onConfirm: { [weak self] in self?.commit() },
                             onCancel: { [weak self] in self?.cancel() })
        p.place(near: selected.map(\.frame).reduce(selected[0].frame) { $0.union($1) }, on: dockScreen)
        p.makeKeyAndOrderFront(nil)
        panel = p
        updateCursor()
    }

    private func commit() {
        let apps = selected.map(\.ref)
        teardown(restoreFocus: false)
        Task { @MainActor in
            await Remover.run(apps)
            // Give focus back to whatever was in front, unless it was just quit.
            if let prev = previousApp, !prev.isTerminated, !apps.contains(where: { $0.matches(prev) }) {
                prev.activate()
            }
            onComplete()
        }
    }

    func cancel() {
        teardown(restoreFocus: true)
        onComplete()
    }

    private func teardown(restoreFocus: Bool) {
        NSCursor.arrow.set()
        panel?.close()
        panel = nil
        windows.forEach { $0.contentView = nil; $0.close() }
        windows.removeAll()
        if restoreFocus { previousApp?.activate() }
        onFinish(self)
    }
}

// MARK: - Overlay

final class OverlayWindow: NSWindow {
    init(screen: NSScreen, sweep: Sweep) {
        super.init(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
        setFrame(screen.frame, display: false)
        level = .screenSaver
        isOpaque = false
        // Nearly clear, not fully clear: fully transparent pixels let clicks fall through to the windows below.
        backgroundColor = NSColor(white: 0, alpha: 0.001)
        hasShadow = false
        ignoresMouseEvents = false
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        isReleasedWhenClosed = false
        acceptsMouseMovedEvents = true
        contentView = OverlayView(sweep: sweep, isDockScreen: screen == sweep.dockScreen)
    }
    override var canBecomeKey: Bool { true }
}

final class OverlayView: NSView {
    // Weak: AppKit can still ask a hidden overlay to draw after its sweep has finished and been freed.
    private weak var sweep: Sweep?
    private let isDockScreen: Bool

    init(sweep: Sweep, isDockScreen: Bool) {
        self.sweep = sweep
        self.isDockScreen = isDockScreen
        super.init(frame: .zero)
    }
    required init?(coder: NSCoder) { fatalError() }

    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(rect: .zero, options: [.activeAlways, .inVisibleRect, .mouseMoved, .cursorUpdate, .mouseEnteredAndExited],
                                       owner: self, userInfo: nil))
    }
    override func cursorUpdate(with e: NSEvent) { sweep?.updateCursor() }
    override func mouseEntered(with e: NSEvent) { sweep?.updateCursor() }
    override func mouseMoved(with e: NSEvent) { sweep?.updateCursor() }

    private func global(_ e: NSEvent) -> NSPoint { window!.convertPoint(toScreen: e.locationInWindow) }
    private func local(_ r: NSRect) -> NSRect { convert(window!.convertFromScreen(r), from: nil) }

    override func mouseDown(with e: NSEvent) { sweep?.mouseDown(at: global(e)); sweep?.updateCursor() }
    override func mouseDragged(with e: NSEvent) { sweep?.mouseDragged(to: global(e)); sweep?.updateCursor() }
    override func mouseUp(with e: NSEvent) { sweep?.mouseUp(at: global(e)) }
    override func rightMouseDown(with e: NSEvent) { sweep?.cancel() }
    override func keyDown(with e: NSEvent) {
        if e.keyCode == 53 { sweep?.cancel() } else { super.keyDown(with: e) }
    }

    override func draw(_ dirty: NSRect) {
        guard let sweep else { return }
        for item in sweep.protectedHits {
            let r = local(item.iconFrame)
            NSColor(white: 0.1, alpha: 0.55).setFill()
            NSBezierPath(roundedRect: r, xRadius: r.width * 0.23, yRadius: r.width * 0.23).fill()
            if let lock = NSImage(systemSymbolName: "lock.fill", accessibilityDescription: "Protected")?
                .withSymbolConfiguration(.init(pointSize: 16, weight: .semibold).applying(.init(paletteColors: [.white]))) {
                let s = lock.size
                lock.draw(in: NSRect(x: r.midX - s.width / 2, y: r.midY - s.height / 2, width: s.width, height: s.height))
            }
        }
        for item in sweep.selected {
            let r = local(item.iconFrame).insetBy(dx: 0.5, dy: 0.5)
            let path = NSBezierPath(roundedRect: r, xRadius: r.width * 0.23, yRadius: r.width * 0.23)
            NSColor.systemBlue.withAlphaComponent(0.22).setFill()
            path.fill()
            NSColor.systemBlue.setStroke()
            path.lineWidth = 1
            path.stroke()
        }
        if let g = sweep.rect {
            let r = local(g)
            NSColor.systemBlue.withAlphaComponent(0.2).setFill()
            r.fill()
            NSColor.systemBlue.withAlphaComponent(0.9).setStroke()
            let path = NSBezierPath(rect: r.insetBy(dx: 0.5, dy: 0.5))
            path.lineWidth = 1
            path.stroke()
        }
        if isDockScreen && sweep.rect == nil && !sweep.isConfirming {
            drawHint(sweep)
        }
    }

    private func drawHint(_ sweep: Sweep) {
        let text = "Drag over Dock icons to quit and remove them. Esc cancels."
        let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 13, weight: .medium), .foregroundColor: NSColor.white]
        let size = (text as NSString).size(withAttributes: attrs)
        let dock = sweep.dockFrame.map(local) ?? NSRect(x: bounds.midX, y: 0, width: 0, height: 80)
        let box = NSRect(x: dock.midX - size.width / 2 - 14, y: dock.maxY + 20, width: size.width + 28, height: size.height + 14)
        NSColor(white: 0, alpha: 0.7).setFill()
        NSBezierPath(roundedRect: box, xRadius: box.height / 2, yRadius: box.height / 2).fill()
        (text as NSString).draw(at: NSPoint(x: box.minX + 14, y: box.minY + 7), withAttributes: attrs)
    }
}
