import Foundation

/// Toggles "Automatically hide and show the menu bar" and "Automatically hide and show the Dock"
/// through System Events, the supported scripting route for these settings.
enum MenuBar {
    /// Turns auto-hide on for the menu bar and/or the Dock unless it already is, in one round trip.
    /// The completion gets which of the two this call turned on.
    static func hide(menuBar: Bool, dock: Bool,
                     completion: @escaping (_ menuBarChanged: Bool, _ dockChanged: Bool) -> Void) {
        guard menuBar || dock else { return completion(false, false) }
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
            completion(output?.contains("m") ?? false, output?.contains("d") ?? false)
        }
    }

    /// Turns auto-hide back off for the ones a session turned on.
    static func restore(menuBar: Bool, dock: Bool, wait: Bool = false) {
        guard menuBar || dock else { return }
        var lines: [String] = []
        if menuBar { lines.append("set autohide menu bar to false") }
        if dock { lines.append("set autohide to false") }
        let script = "tell application \"System Events\" to tell dock preferences\n"
            + lines.joined(separator: "\n") + "\nend tell"
        osascript(script, wait: wait) { _ in }
    }

    /// Out of process, so a slow System Events (or the first Automation prompt) never blocks the UI.
    /// macOS attributes the Apple Events to FocusStage, so the prompt names this app.
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
            let result = process.terminationStatus == 0 ? text : nil
            DispatchQueue.main.async { completion(result) }
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
