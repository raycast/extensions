import AppKit

/// Controls whether the coordinator owns the process lifetime or runs inside a persistent app.
public enum RunMode {
    case raycast    // Event loop owned by coordinator; terminate kills process
    case standalone // Event loop owned by AppDelegate; session ends without killing app
}

/// Protocol for overlay windows that both MeasureWindow and AlignmentGuidesWindow conform to.
/// Allows the coordinator base to call common methods without knowing the concrete window type.
package protocol OverlayWindowProtocol: AnyObject {
    var targetScreen: NSScreen! { get }
    func showInitialState()
    func collapseHintBar()
    func deactivate()
}

/// Base class encapsulating the shared lifecycle for fullscreen overlay commands.
///
/// Both Measure and AlignmentGuides delegate startup orchestration, signal handling,
/// inactivity timeout, first-move hint bar collapse, and exit to this base.
/// Each subclass provides its window factory and command-specific callback wiring.
///
/// The `run()` method enforces the locked startup order:
///   permission check -> detect cursor screen -> captureAllScreens() (abort if nothing was
///   captured) -> .accessory policy -> cleanup old windows -> createWindow() per captured screen ->
///   show all windows -> make key window -> launchTime -> activate -> signal handler ->
///   inactivity timer -> app.run()
open class OverlayCoordinator {
    public static var anySessionActive = false  // Cross-coordinator guard: prevents Measure + Guides overlap
    public var runMode: RunMode = .raycast      // Default .raycast: zero changes needed in RaycastBridge
    public var isSessionActive = false
    public var windows: [NSWindow] = []
    private var staleWindows: [NSWindow] = []   // Standalone: holds old windows until safe to release
    public weak var activeWindow: NSWindow?
    public weak var cursorWindow: NSWindow?
    public var firstMoveReceived = false
    public var launchTime: CFAbsoluteTime = 0
    public let minExpandedDuration: TimeInterval = 3
    public var inactivityTimer: Timer?
    public let inactivityTimeout: TimeInterval = 600 // 10 minutes
    public var sigTermSource: DispatchSourceSignal?

    /// Called when the overlay session ends (ESC, inactivity, SIGTERM, or permission abort).
    /// Safe to set from any thread — fires on whatever thread handleExit() runs on.
    public var onSessionEnd: (() -> Void)?

    public init() {}

    // MARK: - Orchestrated Startup Sequence

    /// Run the overlay command. Enforces the locked startup order.
    /// Subclasses should NOT override this — override the hook methods instead.
    public func run(hideHintBar: Bool) {
        // Session guards: fast-reject overlapping invocations without side effects
        guard !isSessionActive else { return }
        guard !OverlayCoordinator.anySessionActive else { return }
        // Cursor reset: safe here because no session is active (guards passed above)
        CursorManager.shared.restore()
        isSessionActive = true
        OverlayCoordinator.anySessionActive = true

        // 1. Permission check
        let hasPermission = PermissionChecker.hasScreenRecordingPermission()
        if !hasPermission {
            PermissionChecker.requestScreenRecordingPermission()
            // In standalone mode, don't proceed — fullscreen windows would block the permission dialog
            if runMode == .standalone {
                abortStartup()
                return
            }
        }

        // 2. Detect cursor screen
        let mouseLocation = NSEvent.mouseLocation
        guard let cursorScreen = NSScreen.screens.first(where: { NSMouseInRect(mouseLocation, $0.frame, false) })
                ?? NSScreen.main else {
            abortStartup()
            return
        }

        // 3. Reset command-specific state from previous run (before new captures)
        resetCommandState()

        // 4. Capture all screens (subclass may override for command-specific capture).
        // Screens that failed to capture get no window: a frozen overlay with no screenshot is
        // just a black screen. If nothing was captured (no permission, ScreenCaptureKit timed
        // out), end the session instead of showing black overlays.
        let captures = captureAllScreens().filter { $0.image != nil }
        guard !captures.isEmpty else {
            abortStartup()
            return
        }

        // 5. Accessory activation policy
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        // 6. Cleanup old windows
        if runMode == .raycast {
            for oldWindow in windows {
                oldWindow.orderOut(nil)
                oldWindow.close()
            }
            windows.removeAll()
        } else {
            // Standalone: never close() old windows synchronously or deferred —
            // close() on old windows can re-trigger handleExit() via stale callbacks.
            // Just orderOut (already hidden from handleExit) and park in staleWindows.
            // ARC releases old stale windows when replaced by next session's stale set.
            for oldWindow in windows {
                oldWindow.orderOut(nil)
                // Nil out callbacks to prevent stale references
                if let overlay = oldWindow as? OverlayWindow {
                    overlay.onRequestExit = nil
                    overlay.onFirstMove = nil
                    overlay.onActivity = nil
                }
            }
            staleWindows = windows
            windows.removeAll()
        }
        activeWindow = nil
        firstMoveReceived = false

        // 7. Create one window per captured screen
        for capture in captures {
            let isCursorScreen = capture.screen === cursorScreen
            let window = createWindow(
                for: capture.screen,
                image: capture.image,
                isCursorScreen: isCursorScreen,
                hideHintBar: hideHintBar
            )
            wireCallbacks(for: window)
            windows.append(window)
        }

        // 8. Show all windows
        for window in windows {
            window.orderFrontRegardless()
            (window as? OverlayWindow)?.playLaunchWave()
        }

        // 9. Make cursor screen window key and show initial state
        guard let cw = windows.first(where: { ($0 as? OverlayWindowProtocol)?.targetScreen === cursorScreen })
                ?? windows.first else {
            abortStartup()
            return
        }
        cw.makeKey()
        (cw as? OverlayWindowProtocol)?.showInitialState()
        activeWindow = cw
        cursorWindow = cw

        // 10. Launch time, activate, signal handler, inactivity timer, run loop
        launchTime = CFAbsoluteTimeGetCurrent()
        NSApp.activate(ignoringOtherApps: true)
        setupSignalHandler()
        resetInactivityTimer()
        if runMode == .raycast {
            app.run()
        }
        // Standalone: returns immediately, AppDelegate's event loop continues
    }

