// Focus.swift — focuses exactly (pid, wid). Never substitutes another window (SPEC.md §7.1).

import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

struct FocusObservation: Codable {
    let axFocusedAppPid: Int32?
    let workspaceFrontmostPid: Int32?
    let appFocusedWid: UInt32?
    /// Topmost on-screen window among the target app's own windows.
    let topOnScreenWid: UInt32?
    let targetOnScreen: Bool
    let targetMinimized: Bool?
    let appHidden: Bool?
    let visibleSpaceIds: [UInt64]
    let elapsedMs: Int
}

struct FocusAttempt: Codable {
    let tier: String  // "public" or "private"
    let steps: [String]
    let focused: Bool
    let observation: FocusObservation
}

struct FocusResponse: Codable {
    let schema: Int
    let ok: Bool
    let focused: Bool
    let tier: String?
    let code: String?
    let message: String?
    let targetSpaceIds: [UInt64]
    let resolvedBy: String?
    let before: FocusObservation?
    let attempts: [FocusAttempt]
}

func focusFailure(_ code: String, _ message: String, before: FocusObservation? = nil) -> FocusResponse {
    FocusResponse(
        schema: helperSchema, ok: false, focused: false, tier: nil, code: code, message: message, targetSpaceIds: [],
        resolvedBy: nil, before: before, attempts: [])
}

private func pump(_ seconds: TimeInterval) {
    // Lets NSWorkspace deliver its frontmost-app updates to this short-lived process.
    RunLoop.current.run(until: Date().addingTimeInterval(seconds))
}

func observe(pid: pid_t, wid: CGWindowID, element: AXUIElement?, started: Date) -> FocusObservation {
    let system = AXUIElementCreateSystemWide()
    var axFront: pid_t?
    if let raw = copyAttribute(system, kAXFocusedApplicationAttribute), CFGetTypeID(raw) == AXUIElementGetTypeID() {
        var p: pid_t = 0
        if AXUIElementGetPid(raw as! AXUIElement, &p) == .success { axFront = p }
    }
    var focusedWid: CGWindowID?
    let app = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(app, 0.5)
    if let raw = copyAttribute(app, kAXFocusedWindowAttribute), CFGetTypeID(raw) == AXUIElementGetTypeID() {
        focusedWid = PrivateAPI.shared.windowID(of: raw as! AXUIElement)
    }
    // Topmost on-screen window of this app among its real AX windows (ignores toolbars and other surfaces).
    let appWindows = Set(standardWindows(pid: pid).windows.filter { exclusionReason($0.value) == nil }.keys)
        .union([wid])
    var top: CGWindowID?
    var onScreen = false
    if let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
        as? [[String: Any]]
    {
        for info in list where (info[kCGWindowLayer as String] as? Int) == 0 {
            guard let w = info[kCGWindowNumber as String] as? CGWindowID, appWindows.contains(w) else { continue }
            if top == nil { top = w }
            if w == wid { onScreen = true }
        }
    }
    let minimized = element.flatMap { copyAttribute($0, kAXMinimizedAttribute) as? Bool }
    return FocusObservation(
        axFocusedAppPid: axFront,
        workspaceFrontmostPid: NSWorkspace.shared.frontmostApplication?.processIdentifier,
        appFocusedWid: focusedWid, topOnScreenWid: top, targetOnScreen: onScreen, targetMinimized: minimized,
        appHidden: NSRunningApplication(processIdentifier: pid)?.isHidden,
        visibleSpaceIds: spacesTopology().visibleSpaceIds,
        elapsedMs: Int(Date().timeIntervalSince(started) * 1000))
}

/// The frontmost app: the AX answer when there is one, otherwise NSWorkspace (AX returns none while some
/// Chromium apps are frontmost).
func frontPid(_ o: FocusObservation) -> Int32? { o.axFocusedAppPid ?? o.workspaceFrontmostPid }

func isFocused(_ o: FocusObservation, pid: pid_t, wid: CGWindowID) -> Bool {
    frontPid(o) == pid && o.appFocusedWid == wid && o.topOnScreenWid == wid && o.targetOnScreen
        && o.targetMinimized != true
}

/// Waits until `pid` is the frontmost app or `timeout` passes.
func waitFront(pid: pid_t, timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
        if NSWorkspace.shared.frontmostApplication?.processIdentifier == pid { return true }
        pump(0.03)
    }
    return NSWorkspace.shared.frontmostApplication?.processIdentifier == pid
}

/// Polls until the target is focused or `timeout` passes.
func confirm(pid: pid_t, wid: CGWindowID, element: AXUIElement?, started: Date, timeout: TimeInterval)
    -> (Bool, FocusObservation)
{
    let deadline = Date().addingTimeInterval(timeout)
    var last = observe(pid: pid, wid: wid, element: element, started: started)
    while !isFocused(last, pid: pid, wid: wid) && Date() < deadline {
        pump(0.05)
        last = observe(pid: pid, wid: wid, element: element, started: started)
    }
    return (isFocused(last, pid: pid, wid: wid), last)
}

