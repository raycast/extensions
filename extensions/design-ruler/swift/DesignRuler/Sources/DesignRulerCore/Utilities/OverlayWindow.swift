import AppKit
import QuartzCore

/// Base class for fullscreen overlay windows shared by both Measure and Alignment Guides.
///
/// Provides: shared NSWindow configuration (10 properties), tracking area setup,
/// hint bar creation/positioning/collapse, throttled mouse move with first-move detection,
/// ESC key handling, mouseEntered delegation, and zoom infrastructure (content layer,
/// Z key toggle, pan tracking, zoom reset).
///
/// Subclasses override hook methods (handleMouseMoved, handleKeyDown, handleActivation,
/// showInitialState, deactivate) for command-specific behavior.
package class OverlayWindow: NSWindow, OverlayWindowProtocol {
    package private(set) var targetScreen: NSScreen!
    package var hintBarView: HintBarView!
    package var screenBounds: CGRect = .zero
    private var lastMoveTime: Double = 0
    package private(set) var hasReceivedFirstMove = false
    package private(set) var lastCursorPosition: NSPoint = .zero

    // Zoom infrastructure (per-window, satisfies SHUX-02)
    package var zoomState = ZoomState()
    package var contentLayer: CALayer?
    private var isAnimatingZoom = false
    private var zoomAnimationGeneration = 0  // stale animation-end callbacks must not clear a newer zoom's flag
    package var isPeekAnimating = false
    private var launchWave: LaunchWave?

    // Callbacks for multi-monitor coordination
    package var onRequestExit: (() -> Void)?
    package var onFirstMove: (() -> Void)?
    package var onActivity: (() -> Void)?

    // MARK: - Shared Configuration

    /// Apply standard overlay window properties. Called by subclass `create()` factories
    /// immediately after NSWindow init.
    package static func configureOverlay(_ window: OverlayWindow, for screen: NSScreen) {
        window.setFrame(screen.frame, display: false)
        window.targetScreen = screen
        window.screenBounds = screen.frame
        window.level = .statusBar
        window.isOpaque = true
        window.hasShadow = false
        window.backgroundColor = .black
        window.acceptsMouseMovedEvents = true
        window.ignoresMouseEvents = false
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    }

    // MARK: - Tracking Area

    package func setupTrackingArea() {
        guard let cv = contentView else { return }
        // `.cursorUpdate` enables cursorUpdate(with:) callbacks — without it, the system
        // would apply its own cursor logic and our CursorManager state would be overridden.
        let area = NSTrackingArea(
            rect: cv.bounds,
            options: [.mouseEnteredAndExited, .cursorUpdate, .activeAlways],
            owner: self, userInfo: nil
        )
        cv.addTrackingArea(area)
    }

    /// Take over cursor management from the system. With `.cursorUpdate` on the tracking
    /// area, the system calls this instead of applying its own cursor logic. Not calling
    /// super is intentional — it prevents the system from resetting our managed cursor.
    override package func cursorUpdate(with event: NSEvent) {
        CursorManager.shared.applyCursor()
    }

    // MARK: - Hint Bar

    /// Collapse the hint bar from expanded to compact keycap-only layout.
    package func collapseHintBar() {
        guard hintBarView.superview != nil else { return }
        hintBarView.animateToCollapsed()
    }

    /// Create and configure the hint bar. Parameterized by mode so both commands share one path.
    /// Critical: setMode() MUST be called BEFORE configure() per CLAUDE.md.
    package func setupHintBar(mode: HintBarMode, screenSize: CGSize, screenshot: CGImage?, hideHintBar: Bool, container: NSView) {
        let hv = HintBarView(frame: .zero)
        self.hintBarView = hv
        if !hideHintBar {
            if mode != .inspect { hv.setMode(mode) }
            hv.configure(screenWidth: screenSize.width, screenHeight: screenSize.height, screenshot: screenshot)
            container.addSubview(hv)
        }
    }

    /// Show hint bar entrance animation.
    package func hintBarEntrance() {
        if hintBarView.superview != nil { hintBarView.animateEntrance() }
    }

    // MARK: - Background

    /// Set frozen screenshot as background using CALayer (bypasses NSImage DPI scaling).
    package func setBackground(_ cgImage: CGImage, below referenceView: NSView) {
        guard let container = contentView else { return }
        let bgView = NSView(frame: NSRect(origin: .zero, size: screenBounds.size))
        bgView.wantsLayer = true
        bgView.layer?.contents = cgImage
        bgView.layer?.contentsGravity = .resize
        container.addSubview(bgView, positioned: .below, relativeTo: referenceView)
    }

    // MARK: - Zoom Content Layer

    /// Create the content layer that holds the screenshot and receives zoom transforms.
    /// Subclasses call this during setupViews, then add contentLayer as a sublayer of their
    /// background view. UI elements (crosshair, pills, hint bar, guide lines) stay outside
    /// the content layer so they remain at normal screen-space size.
    package func setupContentLayer(screenshot: CGImage?, screenSize: CGSize) {
        let layer = CALayer()
        // anchorPoint MUST be (0,0) — all zoom math (panOffsetForZoom, clampPanOffset,
        // contentTransform) assumes origin-based scaling. Default (0.5, 0.5) would scale
        // from center, breaking cursor anchoring and pan clamping.
        layer.anchorPoint = CGPoint(x: 0, y: 0)
        layer.bounds = NSRect(origin: .zero, size: screenSize)
        layer.position = .zero
        layer.contentsGravity = .resize
        layer.magnificationFilter = .nearest  // Crisp pixels at 2x/4x
        layer.minificationFilter = .nearest
        if let img = screenshot {
            layer.contents = img
        }
        self.contentLayer = layer
    }

    // MARK: - Launch Wave

    /// Play the launch wave over the screenshot, spreading from the cursor. Called by the coordinator
    /// on every window as it is shown: on the other screens the wave sweeps in from the cursor's
    /// side. Skipped with Reduce Motion.
    package func playLaunchWave() {
        guard !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion, let contentLayer else { return }
        cancelLaunchWave()
        let mouse = NSEvent.mouseLocation
        let origin = CGPoint(x: mouse.x - screenBounds.origin.x, y: mouse.y - screenBounds.origin.y)
        let wave = LaunchWave(style: launchWaveStyle)
        launchWave = wave
        wave.start(in: contentLayer, origin: origin, scale: backingScaleFactor)
    }

    /// The wave's marks. Measure keeps the dots; Alignment Guides overrides with grid lines.
    package var launchWaveStyle: LaunchWave.Style { .dots }

    /// Remove the wave immediately. Called on exit.
    package func cancelLaunchWave() {
        launchWave?.cancel()
        launchWave = nil
    }

    // MARK: - Zoom

    /// Toggle zoom level: 1x -> 2x -> 4x -> 1x. Called on Z key press.
    /// Animates the transform change with 0.25s easeOut (ZOOM-01, ZOOM-02, ZOOM-03).
    package func handleZoomToggle() {
        // Drop in-flight pan animations (Measure's peek) first: the new pan is computed from
        // the cursor-tracking pan, not from a peeked one.
        cancelPanAnimations()
        let newLevel = zoomState.level.next()
        let cursorPoint = lastCursorPosition
        let screenSize = screenBounds.size

        // Calculate pan offset that keeps cursor fixed on screen
        let newPanOffset = panOffsetForZoom(
            cursorWindowPoint: cursorPoint,
            currentZoom: zoomState,
            newLevel: newLevel,
            screenSize: screenSize
        )
        let clampedPan = clampPanOffset(newPanOffset, zoomLevel: newLevel, screenSize: screenSize)

        zoomState.level = newLevel
        zoomState.panOffset = clampedPan

        // Animate the transform change (0.25s easeOut per locked decision)
        guard let cl = contentLayer else { return }
        isAnimatingZoom = true
        zoomAnimationGeneration += 1
        let generation = zoomAnimationGeneration
        CATransaction.animated(duration: DesignTokens.Animation.zoom) {
            cl.transform = zoomState.contentTransform
        }
        // Clear animation flag after duration, unless a newer Z press restarted the animation
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignTokens.Animation.zoom) { [weak self] in
            guard let self, self.zoomAnimationGeneration == generation else { return }
            self.isAnimatingZoom = false
        }

        zoomDidChange()
    }

    /// Update pan offset so the cursor tracks 1:1 while zoomed (ZOOM-04).
    /// Called on mouse move before handleMouseMoved. Suppressed during zoom animation.
    package func updateZoomPan(for windowPoint: NSPoint) {
        guard zoomState.isZoomed, !isAnimatingZoom, !isPeekAnimating else { return }
        // 1:1 cursor tracking: the cursor at windowPoint should map to the same
        // capture-space point as it would at 1x (i.e., windowPoint itself).
        let capturePoint = windowPoint  // At 1x, window coords = capture coords
        let s = zoomState.level.rawValue
        let newPanX = (windowPoint.x / s) - capturePoint.x
        let newPanY = (windowPoint.y / s) - capturePoint.y
        zoomState.panOffset = clampPanOffset(
            CGPoint(x: newPanX, y: newPanY),
            zoomLevel: zoomState.level,
            screenSize: screenBounds.size
        )
        CATransaction.instant {
            contentLayer?.transform = zoomState.contentTransform
        }

        zoomDidChange()
    }

    /// Animate pan offset to a specific value. Used by peek pan (MeasureWindow) for
    /// smooth pan-out and pan-back phases.
    package func animatePanOffset(to newOffset: CGPoint, duration: CFTimeInterval) {
        zoomState.panOffset = newOffset
        CATransaction.animated(duration: duration) {
            contentLayer?.transform = zoomState.contentTransform
        }
    }

    /// Reset zoom to 1x immediately. Called on ESC exit and monitor transitions.
    package func resetZoom() {
        guard zoomState.isZoomed else { return }
        zoomState.reset()
        CATransaction.instant {
            contentLayer?.transform = CATransform3DIdentity
        }
        isAnimatingZoom = false
        zoomDidChange()  // selections / guide lines re-project to 1x (e.g. after a monitor switch)
    }

    // MARK: - Window Properties

    override package var canBecomeKey: Bool { true }
    override package var canBecomeMain: Bool { true }

    // MARK: - Event Handling

    override package func mouseEntered(with event: NSEvent) {
        handleActivation()
    }

    override package func mouseMoved(with event: NSEvent) {
        let now = CACurrentMediaTime()
        guard now - lastMoveTime >= 0.014 else { return }
        lastMoveTime = now
        onActivity?()

        if !hasReceivedFirstMove {
            hasReceivedFirstMove = true
            onFirstMove?()
        }

        let windowPoint = event.locationInWindow
        lastCursorPosition = windowPoint

        // Pan BEFORE the subclass converts windowPoint to capture space. With the previous
        // frame's pan, detection and hit-testing land (zoom - 1) x the mouse delta off the cursor.
        cancelPanAnimations()
        updateZoomPan(for: windowPoint)
        handleMouseMoved(to: windowPoint)

        if hintBarView.superview != nil {
            hintBarView.updatePosition(cursorY: windowPoint.y, screenHeight: screenBounds.height)
        }
    }

    override package func keyDown(with event: NSEvent) {
        onActivity?()
        if Int(event.keyCode) == 53 { // ESC
            if hintBarView.superview != nil { hintBarView.pressKey(.esc) }
            onRequestExit?()
            return
        }
        if OverlayWindow.isZoomKey(event) { // Z — zoom toggle (shared infrastructure)
            guard !event.isARepeat else { return }  // holding Z must not keep cycling levels
            if hintBarView.superview != nil { hintBarView.pressKey(.zoom) }
            handleZoomToggle()
            if hintBarView.superview != nil {
                hintBarView.flashZoomLevel(zoomState.level)
            } else {
                showZoomFallbackPill(level: zoomState.level)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.hintBarView.releaseKey(.zoom)
            }
            return
        }
        handleKeyDown(with: event)
    }

    /// Z by the character it types, not its key position, so it follows AZERTY/QWERTZ layouts
    /// (keyCode 6 is W on AZERTY, Y on QWERTZ). Layouts without Latin letters fall back to the
    /// ANSI Z position.
    private static func isZoomKey(_ event: NSEvent) -> Bool {
        guard let scalars = event.charactersIgnoringModifiers?.lowercased().unicodeScalars,
              scalars.count == 1, let scalar = scalars.first else { return false }
        return scalar.isASCII ? scalar == "z" : event.keyCode == 6
    }

    // MARK: - Subclass Helpers

    /// Mark first move as received. For subclass activation paths where a sibling window
    /// already processed the first move.
    package func markFirstMoveReceived() {
        hasReceivedFirstMove = true
    }

    /// Initialize lastCursorPosition from current mouse location (window-local coords).
    /// Used by subclasses in showInitialState/activate to avoid (0,0) artifacts.
    package func initCursorPosition() {
        let mouse = NSEvent.mouseLocation
        lastCursorPosition = NSPoint(
            x: mouse.x - screenBounds.origin.x,
            y: mouse.y - screenBounds.origin.y
        )
    }

    // MARK: - Overridable Hooks

    /// Called on mouseEntered. Subclasses override to call their typed onActivate callback.
    package func handleActivation() {
        // Subclasses override to call their typed onActivate callback
    }

    /// Called before the zoom pan changes: on mouseMoved before the pan update, and at the start
    /// of handleZoomToggle. Subclasses override to cancel in-flight pan animations (e.g. Measure's
    /// peek pan) that would otherwise block or fight it.
    package func cancelPanAnimations() {
        // Subclasses override to cancel pan animations the user is taking over from
    }

    /// Called on mouseMoved after throttle, first-move detection, cursor position tracking,
    /// and the zoom pan update. Hint bar positioning runs AFTER this.
    package func handleMouseMoved(to windowPoint: NSPoint) {
        // Subclasses override for command-specific mouse move handling
    }

    /// Called on keyDown for all non-ESC keys.
    package func handleKeyDown(with event: NSEvent) {
        // Subclasses override for command-specific key handling
    }

    /// Show command-specific initial state on launch.
    package func showInitialState() {
        // Subclasses override for command-specific initial state
    }

    /// Deactivate this window when cursor leaves for another screen.
    package func deactivate() {
        // Subclasses override for command-specific deactivation
    }

    /// Called after zoom level or pan offset changes (from handleZoomToggle and updateZoomPan).
    /// Subclasses override to react to zoom changes (e.g., reposition selections).
    package func zoomDidChange() {
        // Subclasses override for zoom-change reactions
    }

    /// Show a brief fallback zoom pill near the cursor when hint bar is hidden.
    /// Subclasses override to provide command-specific positioning.
    package func showZoomFallbackPill(level: ZoomLevel) {
        // Subclasses override for command-specific fallback pill
    }
}
