import AppKit
import QuartzCore

/// One plain panel per screen, on the normal window level, placed in the stack so it covers every
/// window except the ones on stage (see `Placement`). Clicks on the backdrop are swallowed and never
/// activate anything.
///
/// Everything visible is Core Animation: a solid background color, grain tiled by replicator layers
/// and the glow as a shadow. Nothing is drawn on the CPU, and fades are layer animations that the
/// render server plays on its own, so they stay smooth while the main thread waits on other apps.
final class Backdrop {
    /// Where the panels sit in the window stack. Nothing is hidden in any case: the panels cover
    /// the other windows, so the desktop is exactly as it was when they fade out.
    enum Placement: Equatable {
        /// Directly behind the focused window: covers everything else, its own app's windows too.
        case behindWindow(CGWindowID)
        /// Behind the app's bottom-most window on screen: covers the other apps only.
        case behindApp(pid_t)
        /// Above the normal windows. For displays without the focused window, when that window is
        /// full screen (on its own Space, where nothing may cover it).
        case front
    }

    static let fadeIn: CFTimeInterval = 0.22
    static let fadeOut: CFTimeInterval = 0.2

    private var panels: [BackdropPanel] = []
    private var screenFrames: [CGRect] = []
    private var isVisible = false
    private var generation = 0
    private var placement = Placement.front
    /// A display left uncovered: the one showing the focused window in full screen.
    private var uncoveredScreen: CGRect?
    private var glowFrame: CGRect?  // Cocoa global coordinates
    private var settings = StageSettings()
    private var observers: [NSObjectProtocol] = []
    /// A mouse button went down on the backdrop.
    var onMouseDown: (() -> Void)?

