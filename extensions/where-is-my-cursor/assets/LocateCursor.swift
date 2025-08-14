import Cocoa
import Foundation

// --- Data Structures ---

struct LockInfo: Codable {
    let pid: Int32
    let startTime: TimeInterval
    let duration: TimeInterval // 0 for indefinite
}

struct PresentationModeConfig {
    let screenOpacity: CGFloat
    let circleOpacity: CGFloat
    let hasBorder: Bool
}



// 1. Get the path to the executable file (it's an optional String)
guard let executablePath = Bundle.main.executablePath else {
    fatalError("Could not find executable path.")
}
let executableURL = URL(fileURLWithPath: executablePath)
let directoryURL = executableURL.deletingLastPathComponent()
let lockFileURL = directoryURL.appendingPathComponent("LocateCursor.lock")
let lockFilePath = lockFileURL.path


// --- UI Classes ---

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
    let presentationConfig: PresentationModeConfig?

    init(frame: NSRect, cursorRadius: CGFloat, dimOpacity: CGFloat, screenFrame: NSRect, presentationConfig: PresentationModeConfig? = nil) {
        self.cursorRadius = cursorRadius
        self.dimOpacity = dimOpacity
        self.screenFrame = screenFrame
        self.presentationConfig = presentationConfig
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        
        let mouseLocation = NSEvent.mouseLocation
        let screenContainingMouse = NSScreen.screens.first { $0.frame.contains(mouseLocation) } ?? NSScreen.main
        let screenFrame = screenContainingMouse?.frame ?? .zero
        
        let cursorInWindow = CGPoint(x: mouseLocation.x - screenFrame.origin.x, y: mouseLocation.y - screenFrame.origin.y)
        
        let circleRect = CGRect(
            x: cursorInWindow.x - cursorRadius,
            y: cursorInWindow.y - cursorRadius,
            width: cursorRadius * 2,
            height: cursorRadius * 2
        )

        if let config = presentationConfig {
            context.clear(bounds)
            let yellowWithOpacity = NSColor.yellow.withAlphaComponent(config.circleOpacity)
            context.setFillColor(yellowWithOpacity.cgColor)
            context.addEllipse(in: circleRect)
            context.fillPath()

            let inverseCirclePath = CGMutablePath()
            inverseCirclePath.addRect(bounds)
            inverseCirclePath.addEllipse(in: circleRect)

            let dimColor = NSColor.black.withAlphaComponent(config.screenOpacity)
            context.setFillColor(dimColor.cgColor)
            context.addPath(inverseCirclePath)
            context.fillPath(using: .evenOdd)

            if config.hasBorder {
                context.setStrokeColor(NSColor.white.cgColor)
                context.setLineWidth(2.0)
                context.strokeEllipse(in: circleRect)
            }
        } else {
            context.setFillColor(NSColor.black.withAlphaComponent(self.dimOpacity).cgColor)
            context.fill(bounds)
            context.setBlendMode(.clear)
            context.addEllipse(in: circleRect)
            context.fillPath()
            context.setBlendMode(.normal)
            context.setStrokeColor(NSColor.white.cgColor)
            context.setLineWidth(2.0)
            context.strokeEllipse(in: circleRect)
        }
    }
}

// --- Main Application Delegate ---

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: OverlayWindow!
    var mouseMoveMonitor: Any?
    var keyDownMonitor: Any?
    
    var presentationConfig: PresentationModeConfig?
    // var lockFilePath: String!
    // var lockFilePath: URL

    func applicationDidFinishLaunching(_ notification: Notification) {
        let args = CommandLine.arguments
        
        // self.lockFilePath = lockFilePath
        
        let command = args.count > 1 ? args[1] : "default"

        if command == "off" {
            terminateRunningInstance()
            NSApp.terminate(nil)
            return
        }
        
        terminateRunningInstance()
        
        // --- Argument Parsing ---
        
        switch command {
        case "on":
            // Indefinite, normal dimming mode.
            startSession(duration: 0)
            
        case "pon":
            // Indefinite, presentation mode. All arguments are optional.
            // Defaults: screen=30, circle=30, border=off
            let screenOpacityArg = args.count > 2 ? Int(args[2]) : nil
            let circleOpacityArg = args.count > 3 ? Int(args[3]) : nil
            let hasBorderArg = args.count > 4 ? Int(args[4]) : nil

            let screenOpacity = max(0, min(80, screenOpacityArg ?? 30))
            let circleOpacity = max(0, min(50, circleOpacityArg ?? 30))
            let hasBorder = (hasBorderArg ?? 0) != 0
            
            self.presentationConfig = PresentationModeConfig(
                screenOpacity: CGFloat(screenOpacity) / 100.0,
                circleOpacity: CGFloat(circleOpacity) / 100.0,
                hasBorder: hasBorder
            )
            startSession(duration: 0)
            
        default:
            // Timed duration mode (e.g., "10") or default 1-second flash.
            let duration = TimeInterval(command) ?? 1.0
            startSession(duration: duration)
        }
    }
    
    func startSession(duration: TimeInterval) {
        setupOverlay()
        // Only write a lock file if the session is persistent.
        if duration == 0 {
            writeLockFile(duration: duration)
        }
        
        if duration > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                self.cleanupAndTerminate()
            }
        }
    }

    func readLockFile() -> LockInfo? {
        guard let data = try? Data(contentsOf: URL(fileURLWithPath: lockFilePath)) else { return nil }
        return try? JSONDecoder().decode(LockInfo.self, from: data)
    }

    func writeLockFile(duration: TimeInterval) {
        let info = LockInfo(pid: getpid(), startTime: Date().timeIntervalSince1970, duration: duration)
        if let data = try? JSONEncoder().encode(info) {
            try? data.write(to: URL(fileURLWithPath: lockFilePath))
        }
    }

    func terminateRunningInstance() {
        guard let info = readLockFile() else { return }
        if kill(info.pid, 0) == 0 {
            kill(info.pid, SIGTERM)
            for _ in 0..<10 {
                if kill(info.pid, 0) != 0 { break }
                usleep(50000)
            }
        }
        try? FileManager.default.removeItem(atPath: lockFilePath)
    }

    func cleanupAndTerminate() {
        removeMonitors()
        try? FileManager.default.removeItem(atPath: lockFilePath)
        NSApp.terminate(nil)
    }
    
    func applicationWillTerminate(_ aNotification: Notification) {
        cleanupAndTerminate()
    }

    func setupOverlay() {
        let mouseLocation = NSEvent.mouseLocation
        let screenFrame = NSScreen.screens.first { $0.frame.contains(mouseLocation) }?.frame ?? NSScreen.main?.frame ?? .zero
        let window = OverlayWindow(frame: screenFrame)
        let view = OverlayView(
            frame: NSRect(origin: .zero, size: screenFrame.size),
            cursorRadius: 80,
            dimOpacity: 0.8,
            screenFrame: screenFrame,
            presentationConfig: self.presentationConfig
        )
        window.contentView = view
        window.setFrameOrigin(screenFrame.origin)
        window.makeKeyAndOrderFront(nil)
        self.window = window
        startMonitors()
    }
    
    func startMonitors() {
        mouseMoveMonitor = NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] _ in
            self?.window.contentView?.needsDisplay = true
        }
        keyDownMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 { self?.cleanupAndTerminate() }
        }
    }

    func removeMonitors() {
        if let monitor = mouseMoveMonitor { NSEvent.removeMonitor(monitor) }
        if let monitor = keyDownMonitor { NSEvent.removeMonitor(monitor) }
    }
}

// --- Main Execution ---

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
