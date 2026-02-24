import Foundation
import AppKit

// MARK: - Private CGS API via dlsym (runtime loading)
// These private CoreGraphics functions are re-exported from the SkyLight framework.
// We use dlsym with RTLD_DEFAULT to find them in any loaded image.

private typealias CGSDefaultConnectionFunc = @convention(c) () -> Int32
private typealias CGSCopyManagedDisplaySpacesFunc = @convention(c) (Int32) -> CFArray?
private typealias CGSManagedDisplayGetCurrentSpaceFunc = @convention(c) (Int32, CFString) -> Int64
private typealias CGSCopySpacesForWindowsFunc = @convention(c) (Int32, Int32, CFArray) -> CFArray?

private func loadSymbol<T>(_ name: String) -> T {
    // RTLD_DEFAULT searches all loaded images including the dyld shared cache
    if let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), name) { // RTLD_DEFAULT = -2
        return unsafeBitCast(sym, to: T.self)
    }
    // Try loading CoreGraphics explicitly (symbols are re-exported there)
    if let cg = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_LAZY) {
        if let sym = dlsym(cg, name) {
            return unsafeBitCast(sym, to: T.self)
        }
    }
    // Try SkyLight directly
    if let sl = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY) {
        if let sym = dlsym(sl, name) {
            return unsafeBitCast(sym, to: T.self)
        }
    }
    fputs("Error: Could not find symbol \(name)\n", stderr)
    exit(1)
}

// Note: CGSDefaultConnection is exported as __CGSDefaultConnection (double underscore),
// so the dlsym name is "_CGSDefaultConnection"
private let _CGSDefaultConnection: CGSDefaultConnectionFunc = loadSymbol("_CGSDefaultConnection")
private let _CGSCopyManagedDisplaySpaces: CGSCopyManagedDisplaySpacesFunc = loadSymbol("CGSCopyManagedDisplaySpaces")
private let _CGSManagedDisplayGetCurrentSpace: CGSManagedDisplayGetCurrentSpaceFunc = loadSymbol("CGSManagedDisplayGetCurrentSpace")
private let _CGSCopySpacesForWindows: CGSCopySpacesForWindowsFunc = loadSymbol("CGSCopySpacesForWindows")

// _AXUIElementGetWindow: get CGWindowID from an AXUIElement
private typealias AXUIElementGetWindowFunc = @convention(c) (AXUIElement, UnsafeMutablePointer<CGWindowID>) -> Int32
private let _AXUIElementGetWindow: AXUIElementGetWindowFunc = loadSymbol("_AXUIElementGetWindow")

// MARK: - Data structures

struct SpaceInfo: Codable {
    let id: Int
    let index: Int
    let isCurrent: Bool
    let type: Int  // 0 = user space, 4 = fullscreen/tile
}

struct DisplayInfo: Codable {
    let displayId: String
    let displayName: String
    let spaces: [SpaceInfo]
}

struct WindowInfo: Codable {
    let windowId: Int
    let appBundleId: String
    let appName: String
    let windowTitle: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let spaceIds: [Int]
    let ownerPid: Int
    let isRegularApp: Bool  // true = foreground app, false = background/agent/accessory
}

// MARK: - Core functions

