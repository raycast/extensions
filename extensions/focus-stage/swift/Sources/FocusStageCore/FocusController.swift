import AppKit

/// Owns one focus session and everything needed to put the desktop back exactly as it was.
///
/// Nothing outside the stage is hidden or moved: the backdrop covers it. The only changes to other
/// apps are the focused window's frame and (optionally) raising the focused app's other windows,
/// so ending a session can't reshuffle the desktop.
public final class FocusController {
    private struct Session {
        let id: Int
        let app: NSRunningApplication
        let originalWindow: AXUIElement?
        let originalFrame: CGRect?  // AX coordinates (top-left origin)
        /// The window was resized, so its original frame is put back at the end.
        var resized: Bool
        var recovery: RecoveryRecord
        let startedAt: Date
        /// The window the stage is built around. Follows focus between the app's normal windows.
        var anchorWindow: AXUIElement?
        /// The glow appears once the window has reached its place, not while it is being moved.
        var glowReady = false
        var placement: Backdrop.Placement
        var uncoveredScreen: CGRect?
    }

    public enum StartResult {
        case started
        /// A start or end is still running; toggles are ignored until it has finished.
        case busy
        case noWindow
    }

    private enum Phase { case idle, starting, active, ending }

    /// Called whenever a session starts or ends.
    public var onChange: (() -> Void)?
    /// Called when a start or end has fully finished (window moved, fade done).
    public var onSettled: (() -> Void)?
    public var isActive: Bool { session != nil }
    /// A start or end is in progress.
    public var isBusy: Bool { phase == .starting || phase == .ending }
    public var focusedAppName: String? { session?.app.localizedName }
    /// Where the session keeps its `RecoveryRecord` while it runs. nil: no record.
    public var recoveryURL: URL?

    /// Right after a start, launchers (Raycast) step aside and macOS hands focus to the previous app.
    /// Within this window, focus going elsewhere is put back on the stage.
    private static let settleTime: TimeInterval = 1.5

    private let settings: () -> StageSettings
    private let backdrop = Backdrop()
    /// AX calls into other apps block until that app answers (Chromium and Electron apps can take
    /// 100 ms and more to re-lay out). They run here, in order, so the main thread stays free.
    private let windowQueue = DispatchQueue(label: "com.mirkopoloni.FocusStage.windows", qos: .userInteractive)
    private var session: Session?
    private var sessionCount = 0
    private var watcher: WindowWatcher?
    private var observers: [(NotificationCenter, NSObjectProtocol)] = []
    private var menuBarChangedByUs = false
    private var dockChangedByUs = false
    /// The session's hide call. Its result decides what to restore, so the end waits for it.
    private var barsRequest: MenuBar.HideRequest?
    private var phase = Phase.idle

    /// `settings` is read whenever a session starts or `settingsChanged` is called.
    public init(settings: @escaping () -> StageSettings) {
        self.settings = settings
        backdrop.onMouseDown = { [weak self] in self?.reassert() }
        // An app that is busy (re-rendering, switching appearance) answers AX calls late; the
        // default timeout of 6 s per call could hold a start for many seconds.
        AXUIElementSetMessagingTimeout(AXUIElementCreateSystemWide(), 1)
    }

    /// The stage's app quit or its last window closed: end the session even if it is still
    /// starting, where toggles are otherwise ignored.
    private func endBecauseTargetIsGone() {
        guard session != nil else { return }
        if phase == .starting { phase = .active }
        exitFocus(animated: true)
    }

    /// Creates the backdrop windows ahead of the first session.
    public func prepare() {
        backdrop.prepare(settings: settings())
    }

    /// Starts or ends a session. Ignored while a start or end is still running, so a fast double
    /// press can't end a session halfway through its start (or start one during the restore).
    public func toggle(fraction: Double? = nil, hint: TargetHint? = nil) {
        switch phase {
        case .idle: enterFocus(fraction: fraction, hint: hint)
        case .active: exitFocus(animated: true)
        case .starting, .ending: break
        }
    }

