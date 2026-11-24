import Foundation

/// Toggles "Automatically hide and show the menu bar" and "Automatically hide and show the Dock"
/// through System Events, the supported scripting route for changing these settings.
enum MenuBar {
    /// The current settings, read straight from the preferences (no System Events, no permission,
    /// no waiting). A missing value means the macOS default: not hidden.
    static func currentAutohide() -> (menuBar: Bool, dock: Bool) {
        func flag(_ key: String, _ domain: CFString) -> Bool {
            CFPreferencesAppSynchronize(domain)  // drop this process's cached copy
            let value = CFPreferencesCopyAppValue(key as CFString, domain)
            return (value as? Bool) ?? ((value as? NSNumber)?.boolValue ?? false)
        }
        return (flag("_HIHideMenuBar", kCFPreferencesAnyApplication), flag("autohide", "com.apple.dock" as CFString))
    }

    /// A hide call in flight. System Events can take a while to answer (the first Automation prompt
    /// waits for the user), and a session can end meanwhile.
    final class HideRequest {
        private let lock = NSLock()
        private var process: Process?
        private let finished = DispatchSemaphore(value: 0)
        fileprivate let group = DispatchGroup()

        fileprivate func started(_ process: Process?) {
            lock.lock()
            self.process = process
            lock.unlock()
        }

        fileprivate func finish() {
            finished.signal()
        }

        /// Blocks until the call has finished. `false` if it hadn't after `timeout`: the call is then
        /// stopped, so it can't hide anything after the session has restored the settings.
        func wait(timeout: TimeInterval) -> Bool {
            if finished.wait(timeout: .now() + timeout) == .success {
                finished.signal()  // stay signaled for later callers
                return true
            }
            lock.lock()
            defer { lock.unlock() }
            if let process, process.isRunning { process.terminate() }
            return false
        }

        /// Runs `block` on the main queue once the call has finished.
        func notify(_ block: @escaping () -> Void) {
            group.notify(queue: .main, execute: block)
        }
    }

    /// Turns auto-hide on for the menu bar and/or the Dock.
    @discardableResult
    static func hide(menuBar: Bool, dock: Bool) -> HideRequest {
        let request = HideRequest()
        request.group.enter()
        let done = {
            request.finish()
            DispatchQueue.main.async { request.group.leave() }
        }
        guard menuBar || dock else {
            done()
            return request
        }
        var lines: [String] = []
        if menuBar { lines.append("set autohide menu bar to true") }
        if dock { lines.append("set autohide to true") }
        let process = osascript(script(lines)) { _ in done() }
        request.started(process)
        return request
    }

    /// Turns auto-hide back off and reports whether the settings really are off afterwards, read
    /// from the preferences. `completion` runs on the main queue.
    static func restore(menuBar: Bool, dock: Bool, completion: @escaping (Bool) -> Void) {
        guard menuBar || dock else { return completion(true) }
        osascript(script(restoreLines(menuBar: menuBar, dock: dock))) { _ in
            let ok = isRestored(menuBar: menuBar, dock: dock)
            DispatchQueue.main.async { completion(ok) }
        }
    }

    /// The same, blocking (for shutdown and crash recovery), for at most `timeout`. A call System
    /// Events hasn't answered by then is stopped, so it can't change the settings later, during
    /// another session. `true` only if the settings are off now.
    static func restore(menuBar: Bool, dock: Bool, timeout: TimeInterval) -> Bool {
        guard menuBar || dock else { return true }
        let finished = DispatchSemaphore(value: 0)
        let process = osascript(script(restoreLines(menuBar: menuBar, dock: dock))) { _ in finished.signal() }
        if finished.wait(timeout: .now() + timeout) == .timedOut, let process {
            if process.isRunning { process.terminate() }
            _ = finished.wait(timeout: .now() + 1)
        }
        return isRestored(menuBar: menuBar, dock: dock)
    }

    private static func restoreLines(menuBar: Bool, dock: Bool) -> [String] {
        var lines: [String] = []
        if menuBar { lines.append("set autohide menu bar to false") }
        if dock { lines.append("set autohide to false") }
        return lines
    }

    private static func isRestored(menuBar: Bool, dock: Bool) -> Bool {
        let now = currentAutohide()
        return !(menuBar && now.menuBar) && !(dock && now.dock)
    }

    private static func script(_ lines: [String]) -> String {
        "tell application \"System Events\" to tell dock preferences\n" + lines.joined(separator: "\n") + "\nend tell"
    }

    /// Out of process, so a slow System Events (or the first Automation prompt) never blocks the UI.
    /// macOS attributes the Apple Events to this process, so the prompt names it.
    /// `completion` runs on a background queue (or right away if osascript can't start).
    @discardableResult
    private static func osascript(_ source: String, completion: @escaping (String?) -> Void) -> Process? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", source]
        let output = Pipe()
        let errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        process.terminationHandler = { process in
            let text = String(decoding: output.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            if process.terminationStatus != 0 {
                let message = String(decoding: errors.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
                NSLog("FocusStage: osascript failed: \(message)")
            }
            completion(process.terminationStatus == 0 ? text : nil)
        }
        do {
            try process.run()
            return process
        } catch {
            NSLog("FocusStage: cannot run osascript: \(error)")
            completion(nil)
            return nil
        }
    }
}