func getDisplaySpaces() -> [DisplayInfo] {
    let conn = _CGSDefaultConnection()
    guard let rawSpaces = _CGSCopyManagedDisplaySpaces(conn) as? [[String: Any]] else {
        fputs("Error: Failed to get managed display spaces\n", stderr)
        exit(1)
    }

    // Build a map from display UUID to NSScreen name
    var uuidToName: [String: String] = [:]
    for screen in NSScreen.screens {
        if let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID {
            if let uuid = CGDisplayCreateUUIDFromDisplayID(screenNumber) {
                let uuidStr = CFUUIDCreateString(nil, uuid.takeUnretainedValue()) as String? ?? ""
                uuidToName[uuidStr] = screen.localizedName
            }
        }
    }

    var displays: [DisplayInfo] = []

    for displayDict in rawSpaces {
        guard let displayId = displayDict["Display Identifier"] as? String,
              let spacesList = displayDict["Spaces"] as? [[String: Any]] else {
            continue
        }

        let currentSpaceId = _CGSManagedDisplayGetCurrentSpace(conn, displayId as CFString)

        // Resolve display name
        var displayName = displayId
        if displayId == "Main" {
            if let mainScreen = NSScreen.screens.first {
                displayName = mainScreen.localizedName
            }
        } else {
            for (uuid, name) in uuidToName {
                if displayId.contains(uuid) || uuid.contains(displayId) ||
                   displayId.replacingOccurrences(of: "-", with: "") == uuid.replacingOccurrences(of: "-", with: "") {
                    displayName = name
                    break
                }
            }
        }

        // Include user spaces (type 0) and fullscreen spaces (type 4)
        // Skip system/dashboard spaces (type 2)
        var spaceInfos: [SpaceInfo] = []
        var index = 1
        for space in spacesList {
            let spaceType = space["type"] as? Int ?? 0
            guard spaceType == 0 || spaceType == 4 else { continue }

            let spaceId = space["id64"] as? Int ?? space["ManagedSpaceID"] as? Int ?? 0
            let isCurrent = Int64(spaceId) == currentSpaceId

            spaceInfos.append(SpaceInfo(id: spaceId, index: index, isCurrent: isCurrent, type: spaceType))
            index += 1
        }

        displays.append(DisplayInfo(
            displayId: displayId,
            displayName: displayName,
            spaces: spaceInfos
        ))
    }

    return displays
}

// MARK: - Window functions

func getAllWindows() -> [WindowInfo] {
    let conn = _CGSDefaultConnection()

    // Get on-screen windows only (excludes off-screen/hidden windows)
    guard let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else {
        return []
    }

    var windows: [WindowInfo] = []

    // First pass: collect normal, visible windows with non-zero size
    for windowDict in windowList {
        let layer = windowDict[kCGWindowLayer as String] as? Int ?? -1
        guard layer == 0 else { continue } // Only normal windows

        let windowId = windowDict[kCGWindowNumber as String] as? Int ?? 0
        guard windowId > 0 else { continue }

        let bounds = windowDict[kCGWindowBounds as String] as? [String: Double] ?? [:]
        let w = bounds["Width"] ?? 0
        let h = bounds["Height"] ?? 0
        guard w >= 100 && h >= 100 else { continue } // Skip tiny overlay/helper/titlebar windows

        let pid = windowDict[kCGWindowOwnerPID as String] as? Int ?? 0
        let appName = windowDict[kCGWindowOwnerName as String] as? String ?? ""
        let title = windowDict[kCGWindowName as String] as? String ?? ""

        // Get bundle ID and activation policy from PID
        var bundleId = ""
        var isRegularApp = false
        if pid > 0, let app = NSRunningApplication(processIdentifier: pid_t(pid)) {
            bundleId = app.bundleIdentifier ?? ""
            isRegularApp = app.activationPolicy == .regular
        }

        // Skip windows without a bundle ID (system processes, etc.)
        guard !bundleId.isEmpty else { continue }

        windows.append(WindowInfo(
            windowId: windowId,
            appBundleId: bundleId,
            appName: appName,
            windowTitle: title,
            x: bounds["X"] ?? 0,
            y: bounds["Y"] ?? 0,
            width: w,
            height: h,
            spaceIds: [],
            ownerPid: pid,
            isRegularApp: isRegularApp
        ))
    }

    // Second pass: get space mapping per window
    for i in 0..<windows.count {
        let singleWindowArray = [NSNumber(value: windows[i].windowId)] as CFArray
        if let spaces = _CGSCopySpacesForWindows(conn, 0x7, singleWindowArray) as? [NSNumber] {
            let spaceIds = spaces.map { $0.intValue }
            windows[i] = WindowInfo(
                windowId: windows[i].windowId,
                appBundleId: windows[i].appBundleId,
                appName: windows[i].appName,
                windowTitle: windows[i].windowTitle,
                x: windows[i].x,
                y: windows[i].y,
                width: windows[i].width,
                height: windows[i].height,
                spaceIds: spaceIds,
                ownerPid: windows[i].ownerPid,
                isRegularApp: windows[i].isRegularApp
            )
        }
    }

    return windows
}

