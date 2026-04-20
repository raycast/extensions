import AppKit
import CoreGraphics

/// Manages the floating overlay window that displays keystrokes
class KeystrokeOverlay {
    private var panel: NSPanel?
    private var contentView: KeystrokeContentView?
    private var position: String = "bottomCenter"
    private var currentScreen: NSScreen?
    private var useGlass: Bool = false

    static let shared = KeystrokeOverlay()

    private init() {}

    func showSync(position: String, fontSize: String, displayDuration: Double = 1.5, appearance: String = "dark") {
        if panel != nil { return }
        self.position = position
        if appearance == "glass" {
            if #available(macOS 26, *) { self.useGlass = true }
        }
        createPanel(position: position, fontSize: fontSize, displayDuration: displayDuration, appearance: appearance)
    }

    func hide() {
        panel?.orderOut(nil)
        panel = nil
        contentView = nil
    }

    func displayKeystroke(_ text: String, isCommand: Bool) {
        followMouseScreen()
        contentView?.addKeystroke(text, forceNewPill: isCommand)
    }

    /// Move the overlay to whichever screen the mouse cursor is on
    private func followMouseScreen() {
        guard let panel = panel else { return }
        let mouseLocation = NSEvent.mouseLocation
        let activeScreen = NSScreen.screens.first { NSMouseInRect(mouseLocation, $0.frame, false) }
        guard let screen = activeScreen, screen != currentScreen else { return }
        currentScreen = screen
        positionPanel(panel, position: position, on: screen)
    }

    private func createPanel(position: String, fontSize: String, displayDuration: Double, appearance: String = "dark") {
        let panelWidth: CGFloat = 600
        let panelHeight: CGFloat = 250

        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: panelWidth, height: panelHeight),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        panel.level = .floating
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = self.useGlass  // Glass needs window shadow for depth effect
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient]
        panel.hidesOnDeactivate = false

        let contentView = KeystrokeContentView(fontSize: fontSize, displayDuration: displayDuration, appearance: appearance)
        contentView.frame = NSRect(x: 0, y: 0, width: panelWidth, height: panelHeight)
        contentView.wantsLayer = true
        contentView.layer?.masksToBounds = false
        panel.contentView = contentView

        let screen = NSScreen.main ?? NSScreen.screens.first
        currentScreen = screen
        positionPanel(panel, position: position, on: screen)
        panel.orderFrontRegardless()

        self.panel = panel
        self.contentView = contentView
    }

    private var shadowOverflow: CGFloat {
        // Glass has built-in depth, no overflow needed
        if useGlass { return 0 }
        return 30
    }

    private func positionPanel(_ panel: NSPanel, position: String, on screen: NSScreen?) {
        guard let screen = screen else { return }
        let screenFrame = screen.visibleFrame
        let panelFrame = panel.frame
        let margin: CGFloat = 40

        // Position the panel lower by shadowOverflow so the bottom pill's shadow
        // renders inside the panel frame instead of getting clipped
        let bottomY = screenFrame.minY + margin - shadowOverflow
        let topY = screenFrame.maxY - panelFrame.height - margin

        let origin: NSPoint
        switch position {
        case "bottomCenter":
            origin = NSPoint(x: screenFrame.midX - panelFrame.width / 2, y: bottomY)
        case "bottomLeft":
            origin = NSPoint(x: screenFrame.minX + margin, y: bottomY)
        case "bottomRight":
            origin = NSPoint(x: screenFrame.maxX - panelFrame.width - margin, y: bottomY)
        case "topCenter":
            origin = NSPoint(x: screenFrame.midX - panelFrame.width / 2, y: topY)
        case "topLeft":
            origin = NSPoint(x: screenFrame.minX + margin, y: topY)
        case "topRight":
            origin = NSPoint(x: screenFrame.maxX - panelFrame.width - margin, y: topY)
        default:
            origin = NSPoint(x: screenFrame.midX - panelFrame.width / 2, y: bottomY)
        }

        panel.setFrameOrigin(origin)
    }
}

// MARK: - Content View

class KeystrokeContentView: NSView {

