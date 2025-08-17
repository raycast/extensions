import Cocoa

class OverlayWindow: NSWindow {
    init(frame: NSRect) {
        super.init(
            contentRect: frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        self.isOpaque = false
        self.backgroundColor = .clear
        self.level = .mainMenu + 1
        self.ignoresMouseEvents = true
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    }
}

class OverlayView: NSView {
    let cursorRadius: CGFloat
    let dimOpacity: CGFloat
    let screenFrame: NSRect

    init(frame: NSRect, cursorRadius: CGFloat, dimOpacity: CGFloat, screenFrame: NSRect) {
        self.cursorRadius = cursorRadius
        self.dimOpacity = dimOpacity
        self.screenFrame = screenFrame
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        context.setFillColor(NSColor.black.withAlphaComponent(dimOpacity).cgColor)
        context.fill(bounds)

        // Get mouse location in global screen coordinates
        let mouseLocation = NSEvent.mouseLocation

        // Check which screen contains the mouse
        var containingScreen: NSScreen? = NSScreen.screens.first
        for screen in NSScreen.screens {
            if screen.frame.contains(mouseLocation) {
                containingScreen = screen
                break
            }
        }
        let screenFrame = containingScreen?.frame ?? NSScreen.main?.frame ?? .zero

        // Convert mouseLocation to window coordinates (origin bottom-left)
        let cursorX = mouseLocation.x - screenFrame.origin.x
        let cursorY = mouseLocation.y - screenFrame.origin.y

        let cursorCenter = CGPoint(x: cursorX, y: cursorY)

        context.setBlendMode(.clear)
        context.addEllipse(in: CGRect(
            x: cursorCenter.x - cursorRadius,
            y: cursorCenter.y - cursorRadius,
            width: cursorRadius * 2,
            height: cursorRadius * 2
        ))
        context.fillPath()
        context.setBlendMode(.normal)
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: OverlayWindow!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Get mouse location
        let mouseLocation = NSEvent.mouseLocation

        // Find which screen contains the mouse
        var containingScreen: NSScreen? = NSScreen.screens.first
        for screen in NSScreen.screens {
            if screen.frame.contains(mouseLocation) {
                containingScreen = screen
                break
            }
        }
        let screenFrame = containingScreen?.frame ?? NSScreen.main?.frame ?? .zero

        let frame = screenFrame
        let window = OverlayWindow(frame: frame)
        let view = OverlayView(
            frame: NSRect(origin: .zero, size: frame.size),
            cursorRadius: 80,
            dimOpacity: 0.8,
            screenFrame: frame
        )
        window.contentView = view
        window.setFrameOrigin(frame.origin)
        window.makeKeyAndOrderFront(nil)
        self.window = window

        // Remove overlay after 1 second
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            NSApp.terminate(nil)
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
