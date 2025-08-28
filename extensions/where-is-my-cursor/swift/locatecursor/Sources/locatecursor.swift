import Cocoa
import Foundation
import RaycastSwiftMacros

// MARK: - Data Structures
struct CircleConfig: Codable {
    let radius: CGFloat
    let opacity: CGFloat
    let color: String
    let border: BorderConfig?
}

struct BorderConfig: Codable {
    let width: CGFloat
    let color: String
}

struct PresetConfig: Codable {
    let duration: TimeInterval
    let screenOpacity: CGFloat
    let circle: CircleConfig
}

struct Config: Codable {
    let `default`: PresetConfig
    let presentation: PresetConfig
    let simple: PresetConfig
}

// MARK: - Configuration Loader
class ConfigLoader {
    func loadConfig() -> Config? {
        if let url = Bundle.main.url(forResource: "../locatecursor", withExtension: "json") {
            do {
                let data = try Data(contentsOf: url)
                let decoder = JSONDecoder()
                return try decoder.decode(Config.self, from: data)
            } catch {
                print("Error loading or decoding config: \(error)")
                return nil
            }
        } else {
            print("Warning: locatecursor.json not found. Using default configuration.")
            return Config(
                default: PresetConfig(
                    duration: 2,
                    screenOpacity: 0.5,
                    circle: CircleConfig(
                        radius: 80,
                        opacity: 0.0,
                        color: "clear",
                        border: BorderConfig(width: 2, color: "white")
                    )
                ),
                presentation: PresetConfig(
                    duration: 0,
                    screenOpacity: 0.0,
                    circle: CircleConfig(
                        radius: 80,
                        opacity: 0.2,
                        color: "yellow",
                        border: BorderConfig(width: 0, color: "white")
                    )
                ),
                simple: PresetConfig(
                    duration: 5,
                    screenOpacity: 0,
                    circle: CircleConfig(
                        radius: 100,
                        opacity: 0.5,
                        color: "red",
                        border: BorderConfig(width: 5, color: "yellow")
                    )
                )
            )
        }
    }
}

// MARK: - UI Classes
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

func colorFromString(_ colorString: String) -> NSColor {
    let lowercasedColor = colorString.lowercased()
    
    let namedColors: [String: NSColor] = [
        "red": .red, "green": .green, "blue": .blue, "white": .white,
        "black": .black, "yellow": .yellow, "cyan": .cyan, "magenta": .magenta,
        "orange": .orange, "purple": .purple, "brown": .brown, "clear": .clear
    ]
    
    if let color = namedColors[lowercasedColor] {
        return color
    }
    
    if lowercasedColor.hasPrefix("#") {
        let hexString = String(lowercasedColor.dropFirst())
        if let hexValue = UInt32(hexString, radix: 16) {
            let red = CGFloat((hexValue & 0xFF0000) >> 16) / 255.0
            let green = CGFloat((hexValue & 0x00FF00) >> 8) / 255.0
            let blue = CGFloat(hexValue & 0x0000FF) / 255.0
            return NSColor(red: red, green: green, blue: blue, alpha: 1.0)
        }
    }
    
    return .black // Default color if string is invalid
}

class OverlayView: NSView {
    let config: PresetConfig

    init(frame: NSRect, config: PresetConfig) {
        self.config = config
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) {
        print("Error: init(coder:) is not implemented.")
        return nil
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let mouseLocation = NSEvent.mouseLocation
        guard let screenContainingMouse = NSScreen.screens.first(where: { $0.frame.contains(mouseLocation) }) else { return }
        let screenFrame = screenContainingMouse.frame

        let cursorInWindow = CGPoint(x: mouseLocation.x - screenFrame.origin.x, y: mouseLocation.y - screenFrame.origin.y)

        let circleRect = CGRect(
            x: cursorInWindow.x - config.circle.radius,
            y: cursorInWindow.y - config.circle.radius,
            width: config.circle.radius * 2,
            height: config.circle.radius * 2
        )

        // Fill the background with the screen opacity
        context.setFillColor(NSColor.black.withAlphaComponent(config.screenOpacity).cgColor)
        context.fill(bounds)

        if config.circle.color.lowercased() == "clear" {
            context.saveGState()
            context.addEllipse(in: circleRect)
            context.clip()
            context.clear(circleRect)
            context.restoreGState()
        } else {
            let circleColor = colorFromString(config.circle.color)
            context.setFillColor(circleColor.withAlphaComponent(config.circle.opacity).cgColor)
            context.fillEllipse(in: circleRect)
        }

        if let border = config.circle.border {
            let borderColor = colorFromString(border.color)
            context.setStrokeColor(borderColor.cgColor)
            context.setLineWidth(border.width)
            context.strokeEllipse(in: circleRect)
        }
    }
}


class LocateCursorTool: NSObject, NSApplicationDelegate {
    var window: OverlayWindow?
    var mouseMoveMonitor: Any?
    var keyDownMonitor: Any?

