import AppKit
import QuartzCore

/// Fullscreen overlay window for the Alignment Guides command.
/// Subclasses OverlayWindow for shared window config, tracking, throttle, hint bar, and ESC.
/// Contains only: guide line management, direction/style cycling, cursor direction state.
/// Cursor management via CursorManager (resize ↔ pointingHand).
package final class AlignmentGuidesWindow: OverlayWindow {
    private var guideLineManager: GuideLineManager!

    /// Read from the manager rather than mirrored, so it can't disagree with the preview line
    /// (a session may start horizontal).
    private var cursorDirection: Direction { guideLineManager.direction }

    // Typed callback for multi-monitor activation
    package var onActivate: ((AlignmentGuidesWindow) -> Void)?

    // Command-specific callbacks
    package var onSpacebarPressed: (() -> Void)?
    package var onSpacebarReleased: (() -> Void)?
    package var onTabPressed: (() -> Void)?
    package var onTabReleased: (() -> Void)?

    /// Create a fullscreen alignment guides window for the given screen, in the session's
    /// style and direction so the first frame (and the launch cursor) already match them.
    package static func create(for screen: NSScreen, screenshot: CGImage?, hideHintBar: Bool,
                               style: GuideLineStyle, direction: Direction) -> AlignmentGuidesWindow {
        let window = AlignmentGuidesWindow(
            contentRect: NSRect(origin: .zero, size: screen.frame.size),
            styleMask: .borderless,
            backing: .buffered,
            defer: false,
            screen: screen
        )
        OverlayWindow.configureOverlay(window, for: screen)
        window.setupViews(screenFrame: screen.frame, screenshot: screenshot, hideHintBar: hideHintBar)
        window.guideLineManager.setPreviewStyle(style)
        window.guideLineManager.setDirection(direction)
        window.setupTrackingArea()
        return window
    }

    private func setupViews(screenFrame: CGRect, screenshot: CGImage?, hideHintBar: Bool) {
        let size = screenFrame.size
        let containerView = NSView(frame: NSRect(origin: .zero, size: size))

        // Background view hosts the content layer (receives zoom transform).
        // UI elements (guidelineView, hint bar) stay in containerView above bgView
        // so they remain at normal screen-space size when zoomed.
        setupContentLayer(screenshot: screenshot, screenSize: size)
        let bgView = NSView(frame: NSRect(origin: .zero, size: size))
        bgView.wantsLayer = true
        bgView.layer!.addSublayer(contentLayer!)
        contentLayer?.contentsScale = backingScaleFactor
        containerView.addSubview(bgView)

        // Guideline view (transparent, no hit testing needed)
        let guidelineView = NSView(frame: NSRect(origin: .zero, size: size))
        guidelineView.wantsLayer = true
        containerView.addSubview(guidelineView)

        let scale = backingScaleFactor
        self.guideLineManager = GuideLineManager(
            parentLayer: guidelineView.layer!,
            scale: scale,
            screenSize: size
        )

        contentView = containerView

        // Use base's shared hint bar setup with alignment guides mode
        setupHintBar(mode: .alignmentGuides, screenSize: size, screenshot: screenshot, hideHintBar: hideHintBar, container: containerView)
    }

    // MARK: - Zoom Coordinate Helpers

    /// Convert window-space cursor to capture-space point (window-local).
    /// At 1x zoom, this is identity.
    private func capturePoint(from windowPoint: NSPoint) -> NSPoint {
        windowPointToCapturePoint(windowPoint, zoomState: zoomState, screenSize: screenBounds.size)
    }

    // MARK: - Coordinator-dispatched actions

    /// Cycle color style (called by coordinator on the active window).
    package func performCycleStyle() {
        if hintBarView.superview != nil { hintBarView.pressKey(.space) }
        guideLineManager.cycleStyle(windowPoint: lastCursorPosition)
    }

    package func releaseSpaceKey() {
        if hintBarView.superview != nil { hintBarView.releaseKey(.space) }
    }

    /// Toggle line direction (called by coordinator on the active window).
    package func performToggleDirection() {
        if hintBarView.superview != nil { hintBarView.pressKey(.tab) }
        guideLineManager.toggleDirection(windowPoint: lastCursorPosition)
        let newCursor: NSCursor = cursorDirection == .vertical ? .resizeLeftRight : .resizeUpDown
        CursorManager.shared.updateResize(newCursor)
    }

    package func releaseTabKey() {
        if hintBarView.superview != nil { hintBarView.releaseKey(.tab) }
    }

    package var currentGuideLineStyle: GuideLineStyle {
        guideLineManager.currentStyleValue
    }

    package var currentGuideLineDirection: Direction {
        guideLineManager.direction
    }

    // MARK: - Overridable Hooks

    override package var launchWaveStyle: LaunchWave.Style { .lines }

    override package func handleActivation() {
        onActivate?(self)
    }

    override package func showInitialState() {
        initCursorPosition()
        guideLineManager.updateForZoom(zoomState)
        guideLineManager.showPreview()
        let cp = capturePoint(from: lastCursorPosition)
        guideLineManager.updatePreview(capturePoint: cp, windowPoint: lastCursorPosition)
        let resizeCursor: NSCursor = cursorDirection == .vertical ? .resizeLeftRight : .resizeUpDown
        CursorManager.shared.showResize(resizeCursor)
        hintBarEntrance()
    }

    override package func handleMouseMoved(to windowPoint: NSPoint) {
        let wasHovering = guideLineManager.hasHoveredLine
        let cp = capturePoint(from: windowPoint)

        // Check hover first so preview knows whether to show "Remove" or coordinates
        guideLineManager.updateHover(at: cp)
        guideLineManager.updatePreview(capturePoint: cp, windowPoint: windowPoint)

        // Cursor transitions via CursorManager (only on state change)
        let isHovering = guideLineManager.hasHoveredLine
        if isHovering != wasHovering {
            if isHovering {
                CursorManager.shared.transitionToPointingHand()
            } else {
                CursorManager.shared.transitionBack()
            }
        }

        updateGuidesZoomPillPosition()
    }

    override package func handleKeyDown(with event: NSEvent) {
        switch Int(event.keyCode) {
        case 48: onTabPressed?()
        case 49: onSpacebarPressed?()
        default: break
        }
    }

    override package func zoomDidChange() {
        guideLineManager.updateForZoom(zoomState)
    }

    // MARK: - Zoom Fallback Pill

    private var zoomPillBg: CAShapeLayer?
    private var zoomPillText: CATextLayer?
    private var zoomPillWorkItem: DispatchWorkItem?
    private var zoomPillSize: CGSize = .zero

    override package func showZoomFallbackPill(level: ZoomLevel) {
        zoomPillWorkItem?.cancel()
        removeZoomPill()

        let text: String
        switch level {
        case .one:  text = "x1"
        case .two:  text = "x2"
        case .four: text = "x4"
        }

        guard let container = contentView, let parentLayer = container.layer else { return }
        let scale = backingScaleFactor

        let textAttr = NSAttributedString(string: text, attributes: [
            .font: PillRenderer.makeDesignFont(size: 12),
            .foregroundColor: NSColor.white,
            .kern: DesignTokens.Pill.kerning,
        ])
        let textSize = textAttr.size()
        let padding: CGFloat = 16
        let pillW = ceil(textSize.width) + padding
        let pillH = DesignTokens.Pill.height
        zoomPillSize = CGSize(width: pillW, height: pillH)

        // Position to the right of cursor
        let cursor = lastCursorPosition
        let pos = guidesZoomPillPosition(cursor: cursor, pillW: pillW, pillH: pillH)

        let bg = CAShapeLayer()
        bg.fillColor = DesignTokens.Pill.backgroundColor
        bg.strokeColor = nil
        bg.frame = CGRect(origin: pos, size: CGSize(width: pillW, height: pillH))
        bg.path = PillRenderer.squirclePath(
            rect: CGRect(origin: .zero, size: CGSize(width: pillW, height: pillH)),
            radius: DesignTokens.Pill.cornerRadius
        )
        bg.shadowColor = DesignTokens.Shadow.color
        bg.shadowOffset = DesignTokens.Shadow.offset
        bg.shadowRadius = DesignTokens.Shadow.radius
        bg.shadowOpacity = DesignTokens.Shadow.opacity
        bg.contentsScale = scale
        bg.opacity = 0
        parentLayer.addSublayer(bg)

        let tl = CATextLayer()
        tl.contentsScale = scale
        tl.truncationMode = .none
        tl.isWrapped = false
        tl.alignmentMode = .center
        tl.string = textAttr
        let textY = round(pos.y + (pillH - ceil(textSize.height)) / 2)
        tl.frame = CGRect(x: pos.x, y: textY, width: pillW, height: ceil(textSize.height))
        tl.opacity = 0
        parentLayer.addSublayer(tl)

        self.zoomPillBg = bg
        self.zoomPillText = tl

        CATransaction.animated(duration: DesignTokens.Animation.fast) {
            bg.opacity = 1
            tl.opacity = 1
        }

        let removeItem = DispatchWorkItem { [weak self] in
            self?.fadeAndRemoveZoomPill()
        }
        zoomPillWorkItem = removeItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: removeItem)
    }

    private func guidesZoomPillPosition(cursor: NSPoint, pillW: CGFloat, pillH: CGFloat) -> CGPoint {
        let gap: CGFloat = 6
        let vw = frame.width

        if cursorDirection == .vertical {
            // Vertical line: guide pill is to the right of line at cursor.x + 8, 60pt wide
            let guidePillEnd = cursor.x + 8 + 60
            let guidePillStart = cursor.x - 8 - 60
            let py = round(cursor.y - 12 - pillH)

            var px = round(guidePillEnd + gap)
            if px + pillW > vw - 6 {
                px = round(guidePillStart - gap - pillW)
            }
            if px < 6 { px = round(guidePillEnd + gap) }
            return CGPoint(x: px, y: py)
        } else {
            // Horizontal line: guide pill is above the line at cursor.x + 12, 60pt wide
            let guidePillEnd = cursor.x + 12 + 60
            let py = round(cursor.y - 12 - pillH)

            var px = round(guidePillEnd + gap)
            if px + pillW > vw - 6 {
                px = round(cursor.x - 12 - 60 - gap - pillW)
            }
            if px < 6 { px = round(guidePillEnd + gap) }
            return CGPoint(x: px, y: py)
        }
    }

    private func updateGuidesZoomPillPosition() {
        guard let bg = zoomPillBg, let tl = zoomPillText else { return }
        let pillW = zoomPillSize.width
        let pillH = zoomPillSize.height
        let pos = guidesZoomPillPosition(cursor: lastCursorPosition, pillW: pillW, pillH: pillH)
        CATransaction.instant {
            bg.frame = CGRect(origin: pos, size: CGSize(width: pillW, height: pillH))
            let textH = tl.frame.height
            tl.frame = CGRect(x: pos.x, y: round(pos.y + (pillH - textH) / 2), width: pillW, height: textH)
        }
    }

    private func fadeAndRemoveZoomPill() {
        guard let bg = zoomPillBg, let tl = zoomPillText else { return }
        CATransaction.animated(duration: DesignTokens.Animation.fast) {
            bg.opacity = 0
            tl.opacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignTokens.Animation.fast) { [weak self] in
            self?.removeZoomPill()
        }
    }

    private func removeZoomPill() {
        zoomPillBg?.removeFromSuperlayer()
        zoomPillText?.removeFromSuperlayer()
        zoomPillBg = nil
        zoomPillText = nil
    }

    override package func deactivate() {
        guideLineManager.hidePreview()
        if guideLineManager.hasHoveredLine {
            guideLineManager.updateHover(at: NSPoint(x: -100, y: -100))
            CursorManager.shared.transitionBack()
        }
    }

    // MARK: - Multi-monitor Activation

    package func activate(firstMoveAlreadyReceived: Bool, currentStyle: GuideLineStyle, currentDirection: Direction) {
        initCursorPosition()
        guideLineManager.setPreviewStyle(currentStyle)
        guideLineManager.setDirection(currentDirection)
        guideLineManager.updateForZoom(zoomState)
        let resizeCursor: NSCursor = cursorDirection == .vertical ? .resizeLeftRight : .resizeUpDown
        CursorManager.shared.updateResize(resizeCursor)
        guideLineManager.showPreview()
        let cp = capturePoint(from: lastCursorPosition)
        guideLineManager.updatePreview(capturePoint: cp, windowPoint: lastCursorPosition)
        if hintBarView.superview != nil {
            hintBarView.updatePosition(cursorY: lastCursorPosition.y, screenHeight: screenBounds.height)
        }
    }

    // MARK: - Event Handling (Subclass-specific)

    override package func sendEvent(_ event: NSEvent) {
        switch event.type {
        case .leftMouseDown: mouseDown(with: event)
        default: super.sendEvent(event)
        }
    }

    override package func mouseDown(with event: NSEvent) {
        onActivity?()
        let windowPoint = event.locationInWindow

        // Hover-first conflict resolution: if hovering a line, remove it instead of placing
        if let hoveredLine = guideLineManager.hoveredLine {
            guideLineManager.removeLine(hoveredLine)
            guideLineManager.resetRemoveMode()
            let cp = capturePoint(from: windowPoint)
            guideLineManager.updatePreview(capturePoint: cp, windowPoint: windowPoint)
            CursorManager.shared.transitionBack()
            return
        }

        guideLineManager.placeGuide()
    }

    override package func keyUp(with event: NSEvent) {
        switch Int(event.keyCode) {
        case 48: onTabReleased?()
        case 49: onSpacebarReleased?()
        default: break
        }
    }
}
