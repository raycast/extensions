import AppKit
import CoreGraphics

// A borderless window per screen. Each one draws a millimeter ruler along the edge that
// faces its neighbor, plus one shared reference line — the "match line".
//
// The match line is the whole idea: it is a single position in the global display space,
// so it lands on both screens at once. Where it lands physically depends on the
// arrangement offset, so you nudge until the two lines look level in the real world. At
// that point, and only exactly there, the pointer crosses between screens with no jump.
//
// Everything here works along whichever axis macOS leaves free. Side by side, that is
// vertical: ruler strips down the facing left and right edges, and a horizontal match
// line. Stacked, it is horizontal: strips along the facing top and bottom edges, and a
// vertical match line.

private let hudFont = NSFont.monospacedSystemFont(ofSize: 12, weight: .regular)
private let labelFont = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .medium)
private let stripWidth: CGFloat = 68

enum RulerEdge {
    case left, right, top, bottom
}

final class ScreenOverlayView: NSView {
    /// This screen's bounds in the CG global space (y down).
    var cgBounds: CGRect = .zero
    /// The axis the displays can actually move along.
    var axis: Axis = .vertical
    /// Points per millimeter along that axis, for this screen.
    var ptPerMM: CGFloat = 5
    /// Which edges face a neighboring screen.
    var edges: [RulerEdge] = []
    /// The shared reference line: a y in the global space when aligning vertically, an x
    /// when aligning horizontally.
    var matchPos: CGFloat = 0
    /// A nudge that has been asked for but not yet written to the display configuration.
    /// Drawn straight away so holding a key feels instant, even though each real
    /// reconfiguration takes macOS a third of a second.
    var previewShift: CGFloat = 0
    var isTarget = false
    var hud: [String] = []
    var showHUD = false
    var accent: NSColor = .systemRed

    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    /// Pass clicks through except on the ruler strips, so the desktop stays usable but
    /// there is somewhere to click to take keyboard focus back.
    override func hitTest(_ point: NSPoint) -> NSView? {
        for edge in edges where stripRect(edge).contains(point) { return self }
        return nil
    }

    // MARK: Geometry

    private func stripRect(_ edge: RulerEdge) -> NSRect {
        switch edge {
        case .left: return NSRect(x: 0, y: 0, width: stripWidth, height: bounds.height)
        case .right: return NSRect(x: bounds.maxX - stripWidth, y: 0, width: stripWidth, height: bounds.height)
        case .bottom: return NSRect(x: 0, y: 0, width: bounds.width, height: stripWidth)
        case .top: return NSRect(x: 0, y: bounds.maxY - stripWidth, width: bounds.width, height: stripWidth)
        }
    }

    /// The match line's position in this view's own coordinates, along the free axis.
    private var linePosition: CGFloat {
        switch axis {
        case .vertical:
            // AppKit's y runs the other way to the global space.
            return bounds.height - (matchPos - cgBounds.origin.y) + previewShift
        case .horizontal:
            return (matchPos - cgBounds.origin.x) - previewShift
        }
    }

    /// How far the ruler can run before it leaves the screen.
    private var stripLength: CGFloat {
        axis == .vertical ? bounds.height : bounds.width
    }

    /// Turn a position along the strip and a depth into it back into a point, so the
    /// drawing code does not care which edge it is working on.
    private func point(along: CGFloat, depth: CGFloat, base: CGFloat, inward: CGFloat) -> NSPoint {
        switch axis {
        case .vertical: return NSPoint(x: base + inward * depth, y: along)
        case .horizontal: return NSPoint(x: along, y: base + inward * depth)
        }
    }

    private func anchor(_ edge: RulerEdge) -> (base: CGFloat, inward: CGFloat) {
        let strip = stripRect(edge)
        switch edge {
        case .left: return (strip.minX, 1)
        case .right: return (strip.maxX, -1)
        case .bottom: return (strip.minY, 1)
        case .top: return (strip.maxY, -1)
        }
    }

    // MARK: Drawing

    override func draw(_ dirtyRect: NSRect) {
        let line = linePosition
        for edge in edges { drawStrip(edge, line: line) }
        drawMatchLine(at: line)
        if showHUD { drawHUD() }
    }

