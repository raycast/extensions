// Inventory.swift — discovers windows (SPEC.md §6.3). Identity is always (pid, CGWindowID).

import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

let raycastBundlePrefix = "com.raycast."

struct WSWindow {
    let wid: CGWindowID
    let pid: pid_t
    let bounds: CGRect
    let alpha: Double
    let isOnScreen: Bool
}

struct AppInfo: Codable {
    let pid: Int32
    let name: String
    let bundleId: String?
    let bundlePath: String?
    let isHidden: Bool
}

struct WindowRecord: Codable {
    let pid: Int32
    let wid: UInt32
    let title: String
    /// "ax" (non-empty AX title), "ax-empty" (AX element found, title empty), "none" (no AX element).
    let titleSource: String
    let isMinimized: Bool
    let isFullscreen: Bool
    let spaceIds: [UInt64]
    let onScreen: Bool
    let zIndex: Int?
    let resolved: Bool
    let role: String?
    let subrole: String?
    let foundBy: String  // "kAXWindows", "focused-or-main", "remote-token", "none"
    let width: Int
    let height: Int
}

struct ExcludedRecord: Codable {
    let pid: Int32
    let wid: UInt32
    let reason: String
    let role: String?
    let subrole: String?
    let title: String?
}

/// Layer-0 windows of regular apps that the WindowServer assigns to no Space (debug output only).
struct NoSpaceRecord: Codable {
    let pid: Int32
    let wid: UInt32
    let width: Int
    let height: Int
    let alpha: Double
    let onScreen: Bool
}

struct Warning: Codable {
    let pid: Int32
    let code: String
    let message: String
}

struct DisplayInfo: Codable {
    let uuid: String
    let name: String?
    let isMain: Bool
    let spaceIds: [UInt64]
    let spaceTypes: [Int]
    let currentSpaceId: UInt64?
}

struct SpacesInfo: Codable {
    let available: Bool
    let visibleSpaceIds: [UInt64]
    let displays: [DisplayInfo]
}

struct ListResponse: Codable {
    let schema: Int
    let ok: Bool
    let helper: String
    let generatedAt: String
    let elapsedMs: Int
    let accessibilityTrusted: Bool
    let spaces: SpacesInfo
    let apps: [AppInfo]
    let windows: [WindowRecord]
    let excluded: [ExcludedRecord]
    let noSpace: [NoSpaceRecord]?
    let warnings: [Warning]
    let code: String?
    let message: String?
}

// MARK: - WindowServer

func regularApps() -> [NSRunningApplication] {
    NSWorkspace.shared.runningApplications.filter { app in
        app.activationPolicy == .regular && !app.isTerminated
            && !(app.bundleIdentifier ?? "").hasPrefix(raycastBundlePrefix)
    }
}

/// Layer-0 windows owned by `pids`, plus the front-to-back order of on-screen ones.
func windowServerInventory(pids: Set<pid_t>) -> (windows: [WSWindow], zOrder: [CGWindowID: Int]) {
    var zOrder: [CGWindowID: Int] = [:]
    if let onScreen = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
        as? [[String: Any]]
    {
        var index = 0
        for info in onScreen {
            guard (info[kCGWindowLayer as String] as? Int) == 0,
                let wid = info[kCGWindowNumber as String] as? CGWindowID
            else { continue }
            zOrder[wid] = index
            index += 1
        }
    }
    var result: [WSWindow] = []
    guard
        let all = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID)
            as? [[String: Any]]
    else { return (result, zOrder) }
    for info in all {
        guard (info[kCGWindowLayer as String] as? Int) == 0,
            let wid = info[kCGWindowNumber as String] as? CGWindowID,
            let pid = info[kCGWindowOwnerPID as String] as? pid_t,
            pids.contains(pid)
        else { continue }
        var bounds = CGRect.zero
        if let dict = info[kCGWindowBounds as String] as? NSDictionary {
            bounds = CGRect(dictionaryRepresentation: dict as CFDictionary) ?? .zero
        }
        result.append(
            WSWindow(
                wid: wid, pid: pid, bounds: bounds,
                alpha: info[kCGWindowAlpha as String] as? Double ?? 1,
                isOnScreen: (info[kCGWindowIsOnscreen as String] as? Bool) ?? false))
    }
    return (result, zOrder)
}

