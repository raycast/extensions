import AppKit

/// What a session changed outside its own process, written to disk while it runs. If the session
/// dies without cleaning up (crash, force quit, a hung process killed), `restore` puts the desktop
/// back from this record: the window's frame, the menu bar and Dock settings, notifications.
public struct RecoveryRecord: Codable {
    var windowPID: Int32?
    var windowID: UInt32?
    /// Only when the session resized the window. AX coordinates.
    var originalFrame: CGRect?
    /// Auto-hide was off when the session started and the session turns it on: restore to off.
    /// Written before the hide call, so it holds even if the session dies while that call runs.
    var menuBarChanged = false
    var dockChanged = false

    enum CodingKeys: String, CodingKey { case windowPID, windowID, originalFrame, menuBarChanged, dockChanged }

    init(windowPID: Int32?, windowID: UInt32?, originalFrame: CGRect?) {
        self.windowPID = windowPID
        self.windowID = windowID
        self.originalFrame = originalFrame
    }

    /// Tolerates records written before a key existed.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        windowPID = try c.decodeIfPresent(Int32.self, forKey: .windowPID)
        windowID = try c.decodeIfPresent(UInt32.self, forKey: .windowID)
        originalFrame = try c.decodeIfPresent(CGRect.self, forKey: .originalFrame)
        menuBarChanged = try c.decodeIfPresent(Bool.self, forKey: .menuBarChanged) ?? false
        dockChanged = try c.decodeIfPresent(Bool.self, forKey: .dockChanged) ?? false
    }

    func save(to url: URL?) {
        guard let url else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONEncoder().encode(self).write(to: url, options: .atomic)
    }

    static func remove(at url: URL?) {
        guard let url else { return }
        try? FileManager.default.removeItem(at: url)
    }

    public struct Outcome {
        /// What was restored, for display.
        public var restored: [String] = []
        /// `false`: the menu bar or Dock couldn't be restored (System Events didn't answer in time
        /// or refused). The record is kept, so a later attempt still knows what to restore.
        public var complete = true
    }

    /// Restores what the record describes and deletes it, once everything is back. Notifications
    /// are always resumed.
    @discardableResult
    public static func restore(from url: URL) -> Outcome {
        NotificationHold.releaseStale()
        guard let data = try? Data(contentsOf: url),
              let record = try? JSONDecoder().decode(RecoveryRecord.self, from: data) else { return Outcome() }
        var restored: [String] = []
        if let pid = record.windowPID, let id = record.windowID, let frame = record.originalFrame,
           let window = WindowMover.window(pid: pid, id: id) {
            WindowMover.setFrame(frame, of: window, pid: pid)
            restored.append("window")
        }
        // Stopped after 5 s if System Events doesn't answer, so it can't fire during a later session.
        guard MenuBar.restore(menuBar: record.menuBarChanged, dock: record.dockChanged, timeout: 5) else {
            return Outcome(restored: restored, complete: false)
        }
        if record.menuBarChanged { restored.append("menu bar") }
        if record.dockChanged { restored.append("Dock") }
        remove(at: url)
        return Outcome(restored: restored)
    }
}
