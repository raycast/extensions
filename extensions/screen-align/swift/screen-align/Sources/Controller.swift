import AppKit
import CoreGraphics

/// Owns the overlay windows and the keyboard loop.
final class Overlay {
    static let shared = Overlay()

    private var windows: [CGDirectDisplayID: OverlayWindow] = [:]
    private var supportPath = ""
    /// The match line: a y in the global space when aligning vertically, an x when
    /// aligning horizontally.
    private var matchPos: CGFloat = 0
    private var targetID: CGDirectDisplayID = 0
    /// Layout as it was when the overlay opened, for undo.
    private var initialLayout: [CGDirectDisplayID: CGPoint] = [:]
    private var showHUD = true
    /// Nudges asked for but not yet written. Each CGCompleteDisplayConfiguration costs
    /// macOS about a third of a second, so key presses accumulate here, show up in the
    /// drawing immediately, and get written once the user stops.
    private var pendingDelta = 0
    private var commitTimer: Timer?

    /// Whichever axis macOS leaves free for the current arrangement.
    private var axis: Axis {
        guard let main = mainDisplay(), let target = try? display(targetID), !target.isMain else {
            return .vertical
        }
        return freeAxis(target: target, main: main)
    }

    // MARK: Lifecycle

    func run(supportPath: String) {
        self.supportPath = supportPath
        let displays = snapshot()
        initialLayout = Dictionary(uniqueKeysWithValues: displays.map {
            ($0.id, CGPoint(x: $0.x, y: $0.y))
        })
        targetID = defaultTarget()?.id ?? displays.first?.id ?? 0
        matchPos = loadMatchPos() ?? defaultMatchPos(displays, axis: axis)

        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil, queue: .main
        ) { [weak self] _ in self?.refresh() }