    /// `fraction` overrides the settings' window size for this session. `hint` is the window that
    /// had focus when the hotkey fired (see `TargetHint`).
    @discardableResult
    public func enterFocus(fraction: Double? = nil, hint: TargetHint? = nil) -> StartResult {
        guard phase == .idle, session == nil else { return .busy }
        let settings = settings()
        let trusted = WindowMover.isTrusted(prompt: true)
        guard let target = TargetFinder.find(hint: hint) else {
            NSLog("FocusStage: no app to focus")
            return .noWindow
        }
        phase = .starting
        let started = DispatchGroup()
        let app = target.app
        let pid = app.processIdentifier
        let window = trusted ? target.window : nil
        if !trusted { NSLog("FocusStage: no Accessibility permission, the window is not resized") }
        let originalFrame = window.flatMap(WindowMover.frame(of:))
        if app.isHidden { app.unhide() }  // the launcher hid itself after running the command

        // A full-screen window has its display (its own Space) to itself: it isn't resized, and
        // that display gets no backdrop; the other displays are covered.
        let fullScreen = window.map(WindowMover.isFullScreen) ?? false
        let size = fraction ?? settings.fraction
        var frame: CGRect?
        if let originalFrame, size > 0, !fullScreen {
            frame = ScreenGeometry.centeredFrame(on: ScreenGeometry.screen(containing: originalFrame), fraction: size,
                                                 dockHidden: settings.hideDock)
        }
        let (placement, uncovered) = placement(for: window, pid: pid, settings)

        // 1. The backdrop, handed to the render server right away; its fade runs there.
        backdrop.show(placement: placement, uncovered: uncovered, settings: settings, animated: true)

        // 2. The menu bar (and the Dock) slide out alongside the fade, in one System Events call.
        // What to restore is decided here, from the settings as they are now (read directly from
        // the preferences, no waiting), and recorded before anything changes. So the end of the
        // session, a crash or Reset can put them back even if System Events hasn't answered yet.
        let original = MenuBar.currentAutohide()
        menuBarChangedByUs = !original.menuBar
        dockChangedByUs = settings.hideDock && !original.dock

        sessionCount += 1
        let id = sessionCount
        var recovery = RecoveryRecord(windowPID: pid, windowID: window.flatMap(WindowMover.windowID(of:)),
                                      originalFrame: frame == nil ? nil : originalFrame)
        recovery.menuBarChanged = menuBarChangedByUs
        recovery.dockChanged = dockChangedByUs
        recovery.save(to: recoveryURL)
        barsRequest = MenuBar.hide(menuBar: menuBarChangedByUs, dock: dockChangedByUs)
        session = Session(id: id, app: app, originalWindow: window, originalFrame: originalFrame,
                          resized: frame != nil, recovery: recovery, startedAt: Date(), anchorWindow: window,
                          placement: placement, uncoveredScreen: uncovered)
        if settings.holdNotifications { NotificationHold.hold() }

        started.enter()
        DispatchQueue.main.asyncAfter(deadline: .now() + Backdrop.fadeIn) { started.leave() }

        // 3. The window: moved and raised off the main thread, then the glow fades in around it.
        // When the app's other windows stay visible, they are raised too (back to front), so they
        // sit together on top and the backdrop can go right below the lowest of them.
        if let window {
            let raiseOthers = !settings.coverSameAppWindows && !fullScreen
            started.enter()
            windowQueue.async { [weak self] in
                if let frame { WindowMover.setFrame(frame, of: window, pid: pid) }
                if raiseOthers { Self.otherWindows(of: pid, except: window).forEach(WindowMover.raiseWithoutActivating) }
                WindowMover.raise(window, pid: pid)
                DispatchQueue.main.async {
                    defer { started.leave() }
                    guard let self, self.session?.id == id else { return }
                    // Raising activates the app, which can bring all its windows above the backdrop.
                    self.backdrop.reorder()
                    self.session?.glowReady = true
                    self.updateGlow(animated: true)
                }
            }
        }

        watcher = WindowWatcher(pid: pid) { [weak self] event in self?.handle(event) }
        watcher?.watch(window)
        observe(pid: pid)
        started.notify(queue: .main) { [weak self] in
            guard let self, self.phase == .starting, self.session?.id == id else { return }
            self.phase = .active
            self.onSettled?()
        }
        // Activating an app can bring its other windows forward well after it was raised (Zed
        // does): keep checking the real stack for a few seconds and slide the backdrop back.
        settleBackdrop(sessionID: id, attempts: 16)
        onChange?()
        return .started
    }

