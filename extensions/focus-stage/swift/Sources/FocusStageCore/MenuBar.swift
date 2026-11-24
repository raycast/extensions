import Foundation

/// Toggles "Automatically hide and show the menu bar" and "Automatically hide and show the Dock"
/// through System Events, the supported scripting route for these settings.
enum MenuBar {
    /// A hide call in flight. System Events can take a while to answer (the first Automation prompt
    /// waits for the user), and a session can end meanwhile: it has to know what the call changed
    /// before it can restore anything.
    final class HideRequest {
        private let lock = NSLock()
        private var stored: (menuBar: Bool, dock: Bool)?
        private let finished = DispatchSemaphore(value: 0)
        fileprivate let group = DispatchGroup()

        fileprivate func finish(_ result: (menuBar: Bool, dock: Bool)) {
            lock.lock()
            stored = result
            lock.unlock()
            finished.signal()
        }

        /// Blocks until the call has finished (or the timeout passed). For shutdown, where the main
        /// queue can't run the completion anymore.
        func waitForResult(timeout: TimeInterval) -> (menuBar: Bool, dock: Bool)? {
            guard finished.wait(timeout: .now() + timeout) == .success else { return nil }
            finished.signal()  // stay signaled for later callers
            lock.lock()
            defer { lock.unlock() }
            return stored
        }

        /// Runs `block` on the main queue once the call's completion has run.
        func notify(_ block: @escaping () -> Void) {
            group.notify(queue: .main, execute: block)
        }
    }

    /// Turns auto-hide on for the menu bar and/or the Dock unless it already is, in one round trip.
    /// The completion (main queue) gets which of the two this call turned on.
    @discardableResult
    static func hide(menuBar: Bool, dock: Bool,
                     completion: @escaping (_ menuBarChanged: Bool, _ dockChanged: Bool) -> Void) -> HideRequest {
        let request = HideRequest()
        request.group.enter()
        let done = { (result: (menuBar: Bool, dock: Bool)) in
            request.finish(result)
            DispatchQueue.main.async {
                completion(result.menuBar, result.dock)
                request.group.leave()
            }
        }
        guard menuBar || dock else {
            done((false, false))
            return request
        }
        let script = """
            tell application "System Events" to tell dock preferences
                set changed to ""
                if \(menuBar) and not autohide menu bar then
                    set autohide menu bar to true
                    set changed to changed & "m"
                end if
                if \(dock) and not autohide then
                    set autohide to true
                    set changed to changed & "d"
                end if
                return changed
            end tell
            """
        osascript(script) { output in
            done((output?.contains("m") ?? false, output?.contains("d") ?? false))
        }
        return request
    }

    /// Turns auto-hide back off for the ones a session turned on. `completion` runs on the main
    /// queue once System Events has answered; with `wait`, the call itself blocks until then.
    static func restore(menuBar: Bool, dock: Bool, wait: Bool = false, completion: (() -> Void)? = nil) {
        guard menuBar || dock else {
            completion?()
            return
        }
        var lines: [String] = []
        if menuBar { lines.append("set autohide menu bar to false") }
        if dock { lines.append("set autohide to false") }
        let script = "tell application \"System Events\" to tell dock preferences\n"
            + lines.joined(separator: "\n") + "\nend tell"
        osascript(script, wait: wait) { _ in
            DispatchQueue.main.async { completion?() }
        }
    }

    /// Out of process, so a slow System Events (or the first Automation prompt) never blocks the UI.
    /// macOS attributes the Apple Events to this process, so the prompt names it.
    /// `completion` runs on a background queue (or right away if osascript can't start).
    private static func osascript(_ source: String, wait: Bool = false,
                                  completion: @escaping (String?) -> Void) {
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
            if wait { process.waitUntilExit() }
        } catch {
            NSLog("FocusStage: cannot run osascript: \(error)")
            completion(nil)
        }
    }
}