    private var lockFileURL: URL? = {
        guard let appSupportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            NSLog("Error: Unable to find Application Support directory.")
            return nil
        }
        let directoryURL = appSupportURL.appendingPathComponent("com.raycast.where-is-my-cursor")
        do {
            try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true, attributes: nil)
            return directoryURL.appendingPathComponent("LocateCursor.lock")
        } catch {
            NSLog("Error: Unable to create directory \(directoryURL): \(error)")
            return nil
        }
    }()

    func start(with config: PresetConfig, duration: TimeInterval) {
        if let pid = readLockFile() {
            if let runningApp = NSRunningApplication(processIdentifier: pid) {
                if runningApp.processIdentifier != ProcessInfo.processInfo.processIdentifier {
                    runningApp.terminate()
                    let start = Date()
                    while !runningApp.isTerminated && Date().timeIntervalSince(start) < 0.1 {
                        Thread.sleep(forTimeInterval: 0.05)
                    }
                    if !runningApp.isTerminated {
                        runningApp.forceTerminate()
                    }
                }
            }
        }

        writeLockFile()
        setupOverlay(with: config)

        if duration > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                self.cleanupAndTerminate()
            }
        }

        let app = NSApplication.shared
        app.delegate = self
        app.run()
    }

    func stop() {
        if isAnotherInstanceRunning() {
            terminateRunningInstance()
        }
    }

    private func writeLockFile() {
        guard let lockURL = lockFileURL else { return }
        let pid = ProcessInfo.processInfo.processIdentifier
        try? String(pid).write(to: lockURL, atomically: true, encoding: .utf8)
    }

    private func readLockFile() -> Int32? {
        guard let lockURL = lockFileURL, let pidString = try? String(contentsOf: lockURL, encoding: .utf8) else { return nil }
        return Int32(pidString)
    }

    private func isAnotherInstanceRunning() -> Bool {
        guard let pid = readLockFile() else { return false }
        return NSRunningApplication(processIdentifier: pid) != nil
    }

    private func terminateRunningInstance() {
        guard let pid = readLockFile() else { return }
        if let runningApp = NSRunningApplication(processIdentifier: pid) {
            if runningApp.processIdentifier != ProcessInfo.processInfo.processIdentifier {
                runningApp.terminate()
                let start = Date()
                while !runningApp.isTerminated && Date().timeIntervalSince(start) < 0.1 {
                    Thread.sleep(forTimeInterval: 0.05)
                }
                if !runningApp.isTerminated {
                    runningApp.forceTerminate()
                }
            }
        }
        if let lockURL = lockFileURL {
            try? FileManager.default.removeItem(at: lockURL)
        }
    }

    private func cleanupAndTerminate() {
        removeMonitors()
        if let pid = readLockFile(), pid == ProcessInfo.processInfo.processIdentifier {
            if let lockURL = lockFileURL {
                try? FileManager.default.removeItem(at: lockURL)
            }
        }
        if NSApp.delegate === self {
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        cleanupAndTerminate()
    }

    private func setupOverlay(with config: PresetConfig) {
        let mouseLocation = NSEvent.mouseLocation
        let screenFrame = NSScreen.screens.first { $0.frame.contains(mouseLocation) }?.frame ?? NSScreen.main?.frame ?? .zero

        let window = OverlayWindow(frame: screenFrame)
        let view = OverlayView(frame: NSRect(origin: .zero, size: screenFrame.size), config: config)

        window.contentView = view
        window.setFrameOrigin(screenFrame.origin)
        window.makeKeyAndOrderFront(nil)

        self.window = window

        startMonitors()
    }

    private func startMonitors() {
        mouseMoveMonitor = NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] _ in
            self?.window?.contentView?.needsDisplay = true
        }

        let escapeKeyCode: UInt16 = 53

        keyDownMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == escapeKeyCode {
                self?.cleanupAndTerminate()
            }
        }
    }

    private func removeMonitors() {
        if let monitor = mouseMoveMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = keyDownMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }
}

@raycast func locatecursor(arg1: String, arg2: String, arg3: String) {
    let tool = LocateCursorTool()

    if arg1 == "off" {
        tool.stop()
        return
    }
    
    let configLoader = ConfigLoader()
    guard let config = configLoader.loadConfig() else {
        print("Failed to load config.")
        return
    }

    var preset: PresetConfig

    if !arg1.isEmpty {
        switch arg1 {
        case "-p":
            let presetName = arg2
            switch presetName {
            case "presentation":
                preset = config.presentation
            case "simple":
                preset = config.simple
            default:
                preset = config.default
            }
        case "-c":
            if !arg2.isEmpty,
               let data = arg2.data(using: .utf8),
               let customPreset = try? JSONDecoder().decode(PresetConfig.self, from: data) {
                preset = customPreset
            } else {
                preset = config.default
            }
        default:
            preset = config.default
        }
    } else {
        preset = config.default
    }

    tool.start(with: preset, duration: preset.duration)
}

