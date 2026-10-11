// Close.swift — closes exactly (pid, wid) by pressing its close button, like clicking the red button. The app keeps
// running; it can still ask to save. Never substitutes another window (same rule as Focus.swift).
import AppKit
import ApplicationServices
import Foundation

struct CloseResponse: Codable {
    let schema: Int
    let ok: Bool
    let closed: Bool
    let code: String?
    let message: String?
}

private func closeFailure(_ code: String, _ message: String) -> CloseResponse {
    CloseResponse(schema: helperSchema, ok: false, closed: false, code: code, message: message)
}

/// Gone from the WindowServer, or its AX element no longer valid (apps that order a closed window out but keep it).
private func windowClosed(pid: pid_t, wid: CGWindowID, element: AXUIElement) -> Bool {
    if !windowServerInventory(pids: [pid]).windows.contains(where: { $0.wid == wid }) { return true }
    var value: AnyObject?
    return AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &value) == .invalidUIElement
}

func closeWindow(pid: pid_t, wid: CGWindowID, expectedBundle: String?) -> CloseResponse {
    guard AXIsProcessTrusted() else { return closeFailure("not-trusted", "Raycast does not have Accessibility permission") }
    guard let app = NSRunningApplication(processIdentifier: pid), !app.isTerminated else {
        return closeFailure("window-gone", "The application is no longer running")
    }
    if let expectedBundle, app.bundleIdentifier != expectedBundle {
        return closeFailure("pid-mismatch", "Process \(pid) now belongs to a different application")
    }
    guard windowServerInventory(pids: [pid]).windows.contains(where: { $0.wid == wid }) else {
        return closeFailure("window-gone", "That window no longer exists")
    }
    // Re-acquire the AX element by wid only, including windows on another Desktop.
    var element = standardWindows(pid: pid).windows[wid]?.element
    if element == nil { element = remoteTokenWindows(pid: pid, missing: [wid], budget: bruteForceBudget).found[wid]?.element }
    guard let element else {
        // A window that just closed lingers in the WindowServer for its close animation: recheck before blaming access.
        RunLoop.current.run(until: Date().addingTimeInterval(0.4))
        if !windowServerInventory(pids: [pid]).windows.contains(where: { $0.wid == wid }) {
            return closeFailure("window-gone", "That window no longer exists")
        }
        return closeFailure("unresolved", "macOS did not give access to that window")
    }
    guard let raw = copyAttribute(element, kAXCloseButtonAttribute), CFGetTypeID(raw) == AXUIElementGetTypeID() else {
        return closeFailure("no-close-button", "That window has no close button the app exposes")
    }
    let press = AXUIElementPerformAction(raw as! AXUIElement, kAXPressAction as CFString)
    // `cannotComplete`: the press was delivered and the app went into a modal save prompt before answering (observed
    // with Script Editor; likely Word), so it is not a refusal. Whether the window closed is checked below.
    guard press == .success || press == .cannotComplete else {
        return closeFailure("refused", "The app did not accept the close request (AX error \(press.rawValue))")
    }
    let deadline = Date().addingTimeInterval(1.5)
    var closed = windowClosed(pid: pid, wid: wid, element: element)
    while !closed && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        closed = windowClosed(pid: pid, wid: wid, element: element)
    }
    return CloseResponse(
        schema: helperSchema, ok: true, closed: closed, code: nil,
        message: closed ? nil : "Still open; it may be asking to save changes")
}