    /// `animated: false` is for shutdown: no fade, and the window and menu bar are restored synchronously.
    /// Animated exits only run once the start has fully finished; shutdown always runs.
    public func exitFocus(animated: Bool) {
        guard let session else { return }
        if animated, phase != .active { return }
        self.session = nil
        phase = .ending
        watcher?.stop()
        watcher = nil
        observers.forEach { center, token in center.removeObserver(token) }
        observers.removeAll()

        let pid = session.app.processIdentifier
        NotificationHold.release()
        let restoreWindow = {
            // Not while it is in full screen: the user put it there during the session.
            guard session.resized, let window = session.originalWindow, let frame = session.originalFrame,
                  !WindowMover.isFullScreen(window) else { return }
            WindowMover.setFrame(frame, of: window, pid: pid)
        }

        guard animated else {
            // Shutdown: let a pending hide call finish (or stop it) before restoring, so it can't
            // hide the bars again afterwards. Unless the bars are verifiably back, the recovery
            // record stays, for the next start or Reset.
            var barsKnown = true
            if let request = barsRequest {
                barsKnown = request.wait(timeout: 2)
                barsRequest = nil
            }
            let barsRestored = restoreBars(timeout: 2)
            windowQueue.sync(execute: restoreWindow)
            backdrop.hide(animated: false)
            if barsKnown && barsRestored { RecoveryRecord.remove(at: recoveryURL) }
            phase = .idle
            onChange?()
            return
        }

        // The window goes back to its place while the backdrop still covers everything behind it;
        // then the backdrop fades out over a desktop that never moved.
        windowQueue.async { [weak self] in
            restoreWindow()
            DispatchQueue.main.async {
                self?.backdrop.hide(animated: true)
                DispatchQueue.main.asyncAfter(deadline: .now() + Backdrop.fadeOut) {
                    guard let self, self.phase == .ending, self.session == nil else { return }
                    // Settled (and, in the extension, the stage process exits) only once the menu
                    // bar and Dock are back: the hide call may still be waiting for System Events.
                    self.whenBarsKnown {
                        self.restoreBars { restored in
                            guard self.phase == .ending, self.session == nil else { return }
                            // Not restored (System Events refused or failed): keep the record,
                            // so the next start or Reset tries again.
                            if restored { RecoveryRecord.remove(at: self.recoveryURL) }
                            self.phase = .idle
                            self.onSettled?()
                        }
                    }
                }
            }
        }
        onChange?()
    }

    /// Applies changed settings to a running session. Holding notifications applies from the next session.
    public func settingsChanged(resize: Bool = false) {
        let settings = settings()
        backdrop.apply(settings)
        guard let session else { return }
        if resize, settings.fraction > 0, let window = session.anchorWindow,
           let frame = WindowMover.frame(of: window), !WindowMover.isFullScreen(window) {
            let target = ScreenGeometry.centeredFrame(on: ScreenGeometry.screen(containing: frame), fraction: settings.fraction,
                                                      dockHidden: settings.hideDock)
            let pid = session.app.processIdentifier
            if Self.isSame(window, session.originalWindow) { self.session?.resized = true }
            windowQueue.async { WindowMover.setFrame(target, of: window, pid: pid) }
        }
        refreshPlacement()
        updateGlow()
    }

    // MARK: Following the window

    /// Where the backdrop goes for this window, and which display it leaves alone.
    private func placement(for window: AXUIElement?, pid: pid_t,
                           _ settings: StageSettings) -> (Backdrop.Placement, CGRect?) {
        if let window, WindowMover.isFullScreen(window), let frame = WindowMover.frame(of: window) {
            return (.front, ScreenGeometry.screen(containing: frame).frame)
        }
        if settings.coverSameAppWindows, let window, let id = WindowMover.windowID(of: window) {
            return (.behindWindow(id), nil)
        }
        return (.behindApp(pid), nil)
    }