    private func drawStrip(_ edge: RulerEdge, line: CGFloat) {
        let strip = stripRect(edge)
        NSColor(white: 0, alpha: 0.72).setFill()
        strip.fill()

        let (base, inward) = anchor(edge)

        // The strip's inner border.
        NSColor(white: 1, alpha: 0.18).setStroke()
        let border = NSBezierPath()
        border.move(to: point(along: 0, depth: stripWidth, base: base, inward: inward))
        border.line(to: point(along: stripLength, depth: stripWidth, base: base, inward: inward))
        border.lineWidth = 1
        border.stroke()

        // Ticks every millimeter, counted from the match line so the numbers on both
        // screens read the same at the same real-world position.
        var mm = 0
        while true {
            let delta = CGFloat(mm) * ptPerMM
            if line + delta > stripLength && line - delta < 0 { break }
            let isCm = mm % 10 == 0
            let depth: CGFloat = isCm ? 26 : (mm % 5 == 0 ? 15 : 8)
            NSColor(white: 1, alpha: isCm ? 0.95 : 0.55).setStroke()
            for sign in [CGFloat(-1), CGFloat(1)] {
                if sign < 0 && mm == 0 { continue }
                let at = line + sign * delta
                guard at >= -1 && at <= stripLength + 1 else { continue }
                let tick = NSBezierPath()
                tick.move(to: point(along: at, depth: 0, base: base, inward: inward))
                tick.line(to: point(along: at, depth: depth, base: base, inward: inward))
                tick.lineWidth = isCm ? 1.5 : 1
                tick.stroke()
                if isCm && mm > 0 {
                    drawLabel("\(mm / 10)", along: at, base: base, inward: inward)
                }
            }
            mm += 1
        }
        drawLabel("0", along: line, base: base, inward: inward, color: accent)
    }

    private func drawLabel(
        _ text: String, along: CGFloat, base: CGFloat, inward: CGFloat, color: NSColor = .white
    ) {
        guard along > 0, along < stripLength else { return }
        let string = NSAttributedString(string: text, attributes: [
            .font: labelFont, .foregroundColor: color,
        ])
        let size = string.size()
        let center = point(along: along, depth: 40, base: base, inward: inward)
        string.draw(at: NSPoint(x: center.x - size.width / 2, y: center.y - size.height / 2))
    }

    private func drawMatchLine(at position: CGFloat) {
        let path = NSBezierPath()
        switch axis {
        case .vertical:
            guard position >= 0, position <= bounds.height else { return }
            path.move(to: NSPoint(x: 0, y: position))
            path.line(to: NSPoint(x: bounds.maxX, y: position))
        case .horizontal:
            guard position >= 0, position <= bounds.width else { return }
            path.move(to: NSPoint(x: position, y: 0))
            path.line(to: NSPoint(x: position, y: bounds.maxY))
        }
        accent.withAlphaComponent(isTarget ? 1 : 0.85).setStroke()
        path.lineWidth = 1
        if !isTarget { path.setLineDash([6, 4], count: 2, phase: 0) }
        path.stroke()
    }

    private func drawHUD() {
        let text = hud.joined(separator: "\n")
        let string = NSAttributedString(string: text, attributes: [
            .font: hudFont, .foregroundColor: NSColor.white,
        ])
        let size = string.size()
        let pad: CGFloat = 16
        let box = NSRect(
            x: (bounds.width - size.width) / 2 - pad,
            y: bounds.height * 0.72,
            width: size.width + pad * 2,
            height: size.height + pad * 2
        )
        let bg = NSBezierPath(roundedRect: box, xRadius: 12, yRadius: 12)
        NSColor(white: 0, alpha: 0.82).setFill()
        bg.fill()
        NSColor(white: 1, alpha: 0.15).setStroke()
        bg.lineWidth = 1
        bg.stroke()
        string.draw(at: NSPoint(x: box.minX + pad, y: box.minY + pad))
    }

    // MARK: Events

    override func keyDown(with event: NSEvent) {
        Overlay.shared.handleKey(event)
    }

    override func mouseDown(with event: NSEvent) {
        if let window, !window.isKeyWindow {
            NSApp.activate(ignoringOtherApps: true)
            window.makeKey()
        }
    }
}

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}
