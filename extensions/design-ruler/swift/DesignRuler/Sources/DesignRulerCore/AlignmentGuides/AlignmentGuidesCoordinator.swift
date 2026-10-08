import AppKit

/// Coordinator subclass for the Alignment Guides overlay command.
///
/// Accessible from both RaycastBridge (via @raycast wrapper) and the standalone App target.
/// Manages global guide style and direction state across multi-monitor windows.
open class AlignmentGuidesCoordinator: OverlayCoordinator {
    public static let shared = AlignmentGuidesCoordinator()

    package private(set) var currentStyle: GuideLineStyle = .dynamic
    private var currentDirection: Direction = .vertical

    /// What the next session starts with. `run(hideHintBar:style:direction:)` sets them (the app and
    /// the Raycast bridge resume the last session's); the base `run(hideHintBar:)` keeps the defaults.
    private var startingStyle: GuideLineStyle = .dynamic
    private var startingDirection: Direction = .vertical

    /// The color in use, or the one the last session ended with (a `GuideLineStyle` raw value).
    public var styleName: String { currentStyle.rawValue }

    /// The direction in use, or the one the last session ended with ("vertical" / "horizontal").
    public var directionName: String { currentDirection.rawValue }

    /// Start a session with the given color and direction. Unknown names fall back to dynamic / vertical.
    public func run(hideHintBar: Bool, style: String, direction: String) {
        startingStyle = GuideLineStyle(rawValue: style) ?? .dynamic
        startingDirection = Direction(rawValue: direction) ?? .vertical
        // Also current now: a startup that aborts before resetCommandState() (no permission) still
        // fires onSessionEnd, and the bridges save styleName then; it must not save the type defaults
        // over a remembered color. A running session keeps its own: run() rejects this call.
        if !isSessionActive {
            currentStyle = startingStyle
            currentDirection = startingDirection
        }
        super.run(hideHintBar: hideHintBar)
    }

    override open func resetCommandState() {
        currentStyle = startingStyle
        currentDirection = startingDirection
    }

    override open func createWindow(for screen: NSScreen, image: CGImage?, isCursorScreen: Bool, hideHintBar: Bool) -> NSWindow {
        // Every window starts in the session's state: the cursor window gets showInitialState(),
        // never activate(), so it can't pick the style and direction up later.
        let window = AlignmentGuidesWindow.create(
            for: screen,
            screenshot: image,
            hideHintBar: isCursorScreen ? hideHintBar : true,
            style: currentStyle,
            direction: currentDirection
        )
        return window
    }

    override open func wireCallbacks(for window: NSWindow) {
        guard let guidesWindow = window as? AlignmentGuidesWindow else { return }

        // Standard 4 callbacks
        guidesWindow.onActivate = { [weak self] window in
            self?.activateWindow(window)
        }
        guidesWindow.onRequestExit = { [weak self] in
            self?.handleExit()
        }
        guidesWindow.onFirstMove = { [weak self] in
            self?.handleFirstMove()
        }
        guidesWindow.onActivity = { [weak self] in
            self?.resetInactivityTimer()
        }

        // AlignmentGuides-specific callbacks
        guidesWindow.onSpacebarPressed = { [weak self] in
            self?.handleSpacebar()
        }
        guidesWindow.onSpacebarReleased = { [weak self] in
            (self?.activeWindow as? AlignmentGuidesWindow)?.releaseSpaceKey()
        }
        guidesWindow.onTabPressed = { [weak self] in
            self?.handleTab()
        }
        guidesWindow.onTabReleased = { [weak self] in
            (self?.activeWindow as? AlignmentGuidesWindow)?.releaseTabKey()
        }
    }

    override open func activateWindow(_ window: NSWindow) {
        super.activateWindow(window)
        guard let guidesWindow = window as? AlignmentGuidesWindow else { return }
        guidesWindow.activate(
            firstMoveAlreadyReceived: firstMoveReceived,
            currentStyle: currentStyle,
            currentDirection: currentDirection
        )
    }

    // MARK: - Command-specific methods

    private func handleSpacebar() {
        guard let window = activeWindow as? AlignmentGuidesWindow else { return }
        window.performCycleStyle()
        currentStyle = window.currentGuideLineStyle
    }

    private func handleTab() {
        guard let window = activeWindow as? AlignmentGuidesWindow else { return }
        window.performToggleDirection()
        currentDirection = window.currentGuideLineDirection
    }
}