    /// The focused window changed, or entered or left full screen: move the backdrop to match.
    private func refreshPlacement() {
        guard let session else { return }
        let (placement, uncovered) = placement(for: session.anchorWindow, pid: session.app.processIdentifier, settings())
        guard placement != session.placement || uncovered != session.uncoveredScreen else { return }
        self.session?.placement = placement
        self.session?.uncoveredScreen = uncovered
        backdrop.setPlacement(placement, uncovered: uncovered)
        // Entering or leaving full screen is a Space transition, during which macOS can drop the
        // reorder: check the real stack until the backdrop is in place (for up to 3 s).
        settleBackdrop(sessionID: session.id, attempts: 12)
    }

    private func settleBackdrop(sessionID: Int, attempts: Int) {
        guard attempts > 0 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            guard let self, self.session?.id == sessionID else { return }
            if !self.backdrop.isInPlace() { self.backdrop.reorder() }
            self.updateGlow()
            self.settleBackdrop(sessionID: sessionID, attempts: attempts - 1)
        }
    }

    /// Puts the focused window back in front, with the backdrop right behind it: after a click on
    /// the backdrop, or when another app took focus while the stage was starting.
    private func reassert() {
        guard let session, let window = session.anchorWindow else { return }
        let pid = session.app.processIdentifier
        let id = session.id
        if session.app.isHidden { session.app.unhide() }
        backdrop.reorder()
        windowQueue.async { WindowMover.raise(window, pid: pid) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self, self.session?.id == id else { return }
            self.backdrop.reorder()
            self.windowQueue.async { WindowMover.raise(window, pid: pid) }
        }
    }

    private func handle(_ event: WindowWatcher.Event) {
        guard let session else { return }
        let pid = session.app.processIdentifier
        switch event {
        case .frameChanged:
            refreshPlacement()  // entering or leaving full screen changes the frame too
            updateGlow()

        case .focusChanged:
            // A new or another normal window of the app took focus (Cmd-N, Cmd-`): the stage
            // moves to it. Alerts and panels just float above the stage.
            guard let focused = WindowMover.focusedWindow(pid: pid),
                  WindowMover.isNormalWindow(focused),
                  !Self.isSame(focused, session.anchorWindow) else { return }
            setAnchor(focused)

        case .windowDestroyed(let closed):
            guard Self.isSame(closed, session.anchorWindow) else { return }
            // Give the app a moment to focus its next window (that arrives as .focusChanged).
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                guard let self, let session = self.session, Self.isSame(closed, session.anchorWindow) else { return }
                if let next = WindowMover.focusedWindow(pid: pid), WindowMover.isNormalWindow(next) {
                    self.setAnchor(next)
                } else {
                    self.endBecauseTargetIsGone()
                }
            }
        }
    }

    private func setAnchor(_ window: AXUIElement?) {
        session?.anchorWindow = window
        watcher?.watch(window)
        refreshPlacement()
        backdrop.reorder()
        updateGlow()
    }

    private func updateGlow(animated: Bool = false) {
        guard let session, session.glowReady, settings().glow, let window = session.anchorWindow,
              let frame = WindowMover.frame(of: window), !WindowMover.isFullScreen(window) else {
            backdrop.setGlow(nil)
            return
        }
        backdrop.setGlow(ScreenGeometry.toCocoa(frame), animated: animated)
    }

    private var isSettling: Bool {
        guard let session else { return false }
        return Date().timeIntervalSince(session.startedAt) < Self.settleTime
    }

    private func observe(pid: pid_t) {
        let workspace = NSWorkspace.shared.notificationCenter
        let ownPID = ProcessInfo.processInfo.processIdentifier
        func appPID(_ note: Notification) -> pid_t? {
            (note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)?.processIdentifier
        }
        observers = [
            (workspace, workspace.addObserver(forName: NSWorkspace.didTerminateApplicationNotification,
                                              object: nil, queue: .main) { [weak self] note in
                if appPID(note) == pid { self?.endBecauseTargetIsGone() }
            }),
            (workspace, workspace.addObserver(forName: NSWorkspace.didActivateApplicationNotification,
                                              object: nil, queue: .main) { [weak self] note in
                guard let self else { return }
                if appPID(note) == pid {
                    // Activating the app (Cmd-Tab back to it) brings all its windows forward; slide
                    // the backdrop back under the focused one.
                    self.backdrop.reorder()
                    if let id = self.session?.id { self.settleBackdrop(sessionID: id, attempts: 8) }
                } else if appPID(note) != ownPID, self.isSettling {
                    self.reassert()  // the launcher handed focus to the previous app
                }
            }),
            (workspace, workspace.addObserver(forName: NSWorkspace.didHideApplicationNotification,
                                              object: nil, queue: .main) { [weak self] note in
                guard let self, appPID(note) == pid, self.isSettling else { return }
                self.reassert()  // the launcher hid itself, and the AI Chat with it
            }),
            // This process became active (a click reached the backdrop): hand focus back.
            (NotificationCenter.default, NotificationCenter.default.addObserver(
                forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main
            ) { [weak self] _ in self?.reassert() }),
        ]
    }

    /// The app's other windows on screen, back to front.
    private static func otherWindows(of pid: pid_t, except window: AXUIElement) -> [AXUIElement] {
        let focusedID = WindowMover.windowID(of: window)
        return WindowMover.onScreenWindows()
            .filter { $0.layer == 0 && $0.pid == pid && $0.id != focusedID }
            .reversed()
            .compactMap { WindowMover.window(pid: pid, id: $0.id) }
    }

    private static func isSame(_ a: AXUIElement, _ b: AXUIElement?) -> Bool {
        guard let b else { return false }
        return CFEqual(a, b)
    }

    /// Runs `body` on the main queue once the session's hide call has finished.
    private func whenBarsKnown(_ body: @escaping () -> Void) {
        guard let request = barsRequest else { return body() }
        request.notify { [weak self] in
            self?.barsRequest = nil
            body()
        }
    }

    /// Turns auto-hide back off for the menu bar and the Dock, each only if it was off when the
    /// session started. `completion` (main queue) gets whether they really are off now.
    private func restoreBars(completion: @escaping (Bool) -> Void) {
        let menuBar = menuBarChangedByUs, dock = dockChangedByUs
        menuBarChangedByUs = false
        dockChangedByUs = false
        MenuBar.restore(menuBar: menuBar, dock: dock, completion: completion)
    }

    /// The same, blocking for at most `timeout` (shutdown).
    private func restoreBars(timeout: TimeInterval) -> Bool {
        let menuBar = menuBarChangedByUs, dock = dockChangedByUs
        menuBarChangedByUs = false
        dockChangedByUs = false
        return MenuBar.restore(menuBar: menuBar, dock: dock, timeout: timeout)
    }
}

