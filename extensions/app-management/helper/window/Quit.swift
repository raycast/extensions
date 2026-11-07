// Quit.swift — asks one app to quit normally (like ⌘Q or Dock → Quit). Apps can still ask to save changes.
import AppKit
import Foundation

struct QuitResponse: Codable {
    let schema: Int
    let ok: Bool
    let quit: Bool
    let code: String?
    let message: String?
}

func quitApp(pid: pid_t, expectedBundle: String?) -> QuitResponse {
    guard let app = NSRunningApplication(processIdentifier: pid), !app.isTerminated else {
        return QuitResponse(schema: helperSchema, ok: false, quit: false, code: "app-gone", message: "The app is no longer running")
    }
    if let expectedBundle, app.bundleIdentifier != expectedBundle {
        return QuitResponse(
            schema: helperSchema, ok: false, quit: false, code: "pid-mismatch",
            message: "Process \(pid) now belongs to a different application")
    }
    guard app.terminate() else {
        return QuitResponse(schema: helperSchema, ok: false, quit: false, code: "refused", message: "The app did not accept the quit request")
    }
    let deadline = Date().addingTimeInterval(1.5)
    while !app.isTerminated && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.05)) }
    return QuitResponse(
        schema: helperSchema, ok: true, quit: app.isTerminated, code: nil,
        message: app.isTerminated ? nil : "Still running; it may be asking to save changes")
}