    // A line can be a modifier combo or accumulated plain text
    private struct Line {
        var text: String
        var view: NSView
        var timer: Timer?
    }

    private var lines: [Line] = []
    private let maxLines = 5
    private let fontSize: CGFloat
    private let lineBreakDelay: TimeInterval = 1.5
    private let displayDuration: TimeInterval
    private var lastKeystrokeTime: Date = .distantPast
    private let appearanceMode: String
    private let useGlass: Bool

    init(fontSize: String, displayDuration: TimeInterval, appearance: String = "dark") {
        switch fontSize {
        case "xsmall": self.fontSize = 11
        case "small": self.fontSize = 14
        case "large": self.fontSize = 22
        case "xlarge": self.fontSize = 28
        default: self.fontSize = 18
        }
        self.displayDuration = displayDuration
        self.appearanceMode = appearance

        if appearanceMode == "glass" {
            if #available(macOS 26, *) {
                self.useGlass = true
            } else {
                self.useGlass = false
            }
        } else {
            self.useGlass = false
        }

        super.init(frame: .zero)
        wantsLayer = true
    }

    required init?(coder: NSCoder) { fatalError() }

    /// Resolved when each pill is created so `auto` / `glass` follow system theme changes without toggling the overlay.
    private func isDarkForOpaquePills() -> Bool {
        switch appearanceMode {
        case "light":
            return false
        case "dark":
            return true
        case "auto", "glass":
            let systemAppearance = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua])
            return systemAppearance == .darkAqua
        default:
            return true
        }
    }

    private let maxPillChars = 40

    func addKeystroke(_ text: String, forceNewPill: Bool = false) {
        let now = Date()
        let elapsed = now.timeIntervalSince(lastKeystrokeTime)
        lastKeystrokeTime = now

        // Command keystrokes (Cmd+S, Ctrl+C, etc.) always get their own pill
        if forceNewPill {
            addNewLine(text)
            return
        }

        // Collapse into current pill if within the typing delay
        if elapsed < lineBreakDelay, lines.last != nil {
            var updated = lines.removeLast()
            updated.timer?.invalidate()
            updated.view.removeFromSuperview()
            updated.text += text

            // Truncate display to last N characters so long pills stay readable
            let displayText: String
            if updated.text.count > maxPillChars {
                let start = updated.text.index(updated.text.endIndex, offsetBy: -maxPillChars)
                displayText = "…" + updated.text[start...]
            } else {
                displayText = updated.text
            }

            let newView = createPillView(text: displayText)
            addSubview(newView)
            updated.view = newView
            updated.timer = scheduleFade(for: newView)
            lines.append(updated)
            layoutLines()
        } else {
            addNewLine(text)
        }
    }

    private func addNewLine(_ text: String) {
        // Remove oldest if at max
        while lines.count >= maxLines {
            let oldest = lines.removeFirst()
            oldest.timer?.invalidate()
            oldest.view.removeFromSuperview()
        }

        let view = createPillView(text: text)
        addSubview(view)
        let timer = scheduleFade(for: view)
        lines.append(Line(text: text, view: view, timer: timer))
        layoutLines()
    }

    private func scheduleFade(for pillView: NSView) -> Timer {
        Timer.scheduledTimer(withTimeInterval: displayDuration, repeats: false) { [weak self, weak pillView] _ in
            guard let self = self, let pillView = pillView else { return }
            if self.useGlass {
                // Disable window shadow before fading to avoid shadow lag
                self.window?.hasShadow = false
                NSAnimationContext.runAnimationGroup({ ctx in
                    ctx.duration = 0.3
                    pillView.animator().alphaValue = 0
                }, completionHandler: {
                    pillView.removeFromSuperview()
                    self.lines.removeAll { $0.view === pillView }
                    self.animateLayout()
                    // Re-enable shadow if there are still glass pills visible
                    if !self.lines.isEmpty {
                        self.window?.hasShadow = true
                    }
                })
            } else {
                NSAnimationContext.runAnimationGroup({ ctx in
                    ctx.duration = 0.3
                    pillView.animator().alphaValue = 0
                }, completionHandler: {
                    pillView.removeFromSuperview()
                    self.lines.removeAll { $0.view === pillView }
                    self.animateLayout()
                })
            }
        }
    }

    private func animateLayout() {
        var y: CGFloat = bottomPadding
        let spacing: CGFloat = 6
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.2
            ctx.allowsImplicitAnimation = true
            for line in lines {
                let v = line.view
                let x = (bounds.width - v.frame.width) / 2
                v.animator().frame.origin = NSPoint(x: x, y: y)
                y += v.frame.height + spacing
            }
        }
    }

    private func createPillView(text: String) -> NSView {
        let label = NSTextField(labelWithString: text)
        label.font = NSFont.monospacedSystemFont(ofSize: fontSize, weight: .medium)
        label.backgroundColor = .clear
        label.isBezeled = false
        label.isEditable = false
        label.sizeToFit()

        let hPad: CGFloat = 14
        let vPad: CGFloat = 8

        if useGlass, #available(macOS 26, *) {
            return createGlassPill(label: label, hPad: hPad, vPad: vPad)
        }
        return createOpaquePill(label: label, hPad: hPad, vPad: vPad)
    }

    @available(macOS 26, *)
    private func createGlassPill(label: NSTextField, hPad: CGFloat, vPad: CGFloat) -> NSView {
        label.textColor = .white

        let w = label.frame.width + hPad * 2
        let h = label.frame.height + vPad * 2

        // The glass view manages its own layout via contentView
        let glass = NSGlassEffectView()
        glass.style = .regular
        glass.cornerRadius = 12
        glass.tintColor = NSColor(white: 0.5, alpha: 0.15)
        glass.frame = NSRect(x: 0, y: 0, width: w, height: h)

        // Use a container for the label with padding
        let container = NSView(frame: NSRect(x: 0, y: 0, width: w, height: h))
        label.frame = NSRect(x: hPad, y: vPad, width: label.frame.width, height: label.frame.height)
        container.addSubview(label)
        glass.contentView = container

        // Wrap in an outer view so we can control frame positioning
        let wrapper = NSView(frame: NSRect(x: 0, y: 0, width: w, height: h))
        wrapper.wantsLayer = true
        wrapper.addSubview(glass)
        glass.frame = wrapper.bounds

        return wrapper
    }

    private func createOpaquePill(label: NSTextField, hPad: CGFloat, vPad: CGFloat) -> NSView {
        let bgColor: NSColor
        let textColor: NSColor
        let borderColor: NSColor
        let shadowColor: NSColor

        if isDarkForOpaquePills() {
            bgColor = NSColor(white: 0.1, alpha: 1.0)
            textColor = .white
            borderColor = NSColor(white: 1, alpha: 0.2)
            shadowColor = NSColor(white: 0, alpha: 0.35)
        } else {
            bgColor = NSColor(white: 0.97, alpha: 1.0)
            textColor = NSColor(white: 0.1, alpha: 1)
            borderColor = NSColor(white: 0, alpha: 0.1)
            shadowColor = NSColor(white: 0, alpha: 0.15)
        }

        label.textColor = textColor

        let container = NSView()
        container.wantsLayer = true
        container.layer?.cornerRadius = 8
        container.layer?.backgroundColor = bgColor.cgColor

        let w = label.frame.width + hPad * 2
        let h = label.frame.height + vPad * 2
        container.frame = NSRect(x: 0, y: 0, width: w, height: h)
        label.frame = NSRect(x: hPad, y: vPad, width: label.frame.width, height: label.frame.height)
        container.addSubview(label)

        container.layer?.borderColor = borderColor.cgColor
        container.layer?.borderWidth = 1

        let shadow = NSShadow()
        shadow.shadowColor = shadowColor
        shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowBlurRadius = 6
        container.shadow = shadow

        return container
    }

    private var bottomPadding: CGFloat {
        useGlass ? 4 : 24
    }

    private func layoutLines() {
        var y: CGFloat = bottomPadding
        let spacing: CGFloat = 6
        for line in lines {
            let v = line.view
            let x = (bounds.width - v.frame.width) / 2
            v.frame.origin = NSPoint(x: x, y: y)
            y += v.frame.height + spacing
        }
    }
}