    // MARK: - Overridable Methods (subclass hooks)

    /// Capture all screens in one ScreenCaptureKit batch. A nil image means that screen failed.
    /// Measure overrides to also build an EdgeDetector per screen from the same images.
    open func captureAllScreens() -> [(screen: NSScreen, image: CGImage?)] {
        let screens = NSScreen.screens
        return Array(zip(screens, ScreenCapture.captureScreens(screens)))
    }

    /// Create a window for the given screen. Subclasses MUST override.
    open func createWindow(for screen: NSScreen, image: CGImage?, isCursorScreen: Bool, hideHintBar: Bool) -> NSWindow {
        fatalError("Subclasses must override createWindow(for:image:isCursorScreen:hideHintBar:)")
    }

    /// Wire callbacks for common coordination events.
    /// Default wires onRequestExit, onFirstMove, onActivity.
    /// The onActivate callback is command-specific (typed to the window subclass),
    /// so subclasses override this to add onActivate and any additional callbacks.
    open func wireCallbacks(for window: NSWindow) {
        // Base does nothing — subclasses wire typed callbacks
    }

    /// Activate a window during multi-monitor cursor transitions.
    /// Default handles timer reset, guard, deactivate old, makeKey.
    /// AlignmentGuides overrides to pass currentStyle/currentDirection.
    open func activateWindow(_ window: NSWindow) {
        resetInactivityTimer()
        guard window !== activeWindow else { return }

        // Deactivate old window and reset its zoom to 1x
        (activeWindow as? OverlayWindowProtocol)?.deactivate()
        (activeWindow as? OverlayWindow)?.resetZoom()

        // Activate new window
        activeWindow = window
        window.makeKey()
    }

    /// Reset command-specific state between runs.
    /// AlignmentGuides overrides to reset currentStyle/currentDirection.
    open func resetCommandState() {
        // Default: no command-specific state to reset
    }

    // MARK: - Shared Methods (not overridden)

    /// End a session whose windows never appeared (permission abort, no screens, nothing captured).
    private func abortStartup() {
        isSessionActive = false
        OverlayCoordinator.anySessionActive = false
        onSessionEnd?()   // Reverts menu bar icon / hotkey session state
    }

    /// Clean exit: restore cursor, close all windows, terminate app (Raycast) or return (standalone).
    public func handleExit() {
        isSessionActive = false                     // synchronous first — allows instant re-invocation
        OverlayCoordinator.anySessionActive = false // cross-coordinator guard cleared
        CursorManager.shared.restore()
        inactivityTimer?.invalidate()
        inactivityTimer = nil
        sigTermSource?.cancel()
        sigTermSource = nil
        signal(SIGTERM, SIG_DFL)                    // SIG_IGN was only for the session's handler
        // Reset zoom on all windows before closing (SHUX-03)
        for window in windows {
            (window as? OverlayWindow)?.cancelLaunchWave()
            (window as? OverlayWindow)?.resetZoom()
        }
        for window in windows {
            window.orderOut(nil)                    // instant visual removal
        }
        activeWindow = nil
        cursorWindow = nil
        onSessionEnd?()                             // before terminate, which never returns
        if runMode == .raycast {
            for window in windows {
                window.close()
            }
            windows.removeAll()
            NSApp.terminate(nil)
        }
        // Standalone: windows stay in array (hidden via orderOut) to keep them retained
        // through the autorelease pool drain. The next run() call cleans them up.
    }

    /// Handle first mouse move: set flag, collapse hint bar after minimum display duration.
    public func handleFirstMove() {
        firstMoveReceived = true
        let elapsed = CFAbsoluteTimeGetCurrent() - launchTime
        let remaining = minExpandedDuration - elapsed
        if remaining > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + remaining) { [weak self] in
                (self?.cursorWindow as? OverlayWindowProtocol)?.collapseHintBar()
            }
        } else {
            (cursorWindow as? OverlayWindowProtocol)?.collapseHintBar()
        }
    }

    /// Install SIGTERM handler for clean cursor restoration on process kill.
    /// The signal is ignored (so the dispatch source receives it) only while a session runs;
    /// handleExit() restores the default disposition.
    public func setupSignalHandler() {
        sigTermSource?.cancel()
        signal(SIGTERM, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        source.setEventHandler { [weak self] in
            guard let self else { return }
            self.handleExit()               // Raycast mode terminates inside handleExit()
            if self.runMode == .standalone {
                NSApp.terminate(nil)        // A kill should quit the app, not just end the session
            }
        }
        source.resume()
        sigTermSource = source
    }

    /// Reset the 10-minute inactivity watchdog timer.
    public func resetInactivityTimer() {
        inactivityTimer?.invalidate()
        inactivityTimer = Timer.scheduledTimer(
            withTimeInterval: inactivityTimeout,
            repeats: false
        ) { [weak self] _ in
            self?.handleExit()
        }
    }
}
