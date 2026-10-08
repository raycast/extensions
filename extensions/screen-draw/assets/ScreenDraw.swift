import Cocoa

// Transparent full-screen overlay you can draw on. One window per display.
// Launched (and toggled off) by the Raycast "Draw on Screen" command.

enum Tool: String {
    case pen = "Pen"
    case highlighter = "Highlighter"
    case arrow = "Arrow"
    case rectangle = "Rectangle"
    case ellipse = "Ellipse"
}

struct Stroke {
    var tool: Tool
    var color: NSColor
    var width: CGFloat
    var points: [NSPoint]
}

let palette: [(name: String, color: NSColor)] = [
    ("Red", .systemRed),
    ("Yellow", .systemYellow),
    ("Green", .systemGreen),
    ("Blue", .systemBlue),
    ("White", .white),
    ("Black", .black),
]

let toolShortcuts: [String: Tool] = [
    "p": .pen,
    "h": .highlighter,
    "a": .arrow,
    "r": .rectangle,
    "o": .ellipse,
]

let helpText = """
Draw with the mouse or trackpad
P pen   H highlighter   A arrow   R rectangle   O ellipse
1-6 color   [ ] size   ⌘Z undo   C clear   ? help   Esc quit
"""

final class Session {
    var tool = Tool.pen
    var colorIndex = 0
    var width: CGFloat = 4
    var canvases: [CanvasView] = []
    // The canvas each stroke landed on, in order, so undo works across displays.
    var history: [CanvasView] = []

    var color: NSColor { palette[colorIndex].color }
    var status: String { "\(tool.rawValue) - \(palette[colorIndex].name) - \(Int(width))px" }

    func undo() {
        history.popLast()?.removeLastStroke()
    }

    func clearAll() {
        canvases.forEach { $0.clear() }
        history.removeAll()
    }
}

