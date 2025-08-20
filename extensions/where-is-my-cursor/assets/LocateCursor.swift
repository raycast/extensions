import Cocoa
import Foundation
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
        guard let url = Bundle.main.url(forResource: "locatecursor", withExtension: "json") else {
            print("Config file 'locatecursor.json' not found")
            return nil
        }
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            return try decoder.decode(Config.self, from: data)
        } catch {
            print("Error loading or decoding config: \(error)")
            return nil
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
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        
        let mouseLocation = NSEvent.mouseLocation
        let screenContainingMouse = NSScreen.screens.first { $0.frame.contains(mouseLocation) } ?? NSScreen.main
        let screenFrame = screenContainingMouse?.frame ?? .zero
        
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
// MARK: - Main Application Delegate
class AppDelegate: NSObject, NSApplicationDelegate {
    var window: OverlayWindow!
    var mouseMoveMonitor: Any?
    var keyDownMonitor: Any?
    
    private var lockFileURL: URL = {
        let directoryURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!.appendingPathComponent(Bundle.main.bundleIdentifier ?? "com.raycast.where-is-my-cursor")
        try? FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true, attributes: nil)
        return directoryURL.appendingPathComponent("LocateCursor.lock")
    }()
    private var lockFilePath: String {
        return lockFileURL.path
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        if isAnotherInstanceRunning() {
            terminateRunningInstance()
            NSApp.terminate(nil)
            return
        }
        let args = CommandLine.arguments
        let configLoader = ConfigLoader()
        guard let config = configLoader.loadConfig() else {
            print("Failed to load config.")
            NSApp.terminate(nil)
            return
        }
        var preset: PresetConfig
        var duration: TimeInterval
        if args.count > 1 {
            switch args[1] {
            case "-p":
                let presetName = args.count > 2 ? args[2] : "default"
                switch presetName {
                case "presentation":
                    preset = config.presentation
                case "simple":
                    preset = config.simple
                default:
                    preset = config.default
                }
                duration = preset.duration
            case "-c":
                // Custom config from JSON string
                if args.count > 2 {
                    let jsonString = args[2]
                    let decoder = JSONDecoder()
                    if let data = jsonString.data(using: .utf8), let customPreset = try? decoder.decode(PresetConfig.self, from: data) {
                        preset = customPreset
                        duration = customPreset.duration
                    } else {
                        print("Invalid custom config JSON.")
                        preset = config.default
                        duration = preset.duration
                    }
                } else {
                    preset = config.default
                    duration = preset.duration
                }
            case "off":
                terminateRunningInstance()
                NSApp.terminate(nil)
                return
            default:
                preset = config.default
                duration = preset.duration
            }
        } else {
            preset = config.default
            duration = preset.duration
        }
        startSession(with: preset, duration: duration)
    }
    
    private func startSession(with config: PresetConfig, duration: TimeInterval) {
        writeLockFile()
        setupOverlay(with: config)
        
        if duration > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                self.cleanupAndTerminate()
            }
        }
    }
    private func writeLockFile() {
        let pid = ProcessInfo.processInfo.processIdentifier
        try? String(pid).write(to: lockFileURL, atomically: true, encoding: .utf8)
    }
    private func readLockFile() -> Int32? {
        guard let pidString = try? String(contentsOf: lockFileURL, encoding: .utf8) else { return nil }
        return Int32(pidString)
    }
    private func isAnotherInstanceRunning() -> Bool {
        guard let pid = readLockFile() else { return false }
        return NSRunningApplication(processIdentifier: pid) != nil
    }
    private func terminateRunningInstance() {
        guard let pid = readLockFile() else { return }
        if let runningApp = NSRunningApplication(processIdentifier: pid) {
            runningApp.terminate()
        }
        try? FileManager.default.removeItem(at: lockFileURL)
    }
    private func cleanupAndTerminate() {
        removeMonitors()
        try? FileManager.default.removeItem(at: lockFileURL)
        NSApp.terminate(nil)
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
            self?.window.contentView?.needsDisplay = true
        }
        keyDownMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 { self?.cleanupAndTerminate() }
        }
    }
    private func removeMonitors() {
        if let monitor = mouseMoveMonitor { NSEvent.removeMonitor(monitor) }
        if
 let monitor = keyDownMonitor { NSEvent.removeMonitor(monitor) }
     }
}
// MARK: - Main Execution
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()