// MARK: - Spaces

func screenNamesByUUID() -> [String: (name: String, isMain: Bool)] {
    var out: [String: (String, Bool)] = [:]
    let mainID = CGMainDisplayID()
    for screen in NSScreen.screens {
        guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
            continue
        }
        let displayID = CGDirectDisplayID(number.uint32Value)
        guard let uuid = CGDisplayCreateUUIDFromDisplayID(displayID)?.takeRetainedValue(),
            let uuidString = CFUUIDCreateString(nil, uuid) as String?
        else { continue }
        out[uuidString] = (screen.localizedName, displayID == mainID)
    }
    return out
}

func spacesTopology() -> SpacesInfo {
    let api = PrivateAPI.shared
    guard let cid = api.connection, let copy = api.copyManagedDisplaySpaces,
        let raw = copy(cid)?.takeRetainedValue() as? [NSDictionary]
    else { return SpacesInfo(available: false, visibleSpaceIds: [], displays: []) }
    let names = screenNamesByUUID()
    let mainUUID = names.first { $0.value.isMain }?.key
    var displays: [DisplayInfo] = []
    var visible: [UInt64] = []
    for entry in raw {
        var uuid = entry["Display Identifier"] as? String ?? ""
        if uuid == "Main", let mainUUID { uuid = mainUUID }
        let spaces = (entry["Spaces"] as? [NSDictionary]) ?? []
        let ids = spaces.compactMap { ($0["id64"] as? NSNumber)?.uint64Value }
        let types = spaces.map { ($0["type"] as? NSNumber)?.intValue ?? -1 }
        var current = ((entry["Current Space"] as? NSDictionary)?["id64"] as? NSNumber)?.uint64Value
        if let live = api.displayCurrentSpace, !uuid.isEmpty {
            let value = live(cid, uuid as CFString)
            if value != 0 { current = value }
        }
        if let current { visible.append(current) }
        displays.append(
            DisplayInfo(
                uuid: uuid, name: names[uuid]?.name, isMain: names[uuid]?.isMain ?? false,
                spaceIds: ids, spaceTypes: types, currentSpaceId: current))
    }
    return SpacesInfo(available: true, visibleSpaceIds: visible, displays: displays)
}

// MARK: - Accessibility

func copyAttribute(_ element: AXUIElement, _ name: String) -> AnyObject? {
    var value: AnyObject?
    return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}

struct AXWindowFacts {
    let element: AXUIElement
    let wid: CGWindowID
    let role: String?
    let subrole: String?
    let title: String?
    let isMinimized: Bool
    let isFullscreen: Bool
    let foundBy: String
}

func facts(for element: AXUIElement, wid: CGWindowID, foundBy: String) -> AXWindowFacts {
    AXWindowFacts(
        element: element, wid: wid,
        role: copyAttribute(element, kAXRoleAttribute) as? String,
        subrole: copyAttribute(element, kAXSubroleAttribute) as? String,
        title: copyAttribute(element, kAXTitleAttribute) as? String,
        isMinimized: (copyAttribute(element, kAXMinimizedAttribute) as? Bool) ?? false,
        isFullscreen: (copyAttribute(element, "AXFullScreen") as? Bool) ?? false,
        foundBy: foundBy)
}

/// Standard AX pass: kAXWindows plus the focused and main windows, which AppKit does not filter by Space.
func standardWindows(pid: pid_t) -> (windows: [CGWindowID: AXWindowFacts], error: AXError?) {
    let app = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(app, 1.0)
    var out: [CGWindowID: AXWindowFacts] = [:]
    var value: AnyObject?
    let err = AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &value)
    if err == .success, let list = value as? [AXUIElement] {
        for element in list {
            guard let wid = PrivateAPI.shared.windowID(of: element), out[wid] == nil else { continue }
            out[wid] = facts(for: element, wid: wid, foundBy: "kAXWindows")
        }
    }
    for attribute in [kAXFocusedWindowAttribute, kAXMainWindowAttribute] {
        guard let raw = copyAttribute(app, attribute), CFGetTypeID(raw) == AXUIElementGetTypeID() else { continue }
        let element = raw as! AXUIElement
        guard let wid = PrivateAPI.shared.windowID(of: element), out[wid] == nil else { continue }
        out[wid] = facts(for: element, wid: wid, foundBy: "focused-or-main")
    }
    return (out, err == .success || err == .noValue ? nil : err)
}

