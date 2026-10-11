import AppKit
import SwiftUI
import QuartzCore

/// Thin NSView wrapper that hosts SwiftUI hint bar content.
/// Handles frame positioning and slide animation; all rendering is in HintBarContent.
package final class HintBarView: NSView {
    // MARK: - Public key identifiers

    package enum KeyID: Hashable, CaseIterable {
        case up, down, left, right, shift, esc, tab, space, zoom
    }

    package enum BarState {
        case expanded   // full text + keycaps (default, shown on launch)
        case collapsed  // keycaps only, two separate bars
    }

    // MARK: - State & hosting

    private let state = HintBarState()

    // Morph path (macOS 26+): single SwiftUI hosting view with GlassEffectContainer
    private var morphHostingView: NSView?  // NSHostingView<HintBarGlassRoot>, type-erased
    private var isMorphPath = false

    // Fallback path (pre-macOS 26): three AppKit glass panels
    private var glassPanel: NSView?
    private var hostingView: NSHostingView<HintBarContent>?
    private var leftCollapsedPanel: NSView?
    private var leftHostingView: NSView?  // Can be either CollapsedLeftContent or CollapsedAlignmentGuidesLeftContent
    private var rightCollapsedPanel: NSView?
    private var rightHostingView: NSHostingView<CollapsedRightContent>?
    private var escTintLayer = CALayer()

    package private(set) var currentBarState: BarState = .expanded

    // MARK: - Animation

    private let barMargin: CGFloat = 24
    private let topMargin: CGFloat = 56
    private var isAtBottom = true
    private var isAnimating = false
    private var isAnimatingCollapse = false

    // MARK: - Adaptive appearance

    private var bottomIsLight = false
    private var topIsLight = false

    // MARK: - Init

    override package init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        setupHostingView()
    }

    package required init?(coder: NSCoder) {
        super.init(coder: coder)
        wantsLayer = true
        setupHostingView()
    }

    private func setupHostingView() {
        if #available(macOS 26.0, *) {
            setupMorphPath()
        } else {
            setupFallbackPath()
        }
    }

    @available(macOS 26.0, *)
    private func setupMorphPath() {
        isMorphPath = true
        let root = HintBarGlassRoot(state: state)
        let hosting = NSHostingView(rootView: root)
        hosting.autoresizingMask = [.width, .height]
        addSubview(hosting)
        self.morphHostingView = hosting
    }

    private func setupFallbackPath() {
        // Expanded panel (default visible)
        let glass = makeGlassPanel()
        self.glassPanel = glass
        addSubview(glass)

        let content = HintBarContent(state: state)
        let hosting = NSHostingView(rootView: content)
        hosting.autoresizingMask = [.width, .height]
        glass.addSubview(hosting)
        self.hostingView = hosting

        // Left collapsed panel (mode-dependent content)
        let leftGlass = makeGlassPanel(cornerRadius: 14)
        self.leftCollapsedPanel = leftGlass
        addSubview(leftGlass)

        let leftContent = makeCollapsedLeftContent()
        leftGlass.addSubview(leftContent)
        self.leftHostingView = leftContent

        // Right collapsed panel (ESC)
        let rightGlass = makeGlassPanel(cornerRadius: 14)
        self.rightCollapsedPanel = rightGlass
        addSubview(rightGlass)

        let rightContent = NSHostingView(rootView: CollapsedRightContent(state: state))
        rightContent.autoresizingMask = [.width, .height]
        rightGlass.addSubview(rightContent)
        self.rightHostingView = rightContent

        // ESC tint overlay on right panel
        setupEscTint()

        // Start with collapsed panels hidden (expanded is default)
        leftGlass.isHidden = true
        rightGlass.isHidden = true
    }

    /// Collapsed left panel content for the current mode. The two modes use different SwiftUI
    /// view types, so switching mode means swapping the hosting view (see setMode).
    private func makeCollapsedLeftContent() -> NSView {
        let content: NSView
        if state.mode == .alignmentGuides {
            content = NSHostingView(rootView: CollapsedAlignmentGuidesLeftContent(state: state))
        } else {
            content = NSHostingView(rootView: CollapsedLeftContent(state: state))
        }
        content.autoresizingMask = [.width, .height]
        return content
    }

    private func makeGlassPanel(cornerRadius: CGFloat = 14) -> NSView {
        if #available(macOS 26.0, *) {
            let glass = NSGlassEffectView()
            glass.cornerRadius = cornerRadius
            return glass
        } else {
            let vev = NSVisualEffectView()
            vev.blendingMode = .withinWindow
            vev.material = .hudWindow
            vev.state = .active
            vev.wantsLayer = true
            vev.layer?.cornerRadius = cornerRadius
            vev.layer?.cornerCurve = .continuous
            vev.layer?.masksToBounds = true
            return vev
        }
    }

    // MARK: - Hit testing (pass all events through to the window)

    override package func hitTest(_ point: NSPoint) -> NSView? { nil }

    override package func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            applyAppearance(isLight: isAtBottom ? bottomIsLight : topIsLight)
        }
    }

    // MARK: - Public API: key press/release

    package func pressKey(_ key: KeyID) { state.pressedKeys.insert(key) }
    package func releaseKey(_ key: KeyID) { state.pressedKeys.remove(key) }

    // MARK: - Public API: zoom flash

    package func flashZoomLevel(_ level: ZoomLevel) {
        state.flashZoomLevel(level)
    }

    // MARK: - Public API: mode setting

    package func setMode(_ mode: HintBarMode) {
        state.mode = mode
        // Fallback path (pre-macOS 26): init built the collapsed left content for the default
        // mode, and it doesn't react to state.mode, so rebuild it. configure() sizes it after.
        if !isMorphPath, let leftGlass = leftCollapsedPanel {
            leftHostingView?.removeFromSuperview()
            let leftContent = makeCollapsedLeftContent()
            leftGlass.addSubview(leftContent)
            leftHostingView = leftContent
        }
    }

    // MARK: - Public API: bar state

    package func setBarState(_ newState: BarState) {
        guard newState != currentBarState else { return }
        currentBarState = newState

        if isMorphPath {
            state.isCollapsed = (newState == .collapsed)
        } else {
            switch newState {
            case .expanded:
                glassPanel?.isHidden = false
                leftCollapsedPanel?.isHidden = true
                rightCollapsedPanel?.isHidden = true
            case .collapsed:
                glassPanel?.isHidden = true
                leftCollapsedPanel?.isHidden = false
                rightCollapsedPanel?.isHidden = false
            }
        }
    }

    // MARK: - Public API: collapse animation

    /// Animate from expanded to collapsed state.
    /// On macOS 26+, triggers a liquid glass morph via SwiftUI GlassEffectContainer.
    /// On older systems, crossfades to the collapsed panels as they slide in from the bar's edges.
    package func animateToCollapsed(duration: TimeInterval = DesignTokens.Animation.collapse) {
        guard currentBarState == .expanded else { return }
        guard !isAnimatingCollapse else { return }
        isAnimatingCollapse = true

        // Accessibility: instant toggle if reduce motion is enabled
        if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
            collapseInstantly()
            return
        }

        if isMorphPath {
            animateToCollapsedMorph()
        } else {
            animateToCollapsedFallback(duration: duration)
        }
    }

    private func collapseInstantly() {
        setBarState(.collapsed)
        isAnimatingCollapse = false
    }

    private func animateToCollapsedMorph() {
        guard #available(macOS 26.0, *) else { return }
        currentBarState = .collapsed
        withAnimation(.bouncy(duration: 0.6)) {
            state.isCollapsed = true
        } completion: { [weak self] in
            self?.isAnimatingCollapse = false
        }
    }

    /// Crossfade with an inward slide: the collapsed panels start at the expanded bar's outer
    /// edges and slide to their resting positions, so the bar reads as shrinking to the center.
    /// Uses explicit layer animations; the panels' model values are already final.
    private func animateToCollapsedFallback(duration: TimeInterval) {
        guard let expanded = glassPanel, let left = leftCollapsedPanel, let right = rightCollapsedPanel,
              let expandedLayer = expanded.layer, let leftLayer = left.layer, let rightLayer = right.layer else {
            return collapseInstantly()
        }

        let leftOffset = expanded.frame.minX - left.frame.minX
        let rightOffset = expanded.frame.maxX - right.frame.maxX
        let easeOut = CAMediaTimingFunction(name: .easeOut)

        func slideIn(from offset: CGFloat) -> CAAnimationGroup {
            let slide = CABasicAnimation(keyPath: "transform.translation.x")
            slide.fromValue = offset
            slide.toValue = 0
            let fade = CABasicAnimation(keyPath: "opacity")
            fade.fromValue = 0
            fade.toValue = 1
            let group = CAAnimationGroup()
            group.animations = [slide, fade]
            group.duration = duration
            group.timingFunction = easeOut
            return group
        }

        let fadeOut = CABasicAnimation(keyPath: "opacity")
        fadeOut.fromValue = 1
        fadeOut.toValue = 0
        fadeOut.duration = duration * 0.6  // expanded bar clears early so the two layouts don't overlap
        fadeOut.timingFunction = easeOut
        fadeOut.fillMode = .forwards
        fadeOut.isRemovedOnCompletion = false

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            guard let self else { return }
            expanded.isHidden = true
            expandedLayer.removeAnimation(forKey: "collapseFade")
            self.currentBarState = .collapsed
            self.isAnimatingCollapse = false
        }
        left.isHidden = false
        right.isHidden = false
        leftLayer.add(slideIn(from: leftOffset), forKey: "collapseSlide")
        rightLayer.add(slideIn(from: rightOffset), forKey: "collapseSlide")
        expandedLayer.add(fadeOut, forKey: "collapseFade")
        CATransaction.commit()
    }

    // MARK: - Launch entrance animation

    /// Animate the hint bar in with scale + slide up + fade.
    package func animateEntrance() {
        guard let layer = self.layer else { return }
        if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion { return }

        let scaleAnim = CABasicAnimation(keyPath: "transform")
        let cx = layer.bounds.width / 2
        let cy = layer.bounds.height / 2
        let s: CGFloat = 0.92
        var fromTransform = CATransform3DIdentity
        fromTransform = CATransform3DTranslate(fromTransform, cx, cy, 0)
        fromTransform = CATransform3DScale(fromTransform, s, s, 1)
        fromTransform = CATransform3DTranslate(fromTransform, -cx, -cy, 0)
        scaleAnim.fromValue = NSValue(caTransform3D: fromTransform)

        let slideAnim = CABasicAnimation(keyPath: "position.y")
        slideAnim.fromValue = layer.position.y - 15

        let fadeAnim = CABasicAnimation(keyPath: "opacity")
        fadeAnim.fromValue = 0

        let group = CAAnimationGroup()
        group.animations = [scaleAnim, slideAnim, fadeAnim]
        group.duration = DesignTokens.Animation.collapse
        group.timingFunction = CAMediaTimingFunction(controlPoints: 0.23, 1, 0.32, 1)
        group.isRemovedOnCompletion = true

        layer.add(group, forKey: "hintBarEntrance")
    }

    // MARK: - Position & animation

    /// Compute layout and set initial frame at bottom center.
    package func configure(screenWidth: CGFloat, screenHeight: CGFloat, screenshot: CGImage? = nil) {
        if isMorphPath {
            configureMorph(screenWidth: screenWidth, screenHeight: screenHeight, screenshot: screenshot)
        } else {
            configureFallback(screenWidth: screenWidth, screenHeight: screenHeight, screenshot: screenshot)
        }
    }

    private func configureMorph(screenWidth: CGFloat, screenHeight: CGFloat, screenshot: CGImage?) {
        guard let hosting = morphHostingView else { return }
        let contentHeight: CGFloat = 48

        frame = NSRect(x: 0, y: barMargin, width: screenWidth, height: contentHeight)
        hosting.frame = bounds

        isAtBottom = true

        // Sample brightness at both bar positions
        if let image = screenshot {
            let contentSize = hosting.fittingSize
            let scale = CGFloat(image.width) / screenWidth
            let sampleW = contentSize.width * scale
            let sampleH = contentHeight * scale
            let sampleX = floor(CGFloat(image.width - Int(sampleW)) / 2)

            let bottomY = CGFloat(image.height) - (barMargin + contentHeight) * scale
            bottomIsLight = regionIsLight(image, x: sampleX, y: bottomY, w: sampleW, h: sampleH)

            let topY = topMargin * scale
            topIsLight = regionIsLight(image, x: sampleX, y: topY, w: sampleW, h: sampleH)
        }

        applyAppearance(isLight: bottomIsLight)
    }

    private func configureFallback(screenWidth: CGFloat, screenHeight: CGFloat, screenshot: CGImage?) {
        guard let hosting = hostingView, let glass = glassPanel else { return }
        let expandedSize = hosting.fittingSize

        // Container spans full screen width; height is tallest panel
        var maxHeight = expandedSize.height

        // Compute collapsed layout
        if let leftHosting = leftHostingView, let rightHosting = rightHostingView {
            let leftSize = leftHosting.fittingSize
            let rightSize = rightHosting.fittingSize
            maxHeight = max(maxHeight, max(leftSize.height, rightSize.height))
        }

        frame = NSRect(x: 0, y: barMargin, width: screenWidth, height: maxHeight)

        // Center expanded panel within container
        let expandedX = floor((screenWidth - expandedSize.width) / 2)
        glass.frame = NSRect(x: expandedX, y: 0, width: expandedSize.width, height: expandedSize.height)
        hosting.frame = glass.bounds

        // Center collapsed panels within container
        let gap: CGFloat = 4
        if let leftHosting = leftHostingView, let leftGlass = leftCollapsedPanel,
           let rightHosting = rightHostingView, let rightGlass = rightCollapsedPanel {
            let leftSize = leftHosting.fittingSize
            let rightSize = rightHosting.fittingSize
            let totalWidth = leftSize.width + gap + rightSize.width
            let startX = floor((screenWidth - totalWidth) / 2)

            leftGlass.frame = NSRect(x: startX, y: 0, width: leftSize.width, height: leftSize.height)
            leftHosting.frame = leftGlass.bounds

            rightGlass.frame = NSRect(x: startX + leftSize.width + gap, y: 0, width: rightSize.width, height: rightSize.height)
            rightHosting.frame = rightGlass.bounds
            escTintLayer.frame = rightGlass.bounds
        }

        isAtBottom = true

        // Sample brightness at both bar positions
        if let image = screenshot {
            let scale = CGFloat(image.width) / screenWidth
            let sampleW = expandedSize.width * scale
            let sampleH = expandedSize.height * scale
            let sampleX = floor(CGFloat(image.width - Int(sampleW)) / 2)

            // Bottom position (CG coords: y increases downward, bottom of screen = large y)
            let bottomY = CGFloat(image.height) - (barMargin + expandedSize.height) * scale
            bottomIsLight = regionIsLight(image, x: sampleX, y: bottomY, w: sampleW, h: sampleH)

            // Top position (CG coords: top of screen = small y)
            let topY = topMargin * scale
            topIsLight = regionIsLight(image, x: sampleX, y: topY, w: sampleW, h: sampleH)
        }

        applyAppearance(isLight: bottomIsLight)
    }

    package func updatePosition(cursorY: CGFloat, screenHeight: CGFloat) {
        // Block position updates during collapse animation to prevent overlap
        guard !isAnimatingCollapse else { return }

        let viewH = bounds.height
        let nearBottom = cursorY < viewH + barMargin * 3
        let shouldBeAtTop = nearBottom

        if shouldBeAtTop && !isAtBottom { return }
        if !shouldBeAtTop && isAtBottom { return }
        guard !isAnimating else { return }

        let finalY: CGFloat
        if shouldBeAtTop {
            finalY = screenHeight - viewH - topMargin
            isAtBottom = false
            applyAppearance(isLight: topIsLight)
        } else {
            finalY = barMargin
            isAtBottom = true
            applyAppearance(isLight: bottomIsLight)
        }
        animateSlide(to: finalY, screenHeight: screenHeight, exitDown: shouldBeAtTop)
    }

    // MARK: - Adaptive appearance

    private func applyAppearance(isLight: Bool) {
        state.isOnLightBackground = isLight

        if isMorphPath {
            // SwiftUI glass auto-adapts; just force appearance for correct material
            let appearanceName: NSAppearance.Name = isLight ? .aqua : .darkAqua
            morphHostingView?.appearance = NSAppearance(named: appearanceName)
        } else {
            let appearanceName: NSAppearance.Name = isLight ? .aqua : .darkAqua
            let appearance = NSAppearance(named: appearanceName)
            let tintColor: NSColor = isLight
                ? NSColor(white: 1, alpha: 0.4)
                : NSColor(white: 0, alpha: 0.4)

            for panel in [glassPanel, leftCollapsedPanel, rightCollapsedPanel] {
                panel?.appearance = appearance
                if #available(macOS 26.0, *), let glass = panel as? NSGlassEffectView {
                    glass.tintColor = tintColor
                }
            }
            updateEscTint()
        }
    }

    // MARK: - ESC tint (fallback path only)

    private func setupEscTint() {
        escTintLayer.cornerRadius = 14
        escTintLayer.cornerCurve = .continuous
        rightCollapsedPanel?.layer?.addSublayer(escTintLayer)
        updateEscTint()
    }

    private func updateEscTint() {
        guard !isMorphPath else { return }
        let isDark = !state.isOnLightBackground
        escTintLayer.backgroundColor = isDark
            ? CGColor(srgbRed: 1.0, green: 0.3, blue: 0.3, alpha: 0.08)
            : CGColor(srgbRed: 0.9, green: 0.2, blue: 0.2, alpha: 0.06)
    }

    override package func viewDidChangeEffectiveAppearance() {
        super.viewDidChangeEffectiveAppearance()
        if !isMorphPath { updateEscTint() }
    }

    // MARK: - Brightness sampling

    private func regionIsLight(_ image: CGImage, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat) -> Bool {
        let rect = CGRect(
            x: max(0, x), y: max(0, y),
            width: min(w, CGFloat(image.width) - max(0, x)),
            height: min(h, CGFloat(image.height) - max(0, y))
        )
        guard rect.width > 0, rect.height > 0,
              let cropped = image.cropping(to: rect) else { return false }

        // Downsample to small size for fast averaging
        let sw = min(cropped.width, 64)
        let sh = min(cropped.height, 16)
        guard let ctx = CGContext(
            data: nil, width: sw, height: sh,
            bitsPerComponent: 8, bytesPerRow: sw * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return false }

        ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: sw, height: sh))
        guard let data = ctx.data else { return false }

        let ptr = data.bindMemory(to: UInt8.self, capacity: sw * sh * 4)
        var total: Double = 0
        let count = sw * sh
        for i in 0..<count {
            let r = Double(ptr[i * 4]) / 255.0
            let g = Double(ptr[i * 4 + 1]) / 255.0
            let b = Double(ptr[i * 4 + 2]) / 255.0
            total += 0.299 * r + 0.587 * g + 0.114 * b
        }
        return (total / Double(count)) > 0.5
    }

    // MARK: - Slide animation

    private func animateSlide(to finalY: CGFloat, screenHeight: CGFloat, exitDown: Bool) {
        guard let layer = self.layer else {
            frame.origin.y = finalY
            return
        }

        let viewH = bounds.height
        isAnimating = true
        let currentPos = layer.position.y
        let offscreenExit = exitDown ? -viewH : screenHeight + viewH
        let offscreenEntry = exitDown ? screenHeight + viewH : -viewH

        let anim = CAKeyframeAnimation(keyPath: "position.y")
        anim.values = [currentPos, offscreenExit, offscreenEntry, finalY]
        anim.keyTimes = [0, 0.3, 0.3001, 1]
        anim.timingFunctions = [
            CAMediaTimingFunction(name: .easeIn),
            CAMediaTimingFunction(name: .linear),
            CAMediaTimingFunction(controlPoints: 0.23, 1, 0.32, 1)
        ]
        anim.duration = DesignTokens.Animation.slow
        anim.isRemovedOnCompletion = true

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            self?.isAnimating = false
        }
        frame.origin.y = finalY
        layer.add(anim, forKey: "hintBarSlide")
        CATransaction.commit()
    }
}