enum TargetFinder {
    struct Target {
        let app: NSRunningApplication
        let window: AXUIElement?
    }

    /// 1. The window from the hint, if it still exists.
    /// 2. The frontmost app's focused window, if it is a normal window.
    /// 3. The topmost normal window on screen.
    /// An app whose hint had no normal window at all is skipped in 2 and 3.
    static func find(hint: TargetHint? = nil) -> Target? {
        let ownPID = ProcessInfo.processInfo.processIdentifier
        var skipped: Set<pid_t> = [ownPID]

        if let hint, let app = NSRunningApplication(processIdentifier: hint.pid) {
            if let id = hint.windowID, let window = WindowMover.window(pid: hint.pid, id: id) {
                return Target(app: app, window: window)
            }
            if hint.windowID == nil { skipped.insert(hint.pid) }
        }

        if let app = NSWorkspace.shared.frontmostApplication, !skipped.contains(app.processIdentifier),
           app.activationPolicy == .regular,
           let window = WindowMover.focusedWindow(pid: app.processIdentifier),
           WindowMover.isNormalWindow(window) {
            return Target(app: app, window: window)
        }
        // Skip window-server windows without an AX window behind them (helper or overlay windows).
        var appWithoutWindow: NSRunningApplication?
        for info in WindowMover.onScreenWindows() where info.layer == 0 && !skipped.contains(info.pid) {
            guard let app = NSRunningApplication(processIdentifier: info.pid),
                  app.activationPolicy == .regular else { continue }
            if let window = WindowMover.window(pid: info.pid, id: info.id) {
                return Target(app: app, window: window)
            }
            appWithoutWindow = appWithoutWindow ?? app
        }
        return appWithoutWindow.map { Target(app: $0, window: nil) }
    }
}