    private static let desktopLevel = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)

    /// Creates the panels ahead of the first session (the app calls this at launch).
    func prepare(settings: StageSettings) {
        self.settings = settings
        ensurePanels()
        refreshStyle()
        panels.forEach { $0.displayIfNeeded() }
    }

    /// `uncovered`: the Cocoa frame of a display to leave alone.
    func show(placement: Placement, uncovered: CGRect?, settings: StageSettings, animated: Bool) {
        generation += 1
        isVisible = true
        self.placement = placement
        uncoveredScreen = uncovered
        glowFrame = nil
        self.settings = settings
        ensurePanels()
        refreshStyle()
        for panel in coveringPanels {
            panel.backdropView.setGlow(nil, animated: false)
            if !panel.isVisible { panel.backdropView.setOpacity(0) }  // else: shown again mid fade-out
            panel.displayIfNeeded()
        }
        reorder()
        startObserving()
        fade(to: 1, duration: animated ? Self.fadeIn : 0)
    }

    /// Moves the backdrop for the same session, e.g. when the focused window enters or leaves full
    /// screen, or focus moves to another window. A display that becomes covered appears at once.
    func setPlacement(_ placement: Placement, uncovered: CGRect?) {
        guard isVisible else { return }
        let newlyCovered = panels.filter { $0.frame == uncoveredScreen && $0.frame != uncovered }
        self.placement = placement
        uncoveredScreen = uncovered
        newlyCovered.forEach { $0.backdropView.setOpacity(1) }
        reorder()
    }

    private var coveringPanels: [BackdropPanel] {
        panels.filter { $0.frame != uncoveredScreen }
    }

    func hide(animated: Bool) {
        generation += 1
        let current = generation
        isVisible = false
        stopObserving()
        fade(to: 0, duration: animated ? Self.fadeOut : 0) { [weak self] in
            guard let self, self.generation == current else { return }  // shown again while fading out
            self.panels.forEach { $0.orderOut(nil) }
            self.uncoveredScreen = nil
            self.glowFrame = nil
        }
    }

    /// Puts the panels back in place, e.g. after the focused app was activated, which brings all
    /// of its windows to the front.
    func reorder() {
        guard isVisible else { return }
        let reference = referenceWindow()
        for panel in panels {
            guard panel.frame != uncoveredScreen else {
                panel.orderOut(nil)
                continue
            }
            if let reference {
                panel.level = .normal
                panel.order(.below, relativeTo: Int(reference))
            } else if placement == .front {
                panel.level = .normal
                panel.orderFrontRegardless()
            } else {
                // The app has no window on screen to sit behind: stay below all windows.
                panel.level = Self.desktopLevel
                panel.orderFrontRegardless()
            }
        }
    }

    /// The window the panels go right behind, nil for `.front` (or an app without windows on screen).
    private func referenceWindow() -> CGWindowID? {
        switch placement {
        case .behindWindow(let id): return id
        case .behindApp(let pid): return WindowMover.onScreenWindows().last { $0.layer == 0 && $0.pid == pid }?.id
        case .front: return nil
        }
    }

    /// Whether the window server shows the panels where `reorder` put them: all on screen, and
    /// directly behind the reference window (only other panels in between). Right after a window
    /// leaves full screen, macOS can drop the first reorder, so callers check and repeat.
    func isInPlace() -> Bool {
        guard isVisible else { return true }
        let stack = WindowMover.onScreenWindows().filter { $0.layer == 0 }.map(\.id)
        let own = Set(coveringPanels.map { CGWindowID($0.windowNumber) })
        guard own.allSatisfy(stack.contains) else { return false }
        guard let reference = referenceWindow(), let top = stack.firstIndex(of: reference) else { return true }
        var remaining = own
        for id in stack[(top + 1)...] {
            guard remaining.remove(id) != nil else { return false }  // a foreign window in between
            if remaining.isEmpty { return true }
        }
        return false
    }

    /// `frame` in Cocoa global coordinates, nil hides the glow. `animated` fades it in.
    func setGlow(_ frame: CGRect?, animated: Bool = false) {
        glowFrame = frame
        for panel in coveringPanels {
            panel.backdropView.setGlow(frame?.offsetBy(dx: -panel.frame.minX, dy: -panel.frame.minY),
                                       animated: animated)
        }
    }

    func apply(_ settings: StageSettings) {
        self.settings = settings
        refreshStyle()
    }

    private func refreshStyle() {
        panels.forEach { $0.backdropView.apply(grain: settings.grain, showLabel: settings.showLabel) }
    }

    /// Recreates the panels only when the screens themselves changed. Hiding the menu bar posts a
    /// screen-parameters change too (the visible frame changes), and recreating the panels then
    /// made them flash.
    private func ensurePanels() {
        let frames = NSScreen.screens.map(\.frame)
        guard frames != screenFrames || panels.isEmpty else { return }
        panels.forEach { $0.orderOut(nil) }
        panels = NSScreen.screens.map { screen in
            let panel = BackdropPanel(screen: screen)
            panel.onMouseDown = { [weak self] in self?.onMouseDown?() }
            return panel
        }
        screenFrames = frames
    }

    private func screensChanged() {
        let frames = NSScreen.screens.map(\.frame)
        guard frames != screenFrames else { return }
        ensurePanels()
        refreshStyle()
        panels.forEach { $0.backdropView.setOpacity(isVisible ? 1 : 0) }
        reorder()
        setGlow(glowFrame)
    }

    private func fade(to opacity: Float, duration: CFTimeInterval, completion: (() -> Void)? = nil) {
        guard duration > 0 else {
            panels.forEach { $0.backdropView.setOpacity(opacity) }
            completion?()
            return
        }
        CATransaction.begin()
        CATransaction.setCompletionBlock(completion)
        coveringPanels.forEach { $0.backdropView.fade(to: opacity, duration: duration) }
        CATransaction.commit()
        // Hand the animation to the render server now, not at the end of this run loop pass:
        // whatever runs next on the main thread can't delay or stall it.
        CATransaction.flush()
    }

    private func startObserving() {
        guard observers.isEmpty else { return }
        let center = NotificationCenter.default
        observers = [
            center.addObserver(forName: NSApplication.didChangeScreenParametersNotification,
                               object: nil, queue: .main) { [weak self] _ in self?.screensChanged() },
            // Accent color changed in System Settings: recolor the glow and the label's dot.
            center.addObserver(forName: NSColor.systemColorsDidChangeNotification,
                               object: nil, queue: .main) { [weak self] _ in self?.refreshStyle() },
        ]
    }

    private func stopObserving() {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers.removeAll()
    }
}

final class BackdropPanel: NSPanel {
    let backdropView: BackdropView
    var onMouseDown: (() -> Void)?

    init(screen: NSScreen) {
        backdropView = BackdropView(frame: CGRect(origin: .zero, size: screen.frame.size))
        super.init(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel],
                   backing: .buffered, defer: false)
        contentView = backdropView
        // Lives on the Space it is shown on only: at the normal window level, a backdrop that joined
        // every Space would cover the windows there. `fullScreenAuxiliary`: a display that shows
        // another app in full screen gets covered too.
        collectionBehavior = [.stationary, .ignoresCycle, .fullScreenAuxiliary]
        // Transparent window; the content layer's opacity does the fading.
        backgroundColor = .clear
        isOpaque = false
        hasShadow = false
        hidesOnDeactivate = false
        isReleasedWhenClosed = false
        animationBehavior = .none
        setFrame(screen.frame, display: false)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    /// Swallow mouse input: AppKit would otherwise bring the panel to the front of its level on
    /// click, on top of the focused window.
    override func sendEvent(_ event: NSEvent) {
        switch event.type {
        case .leftMouseDown, .rightMouseDown, .otherMouseDown:
            onMouseDown?()
        case .leftMouseUp, .leftMouseDragged, .rightMouseUp, .rightMouseDragged,
             .otherMouseUp, .otherMouseDragged, .scrollWheel:
            return
        default:
            super.sendEvent(event)
        }
    }
}

