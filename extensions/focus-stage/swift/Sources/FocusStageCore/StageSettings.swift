import AppKit

public enum Grain: Int, CaseIterable, Codable, Sendable {
    case off, subtle, medium, strong

    public var title: String { ["Off", "Subtle", "Medium", "Strong"][rawValue] }
    var opacity: Double { [0, 0.06, 0.1, 0.16][rawValue] }
}

/// Everything a session can be configured with. The app fills it from its menu (UserDefaults), the
/// Raycast extension from its preferences.
public struct StageSettings: Codable, Sendable {
    /// Window size as a fraction of the screen. 0 keeps the window's own size and position.
    public var fraction: Double = 0.8
    public var grain: Grain = .subtle
    public var glow = true
    public var coverSameAppWindows = true
    public var showLabel = true
    /// Turns on Dock auto-hide for the session (and back off afterwards if it was off).
    public var hideDock = true
    /// Holds notification banners during the session and lets them through when it ends.
    public var holdNotifications = false

    public init() {}
}

/// The window to build the stage around, captured the moment the hotkey fired. Launchers such as
/// Raycast step aside right after running a command, which hands focus to the previous app before
/// the stage starts; the hint keeps the stage on the window that was actually focused.
public struct TargetHint: Codable, Sendable {
    public var pid: Int32
    /// The window to focus. nil: no normal window was found, so the frontmost app is skipped.
    public var windowID: UInt32?
    public var bundleID: String?
    /// The frontmost app had something other than a normal window focused (e.g. the Raycast search
    /// bar), so `windowID` is the topmost normal window behind it, which may belong to the same app
    /// (the Raycast AI Chat behind the search bar).
    public var viaLauncher: Bool?

    public init(pid: Int32, windowID: UInt32?, bundleID: String?, viaLauncher: Bool = false) {
        self.pid = pid
        self.windowID = windowID
        self.bundleID = bundleID
        self.viaLauncher = viaLauncher
    }

    /// The window you are looking at, right now: the frontmost app's focused window, or, when that
    /// is a launcher or a panel, the topmost normal window on screen.
    public static func capture() -> TargetHint? {
        let ownPID = ProcessInfo.processInfo.processIdentifier
        guard let app = NSWorkspace.shared.frontmostApplication, app.processIdentifier != ownPID else { return nil }
        if let window = WindowMover.focusedWindow(pid: app.processIdentifier), WindowMover.isNormalWindow(window),
           let id = WindowMover.windowID(of: window) {
            return TargetHint(pid: app.processIdentifier, windowID: id, bundleID: app.bundleIdentifier)
        }
        for info in WindowMover.onScreenWindows() where info.layer == 0 && info.pid != ownPID {
            guard let owner = NSRunningApplication(processIdentifier: info.pid), owner.activationPolicy == .regular,
                  let window = WindowMover.window(pid: info.pid, id: info.id),
                  WindowMover.isNormalWindow(window) else { continue }
            return TargetHint(pid: info.pid, windowID: info.id, bundleID: owner.bundleIdentifier, viaLauncher: true)
        }
        return TargetHint(pid: app.processIdentifier, windowID: nil, bundleID: app.bundleIdentifier, viaLauncher: true)
    }

    /// `pid=…&window=…` for focusstage:// URLs.
    public var query: String {
        "pid=\(pid)" + (windowID.map { "&window=\($0)" } ?? "")
    }

    public init?(query items: [URLQueryItem]) {
        guard let pid = items.first(where: { $0.name == "pid" })?.value.flatMap(Int32.init) else { return nil }
        self.pid = pid
        windowID = items.first { $0.name == "window" }?.value.flatMap(UInt32.init)
        bundleID = nil
        viaLauncher = nil
    }
}