/// Remote-token scan for specific wids the standard pass missed (SPEC.md §6.3 step 4).
/// A descendant element reports its window's wid, so the role must be AXWindow as well.
func remoteTokenWindows(pid: pid_t, missing: Set<CGWindowID>, budget: TimeInterval) -> (
    found: [CGWindowID: AXWindowFacts], timedOut: Bool
) {
    guard !missing.isEmpty else { return ([:], false) }
    var remaining = missing
    var found: [CGWindowID: AXWindowFacts] = [:]
    let result = PrivateAPI.shared.scanRemoteElements(pid: pid, budget: budget) { element in
        guard let wid = PrivateAPI.shared.windowID(of: element), remaining.contains(wid),
            (copyAttribute(element, kAXRoleAttribute) as? String) == (kAXWindowRole as String)
        else { return false }
        found[wid] = facts(for: element, wid: wid, foundBy: "remote-token")
        remaining.remove(wid)
        return remaining.isEmpty
    }
    return (found, result.timedOut && !remaining.isEmpty)
}

/// Which AX windows are user windows (SPEC.md §6.3 step 3).
func exclusionReason(_ f: AXWindowFacts) -> String? {
    if f.role != (kAXWindowRole as String) { return "role-not-window" }
    if f.subrole == (kAXStandardWindowSubrole as String) { return nil }
    // Minimized windows often report AXDialog, so a minimized dialog is always kept.
    if f.subrole == (kAXDialogSubrole as String) {
        return (f.title ?? "").isEmpty && !f.isMinimized ? "untitled-dialog" : nil
    }
    return "subrole-\(f.subrole ?? "none")"
}

/// Unresolved windows (no AX element) that are not user windows:
/// - on a visible Space, kAXWindows is authoritative, so a window it omits is a surface, not a window;
/// - bars and strips smaller than a usable window.
func unresolvedExclusion(_ w: WSWindow, spaceIds: [SpaceID], visible: Set<SpaceID>) -> String? {
    if !spaceIds.isEmpty && spaceIds.allSatisfy({ visible.contains($0) }) { return "not-in-kAXWindows-on-visible-space" }
    if w.bounds.width < 100 || w.bounds.height < 120 { return "unresolved-small-surface" }
    return nil
}

// MARK: - List

let bruteForceBudget: TimeInterval = 0.25

