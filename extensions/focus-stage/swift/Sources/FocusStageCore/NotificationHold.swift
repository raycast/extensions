import AppKit

/// Holds notification banners during a session. macOS has no public API for Focus modes, so this
/// pauses the process that draws the banners (NotificationCenter, SIGSTOP) and resumes it at the
/// end (SIGCONT). Notifications keep arriving and are stored as usual; the banners that came in
/// meanwhile appear as soon as it resumes, and all of them are in Notification Center.
/// While paused, Notification Center itself and desktop widgets don't respond either.
public enum NotificationHold {
    private static let bundleID = "com.apple.notificationcenterui"
    private static var heldPID: pid_t?

    public static var isHolding: Bool { heldPID != nil }

    public static func hold() {
        guard heldPID == nil,
              let pid = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first?.processIdentifier,
              kill(pid, SIGSTOP) == 0 else { return }
        heldPID = pid
    }

    public static func release() {
        guard let pid = heldPID else { return }
        heldPID = nil
        kill(pid, SIGCONT)
    }

    /// Resumes NotificationCenter even if this process didn't pause it: a session that crashed
    /// can't release its hold. Harmless when it isn't paused.
    public static func releaseStale() {
        for app in NSRunningApplication.runningApplications(withBundleIdentifier: bundleID) {
            kill(app.processIdentifier, SIGCONT)
        }
    }
}