/// Find a specific AXUIElement window using 3-tier strategy: windowId → title → bundleId fallback.
/// Returns (window, app) on success, nil if nothing matched.
func findWindow(bundleId: String, titleMatch: String, windowId: Int?) -> (AXUIElement, NSRunningApplication)? {
    // Check accessibility permission
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary
    guard AXIsProcessTrustedWithOptions(options) else {
        fputs("Error: Accessibility permission not granted\n", stderr)
        return nil
    }

    guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first else {
        fputs("Error: No running app with bundle ID '\(bundleId)'\n", stderr)
        return nil
    }

    let appElement = AXUIElementCreateApplication(app.processIdentifier)

    var windowsRef: CFTypeRef?
    let windowsResult = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowsRef)
    guard windowsResult == .success, let windows = windowsRef as? [AXUIElement] else {
        fputs("Error: Could not get windows for '\(bundleId)'\n", stderr)
        return nil
    }

    // Strategy 1: Match by window ID
    if let targetId = windowId, targetId > 0 {
        for window in windows {
            var wid: CGWindowID = 0
            if _AXUIElementGetWindow(window, &wid) == 0 && Int(wid) == targetId {
                return (window, app)
            }
        }
    }

    // Strategy 2: Match by title substring
    if !titleMatch.isEmpty {
        for window in windows {
            var titleRef: CFTypeRef?
            AXUIElementCopyAttributeValue(window, kAXTitleAttribute as CFString, &titleRef)
            let title = titleRef as? String ?? ""
            if title.contains(titleMatch) {
                return (window, app)
            }
        }
    }

    // Strategy 3: First window of this app (bundle ID fallback)
    if let first = windows.first {
        return (first, app)
    }

    fputs("Error: No windows found for '\(bundleId)'\n", stderr)
    return nil
}

func raiseWindow(bundleId: String, titleMatch: String, windowId: Int?) -> Bool {
    guard let (window, app) = findWindow(bundleId: bundleId, titleMatch: titleMatch, windowId: windowId) else {
        return false
    }
    AXUIElementPerformAction(window, kAXRaiseAction as CFString)
    app.activate()
    return true
}

func setWindowFrame(bundleId: String, titleMatch: String, windowId: Int?, x: Double, y: Double, width: Double, height: Double) -> Bool {
    guard let (window, app) = findWindow(bundleId: bundleId, titleMatch: titleMatch, windowId: windowId) else {
        return false
    }

    // Set position
    var point = CGPoint(x: x, y: y)
    if let posValue = AXValueCreate(.cgPoint, &point) {
        AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, posValue)
    }

    // Set size
    var size = CGSize(width: width, height: height)
    if let sizeValue = AXValueCreate(.cgSize, &size) {
        AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, sizeValue)
    }

    // Raise window after positioning
    AXUIElementPerformAction(window, kAXRaiseAction as CFString)
    app.activate()
    return true
}

func launchApp(bundleId: String) -> (ok: Bool, alreadyRunning: Bool, pid: Int?) {
    // Check if already running
    if let running = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first {
        return (ok: true, alreadyRunning: true, pid: Int(running.processIdentifier))
    }

    // Resolve app URL
    guard let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else {
        fputs("Error: No app found with bundle ID '\(bundleId)'\n", stderr)
        return (ok: false, alreadyRunning: false, pid: nil)
    }

    // Launch
    let config = NSWorkspace.OpenConfiguration()
    let semaphore = DispatchSemaphore(value: 0)
    var launchedPid: Int?
    var launchError: Error?

    NSWorkspace.shared.openApplication(at: appURL, configuration: config) { app, error in
        if let app = app {
            launchedPid = Int(app.processIdentifier)
        }
        launchError = error
        semaphore.signal()
    }
    semaphore.wait()

    if let error = launchError {
        fputs("Error: Failed to launch '\(bundleId)': \(error.localizedDescription)\n", stderr)
        return (ok: false, alreadyRunning: false, pid: nil)
    }

    return (ok: true, alreadyRunning: false, pid: launchedPid)
}

// MARK: - CLI

func printJSON<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    if let data = try? encoder.encode(value),
       let str = String(data: data, encoding: .utf8) {
        print(str)
    }
}

let args = CommandLine.arguments