func buildList(debug: Bool = false) -> ListResponse {
    let started = Date()
    let trusted = AXIsProcessTrusted()
    let apps = regularApps()
    let pids = Set(apps.map { $0.processIdentifier })
    let (wsWindows, zOrder) = windowServerInventory(pids: pids)
    let spaces = spacesTopology()
    let api = PrivateAPI.shared
    let cid = api.connection

    var spaceMap: [CGWindowID: [SpaceID]] = [:]
    for w in wsWindows {
        if let cid, let s = api.spaces(of: w.wid, connection: cid) { spaceMap[w.wid] = s }
    }
    let spacesKnown = cid != nil && api.copySpacesForWindows != nil
    // Candidate user windows: layer 0, regular app, assigned to a Space (when Space data exists).
    let visibleSpaces = Set(spaces.visibleSpaceIds)
    let candidates = wsWindows.filter { !spacesKnown || !(spaceMap[$0.wid] ?? []).isEmpty }
    let byPid = Dictionary(grouping: candidates, by: { $0.pid })

    let appList = apps.filter { byPid[$0.processIdentifier] != nil }
    let lock = NSLock()
    var windows: [WindowRecord] = []
    var excluded: [ExcludedRecord] = []
    var warnings: [Warning] = []

    if trusted {
        DispatchQueue.concurrentPerform(iterations: appList.count) { index in
            let app = appList[index]
            let pid = app.processIdentifier
            let ws = byPid[pid] ?? []
            let wsIDs = Set(ws.map { $0.wid })
            let standard = standardWindows(pid: pid)
            var known = standard.windows.filter { wsIDs.contains($0.key) }
            var localWarnings: [Warning] = []
            if let err = standard.error {
                localWarnings.append(Warning(pid: pid, code: "ax-error", message: "kAXWindows failed: \(err.rawValue)"))
            }
            let missing = wsIDs.subtracting(known.keys)
            if !missing.isEmpty {
                let scan = remoteTokenWindows(pid: pid, missing: missing, budget: bruteForceBudget)
                known.merge(scan.found) { a, _ in a }
                if scan.timedOut {
                    localWarnings.append(
                        Warning(
                            pid: pid, code: "ax-budget",
                            message: "\(wsIDs.subtracting(known.keys).count) window(s) not resolved within \(Int(bruteForceBudget * 1000)) ms"))
                }
            }
            var localWindows: [WindowRecord] = []
            var localExcluded: [ExcludedRecord] = []
            for w in ws {
                let spaceIds = spaceMap[w.wid] ?? []
                if let f = known[w.wid] {
                    if let reason = exclusionReason(f) {
                        localExcluded.append(
                            ExcludedRecord(pid: pid, wid: w.wid, reason: reason, role: f.role, subrole: f.subrole, title: f.title))
                        continue
                    }
                    let title = (f.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    localWindows.append(
                        WindowRecord(
                            pid: pid, wid: w.wid, title: title, titleSource: title.isEmpty ? "ax-empty" : "ax",
                            isMinimized: f.isMinimized, isFullscreen: f.isFullscreen, spaceIds: spaceIds,
                            onScreen: w.isOnScreen, zIndex: zOrder[w.wid], resolved: true, role: f.role,
                            subrole: f.subrole, foundBy: f.foundBy, width: Int(w.bounds.width),
                            height: Int(w.bounds.height)))
                } else if let reason = unresolvedExclusion(w, spaceIds: spaceIds, visible: visibleSpaces) {
                    localExcluded.append(
                        ExcludedRecord(pid: pid, wid: w.wid, reason: reason, role: nil, subrole: nil, title: nil))
                } else {
                    localWindows.append(
                        WindowRecord(
                            pid: pid, wid: w.wid, title: "", titleSource: "none", isMinimized: false,
                            isFullscreen: false, spaceIds: spaceIds, onScreen: w.isOnScreen, zIndex: zOrder[w.wid],
                            resolved: false, role: nil, subrole: nil, foundBy: "none", width: Int(w.bounds.width),
                            height: Int(w.bounds.height)))
                }
            }
            lock.lock()
            windows.append(contentsOf: localWindows)
            excluded.append(contentsOf: localExcluded)
            warnings.append(contentsOf: localWarnings)
            lock.unlock()
        }
    }

    let appsWithWindows = Set(windows.map { $0.pid })
    let appInfos = appList.filter { appsWithWindows.contains($0.processIdentifier) }.map {
        AppInfo(
            pid: $0.processIdentifier, name: $0.localizedName ?? "Unknown", bundleId: $0.bundleIdentifier,
            bundlePath: $0.bundleURL?.path, isHidden: $0.isHidden)
    }
    windows.sort { ($0.pid, $0.wid) < ($1.pid, $1.wid) }
    excluded.sort { ($0.pid, $0.wid) < ($1.pid, $1.wid) }
    warnings.sort { ($0.pid, $0.code) < ($1.pid, $1.code) }
    return ListResponse(
        schema: helperSchema, ok: trusted, helper: helperVersion,
        generatedAt: ISO8601DateFormatter().string(from: Date()),
        elapsedMs: Int(Date().timeIntervalSince(started) * 1000), accessibilityTrusted: trusted, spaces: spaces,
        apps: appInfos, windows: windows, excluded: excluded,
        noSpace: debug
            ? wsWindows.filter { spacesKnown && (spaceMap[$0.wid] ?? []).isEmpty }.map {
                NoSpaceRecord(
                    pid: $0.pid, wid: $0.wid, width: Int($0.bounds.width), height: Int($0.bounds.height), alpha: $0.alpha,
                    onScreen: $0.isOnScreen)
            } : nil,
        warnings: warnings,
        code: trusted ? nil : "not-trusted",
        message: trusted ? nil : "Raycast does not have Accessibility permission")
}
