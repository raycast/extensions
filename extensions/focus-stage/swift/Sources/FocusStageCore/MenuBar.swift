import Foundation

/// Toggles "Automatically hide and show the menu bar" and "Automatically hide and show the Dock"
/// through System Events, the supported scripting route for changing these settings.
enum MenuBar {
    /// The current settings, read straight from the preferences (no System Events, no permission,
    /// no waiting). A missing value means the macOS default: not hidden.
    static func currentAutohide() -> (menuBar: Bool, dock: Bool) {
        func flag(_ key: String, _ domain: CFString) -> Bool {
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

    /// Turns auto-hide back off. `completion` runs on the main queue once System Events has answered.
    /// With `waitTimeout`, the call blocks until then, but no longer than that (for shutdown).
    static func restore(menuBar: Bool, dock: Bool, waitTimeout: TimeInterval? = nil,
                        completion: (() -> Void)? = nil) {
        guard menuBar || dock else {
            completion?()
            return
        }
        var lines: [String] = []
        if menuBar { lines.append("set autohide menu bar to false") }
        if dock { lines.append("set autohide to false") }
        let finished = DispatchSemaphore(value: 0)
        osascript(script(lines)) { _ in
            finished.signal()
            DispatchQueue.main.async { completion?() }
        }
        if let waitTimeout { _ = finished.wait(timeout: .now() + waitTimeout) }
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