        build()
        app.activate(ignoringOtherApps: true)
        app.run()
    }

    /// Center of the band every display shares along the free axis, so the line starts
    /// visible on all of them.
    private func defaultMatchPos(_ displays: [DisplayInfo], axis: Axis) -> CGFloat {
        guard !displays.isEmpty else { return 0 }
        let starts = displays.map { $0.position(axis) }
        let ends = displays.map { $0.position(axis) + $0.extent(axis) }
        guard let start = starts.max(), let end = ends.min(), end > start else {
            guard let main = mainDisplay() else { return 0 }
            return CGFloat(Double(main.position(axis)) + Double(main.extent(axis)) / 2)
        }
        return CGFloat(start + end) / 2
    }

    private func build() {
        windows.values.forEach { $0.orderOut(nil); $0.close() }
        windows.removeAll()

        var focused: OverlayWindow?
        let mouse = NSEvent.mouseLocation
        for screen in NSScreen.screens {
            guard let id = screen.displayID else { continue }
            let window = OverlayWindow(
                contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false
            )
            window.level = .screenSaver
            window.isOpaque = false
            window.backgroundColor = .clear
            window.hasShadow = false
            window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
            window.isReleasedWhenClosed = false
            let view = ScreenOverlayView(frame: NSRect(origin: .zero, size: screen.frame.size))
            window.contentView = view
            window.orderFrontRegardless()
            windows[id] = window
            if screen.frame.contains(mouse) || focused == nil { focused = window }
        }
        apply()
        if let focused, let view = focused.contentView {
            focused.makeKeyAndOrderFront(nil)
            focused.makeFirstResponder(view)
        }
    }

    /// Reframe in place when the same displays are still attached: rebuilding on every
    /// one-point nudge would flicker.
    private func refresh() {
        let attached = Set(NSScreen.screens.compactMap(\.displayID))
        guard attached == Set(windows.keys) else { build(); return }
        for screen in NSScreen.screens {
            guard let id = screen.displayID, let window = windows[id] else { continue }
            window.setFrame(screen.frame, display: false)
            window.contentView?.frame = NSRect(origin: .zero, size: screen.frame.size)
        }
        apply()
    }

    /// Push current geometry into every view and redraw.
    private func apply() {
        let displays = snapshot()
        let currentAxis = axis
        let hud = hudLines(displays, axis: currentAxis)
        for info in displays {
            guard let view = windows[info.id]?.contentView as? ScreenOverlayView else { continue }
            view.cgBounds = CGRect(x: info.x, y: info.y, width: info.width, height: info.height)
            view.axis = currentAxis
            let density = info.ptPerMM(currentAxis)
            view.ptPerMM = CGFloat(density > 0 ? density : info.ptPerMMY)
            view.edges = edges(for: info, among: displays, axis: currentAxis)
            view.matchPos = matchPos
            view.isTarget = info.id == targetID
            view.previewShift = info.id == targetID ? CGFloat(pendingDelta) : 0
            view.hud = hud
            view.showHUD = showHUD
            view.needsDisplay = true
        }
    }

    /// Ruler strips go on the edges that face a neighbor, which are the edges either
    /// side of the one macOS has pinned.
    private func edges(for info: DisplayInfo, among displays: [DisplayInfo], axis: Axis) -> [RulerEdge] {
        let others = displays.filter { $0.id != info.id }
        var result: [RulerEdge] = []
        switch axis {
        case .vertical:
            if others.contains(where: { $0.right <= info.left + 4 }) { result.append(.left) }
            if others.contains(where: { $0.left >= info.right - 4 }) { result.append(.right) }
            return result.isEmpty ? [.right] : result
        case .horizontal:
            if others.contains(where: { $0.bottom <= info.top + 4 }) { result.append(.top) }
            if others.contains(where: { $0.top >= info.bottom - 4 }) { result.append(.bottom) }
            return result.isEmpty ? [.bottom] : result
        }
    }

    // MARK: Read-out

    /// Two lines: the number that is changing, and the keys. Everything else lives in
    /// the Arrange Displays command, where there is room to read it.
    private func hudLines(_ displays: [DisplayInfo], axis: Axis) -> [String] {
        guard let main = displays.first(where: \.isMain) else { return ["No main display"] }
        let arrows = axis == .vertical ? "↑↓" : "←→"
        guard let target = displays.first(where: { $0.id == targetID }), target.id != main.id else {
            return ["⌥ \(arrows) move the line     esc done"]
        }
        let offset = target.position(axis) - main.position(axis) + pendingDelta
        let density = target.ptPerMM(axis)
        let mm = density > 0 ? Double(offset) / density : 0
        let snaps = axis == .vertical ? "T C B snap" : "L C R snap"
        return [
            String(format: "%@   %+d pt   %+.1f mm", target.name, offset, mm),
            "\(arrows) align \(target.name)   ⌥\(arrows) move line   ⇧ ×10   \(snaps)   U undo   esc",
        ]
    }

    // MARK: Keys

    func handleKey(_ event: NSEvent) {
        let flags = event.modifierFlags
        let step: CGFloat = flags.contains(.shift) ? 10 : 1
        let option = flags.contains(.option)
        let currentAxis = axis

        switch Int(event.keyCode) {
        case 53: // esc
            commit()
            NSApp.terminate(nil)
        case 126 where currentAxis == .vertical: // up
            option ? moveLine(by: -step) : moveTarget(by: Int(step))
        case 125 where currentAxis == .vertical: // down
            option ? moveLine(by: step) : moveTarget(by: -Int(step))
        case 124 where currentAxis == .horizontal: // right
            option ? moveLine(by: step) : moveTarget(by: -Int(step))
        case 123 where currentAxis == .horizontal: // left
            option ? moveLine(by: -step) : moveTarget(by: Int(step))
        default:
            switch event.charactersIgnoringModifiers?.lowercased() ?? "" {
            case "t", "l": align(.start)
            case "c": align(.center)
            case "b", "r": align(.end)
            case "u": undo()
            case "h": showHUD.toggle(); apply()
            default: break
            }
        }
    }

    /// The keys move what the user can see: up raises the line on the target screen,
    /// right slides it right. The arrangement offset follows from that.
    private func moveTarget(by delta: Int) {
        guard targetID != 0, let info = try? display(targetID), !info.isMain else { return }
        pendingDelta += delta
        apply()
        commitTimer?.invalidate()
        commitTimer = Timer.scheduledTimer(withTimeInterval: 0.12, repeats: false) { [weak self] _ in
            self?.commit()
        }
    }

    private func commit() {
        commitTimer?.invalidate()
        commitTimer = nil
        let delta = pendingDelta
        pendingDelta = 0
        guard delta != 0 else { return }
        _ = try? nudgeDisplay(targetID, by: delta, along: axis)
        apply()
    }

    private func moveLine(by delta: CGFloat) {
        matchPos += delta
        saveMatchPos()
        apply()
    }

    private func align(_ mode: AlignMode) {
        commit()
        guard let main = mainDisplay(), let target = try? display(targetID), !target.isMain else { return }
        let origin = alignedOrigin(target: target, to: main, mode: mode, axis: axis)
        _ = try? moveDisplay(target.id, toX: Int(origin.x), y: Int(origin.y))
        apply()
    }

    private func undo() {
        commitTimer?.invalidate()
        commitTimer = nil
        pendingDelta = 0
        try? setOrigins(initialLayout)
        apply()
    }

    // MARK: Persistence

    private var matchPath: String { (supportPath as NSString).appendingPathComponent("match-line") }

    /// Stored as "axis value", so a line saved for one arrangement is not reused for the
    /// other.
    private func loadMatchPos() -> CGFloat? {
        guard let text = try? String(contentsOfFile: matchPath, encoding: .utf8) else { return nil }
        let parts = text.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: " ")
        guard parts.count == 2, parts[0] == axis.rawValue, let value = Double(parts[1]) else { return nil }
        // Only reuse it if it still lands on a screen.
        let current = axis
        let lands = snapshot().contains {
            Double($0.position(current)) <= value && value <= Double($0.position(current) + $0.extent(current))
        }
        return lands ? CGFloat(value) : nil
    }

    private func saveMatchPos() {
        try? "\(axis.rawValue) \(Double(matchPos))"
            .write(toFile: matchPath, atomically: true, encoding: .utf8)
    }
}

extension NSScreen {
    var displayID: CGDirectDisplayID? {
        (deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value
    }
}