guard args.count >= 2 else {
    fputs("Usage: window-helper <command> [options]\n", stderr)
    fputs("  list                                    List all displays and their spaces\n", stderr)
    fputs("  windows                                 List all windows with space mapping\n", stderr)
    fputs("  raise-window --bundle-id <id> --title-match <substring> [--window-id <id>]  Raise a window to front\n", stderr)
    fputs("  set-window-frame --bundle-id <id> --title-match <str> [--window-id <id>] --x <n> --y <n> --width <n> --height <n>  Position and raise a window\n", stderr)
    fputs("  launch-app --bundle-id <id>             Launch an app by bundle ID\n", stderr)
    exit(1)
}

switch args[1] {
case "list":
    let displays = getDisplaySpaces()
    printJSON(displays)

case "windows":
    let windows = getAllWindows()
    printJSON(windows)

case "raise-window":
    var bundleIdArg: String?
    var titleMatchArg: String?
    var windowIdArg: Int?

    var i = 2
    while i < args.count {
        switch args[i] {
        case "--bundle-id":
            i += 1
            if i < args.count { bundleIdArg = args[i] }
        case "--title-match":
            i += 1
            if i < args.count { titleMatchArg = args[i] }
        case "--window-id":
            i += 1
            if i < args.count { windowIdArg = Int(args[i]) }
        default:
            break
        }
        i += 1
    }

    guard let bundleId = bundleIdArg, let titleMatch = titleMatchArg else {
        fputs("Usage: window-helper raise-window --bundle-id <id> --title-match <substring> [--window-id <id>]\n", stderr)
        exit(1)
    }

    let success = raiseWindow(bundleId: bundleId, titleMatch: titleMatch, windowId: windowIdArg)
    if success {
        print("{\"ok\":true}")
    } else {
        exit(1)
    }

case "set-window-frame":
    var bundleIdArg: String?
    var titleMatchArg: String?
    var windowIdArg: Int?
    var xArg: Double?
    var yArg: Double?
    var widthArg: Double?
    var heightArg: Double?

    var i = 2
    while i < args.count {
        switch args[i] {
        case "--bundle-id":
            i += 1
            if i < args.count { bundleIdArg = args[i] }
        case "--title-match":
            i += 1
            if i < args.count { titleMatchArg = args[i] }
        case "--window-id":
            i += 1
            if i < args.count { windowIdArg = Int(args[i]) }
        case "--x":
            i += 1
            if i < args.count { xArg = Double(args[i]) }
        case "--y":
            i += 1
            if i < args.count { yArg = Double(args[i]) }
        case "--width":
            i += 1
            if i < args.count { widthArg = Double(args[i]) }
        case "--height":
            i += 1
            if i < args.count { heightArg = Double(args[i]) }
        default:
            break
        }
        i += 1
    }

    guard let bundleId = bundleIdArg, let titleMatch = titleMatchArg,
          let x = xArg, let y = yArg, let w = widthArg, let h = heightArg else {
        fputs("Usage: window-helper set-window-frame --bundle-id <id> --title-match <str> [--window-id <id>] --x <n> --y <n> --width <n> --height <n>\n", stderr)
        exit(1)
    }

    let frameSuccess = setWindowFrame(bundleId: bundleId, titleMatch: titleMatch, windowId: windowIdArg, x: x, y: y, width: w, height: h)
    if frameSuccess {
        print("{\"ok\":true}")
    } else {
        exit(1)
    }

case "launch-app":
    var bundleIdArg: String?

    var i = 2
    while i < args.count {
        switch args[i] {
        case "--bundle-id":
            i += 1
            if i < args.count { bundleIdArg = args[i] }
        default:
            break
        }
        i += 1
    }

    guard let bundleId = bundleIdArg else {
        fputs("Usage: window-helper launch-app --bundle-id <id>\n", stderr)
        exit(1)
    }

    let result = launchApp(bundleId: bundleId)
    if result.ok {
        if result.alreadyRunning {
            print("{\"ok\":true,\"alreadyRunning\":true}")
        } else {
            let pidStr = result.pid != nil ? String(result.pid!) : "null"
            print("{\"ok\":true,\"alreadyRunning\":false,\"pid\":\(pidStr)}")
        }
    } else {
        exit(1)
    }

default:
    fputs("Unknown command: \(args[1])\n", stderr)
    exit(1)
}