final class BackdropView: NSView {
    private let grainGrid = CAReplicatorLayer()  // repeats a row of tiles upwards
    private let grainRow = CAReplicatorLayer()   // repeats one tile to the right
    private let grainTile = CALayer()
    private let glowLayer = CALayer()
    private let label = NSTextField(labelWithString: "")
    private var glowRect: CGRect?
    private var grain = Grain.subtle
    private var showLabel = true

    /// Ease-out with a long tail: quick to appear, soft to settle.
    private static let easeOut = CAMediaTimingFunction(controlPoints: 0.16, 1, 0.3, 1)
    private static let easeIn = CAMediaTimingFunction(controlPoints: 0.4, 0, 1, 1)

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layerContentsRedrawPolicy = .onSetNeedsDisplay
        autoresizingMask = [.width, .height]

        grainTile.magnificationFilter = .nearest
        grainTile.minificationFilter = .nearest
        grainTile.contentsGravity = .resize
        grainRow.addSublayer(grainTile)
        grainGrid.addSublayer(grainRow)

        glowLayer.shadowOffset = .zero
        glowLayer.shadowOpacity = 1
        glowLayer.shadowRadius = BackdropStyle.glowRadius
        glowLayer.isHidden = true

        label.isSelectable = false
        label.drawsBackground = false
        addSubview(label)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func makeBackingLayer() -> CALayer {
        let layer = super.makeBackingLayer()
        layer.masksToBounds = true
        layer.addSublayer(grainGrid)
        layer.addSublayer(glowLayer)
        return layer
    }

    override var wantsUpdateLayer: Bool { true }
    override var isOpaque: Bool { false }

    private var isDark: Bool { effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua }

    override func updateLayer() {
        withoutAnimation {
            layer?.backgroundColor = BackdropStyle.baseColor(dark: isDark).cgColor
            grainTile.contents = BackdropStyle.grainImage(grain)
            grainGrid.isHidden = grain == .off
        }
    }

    override func layout() {
        super.layout()
        withoutAnimation {
            let side = BackdropStyle.grainTileSize
            let columns = Int((bounds.width / side).rounded(.up))
            let rows = Int((bounds.height / side).rounded(.up))
            grainTile.frame = CGRect(x: 0, y: 0, width: side, height: side)
            grainRow.frame = CGRect(x: 0, y: 0, width: side * CGFloat(columns), height: side)
            grainRow.instanceCount = columns
            grainRow.instanceTransform = CATransform3DMakeTranslation(side, 0, 0)
            grainGrid.frame = bounds
            grainGrid.instanceCount = rows
            grainGrid.instanceTransform = CATransform3DMakeTranslation(0, side, 0)
            glowLayer.frame = bounds
        }
        layoutLabel()
    }

    override func viewDidChangeEffectiveAppearance() {
        super.viewDidChangeEffectiveAppearance()
        refresh()
    }

    func apply(grain: Grain, showLabel: Bool) {
        self.grain = grain
        self.showLabel = showLabel
        refresh()
    }

    func setOpacity(_ opacity: Float) {
        layer?.removeAnimation(forKey: "fade")
        withoutAnimation { alphaValue = CGFloat(opacity) }
    }

    func fade(to opacity: Float, duration: CFTimeInterval) {
        guard let layer else { return }
        let from = layer.presentation()?.opacity ?? layer.opacity
        setOpacity(opacity)
        let animation = CABasicAnimation(keyPath: "opacity")
        animation.fromValue = from
        animation.toValue = opacity
        animation.duration = duration
        animation.timingFunction = opacity > from ? Self.easeOut : Self.easeIn
        layer.add(animation, forKey: "fade")
    }

    func setGlow(_ rect: CGRect?, animated: Bool) {
        let wasHidden = glowRect == nil
        glowRect = rect
        updateGlow()
        if animated, wasHidden, rect != nil {
            let animation = CABasicAnimation(keyPath: "opacity")
            animation.fromValue = 0
            animation.toValue = 1
            animation.duration = 0.3
            animation.timingFunction = Self.easeOut
            glowLayer.add(animation, forKey: "fade")
            CATransaction.flush()
        }
    }

    private func refresh() {
        needsDisplay = true
        updateGlow()
        updateLabel()
    }

