import AppKit
import CoreGraphics
import ApplicationServices
import Foundation
import Security
import Darwin

let bundleID = "app.cotypist.Cotypist"
let completionLabel = "Enable completions by default"
let knownPanes = ["Setup", "General", "Context", "Personalization", "Emoji", "Shortcuts", "Battery", "App Settings", "Cotypist Labs", "Statistics", "Subscription", "About", "Contact Support"]
let start = ProcessInfo.processInfo.systemUptime
let workEnd = start + 14
let cleanupEnd = start + 21
var phaseEnd = workEnd
var diagnosticPhase = "preflight"
func checkTime() throws { if ProcessInfo.processInfo.systemUptime >= phaseEnd { throw NativeFailure(message: "Cotypist's control deadline was reached. Check its setting before retrying.") } }
func fail(_ message: String) throws -> Never { throw NativeFailure(message: message) }
var controlledPID: pid_t = 0
func owned(_ element: AXUIElement) throws {
    try checkTime()
    var pid: pid_t = 0
    let error = AXUIElementGetPid(element, &pid)
    guard error == .success else { try fail("Cotypist's Accessibility element ownership could not be read (error \(error.rawValue)). " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementGetPid")) }
    do { try validateSnapshotNode(ownerPID: pid, expectedPID: controlledPID, depth: 0, count: 1) }
    catch { try fail(((error as? NativeFailure)?.message ?? "Cotypist's element ownership could not be verified.") + " " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementGetPid")) }
}
func attribute(_ element: AXUIElement, _ name: String, required: Bool = false) throws -> CFTypeRef? {
    try owned(element)
    var value: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
    do { switch try optionalAXDisposition(errorCode: error.rawValue, required: required) {
    case .absent:
        if required { try fail("A required Cotypist Accessibility attribute is unavailable: " + name + ".") }
        return nil
    case .value:
        guard let value else { try fail("Cotypist returned an empty successful Accessibility value: " + name + ".") }
        return value
    } } catch { try fail(((error as? NativeFailure)?.message ?? "Cotypist's Accessibility attribute could not be read.") + " " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name)) }
}
func text(_ element: AXUIElement, _ name: String, required: Bool = false) throws -> String? {
    guard let value = try attribute(element, name, required: required) else { return nil }
    guard let value = value as? String else { try fail("Cotypist returned an unexpected text attribute type. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name)) }
    return value
}
func bool(_ element: AXUIElement, _ name: String, required: Bool = false) throws -> Bool? {
    guard let value = try attribute(element, name, required: required) else { return nil }
    if let number = value as? NSNumber {
        do { return try nativeBoolean(number.doubleValue) }
        catch { try fail(((error as? NativeFailure)?.message ?? "Cotypist's boolean state could not be verified.") + " " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name)) }
    }
    if let value = value as? String { if value == "0" || value == "off" { return false }; if value == "1" || value == "on" { return true } }
    try fail("Cotypist returned an unexpected boolean attribute type. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name))
}
func elements(_ element: AXUIElement, _ name: String, required: Bool = false) throws -> [AXUIElement] {
    guard let value = try attribute(element, name, required: required) else { return [] }
    guard let values = value as? [AXUIElement] else { try fail("Cotypist returned an unexpected Accessibility element array. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name)) }
    for value in values { try owned(value) }
    return values
}
func optionalElement(_ element: AXUIElement, _ name: String) throws -> AXUIElement? {
    guard let value = try attribute(element, name) else { return nil }
    guard CFGetTypeID(value) == AXUIElementGetTypeID() else { try fail("Cotypist returned an unexpected Accessibility element. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyAttributeValue", attribute: name)) }
    let result = unsafeBitCast(value, to: AXUIElement.self); try owned(result); return result
}
func waitFor<T>(_ getter: () throws -> T?, timeout: TimeInterval = 2, message: String = "Cotypist did not provide the expected native acknowledgement in time.") throws -> T {
    let end = min(phaseEnd, ProcessInfo.processInfo.systemUptime + timeout)
    repeat {
        try checkTime()
        if let value = try getter() { return value }
        RunLoop.current.run(until: Date().addingTimeInterval(0.06))
    } while ProcessInfo.processInfo.systemUptime < end
    try fail(message)
}
func press(_ element: AXUIElement) throws {
    guard try bool(element, kAXEnabledAttribute, required: true) == true,
          AXUIElementPerformAction(element, kAXPressAction as CFString) == .success else { try fail("Cotypist did not accept the requested native action. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementPerformAction", attribute: kAXPressAction)) }
}
struct WindowTree {
    let root: AXUIElement
    var nodes: [ControlNode] = []
    var elements: [AXUIElement] = []
    var selected: [Int: Bool] = [:]
    var modal = false
    var modalIDs: [Int] = []
    init(_ root: AXUIElement, total: inout Int) throws {
        self.root = root
        func collect(_ element: AXUIElement, parent: Int?, depth: Int) throws -> Int {
            try checkTime(); try owned(element)
            total += 1
            try validateSnapshotNode(ownerPID: controlledPID, expectedPID: controlledPID, depth: depth, count: total)
            let kind = try text(element, kAXRoleAttribute, required: true)!
            let subtype = try text(element, kAXSubroleAttribute) ?? ""
            let isModal = try bool(element, kAXModalAttribute, required: kind == kAXWindowRole) ?? false
            var names: [String] = []
            if !["AXTextField", "AXTextArea", "AXSecureTextField"].contains(kind) {
                names = try [kAXTitleAttribute, kAXDescriptionAttribute].compactMap { try text(element, $0) }
                if [kAXStaticTextRole, kAXButtonRole, kAXPopUpButtonRole].contains(kind), let value = try attribute(element, kAXValueAttribute) as? String { names.append(value) }
            }
            let id = elements.count; elements.append(element)
            if kind == kAXSheetRole || subtype == kAXDialogSubrole || subtype == kAXSystemDialogSubrole || isModal { modal = true; modalIDs.append(id) }
            nodes.append(ControlNode(id: id, role: kind, labels: names.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }, parent: parent, children: []))
            if kind == kAXRowRole, let value = try bool(element, kAXSelectedAttribute) { selected[id] = value }
            let childValues = try elementsOf(element, kind: kind)
            var ids: [Int] = []
            for child in childValues { ids.append(try collect(child, parent: id, depth: depth + 1)) }
            let old = nodes[id]; nodes[id] = ControlNode(id: id, role: old.role, labels: old.labels, parent: parent, children: ids)
            return id
        }
        _ = try collect(root, parent: nil, depth: 0)
    }
    func subtree(_ id: Int) -> [Int] { [id] + nodes[id].children.flatMap { subtree($0) } }
    func row(_ pane: String) -> Int? {
        nodes.first { $0.role == kAXRowRole && subtree($0.id).contains { id in nodes[id].labels.contains { $0 == pane || $0.hasPrefix(pane + ",") } } }?.id
    }
    var isSettings: Bool { row("General") != nil && row("Shortcuts") != nil }
    var pane: String? { let values = knownPanes.filter { name in row(name).map { selected[$0] == true } ?? false }; return values.count == 1 ? values[0] : nil }
}
func elementsOf(_ element: AXUIElement, kind: String) throws -> [AXUIElement] {
    try elements(element, kAXChildrenAttribute, required: [kAXWindowRole, kAXSheetRole].contains(kind))
}
func appWindows(_ app: AXUIElement) throws -> [AXUIElement] {
    var result = try elements(app, kAXWindowsAttribute, required: true)
    for name in [kAXMainWindowAttribute, kAXFocusedWindowAttribute] {
        if let value = try optionalElement(app, name), !result.contains(where: { CFEqual($0, value) }) { result.append(value) }
    }
    for child in try elements(app, kAXChildrenAttribute) {
        let kind = try text(child, kAXRoleAttribute, required: true)!
        if [kAXWindowRole, kAXSheetRole].contains(kind), !result.contains(where: { CFEqual($0, child) }) { result.append(child) }
    }
    return result
}
struct AppSnapshot {
    var trees: [WindowTree]
    init(_ app: AXUIElement) throws {
        var total = 0
        trees = try appWindows(app).map { try WindowTree($0, total: &total) }
    }
    var modal: Bool { trees.contains { $0.modal } }
    func settings() throws -> WindowTree? {
        let values = trees.filter { $0.isSettings }
        guard values.count <= 1 else { try fail("Multiple Cotypist settings windows are open. Close the extra window before using controls.") }
        return values.first
    }
    func contains(_ window: AXUIElement) -> Bool { trees.contains { CFEqual($0.root, window) } }
}
func ownedMetadata() throws -> [WindowMetadataRecord] {
    try checkTime()
    guard let rows = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { try fail("Cotypist's independent window metadata could not be enumerated.") }
    var result: [WindowMetadataRecord] = []
    for row in rows {
        // Filter by PID before reading any other field. No window titles,
        // owner names, image pixels, or other-app data are inspected or logged.
        guard let owner = row[kCGWindowOwnerPID as String] as? NSNumber, owner.int32Value == controlledPID else { continue }
        guard let id = row[kCGWindowNumber as String] as? NSNumber,
              let layer = row[kCGWindowLayer as String] as? NSNumber,
              id.doubleValue == Double(id.intValue), layer.doubleValue == Double(layer.intValue),
              let bounds = row[kCGWindowBounds as String] as? [String: Any],
              let x = bounds["X"] as? NSNumber, let y = bounds["Y"] as? NSNumber,
              let width = bounds["Width"] as? NSNumber, let height = bounds["Height"] as? NSNumber else { try fail("Cotypist's independent window metadata was incomplete or malformed.") }
        let value = WindowMetadataRecord(id: id.intValue, layer: layer.intValue, x: x.doubleValue, y: y.doubleValue, width: width.doubleValue, height: height.doubleValue)
        try validateWindowMetadata(value); result.append(value)
        guard result.count <= 1600 else { try fail("Cotypist's window metadata exceeded the safety limit.") }
    }
    return result.sorted { $0.id < $1.id }
}
func stableBaseline(_ app: AXUIElement) throws -> AppSnapshot {
    diagnosticPhase = "baseline-first"
    let first = try AppSnapshot(app)
    if first.modal { try fail("Resolve Cotypist's existing dialog before running controls. It was left untouched.") }
    let firstSettings = try first.settings()
    let firstMetadata = firstSettings == nil ? try ownedMetadata() : []
    if firstSettings == nil { try confirmClosedBaseline(axWindowCount: first.trees.count, ownedWindows: firstMetadata) }
    RunLoop.current.run(until: Date().addingTimeInterval(0.06))
    diagnosticPhase = "baseline-second"
    let second = try AppSnapshot(app)
    if second.modal { try fail("A Cotypist dialog appeared during baseline inspection. It was left untouched.") }
    let secondSettings = try second.settings()
    let sameSettingsWindow = firstSettings.flatMap { first in secondSettings.map { CFEqual(first.root, $0.root) } } ?? false
    try confirmSettingsIdentity(firstHasSettings: firstSettings != nil, secondHasSettings: secondSettings != nil, sameWindow: sameSettingsWindow)
    guard first.trees.count == second.trees.count,
          zip(first.trees, second.trees).allSatisfy({ CFEqual($0.root, $1.root) && $0.pane == $1.pane && $0.isSettings == $1.isSettings }) else { try fail("Cotypist's window, settings classification, or pane changed during baseline inspection. Retry after it settles.") }
    if firstSettings == nil {
        let secondMetadata = try ownedMetadata()
        guard firstMetadata == secondMetadata else { try fail("Cotypist's independent window metadata changed during baseline inspection.") }
        try confirmClosedBaseline(axWindowCount: second.trees.count, ownedWindows: secondMetadata)
    }
    return second
}
func selectPane(_ tree: WindowTree, _ pane: String) throws {
    guard let id = tree.row(pane) else { try fail("Cotypist's expected settings row was not found.") }
    let row = tree.elements[id]; try owned(row)
    var names: CFArray?
    guard AXUIElementCopyActionNames(row, &names) == .success, let actions = names as? [String] else { try fail("Cotypist's settings row actions could not be read. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementCopyActionNames")) }
    if actions.contains(kAXPressAction) { try press(row) }
    else {
        var settable: DarwinBoolean = false
        guard AXUIElementIsAttributeSettable(row, kAXSelectedAttribute as CFString, &settable) == .success && settable.boolValue else { try fail("Cotypist's settings row cannot be selected safely. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementIsAttributeSettable", attribute: kAXSelectedAttribute)) }
        guard AXUIElementSetAttributeValue(row, kAXSelectedAttribute as CFString, kCFBooleanTrue) == .success else { try fail("Cotypist's settings row cannot be selected safely. " + nativeDiagnostic(phase: diagnosticPhase, api: "AXUIElementSetAttributeValue", attribute: kAXSelectedAttribute)) }
    }
}
func currentSettings(_ app: AXUIElement, exact window: AXUIElement) throws -> WindowTree {
    let snapshot = try AppSnapshot(app)
    if snapshot.modal { try fail("An unexpected Cotypist dialog appeared. Resolve it before retrying.") }
    guard let tree = try snapshot.settings(), CFEqual(tree.root, window) else { try fail("Cotypist's original settings window is no longer uniquely available.") }
    return tree
}
func completionControl(_ tree: WindowTree) throws -> AXUIElement { tree.elements[try locateDefaultControl(tree.nodes, label: completionLabel)] }
func expectedDisableSheet(_ snapshot: AppSnapshot) throws -> (WindowTree, Int)? {
    var matches: [(WindowTree, Int)] = []
    for tree in snapshot.trees {
        for node in tree.nodes where node.role == kAXSheetRole {
            if tree.subtree(node.id).contains(where: { id in tree.nodes[id].labels.contains { $0.hasPrefix("Disable completions by default?") } }) { matches.append((tree, node.id)) }
        }
    }
    guard matches.count <= 1 else { try fail("Cotypist exposed multiple disable-confirmation sheets. No dialog was accepted.") }
    guard let match = matches.first else { return nil }
    let allowedIDs = Set(match.0.subtree(match.1))
    guard snapshot.trees.allSatisfy({ tree in
        tree.modalIDs.isEmpty || (CFEqual(tree.root, match.0.root) && tree.modalIDs.allSatisfy { allowedIDs.contains($0) })
    }) else { try fail("An additional Cotypist dialog appeared. No dialog was accepted.") }
    return match
}
func settledState(_ window: AXUIElement, desired: Bool, app: AXUIElement) throws -> Bool {
    var since: TimeInterval?
    return try waitFor({
        let tree = try currentSettings(app, exact: window)
        let value = try requireBoolean(bool(try completionControl(tree), kAXValueAttribute, required: true))
        if value != desired { since = nil; return nil }
        let now = ProcessInfo.processInfo.systemUptime
        if since == nil { since = now }
        return now - since! >= 0.25 ? value : nil
    }, timeout: 2.5)
}
func requirement() throws -> SecRequirement {
    var result: SecRequirement?
    let identity = "anchor apple generic and identifier \"app.cotypist.Cotypist\" and certificate leaf[subject.OU] = \"MRLF43FW3G\""
    guard SecRequirementCreateWithString(identity as CFString, [], &result) == errSecSuccess, let result else { try fail("Cannot prepare Cotypist's developer identity check.") }
    return result
}
func verifyApp(_ url: URL) throws {
    var code: SecStaticCode?
    guard SecStaticCodeCreateWithPath(url as CFURL, [], &code) == errSecSuccess, let code,
          SecStaticCodeCheckValidity(code, SecCSFlags(rawValue: kSecCSStrictValidate), try requirement()) == errSecSuccess else { try fail("The installed app does not match Cotypist's expected developer signature. Reinstall from cotypist.app.") }
}
func verifyProcess(_ app: NSRunningApplication, at url: URL) throws {
    guard app.bundleURL?.resolvingSymlinksInPath().standardizedFileURL == url.resolvingSymlinksInPath().standardizedFileURL else { try fail("The running Cotypist process does not match the verified installed application.") }
    var code: SecCode?
    let attributes = [kSecGuestAttributePid as String: NSNumber(value: app.processIdentifier)] as CFDictionary
    guard SecCodeCopyGuestWithAttributes(nil, attributes, [], &code) == errSecSuccess, let code,
          SecCodeCheckValidity(code, SecCSFlags(rawValue: kSecCSStrictValidate), try requirement()) == errSecSuccess else { try fail("The actual running Cotypist process failed developer identity verification.") }
}
func runningApp(at url: URL) throws -> NSRunningApplication? {
    let matches = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
    guard matches.count <= 1 else { try fail("Multiple Cotypist processes share the bundle identity. Quit the duplicate before using native controls.") }
    if let app = matches.first { try verifyProcess(app, at: url) }
    return matches.first
}
final class RestoreContext {
    var previousApp: NSRunningApplication?
    var operatedApp: NSRunningApplication?
    var appURL: URL?
    var priorWindow: AXUIElement?
    var priorPane: String?
    var managedWindow: AXUIElement?
    var baselineClosed = false
    var openingAttempted = false
    var windowTouched = false
    var paneTouched = false
    var lastManagedPane: String?
    var userTakeover = false
    var done = false
    var warnings: [String] = []
    func restore() {
        if done { return }; done = true; phaseEnd = cleanupEnd
        if windowTouched || openingAttempted {
            diagnosticPhase = "window-restoration"
            do {
                if let appURL, let running = try runningApp(at: appURL) {
                    guard let operatedApp, running.isEqual(operatedApp) else {
                        userTakeover = true
                        warnings.append("Cotypist's process instance changed; its newer windows and focus were left untouched. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
                        return
                    }
                    controlledPID = running.processIdentifier
                    let app = AXUIElementCreateApplication(controlledPID)
                    let snapshot = try AppSnapshot(app)
                    if snapshot.modal { userTakeover = true; warnings.append("A Cotypist dialog remains open; it was not dismissed during restoration. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration")) }
                    else if let priorWindow, let priorPane, snapshot.contains(priorWindow) {
                        let tree = try currentSettings(app, exact: priorWindow)
                        if tree.pane != lastManagedPane {
                            userTakeover = true
                            warnings.append("Cotypist's selected pane changed after the command's action; that newer selection was preserved. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
                        } else if paneTouched && tree.pane != priorPane {
                            try selectPane(tree, priorPane)
                            _ = try waitFor({ try currentSettings(app, exact: priorWindow).pane == priorPane ? true : nil }, timeout: 1.5)
                        }
                    } else if baselineClosed, let managedWindow, snapshot.contains(managedWindow) {
                        let tree = try currentSettings(app, exact: managedWindow)
                        guard let pane = tree.pane, let lastManagedPane, pane == lastManagedPane else {
                            userTakeover = true
                            try fail("The newly opened settings window was changed after the command; it was left open.")
                        }
                        guard let button = try optionalElement(managedWindow, kAXCloseButtonAttribute) else { try fail("The exact settings window opened by this command has no close button.") }
                        try press(button)
                        _ = try waitFor({ try AppSnapshot(app).contains(managedWindow) ? nil : true }, timeout: 1.5)
                        try confirmClosedBaseline(axWindowCount: try appWindows(app).count, ownedWindows: try ownedMetadata())
                    } else if openingAttempted && managedWindow == nil {
                        warnings.append("The opened settings window was not identified safely and could not be closed during restoration. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
                    } else if priorWindow != nil {
                        userTakeover = true
                        warnings.append("Cotypist's original settings window is no longer available for pane restoration. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
                    } else if baselineClosed && managedWindow != nil {
                        userTakeover = true
                    }
                } else { userTakeover = true; warnings.append("The original Cotypist process is no longer running; no replacement was controlled during restoration. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration")) }
            } catch {
                userTakeover = true
                let cause = (error as? NativeFailure)?.message ?? "Cotypist's exact previous window or pane could not be verified."
                warnings.append("Window/pane restoration failed: " + cause + " " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
            }
        }
        let currentPID = NSWorkspace.shared.frontmostApplication?.processIdentifier
        if operatedApp?.isTerminated == true { userTakeover = true }
        if shouldRestoreFocus(previousPID: previousApp?.processIdentifier, currentPID: currentPID, controlledPID: controlledPID, windowTouched: (windowTouched || openingAttempted) && !userTakeover), let previousApp {
            diagnosticPhase = "focus-restoration"
            if !previousApp.activate() { warnings.append("The prior app could not be reactivated. " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration")) }
            else {
                do { _ = try waitFor({ NSWorkspace.shared.frontmostApplication?.processIdentifier == previousApp.processIdentifier ? true : nil }, timeout: 1.5) }
                catch {
                    let cause = (error as? NativeFailure)?.message ?? "The prior app focus could not be verified."
                    warnings.append("Focus restoration failed: " + cause + " " + nativeDiagnostic(phase: diagnosticPhase, api: "restoration"))
                }
            }
        }
    }
}
func execute(_ operation: String, context: RestoreContext) throws -> [String: Any] {
    diagnosticPhase = "preflight"
    guard ["status", "enable-default", "disable-default", "toggle-default"].contains(operation) else { try fail("Unsupported Cotypist operation.") }
    guard AXIsProcessTrusted() else { try fail("Allow Raycast in System Settings → Privacy & Security → Accessibility, then retry. Permission is never granted automatically.") }
    AXUIElementSetMessagingTimeout(AXUIElementCreateSystemWide(), 0.2)
    guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID) else { try fail("Install Cotypist from cotypist.app and finish its setup first.") }
    try verifyApp(url)
    context.appURL = url; context.previousApp = NSWorkspace.shared.frontmostApplication
    var running = try runningApp(at: url)
    var tree: WindowTree?
    if let existing = running {
        context.operatedApp = existing
        controlledPID = existing.processIdentifier
        let app = AXUIElementCreateApplication(controlledPID)
        let baseline = try stableBaseline(app)
        tree = try baseline.settings()
        context.priorWindow = tree?.root; context.priorPane = tree?.pane
        if tree != nil && context.priorPane == nil { try fail("The prior Cotypist settings pane could not be identified safely.") }
        context.baselineClosed = tree == nil
    } else { context.baselineClosed = true }
    if tree == nil {
        diagnosticPhase = "settings-route"
        try checkTime(); context.openingAttempted = true
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = false; configuration.promptsUserIfNeeded = false
        configuration.addsToRecentItems = false; configuration.createsNewApplicationInstance = false
        configuration.allowsRunningApplicationSubstitution = false
        var launch: Result<NSRunningApplication, Error>?
        NSWorkspace.shared.open([URL(string: "cotypist://showPreferencePane/shortcuts")!], withApplicationAt: url, configuration: configuration) { app, error in
            if let error { launch = .failure(error) } else if let app { launch = .success(app) }
        }
        let opened = try waitFor({ launch }, timeout: 2.5, message: "Cotypist did not acknowledge opening its documented settings route in time.").get()
        try verifyProcess(opened, at: url)
        guard let current = try runningApp(at: url), current.isEqual(opened) else { try fail("The opened Cotypist process could not be authenticated uniquely.") }
        if let original = context.operatedApp, !current.isEqual(original) { try fail("Cotypist's process instance changed while opening settings. Its newer instance was left untouched.") }
        context.operatedApp = current
        running = current; controlledPID = current.processIdentifier
        let app = AXUIElementCreateApplication(controlledPID)
        diagnosticPhase = "settings-acknowledgement"
        tree = try waitFor({
            let snapshot = try AppSnapshot(app)
            if snapshot.modal { try fail("Cotypist opened a setup or modal dialog. Complete it manually before using controls.") }
            return try snapshot.settings()
        }, timeout: 3, message: "Cotypist acknowledged its settings route but did not expose the expected settings window in time.")
        context.managedWindow = tree?.root
    }
    guard let tree, let running else { try fail("Cotypist's settings window was not identified safely.") }
    let window = tree.root, app = AXUIElementCreateApplication(running.processIdentifier)
    context.lastManagedPane = tree.pane
    if tree.pane != "General" {
        diagnosticPhase = "general-pane-action"
        context.windowTouched = true; context.paneTouched = true; context.lastManagedPane = "General"
        try selectPane(tree, "General")
    }
    diagnosticPhase = "general-pane-read"
    let general = try waitFor({ let value = try currentSettings(app, exact: window); return value.pane == "General" ? value : nil }, timeout: 2)
    diagnosticPhase = "completion-read"
    let target = try completionControl(general)
    let initial = try requireBoolean(bool(target, kAXValueAttribute, required: true))
    let desired = operation == "enable-default" ? true : operation == "disable-default" ? false : operation == "toggle-default" ? !initial : initial
    var confirmed = false
    if desired != initial {
        diagnosticPhase = "completion-action"
        let ready = try completionControl(currentSettings(app, exact: window))
        guard CFEqual(ready, target), try bool(ready, kAXValueAttribute, required: true) == initial else { try fail("Cotypist's completion setting changed before the action. No further action was attempted.") }
        context.windowTouched = true; try press(ready)
        if !desired {
            diagnosticPhase = "disable-confirmation"
            let (sheetTree, sheetID) = try waitFor({ try expectedDisableSheet(AppSnapshot(app)) }, timeout: 2)
            let buttons = sheetTree.subtree(sheetID).filter { id in sheetTree.nodes[id].role == kAXButtonRole && sheetTree.nodes[id].labels.contains("Disable Anyway") }
            guard buttons.count == 1 else { try fail("The exact Disable Anyway confirmation is unavailable or ambiguous.") }
            try press(sheetTree.elements[buttons[0]]); confirmed = true
            _ = try waitFor({ () throws -> Bool? in
                let snapshot = try AppSnapshot(app)
                if try expectedDisableSheet(snapshot) != nil { return nil }
                return !snapshot.modal ? true : nil
            }, timeout: 2)
        }
    }
    diagnosticPhase = "completion-readback"
    let final = try settledState(window, desired: desired, app: app)
    diagnosticPhase = "status-metadata-read"
    let finalTree = try currentSettings(app, exact: window)
    let model = finalTree.nodes.first { $0.role == kAXPopUpButtonRole }?.labels.first
    var result: [String: Any] = ["ok": true, "defaultEnabled": final, "originalDefaultEnabled": initial, "changed": final != initial, "version": Bundle(url: url)?.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Unknown", "method": "native-accessibility", "disableConfirmationHandled": confirmed]
    if let model { result["model"] = model }
    if let node = finalTree.nodes.first(where: { $0.role == kAXProgressIndicatorRole }), let value = try attribute(finalTree.elements[node.id], kAXValueAttribute) as? NSNumber { result["downloadProgress"] = value.doubleValue }
    return result
}
@main struct NativeRunner {
    static func main() {
        // flock spans every read, action, confirmation, and restoration across workers.
        let lockURL = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().appendingPathComponent("cotypist-accessibility.lock")
        let descriptor = Darwin.open(lockURL.path, O_CREAT | O_RDWR | O_NOFOLLOW, S_IRUSR | S_IWUSR)
        var result: [String: Any]
        var status: Int32 = 0
        if descriptor < 0 || flock(descriptor, LOCK_EX | LOCK_NB) != 0 {
            result = ["ok": false, "error": "Another Cotypist control is running, or its operation lock could not be opened. Retry after it finishes.", "warnings": []]; status = 1
        } else {
            let context = RestoreContext()
            // The wrapper always restores, including partial-open and failure paths.
            do { result = try execute(CommandLine.arguments.dropFirst().first ?? "status", context: context) }
            catch {
                let cause = (error as? NativeFailure)?.message ?? "Cotypist's native operation could not be completed."
                // Capture operation context before restoration changes phase.
                result = ["ok": false, "error": "Operation failed: " + cause + " " + nativeDiagnostic(phase: diagnosticPhase, api: "operation")]
                status = 1
            }
            context.restore()
            result["warnings"] = context.warnings
            _ = flock(descriptor, LOCK_UN)
        }
        if descriptor >= 0 { Darwin.close(descriptor) }
        let data = try! JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        print(String(data: data, encoding: .utf8)!)
        exit(status)
    }
}