func raiseAndMain(_ element: AXUIElement?, _ steps: inout [String]) {
    guard let element else { return }
    let raise = AXUIElementPerformAction(element, kAXRaiseAction as CFString)
    steps.append("raise:\(raise.rawValue)")
    let main = AXUIElementSetAttributeValue(element, kAXMainAttribute as CFString, kCFBooleanTrue)
    steps.append("main:\(main.rawValue)")
    let focused = AXUIElementSetAttributeValue(element, kAXFocusedAttribute as CFString, kCFBooleanTrue)
    steps.append("focusedAttr:\(focused.rawValue)")
    var pid: pid_t = 0
    if AXUIElementGetPid(element, &pid) == .success {
        let app = AXUIElementCreateApplication(pid)
        let r = AXUIElementSetAttributeValue(app, kAXFocusedWindowAttribute as CFString, element)
        steps.append("appFocusedWindow:\(r.rawValue)")
    }
}

func privateActivate(pid: pid_t, wid: CGWindowID, _ steps: inout [String]) -> Bool {
    let api = PrivateAPI.shared
    guard let getPSN = api.getProcessForPID, let setFront = api.setFrontProcess else {
        steps.append("private-unavailable")
        return false
    }
    var psn = ProcessSerialNumber()
    let status = getPSN(pid, &psn)
    guard status == noErr else {
        steps.append("psn:\(status)")
        return false
    }
    let result = setFront(&psn, wid, 0x200)  // 0x200: user-generated front switch, this window only
    steps.append("setFront:\(result)")
    return result == 0
}

enum ActivationMode: String { case publicOnly = "public", privateOnly = "private", auto }

func focusWindow(pid: pid_t, wid: CGWindowID, mode: ActivationMode, expectedBundle: String?) -> FocusResponse {
    let started = Date()
    guard AXIsProcessTrusted() else { return focusFailure("not-trusted", "Raycast does not have Accessibility permission") }
    guard let app = NSRunningApplication(processIdentifier: pid), !app.isTerminated else {
        return focusFailure("window-gone", "The application is no longer running")
    }
    if let expectedBundle, app.bundleIdentifier != expectedBundle {
        return focusFailure("pid-mismatch", "Process \(pid) now belongs to a different application")
    }
    // 1. Verify the exact window still exists and is owned by pid.
    let (ws, _) = windowServerInventory(pids: [pid])
    guard ws.contains(where: { $0.wid == wid }) else {
        return focusFailure("window-gone", "That window no longer exists")
    }
    let cid = PrivateAPI.shared.connection
    let targetSpaces = cid.flatMap { PrivateAPI.shared.spaces(of: wid, connection: $0) } ?? []
    // 2. Re-acquire the AX element by wid only.
    var element: AXUIElement?
    var resolvedBy: String?
    if let f = standardWindows(pid: pid).windows[wid] {
        element = f.element
        resolvedBy = f.foundBy
    } else {
        let scan = remoteTokenWindows(pid: pid, missing: [wid], budget: bruteForceBudget)
        if let f = scan.found[wid] {
            element = f.element
            resolvedBy = f.foundBy
        }
    }
    let before = observe(pid: pid, wid: wid, element: element, started: started)
    var steps: [String] = ["verify", "resolved:\(resolvedBy ?? "none")"]
    // 3. Unhide.
    if app.isHidden {
        steps.append("unhide:\(app.unhide())")
        pump(0.1)
    }
    // 4. Unminimize.
    if let element, (copyAttribute(element, kAXMinimizedAttribute) as? Bool) == true {
        let r = AXUIElementSetAttributeValue(element, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
        steps.append("unminimize:\(r.rawValue)")
        let deadline = Date().addingTimeInterval(0.6)
        while (copyAttribute(element, kAXMinimizedAttribute) as? Bool) == true && Date() < deadline { pump(0.03) }
    }
    var attempts: [FocusAttempt] = []
    // 5a. Public activation.
    if mode != .privateOnly {
        var s = steps
        s.append("activate:\(app.activate(options: []))")
        s.append("front:\(waitFront(pid: pid, timeout: 0.5))")
        raiseAndMain(element, &s)
        let (ok, obs) = confirm(pid: pid, wid: wid, element: element, started: started, timeout: 0.8)
        attempts.append(FocusAttempt(tier: "public", steps: s, focused: ok, observation: obs))
        if ok || mode == .publicOnly {
            return FocusResponse(
                schema: helperSchema, ok: true, focused: ok, tier: "public", code: nil, message: nil,
                targetSpaceIds: targetSpaces, resolvedBy: resolvedBy, before: before, attempts: attempts)
        }
    }
    // 5b. Private activation (Tier B), used alone or as the bounded fallback.
    var s = mode == .privateOnly ? steps : []
    _ = privateActivate(pid: pid, wid: wid, &s)
    s.append("front:\(waitFront(pid: pid, timeout: 0.5))")
    raiseAndMain(element, &s)
    let (ok, obs) = confirm(pid: pid, wid: wid, element: element, started: started, timeout: 0.8)
    attempts.append(FocusAttempt(tier: "private", steps: s, focused: ok, observation: obs))
    return FocusResponse(
        schema: helperSchema, ok: true, focused: ok, tier: "private", code: nil, message: nil,
        targetSpaceIds: targetSpaces, resolvedBy: resolvedBy, before: before, attempts: attempts)
}