let session = Session()

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class CanvasView: NSView {
    private var strokes: [Stroke] = []
    private var current: Stroke?
    private var hudText: String?
    private var hudTimer: Timer?

    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func resetCursorRects() { addCursorRect(bounds, cursor: .crosshair) }

    // MARK: Mouse

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        current = Stroke(tool: session.tool, color: session.color, width: session.width, points: [point])
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        guard var stroke = current else { return }
        let point = convert(event.locationInWindow, from: nil)
        switch stroke.tool {
        case .pen, .highlighter:
            stroke.points.append(point)
        case .arrow, .rectangle, .ellipse:
            stroke.points = [stroke.points[0], point]
        }
        current = stroke
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        guard let stroke = current else { return }
        strokes.append(stroke)
        session.history.append(self)
        current = nil
        needsDisplay = true
    }

    // MARK: Keyboard

    override func keyDown(with event: NSEvent) {
        let key = event.charactersIgnoringModifiers?.lowercased() ?? ""
        let command = event.modifierFlags.contains(.command)

        if event.keyCode == 53 || (command && (key == "q" || key == "w")) {
            NSApp.terminate(nil)
        } else if command && key == "z" {
            session.undo()
        } else if key == "c" || event.keyCode == 51 {
            session.clearAll()
            flash("Cleared")
        } else if key == "?" || key == "/" {
            flash(helpText, for: 4)
        } else if let digit = Int(key), (1...palette.count).contains(digit) {
            session.colorIndex = digit - 1
            flash(session.status)
        } else if let tool = toolShortcuts[key] {
            session.tool = tool
            flash(session.status)
        } else if key == "]" || key == "=" {
            session.width = min(session.width + 2, 40)
            flash(session.status)
        } else if key == "[" || key == "-" {
            session.width = max(session.width - 2, 2)
            flash(session.status)
        }
    }

    // MARK: Strokes

    func removeLastStroke() {
        guard !strokes.isEmpty else { return }
        strokes.removeLast()
        needsDisplay = true
    }

    func clear() {
        strokes.removeAll()
        needsDisplay = true
    }

    // MARK: Drawing

    override func draw(_ dirtyRect: NSRect) {
        strokes.forEach(render)
        if let current { render(current) }
        if let hudText { drawHUD(hudText) }
    }

    private func render(_ stroke: Stroke) {
        let isHighlighter = stroke.tool == .highlighter
        let path = NSBezierPath()
        path.lineCapStyle = .round
        path.lineJoinStyle = .round
        path.lineWidth = isHighlighter ? stroke.width * 4 : stroke.width

        let start = stroke.points[0]
        let end = stroke.points[stroke.points.count - 1]
        switch stroke.tool {
        case .pen, .highlighter:
            appendSmoothCurve(stroke.points, to: path)
        case .arrow:
            path.move(to: start)
            path.line(to: end)
            let angle = atan2(end.y - start.y, end.x - start.x)
            let headLength = max(14, stroke.width * 4)
            for offset in [CGFloat.pi * 5 / 6, -CGFloat.pi * 5 / 6] {
                path.move(to: end)
                path.line(to: NSPoint(x: end.x + headLength * cos(angle + offset),
                                      y: end.y + headLength * sin(angle + offset)))
            }
        case .rectangle:
            path.appendRect(rect(from: start, to: end))
        case .ellipse:
            path.appendOval(in: rect(from: start, to: end))
        }

        (isHighlighter ? stroke.color.withAlphaComponent(0.35) : stroke.color).setStroke()
        path.stroke()
    }

    // Curves through the midpoints between samples, so fast strokes don't look jagged.
    private func appendSmoothCurve(_ points: [NSPoint], to path: NSBezierPath) {
        path.move(to: points[0])
        guard points.count > 2 else {
            // A single click still leaves a dot.
            path.line(to: points.count == 2 ? points[1] : NSPoint(x: points[0].x + 0.01, y: points[0].y))
            return
        }
        for i in 1..<(points.count - 1) {
            let mid = NSPoint(x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2)
            path.curve(to: mid, controlPoint1: points[i], controlPoint2: points[i])
        }
        path.line(to: points[points.count - 1])
    }

    private func rect(from a: NSPoint, to b: NSPoint) -> NSRect {
        NSRect(x: min(a.x, b.x), y: min(a.y, b.y), width: abs(a.x - b.x), height: abs(a.y - b.y))
    }

    // MARK: HUD

    func flash(_ text: String, for seconds: TimeInterval = 1.5) {
        hudText = text
        needsDisplay = true
        hudTimer?.invalidate()
        hudTimer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
            self?.hudText = nil
            self?.needsDisplay = true
        }
    }

    private func drawHUD(_ text: String) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineSpacing = 4
        let string = NSAttributedString(string: text, attributes: [
            .font: NSFont.systemFont(ofSize: 15, weight: .medium),
            .foregroundColor: NSColor.white,
            .paragraphStyle: paragraph,
        ])
        let size = string.boundingRect(with: NSSize(width: bounds.width - 80, height: .greatestFiniteMagnitude),
                                       options: [.usesLineFragmentOrigin]).size
        let box = NSRect(x: bounds.midX - size.width / 2 - 18, y: bounds.maxY - size.height - 100,
                         width: size.width + 36, height: size.height + 20)
        NSColor.black.withAlphaComponent(0.75).setFill()
        NSBezierPath(roundedRect: box, xRadius: 12, yRadius: 12).fill()
        string.draw(with: box.insetBy(dx: 18, dy: 10), options: [.usesLineFragmentOrigin])
    }
}

// MARK: Launch

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let mouseLocation = NSEvent.mouseLocation
var focusedCanvas: CanvasView?

for screen in NSScreen.screens {
    let window = OverlayWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
    window.level = .screenSaver
    window.isOpaque = false
    // Nearly (not fully) transparent so the window catches clicks instead of passing them through.
    window.backgroundColor = NSColor.black.withAlphaComponent(0.01)
    window.hasShadow = false
    window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
    window.isReleasedWhenClosed = false

    let canvas = CanvasView(frame: NSRect(origin: .zero, size: screen.frame.size))
    window.contentView = canvas
    window.orderFrontRegardless()
    session.canvases.append(canvas)

    if screen.frame.contains(mouseLocation) || focusedCanvas == nil {
        focusedCanvas = canvas
    }
}

if let focusedCanvas, let window = focusedCanvas.window {
    window.makeKeyAndOrderFront(nil)
    window.makeFirstResponder(focusedCanvas)
    focusedCanvas.flash(helpText, for: 3)
}

app.activate(ignoringOtherApps: true)
app.run()
