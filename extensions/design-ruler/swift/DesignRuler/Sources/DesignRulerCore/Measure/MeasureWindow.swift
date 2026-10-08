import AppKit
import QuartzCore

/// Fullscreen overlay window for the Measure command.
/// Subclasses OverlayWindow for shared window config, tracking, throttle, hint bar, and ESC.
/// Contains only: edge detection, crosshair rendering, selection/drag lifecycle, arrow keys.
package final class MeasureWindow: OverlayWindow {
    private var edgeDetector: EdgeDetector!
    private var crosshairView: CrosshairView!
    private var selectionManager: SelectionManager!
    private var isDragging = false
    private var isHoveringSelection = false
    private var peekWorkItem: DispatchWorkItem?
    private var peekHomePan: CGPoint?   // cursor-tracking pan to return to while a peek is in flight
    private var peekGeneration = 0      // stale peek callbacks must not touch a newer peek's state

    // Typed callback for multi-monitor activation
    package var onActivate: ((MeasureWindow) -> Void)?

    /// Create a fullscreen measure window for the given screen
    package static func create(for screen: NSScreen, edgeDetector: EdgeDetector, hideHintBar: Bool, screenshot: CGImage? = nil) -> MeasureWindow {
        let window = MeasureWindow(
            contentRect: NSRect(origin: .zero, size: screen.frame.size),
            styleMask: .borderless,
            backing: .buffered,
            defer: false,
            screen: screen
        )
        OverlayWindow.configureOverlay(window, for: screen)
        window.edgeDetector = edgeDetector
        window.setupViews(screenFrame: screen.frame, edgeDetector: edgeDetector, hideHintBar: hideHintBar, screenshot: screenshot)
        window.setupTrackingArea()
        return window
    }

    private func setupViews(screenFrame: CGRect, edgeDetector: EdgeDetector, hideHintBar: Bool, screenshot: CGImage? = nil) {
        let size = screenFrame.size
        let containerView = NSView(frame: NSRect(origin: .zero, size: size))

        // Background view hosts the content layer (receives zoom transform).
        // UI elements (crosshairView, selection layers, hint bar) stay in containerView
        // above bgView so they remain at normal screen-space size when zoomed.
        setupContentLayer(screenshot: screenshot, screenSize: size)
        let bgView = NSView(frame: NSRect(origin: .zero, size: size))
        bgView.wantsLayer = true
        bgView.layer!.addSublayer(contentLayer!)
        contentLayer?.contentsScale = backingScaleFactor
        containerView.addSubview(bgView)

        let cv = CrosshairView(frame: NSRect(origin: .zero, size: size))
        cv.screenFrame = screenFrame
        self.crosshairView = cv
        containerView.addSubview(cv)

        let scale = backingScaleFactor
        self.selectionManager = SelectionManager(
            parentLayer: cv.layer!,
            edgeDetector: edgeDetector,
            scale: scale
        )

        contentView = containerView
        containerView.wantsLayer = true
        containerView.layer?.masksToBounds = false

        // Use base's shared hint bar setup (mode defaults to .inspect)
        setupHintBar(mode: .inspect, screenSize: size, screenshot: screenshot, hideHintBar: hideHintBar, container: containerView)
    }

    /// Set frozen screenshot as content layer contents (called by coordinator after capture).
    package func setBackground(_ cgImage: CGImage) {
        contentLayer?.contents = cgImage
    }

    package var hasSelections: Bool { selectionManager.hasSelections }

    // MARK: - Zoom Coordinate Helpers

    /// Convert window-space cursor to capture-space AppKit screen point for EdgeDetector.
    /// At 1x zoom, this is identity (capturePoint == windowPoint).
    private func captureScreenPoint(from windowPoint: NSPoint) -> NSPoint {
        let cp = windowPointToCapturePoint(windowPoint, zoomState: zoomState, screenSize: screenBounds.size)
        return NSPoint(x: screenBounds.origin.x + cp.x, y: screenBounds.origin.y + cp.y)
    }

    /// Convert window-space cursor to capture-space point (window-local).
    /// At 1x zoom, this is identity.
    private func capturePoint(from windowPoint: NSPoint) -> NSPoint {
        windowPointToCapturePoint(windowPoint, zoomState: zoomState, screenSize: screenBounds.size)
    }

    // MARK: - Peek Pan (Arrow Key Edge Skip While Zoomed)

    /// When an arrow key skip moves an edge outside the visible zoomed viewport,
    /// auto-pan to reveal the edge, hold briefly, then pan back to cursor.
    /// No-op at 1x zoom.
    private func peekToEdge(_ edges: DirectionalEdges, direction: EdgeDetector.Direction) {
        guard zoomState.isZoomed else { return }

        // Determine which edge to check based on skip direction
        let edge: EdgeHit?
        switch direction {
        case .left:   edge = edges.left
        case .right:  edge = edges.right
        case .top:    edge = edges.top
        case .bottom: edge = edges.bottom
        }
        guard let edgeHit = edge else { return }

        // "Home" is the cursor-tracking pan. A peek already in flight has moved panOffset away
        // from it, so measure the cursor and the edge against home, not the peeked view.
        let homePan = peekHomePan ?? zoomState.panOffset
        var homeState = zoomState
        homeState.panOffset = homePan

        // Edge position is in capture-space (distance from cursor).
        // Get the cursor in capture-space, then compute the edge's capture-space position.
        let cursorCapture = windowPointToCapturePoint(crosshairView.cursorPosition, zoomState: homeState, screenSize: screenBounds.size)
        let edgeCapturePos: CGFloat
        let isHorizontalAxis: Bool

        switch direction {
        case .left:
            edgeCapturePos = cursorCapture.x - edgeHit.distance
            isHorizontalAxis = true
        case .right:
            edgeCapturePos = cursorCapture.x + edgeHit.distance
            isHorizontalAxis = true
        case .top:
            edgeCapturePos = cursorCapture.y + edgeHit.distance  // AppKit: top = +y
            isHorizontalAxis = false
        case .bottom:
            edgeCapturePos = cursorCapture.y - edgeHit.distance  // AppKit: bottom = -y
            isHorizontalAxis = false
        }

        // Convert edge capture position to window-space to check visibility
        let edgeWindowPos: CGFloat
        let viewportSize: CGFloat
        let s = zoomState.level.rawValue

        if isHorizontalAxis {
            edgeWindowPos = (edgeCapturePos + homePan.x) * s
            viewportSize = screenBounds.width
        } else {
            edgeWindowPos = (edgeCapturePos + homePan.y) * s
            viewportSize = screenBounds.height
        }

        // Check if edge is within visible viewport (with small margin)
        let margin: CGFloat = 20
        guard edgeWindowPos < margin || edgeWindowPos > viewportSize - margin else { return }

        // Calculate pan offset that brings edge into view with margin
        var peekOffset = homePan

        if isHorizontalAxis {
            if edgeWindowPos < margin {
                // Edge is off-screen left: pan right so edge is at margin
                peekOffset.x = (margin / s) - edgeCapturePos
            } else {
                // Edge is off-screen right: pan left so edge is at viewportSize - margin
                peekOffset.x = ((viewportSize - margin) / s) - edgeCapturePos
            }
        } else {
            if edgeWindowPos < margin {
                // Edge is off-screen bottom
                peekOffset.y = (margin / s) - edgeCapturePos
            } else {
                // Edge is off-screen top
                peekOffset.y = ((viewportSize - margin) / s) - edgeCapturePos
            }
        }

        // Clamp the peek offset to valid bounds
        peekOffset = clampPanOffset(peekOffset, zoomLevel: zoomState.level, screenSize: screenBounds.size)

        // Replace any in-flight peek. The new generation stops the old peek's pending return and
        // completion from acting on this one (e.g. clearing isPeekAnimating mid-hold).
        peekWorkItem?.cancel()
        peekGeneration += 1
        let generation = peekGeneration

        // Phase 1: Pan out to edge, crosshair follows content
        isPeekAnimating = true
        peekHomePan = homePan
        zoomState.panOffset = peekOffset
        let peekDelta = CGPoint(x: (peekOffset.x - homePan.x) * s, y: (peekOffset.y - homePan.y) * s)
        CATransaction.animated(duration: DesignTokens.Animation.peekPan) {
            self.contentLayer?.transform = self.zoomState.contentTransform
            self.crosshairView.layer?.transform = CATransform3DMakeTranslation(peekDelta.x, peekDelta.y, 0)
        }

        // Phase 2: Hold, then Phase 3: Return (crosshair returns to screen-space)
        let returnItem = DispatchWorkItem { [weak self] in
            guard let self, self.isPeekAnimating, self.peekGeneration == generation else { return }
            self.zoomState.panOffset = homePan
            CATransaction.animated(duration: DesignTokens.Animation.peekReturn) {
                self.contentLayer?.transform = self.zoomState.contentTransform
                self.crosshairView.layer?.transform = CATransform3DIdentity
            }

            // Clear flag after return animation completes (unless a newer peek or a cancel took over)
            DispatchQueue.main.asyncAfter(deadline: .now() + DesignTokens.Animation.peekReturn) { [weak self] in
                guard let self, self.peekGeneration == generation else { return }
                self.isPeekAnimating = false
                self.peekHomePan = nil
                self.peekWorkItem = nil
            }
        }
        peekWorkItem = returnItem

        let holdDelay = DesignTokens.Animation.peekPan + DesignTokens.Animation.peekHold
        DispatchQueue.main.asyncAfter(deadline: .now() + holdDelay, execute: returnItem)
    }

    /// Cancel any in-flight peek animation and reset state.
    /// Puts the model pan back at home; the caller's pan update, zoom toggle or zoom reset
    /// applies the content transform.
    private func cancelPeek() {
        peekWorkItem?.cancel()
        peekWorkItem = nil
        peekGeneration += 1
        if let home = peekHomePan {
            zoomState.panOffset = home
        }
        peekHomePan = nil
        isPeekAnimating = false
        CATransaction.instant {
            crosshairView.layer?.transform = CATransform3DIdentity
        }
    }

    // MARK: - Overridable Hooks

    override package func handleActivation() {
        onActivate?(self)
    }

    override package func zoomDidChange() {
        selectionManager.updateZoom(zoomState)
    }

    override package func showZoomFallbackPill(level: ZoomLevel) {
        crosshairView.showZoomFlash(level: level, at: lastCursorPosition)
    }

    override package func showInitialState() {
        CursorManager.shared.hide()
        // Seed lastCursorPosition so a Z press before the first mouse move anchors the zoom at
        // the cursor instead of (0,0), the bottom-left corner.
        initCursorPosition()
        crosshairView.showInitialPill(at: lastCursorPosition)
        hintBarEntrance()
    }

    override package func cancelPanAnimations() {
        // Cancel any in-flight peek — user is taking over (mouse move or Z). Runs before the
        // base pan/zoom update, which peeks would otherwise block (isPeekAnimating) or fight.
        if isPeekAnimating {
            cancelPeek()
        }
    }

    override package func handleMouseMoved(to windowPoint: NSPoint) {
        // Convert window-space to capture-space for edge detection (MEAS-01)
        let appKitScreenPoint = captureScreenPoint(from: windowPoint)

        guard let edges = edgeDetector.onMouseMoved(at: appKitScreenPoint) else { return }

        // Selection hover state — hit-test in capture-space (selections store captureRect)
        let cp = capturePoint(from: windowPoint)
        if selectionManager.hasSelections, let _ = selectionManager.hitTest(cp) {
            if !isHoveringSelection {
                isHoveringSelection = true
                crosshairView.hideForDrag()
                CursorManager.shared.transitionToPointingHand()
            }
            selectionManager.updateHover(at: cp)
            return
        } else if isHoveringSelection {
            isHoveringSelection = false
            crosshairView.showAfterDrag()
            CursorManager.shared.transitionBack()
            selectionManager.updateHover(at: cp)
        }

        // cursor: windowPoint (screen-space for rendering position)
        // edges: capture-space distances
        // zoomScale: multiplier for visual edge positions
        crosshairView.update(cursor: windowPoint, edges: edges, zoomScale: zoomState.level.rawValue)
    }

    override package func handleKeyDown(with event: NSEvent) {
        let shift = event.modifierFlags.contains(.shift)
        let hintVisible = hintBarView.superview != nil
        let zs = zoomState.level.rawValue

        switch Int(event.keyCode) {
        case 123: // Left arrow
            if !event.isARepeat && hintVisible { hintBarView.pressKey(.left) }
            let edges = shift ? edgeDetector.decrementSkip(.right) : edgeDetector.incrementSkip(.left)
            if let edges {
                crosshairView.update(cursor: crosshairView.cursorPosition, edges: edges, zoomScale: zs)
                peekToEdge(edges, direction: shift ? .right : .left)
            }
        case 124: // Right arrow
            if !event.isARepeat && hintVisible { hintBarView.pressKey(.right) }
            let edges = shift ? edgeDetector.decrementSkip(.left) : edgeDetector.incrementSkip(.right)
            if let edges {
                crosshairView.update(cursor: crosshairView.cursorPosition, edges: edges, zoomScale: zs)
                peekToEdge(edges, direction: shift ? .left : .right)
            }
        case 125: // Down arrow
            if !event.isARepeat && hintVisible { hintBarView.pressKey(.down) }
            let edges = shift ? edgeDetector.decrementSkip(.top) : edgeDetector.incrementSkip(.bottom)
            if let edges {
                crosshairView.update(cursor: crosshairView.cursorPosition, edges: edges, zoomScale: zs)
                peekToEdge(edges, direction: shift ? .top : .bottom)
            }
        case 126: // Up arrow
            if !event.isARepeat && hintVisible { hintBarView.pressKey(.up) }
            let edges = shift ? edgeDetector.decrementSkip(.bottom) : edgeDetector.incrementSkip(.top)
            if let edges {
                crosshairView.update(cursor: crosshairView.cursorPosition, edges: edges, zoomScale: zs)
                peekToEdge(edges, direction: shift ? .bottom : .top)
            }
        default:
            break
        }
    }

    override package func deactivate() {
        cancelPeek()
        crosshairView.hideForDrag()
        if isHoveringSelection {
            isHoveringSelection = false
            CursorManager.shared.transitionBack()
            selectionManager.updateHover(at: .zero)
        }
        if isDragging {
            selectionManager.cancelDrag()
            isDragging = false
            CursorManager.shared.transitionBack()
        }
    }

    // MARK: - Multi-monitor Activation

    package func activate(firstMoveAlreadyReceived: Bool) {
        if firstMoveAlreadyReceived && !hasReceivedFirstMove {
            markFirstMoveReceived()
        }
        crosshairView.showAfterDrag()

        initCursorPosition()
        let wp = lastCursorPosition
        // Convert to capture-space for edge detection (MEAS-01)
        let sp = captureScreenPoint(from: wp)
        if let edges = edgeDetector.onMouseMoved(at: sp) {
            crosshairView.update(cursor: wp, edges: edges, zoomScale: zoomState.level.rawValue)
        }
        if hintBarView.superview != nil {
            hintBarView.updatePosition(cursorY: wp.y, screenHeight: screenBounds.height)
        }
    }

    // MARK: - Event Handling (Subclass-specific)

    // Route mouse events directly to the window, bypassing view hit-testing.
    // No subview in this overlay needs mouse events — handling them here
    // prevents views from silently consuming mouseDown (which caused an
    // intermittent bug where drags wouldn't start).
    override package func sendEvent(_ event: NSEvent) {
        switch event.type {
        case .leftMouseDown:  mouseDown(with: event)
        case .leftMouseDragged: mouseDragged(with: event)
        case .leftMouseUp:    mouseUp(with: event)
        default: super.sendEvent(event)
        }
    }

    override package func mouseDown(with event: NSEvent) {
        onActivity?()
        let windowPoint = event.locationInWindow
        let cp = capturePoint(from: windowPoint)

        // Reset stale drag state — if mouseUp was never delivered (e.g., system stole the event),
        // isDragging could be stuck true, preventing new drags from starting correctly
        if isDragging {
            isDragging = false
            crosshairView.showAfterDrag()
            CursorManager.shared.transitionBack()
        }

        // Click on a hovered selection -> remove it and restore crosshair (hit-test in capture-space)
        if let hovered = selectionManager.hitTest(cp), hovered.state == .hovered {
            selectionManager.removeSelection(hovered)
            if isHoveringSelection {
                isHoveringSelection = false
                CursorManager.shared.transitionBack()
            }
            // Restore crosshair at current position (edge detection in capture-space)
            crosshairView.showAfterDrag()
            let appKitScreenPoint = captureScreenPoint(from: windowPoint)
            if let edges = edgeDetector.onMouseMoved(at: appKitScreenPoint) {
                crosshairView.update(cursor: windowPoint, edges: edges, zoomScale: zoomState.level.rawValue)
            }
            return
        }

        // Start drag (in capture-space)
        isDragging = true
        if isHoveringSelection {
            isHoveringSelection = false
            CursorManager.shared.transitionBack()
        }
        crosshairView.hideForDrag()
        selectionManager.startDrag(at: cp)
        CursorManager.shared.transitionToCrosshairDrag()
    }

    override package func mouseDragged(with event: NSEvent) {
        onActivity?()
        if !isDragging { return }
        let windowPoint = event.locationInWindow
        selectionManager.updateDrag(to: capturePoint(from: windowPoint))
    }

    override package func mouseUp(with event: NSEvent) {
        onActivity?()
        if !isDragging { return }
        isDragging = false

        let windowPoint = event.locationInWindow
        _ = selectionManager.endDrag(at: capturePoint(from: windowPoint), screenBounds: screenBounds)

        // Restore crosshair at current cursor position (edge detection in capture-space)
        crosshairView.showAfterDrag()
        let appKitScreenPoint = captureScreenPoint(from: windowPoint)
        if let edges = edgeDetector.onMouseMoved(at: appKitScreenPoint) {
            crosshairView.update(cursor: windowPoint, edges: edges, zoomScale: zoomState.level.rawValue)
        }

        // Hide system cursor again (custom crosshair takes over)
        CursorManager.shared.transitionBack()
    }

    override package func keyUp(with event: NSEvent) {
        guard hintBarView.superview != nil else { return }
        switch Int(event.keyCode) {
        case 123: hintBarView.releaseKey(.left)
        case 124: hintBarView.releaseKey(.right)
        case 125: hintBarView.releaseKey(.down)
        case 126: hintBarView.releaseKey(.up)
        default: break
        }
    }

    override package func flagsChanged(with event: NSEvent) {
        guard hintBarView.superview != nil else { return }
        if event.modifierFlags.contains(.shift) {
            hintBarView.pressKey(.shift)
        } else {
            hintBarView.releaseKey(.shift)
        }
    }

}