    /// The glow is the shadow of a rounded rect slightly inside the window: the window covers the
    /// rect itself, only the soft halo around it shows. Moving it is a cheap layer update.
    private func updateGlow() {
        withoutAnimation {
            guard let glowRect else {
                glowLayer.isHidden = true
                return
            }
            var color = NSColor.clear.cgColor
            effectiveAppearance.performAsCurrentDrawingAppearance {
                color = BackdropStyle.glowColor(dark: isDark).cgColor
            }
            glowLayer.shadowColor = color
            glowLayer.shadowPath = BackdropStyle.glowPath(around: glowRect)
            glowLayer.isHidden = false
        }
    }

    /// Top-left, in the strip the hidden menu bar leaves free (mirrors HiddenMenuBarClock's corner).
    private func updateLabel() {
        label.isHidden = !showLabel
        label.attributedStringValue = BackdropStyle.labelText()
        label.sizeToFit()
        layoutLabel()
    }

    private func layoutLabel() {
        label.setFrameOrigin(NSPoint(x: BackdropStyle.labelInset,
                                     y: (bounds.height - BackdropStyle.labelCenterFromTop - label.frame.height / 2).rounded()))
    }

    private func withoutAnimation(_ body: () -> Void) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        body()
        CATransaction.commit()
    }
}

/// Colors, grain, glow geometry and the label, shared by the live backdrop and `--preview`.
enum BackdropStyle {
    static let glowRadius: CGFloat = 26
    static let labelInset: CGFloat = 16
    static let labelCenterFromTop: CGFloat = 15
    /// 512 px of noise in 256 pt: one grain per physical pixel on a Retina screen.
    static let grainTileSize: CGFloat = 256

    static func baseColor(dark: Bool) -> NSColor {
        dark ? NSColor(srgbRed: 0.086, green: 0.086, blue: 0.094, alpha: 1)
             : NSColor(srgbRed: 0.949, green: 0.949, blue: 0.957, alpha: 1)
    }

    static func glowColor(dark: Bool) -> NSColor {
        NSColor.controlAccentColor.withAlphaComponent(dark ? 0.75 : 0.55)
    }

    /// "● Focus Stage on": accent dot, secondary label color, so it reads without shouting.
    static func labelText() -> NSAttributedString {
        let text = NSMutableAttributedString(string: "●  ", attributes: [
            .foregroundColor: NSColor.controlAccentColor,
            .font: NSFont.systemFont(ofSize: 9, weight: .bold),
            .baselineOffset: 1.5,
        ])
        text.append(NSAttributedString(string: "Focus Stage on", attributes: [
            .foregroundColor: NSColor.secondaryLabelColor,
            .font: NSFont.systemFont(ofSize: 13, weight: .medium),
        ]))
        return text
    }

    /// Inset so the rect stays hidden behind the window's rounded corners.
    static func glowPath(around window: CGRect) -> CGPath {
        CGPath(roundedRect: window.insetBy(dx: 6, dy: 6), cornerWidth: 16, cornerHeight: 16, transform: nil)
    }

    /// CPU drawing of the backdrop, for `--preview` only.
    static func drawBackground(in rect: CGRect, dark: Bool, grain: Grain) {
        baseColor(dark: dark).setFill()
        rect.fill()
        if let image = grainImage(grain) {
            let size = NSSize(width: grainTileSize, height: grainTileSize)
            NSColor(patternImage: NSImage(cgImage: image, size: size)).setFill()
            rect.fill(using: .sourceOver)
        }
    }

    private static var grainCache: [Grain: CGImage] = [:]

    /// A 512 px tile of monochrome noise at the grain's opacity. Seeded, so the pattern is
    /// identical on every display and in every session.
    static func grainImage(_ grain: Grain) -> CGImage? {
        guard grain.opacity > 0 else { return nil }
        if let cached = grainCache[grain] { return cached }

        let side = 512
        var random = SplitMix64(state: 0xF0C5_57A6)
        let alpha = grain.opacity
        let alphaByte = UInt8((alpha * 255).rounded())
        var pixels = [UInt8](repeating: 0, count: side * side * 4)
        for i in 0..<(side * side) {
            let value = Double(random.next() >> 56) / 255
            let premultiplied = UInt8((value * alpha * 255).rounded())
            pixels[i * 4] = premultiplied
            pixels[i * 4 + 1] = premultiplied
            pixels[i * 4 + 2] = premultiplied
            pixels[i * 4 + 3] = alphaByte
        }
        guard let provider = CGDataProvider(data: Data(pixels) as CFData),
              let image = CGImage(width: side, height: side, bitsPerComponent: 8, bitsPerPixel: 32,
                                  bytesPerRow: side * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                  bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                                  provider: provider, decode: nil, shouldInterpolate: false,
                                  intent: .defaultIntent) else { return nil }
        grainCache[grain] = image
        return image
    }
}

struct SplitMix64 {
    var state: UInt64

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}
