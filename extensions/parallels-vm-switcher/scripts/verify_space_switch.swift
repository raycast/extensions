import AppKit
import CoreGraphics
import Foundation

typealias CGSConnectionID = UInt32
typealias CGSSpaceID = UInt64

@_silgen_name("CGSMainConnectionID")
private func CGSMainConnectionID() -> CGSConnectionID

@_silgen_name("CGSGetActiveSpace")
private func CGSGetActiveSpace(_ cid: CGSConnectionID) -> CGSSpaceID

@_silgen_name("SLSCopyManagedDisplaySpaces")
private func SLSCopyManagedDisplaySpaces(_ cid: CGSConnectionID) -> CFArray

@_silgen_name("CGSCopySpacesForWindows")
private func CGSCopySpacesForWindows(
    _ cid: CGSConnectionID,
    _ mask: UInt32,
    _ windowIDs: CFArray
) -> Unmanaged<CFArray>?

@_silgen_name("_AXUIElementGetWindow")
private func AXUIElementGetWindow(
    _ element: AXUIElement,
    _ windowID: UnsafeMutablePointer<CGWindowID>
) -> AXError

struct Topology {
    let visibleSpaces: Set<CGSSpaceID>
    let fullscreenSpaces: [FullscreenSpace]
}

struct FullscreenSpace {
    let spaceID: CGSSpaceID
    let ownerPID: pid_t
    let windowID: CGWindowID
}

struct WindowState {
    let ownerPID: pid_t
    let layer: Int
    let bounds: CGRect
}

struct FocusState {
    let frontmostPID: pid_t?
    let menuBarOwnerPID: pid_t?
}

struct RunningVM {
    let id: String
    let name: String
}

struct ConsoleWindow {
    let windowID: CGWindowID
    let title: String
    let isFullScreen: Bool?
}

private let connection = CGSMainConnectionID()

private func number<T: BinaryInteger>(
    _ dictionary: [String: Any],
    key: String,
    as type: T.Type
) -> T? {
    guard let value = dictionary[key] as? NSNumber else {
        return nil
    }
    return T(exactly: value.int64Value)
}

private func topology() -> Topology? {
    guard let displays = SLSCopyManagedDisplaySpaces(connection)
        as? [[String: Any]] else {
        return nil
    }

    var visibleSpaces = Set<CGSSpaceID>()
    var fullscreenSpaces: [FullscreenSpace] = []
    for display in displays {
        guard
            let current = display["Current Space"] as? [String: Any],
            let currentID = number(current, key: "id64", as: CGSSpaceID.self),
            let spaces = display["Spaces"] as? [[String: Any]]
        else {
            return nil
        }
        visibleSpaces.insert(currentID)

        for space in spaces {
            guard number(space, key: "type", as: Int.self) == 4 else {
                continue
            }
            guard
                let spaceID = number(space, key: "id64", as: CGSSpaceID.self),
                let ownerPID = number(space, key: "pid", as: pid_t.self),
                let windowID = number(space, key: "fs_wid", as: CGWindowID.self)
            else {
                return nil
            }
            fullscreenSpaces.append(
                FullscreenSpace(
                    spaceID: spaceID,
                    ownerPID: ownerPID,
                    windowID: windowID
                )
            )
        }
    }
    guard !visibleSpaces.isEmpty else {
        return nil
    }
    return Topology(
        visibleSpaces: visibleSpaces,
        fullscreenSpaces: fullscreenSpaces
    )
}

private func windowStates() -> [CGWindowID: WindowState]? {
    guard let rows = CGWindowListCopyWindowInfo(
        [.optionAll],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        return nil
    }
    var states: [CGWindowID: WindowState] = [:]
    for row in rows {
        guard
            let windowID = number(
                row,
                key: kCGWindowNumber as String,
                as: CGWindowID.self
            ),
            let ownerPID = number(
                row,
                key: kCGWindowOwnerPID as String,
                as: pid_t.self
            ),
            let layer = number(
                row,
                key: kCGWindowLayer as String,
                as: Int.self
            ),
            let rawBounds = row[kCGWindowBounds as String] as? [String: Any],
            let x = rawBounds["X"] as? NSNumber,
            let y = rawBounds["Y"] as? NSNumber,
            let width = rawBounds["Width"] as? NSNumber,
            let height = rawBounds["Height"] as? NSNumber
        else {
            continue
        }
        guard states[windowID] == nil else {
            return nil
        }
        states[windowID] = WindowState(
            ownerPID: ownerPID,
            layer: layer,
            bounds: CGRect(
                x: CGFloat(x.doubleValue),
                y: CGFloat(y.doubleValue),
                width: CGFloat(width.doubleValue),
                height: CGFloat(height.doubleValue)
            )
        )
    }
    return states
}

private func isStrictlyOnscreen(
    windowID: CGWindowID,
    ownerPID: pid_t
) -> Bool? {
    guard let rows = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        return nil
    }
    guard let row = rows.first(where: {
        number(
            $0,
            key: kCGWindowNumber as String,
            as: CGWindowID.self
        ) == windowID
    }) else {
        return false
    }
    guard
        number(row, key: kCGWindowOwnerPID as String, as: pid_t.self)
            == ownerPID,
        row[kCGWindowIsOnscreen as String] as? Bool == true
    else {
        return nil
    }
    return true
}

private func spaces(for windowID: CGWindowID) -> Set<CGSSpaceID>? {
    guard let raw = CGSCopySpacesForWindows(
        connection,
        7,
        [windowID] as CFArray
    ) else {
        return nil
    }
    guard let values = raw.takeRetainedValue() as? [CGSSpaceID] else {
        return nil
    }
    return Set(values)
}

private func consolePID() -> pid_t? {
    let applications = NSRunningApplication.runningApplications(
        withBundleIdentifier: "com.parallels.desktop.console"
    ).filter { $0.activationPolicy == .regular }
    guard applications.count == 1 else {
        return nil
    }
    return applications[0].processIdentifier
}

private func normalizeVMID(_ rawID: String) -> String {
    rawID
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .trimmingCharacters(in: CharacterSet(charactersIn: "{}"))
        .replacingOccurrences(of: "-", with: "")
        .lowercased()
}

private func runningVMs() -> [RunningVM]? {
    let prlctlPath = "/usr/local/bin/prlctl"
    guard FileManager.default.isExecutableFile(atPath: prlctlPath) else {
        return nil
    }
    let output = Pipe()
    let process = Process()
    process.executableURL = URL(fileURLWithPath: prlctlPath)
    process.arguments = ["list", "--all", "--json"]
    process.standardOutput = output
    process.standardError = Pipe()
    do {
        try process.run()
    } catch {
        return nil
    }
    process.waitUntilExit()
    guard
        process.terminationStatus == 0,
        let records = try? JSONSerialization.jsonObject(
            with: output.fileHandleForReading.readDataToEndOfFile()
        ) as? [[String: Any]]
    else {
        return nil
    }
    var vms: [RunningVM] = []
    for record in records {
        guard
            (record["status"] as? String)?.lowercased() == "running",
            let rawID = record["uuid"] as? String,
            let rawName = record["name"] as? String
        else {
            continue
        }
        let id = normalizeVMID(rawID)
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty, !name.isEmpty else {
            return nil
        }
        vms.append(RunningVM(id: id, name: name))
    }
    return vms
}

private func axAttribute(
    _ element: AXUIElement,
    _ name: String
) -> CFTypeRef? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(
        element,
        name as CFString,
        &value
    ) == .success else {
        return nil
    }
    return value
}

private func consoleWindow(
    _ element: AXUIElement
) -> ConsoleWindow? {
    guard let title = axAttribute(element, kAXTitleAttribute) as? String else {
        return nil
    }
    let fullScreen = axAttribute(element, "AXFullScreen") as? Bool
    var windowID = CGWindowID(0)
    guard
        AXUIElementGetWindow(element, &windowID) == .success,
        windowID != 0
    else {
        return nil
    }
    return ConsoleWindow(
        windowID: windowID,
        title: title,
        isFullScreen: fullScreen
    )
}

private func consoleWindows(pid: pid_t) -> [ConsoleWindow]? {
    let script = #"""
function run() {
  const app = Application("com.parallels.desktop.console");
  return JSON.stringify(app.windows().map(window => ({
    title: window.name(),
    windowID: window.id()
  })));
}
"""#
    let input = Pipe()
    let output = Pipe()
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
    process.arguments = ["-l", "JavaScript", "-"]
    process.standardInput = input
    process.standardOutput = output
    process.standardError = Pipe()
    do {
        try process.run()
        input.fileHandleForWriting.write(Data(script.utf8))
        try input.fileHandleForWriting.close()
    } catch {
        return nil
    }
    process.waitUntilExit()
    guard
        process.terminationStatus == 0,
        let records = try? JSONSerialization.jsonObject(
            with: output.fileHandleForReading.readDataToEndOfFile()
        ) as? [[String: Any]]
    else {
        return nil
    }
    var windows: [ConsoleWindow] = []
    for record in records {
        guard
            let title = record["title"] as? String,
            let rawWindowID = record["windowID"] as? NSNumber,
            let windowID = CGWindowID(exactly: rawWindowID.uint64Value)
        else {
            return nil
        }
        windows.append(ConsoleWindow(
            windowID: windowID,
            title: title,
            isFullScreen: nil
        ))
    }
    return windows
}

private func focusedConsoleWindow(pid: pid_t) -> ConsoleWindow? {
    guard AXIsProcessTrusted() else {
        return nil
    }
    let application = AXUIElementCreateApplication(pid)
    guard
        let rawWindow = axAttribute(application, kAXFocusedWindowAttribute),
        CFGetTypeID(rawWindow) == AXUIElementGetTypeID()
    else {
        return nil
    }
    let element = unsafeBitCast(rawWindow, to: AXUIElement.self)
    return consoleWindow(element)
}

private func focusProxyPID(compactVMID: String) -> pid_t? {
    let bundleID = "com.parallels.winapp.\(compactVMID).VM"
    let applications = NSWorkspace.shared.runningApplications.filter { app in
        guard
            app.activationPolicy == .regular,
            let candidateID = app.bundleIdentifier
        else {
            return false
        }
        return candidateID == bundleID
    }
    guard applications.count == 1 else {
        return nil
    }
    return applications[0].processIdentifier
}

private func screenIsLocked() -> Bool? {
    guard let session = CGSessionCopyCurrentDictionary() as? [String: Any] else {
        return nil
    }
    guard let value = session["CGSSessionScreenIsLocked"] else {
        return false
    }
    return (value as? NSNumber)?.boolValue
}

private func focusState() -> FocusState {
    let workspace = NSWorkspace.shared
    return FocusState(
        frontmostPID: workspace.frontmostApplication?.processIdentifier,
        menuBarOwnerPID: workspace.menuBarOwningApplication?.processIdentifier
    )
}

private func describe(pid: pid_t?) -> String {
    guard let pid else {
        return "none"
    }
    return String(pid)
}

private func failSetup(_ message: String) -> Never {
    FileHandle.standardError.write(Data("SETUP-ERROR \(message)\n".utf8))
    exit(2)
}

private func activeTargetFullscreenSpace(
    topology current: Topology,
    consolePID: pid_t,
    targetWindow: ConsoleWindow
) -> FullscreenSpace? {
    guard
        let states = windowStates(),
        let state = states[targetWindow.windowID]
    else {
        return nil
    }
    let matches = current.fullscreenSpaces.filter {
        $0.windowID == targetWindow.windowID && $0.ownerPID == consolePID
    }
    guard matches.count == 1, let candidate = matches.first else {
        return nil
    }
    guard
        state.ownerPID == consolePID,
        state.layer == 0,
        state.bounds.width >= 800,
        state.bounds.height >= 600,
        current.visibleSpaces.contains(candidate.spaceID),
        CGSGetActiveSpace(connection) == candidate.spaceID,
        isStrictlyOnscreen(
            windowID: candidate.windowID,
            ownerPID: consolePID
        ) == true,
        spaces(for: candidate.windowID) == Set([candidate.spaceID])
    else {
        return nil
    }
    return candidate
}

private func focusIsSettled(
    _ focus: FocusState,
    proxyPID: pid_t,
    consolePID: pid_t,
    targetWindow: ConsoleWindow
) -> Bool {
    let targetOwnsFocus = focus.frontmostPID == proxyPID
        && focus.menuBarOwnerPID == proxyPID
    let consoleOwnsFocus = focus.frontmostPID == consolePID
        && focus.menuBarOwnerPID == consolePID
    guard consoleOwnsFocus else {
        return targetOwnsFocus
    }
    guard let focusedWindow = focusedConsoleWindow(pid: consolePID) else {
        return false
    }
    return focusedWindow.windowID == targetWindow.windowID
        && focusedWindow.title == targetWindow.title
        && focusedWindow.isFullScreen == true
}

private func verifyCurrentTarget(compactID: String) -> Never {
    guard screenIsLocked() == false else {
        failSetup("macOS screen is locked; UI switching cannot be verified")
    }
    guard
        let running = runningVMs(),
        let targetVM = running.first(where: { $0.id == compactID })
    else {
        failSetup("target VM is not running")
    }
    guard let proxyPID = focusProxyPID(compactVMID: compactID) else {
        failSetup("expected exactly one regular UUID-specific Dock Helper")
    }
    guard let consolePID = consolePID() else {
        failSetup("expected exactly one regular Parallels Desktop console process")
    }
    guard
        let windows = consoleWindows(pid: consolePID),
        windows.filter({ $0.title == targetVM.name }).count == 1,
        let targetWindow = windows.first(where: { $0.title == targetVM.name })
    else {
        failSetup("cannot map target VM name to exactly one Parallels window")
    }

    let deadline = Date().addingTimeInterval(3)
    var stableSamples = 0
    repeat {
        guard
            let current = topology(),
            let candidate = activeTargetFullscreenSpace(
                topology: current,
                consolePID: consolePID,
                targetWindow: targetWindow
            )
        else {
            stableSamples = 0
            Thread.sleep(forTimeInterval: 0.1)
            continue
        }
        let focus = focusState()
        if focusIsSettled(
                focus,
                proxyPID: proxyPID,
                consolePID: consolePID,
                targetWindow: targetWindow
            ) {
            stableSamples += 1
            if stableSamples >= 10 {
                print(
                    "GREEN targetVM=\(compactID) "
                        + "activeSpace=\(CGSGetActiveSpace(connection)) "
                        + "targetSpace=\(candidate.spaceID) "
                        + "targetWindow=\(candidate.windowID) "
                        + "targetOnscreen=true "
                        + "frontmostPID=\(describe(pid: focus.frontmostPID)) "
                        + "menuBarOwnerPID=\(describe(pid: focus.menuBarOwnerPID)) "
                        + "stableSamples=\(stableSamples)"
                )
                exit(0)
            }
        } else {
            stableSamples = 0
        }
        Thread.sleep(forTimeInterval: 0.1)
    } while Date() < deadline

    let finalFocus = focusState()
    print(
        "RED targetVM=\(compactID) "
            + "activeSpace=\(CGSGetActiveSpace(connection)) "
            + "frontmostPID=\(describe(pid: finalFocus.frontmostPID)) "
            + "menuBarOwnerPID=\(describe(pid: finalFocus.menuBarOwnerPID))"
    )
    exit(1)
}

if CommandLine.arguments.count == 3,
    CommandLine.arguments[1] == "--check-current"
{
    let compactID = normalizeVMID(CommandLine.arguments[2])
    guard !compactID.isEmpty else {
        failSetup("VM UUID is empty")
    }
    verifyCurrentTarget(compactID: compactID)
}

guard CommandLine.arguments.count >= 3 else {
    failSetup(
        "usage: xcrun swift scripts/verify_space_switch.swift "
            + "<vm-uuid> <executable> [argument ...] | "
            + "--check-current <vm-uuid>"
    )
}

private let compactID = normalizeVMID(CommandLine.arguments[1])
guard !compactID.isEmpty else {
    failSetup("VM UUID is empty")
}
private let executablePath = NSString(
    string: CommandLine.arguments[2]
).expandingTildeInPath
guard FileManager.default.isExecutableFile(atPath: executablePath) else {
    failSetup("command is not executable: \(executablePath)")
}
guard screenIsLocked() == false else {
    failSetup("macOS screen is locked; UI switching cannot be verified")
}
guard
    let running = runningVMs(),
    let targetVM = running.first(where: { $0.id == compactID })
else {
    failSetup("target VM is not running")
}
guard let proxyPID = focusProxyPID(compactVMID: compactID) else {
    failSetup("expected exactly one regular UUID-specific Dock Helper")
}
guard let pid = consolePID() else {
    failSetup("expected exactly one regular Parallels Desktop console process")
}
guard
    let consoleWindowList = consoleWindows(pid: pid),
    consoleWindowList.filter({ $0.title == targetVM.name }).count == 1,
    let targetWindow = consoleWindowList.first(where: {
        $0.title == targetVM.name
    })
else {
    failSetup("cannot map target VM name to exactly one fullscreen Parallels window")
}
guard let before = topology() else {
    failSetup("cannot read managed Space topology")
}

guard let states = windowStates() else {
    failSetup("cannot read the complete window list")
}
private let candidates = before.fullscreenSpaces.filter { space in
    guard let state = states[space.windowID] else {
        return false
    }
    return space.windowID == targetWindow.windowID
        && space.ownerPID == pid
        && state.ownerPID == pid
        && state.layer == 0
        && state.bounds.width >= 800
        && state.bounds.height >= 600
        && spaces(for: space.windowID) == Set([space.spaceID])
}

guard candidates.count == 1, let target = candidates.first else {
    failSetup("cannot map the target Parallels window to one fullscreen Space")
}
guard !before.visibleSpaces.contains(target.spaceID) else {
    failSetup("target Space \(target.spaceID) is already visible")
}
guard CGSGetActiveSpace(connection) != target.spaceID else {
    failSetup("target Space \(target.spaceID) is already active")
}
guard isStrictlyOnscreen(
        windowID: target.windowID,
        ownerPID: pid
    ) == false
else {
    failSetup("target window \(target.windowID) is already onscreen")
}

print(
    "SETUP targetVM=\(compactID) visibleSpaces=\(before.visibleSpaces.sorted()) "
        + "targetSpace=\(target.spaceID) targetWindow=\(target.windowID) "
        + "consolePID=\(pid) proxyPID=\(proxyPID)"
)

private let command = Process()
command.executableURL = URL(fileURLWithPath: executablePath)
command.arguments = Array(CommandLine.arguments.dropFirst(3))
do {
    try command.run()
} catch {
    print("RED cannotLaunch=\(error)")
    exit(1)
}
command.waitUntilExit()
guard command.terminationStatus == 0 else {
    print("RED commandExit=\(command.terminationStatus)")
    exit(1)
}

private let deadline = Date().addingTimeInterval(10)
private var consecutiveGreenSamples = 0
repeat {
    guard let current = topology() else {
        failSetup("managed Space topology disappeared during verification")
    }
    let activeTarget = activeTargetFullscreenSpace(
        topology: current,
        consolePID: pid,
        targetWindow: targetWindow
    )
    let focus = focusState()
    let green = activeTarget != nil
        && focusIsSettled(
            focus,
            proxyPID: proxyPID,
            consolePID: pid,
            targetWindow: targetWindow
        )
    consecutiveGreenSamples = green ? consecutiveGreenSamples + 1 : 0
    if
        consecutiveGreenSamples >= 10,
        let activeCandidate = activeTarget,
        let membership = spaces(for: activeCandidate.windowID)
    {
        print(
            "GREEN activeSpace=\(CGSGetActiveSpace(connection)) "
                + "visibleSpaces=\(current.visibleSpaces.sorted()) "
                + "targetSpace=\(activeCandidate.spaceID) "
                + "targetWindow=\(activeCandidate.windowID) "
                + "membership=\(membership.sorted()) targetOnscreen=true "
                + "frontmostPID=\(describe(pid: focus.frontmostPID)) "
                + "menuBarOwnerPID=\(describe(pid: focus.menuBarOwnerPID)) "
                + "stableSamples=\(consecutiveGreenSamples)"
        )
        exit(0)
    }
    Thread.sleep(forTimeInterval: 0.1)
} while Date() < deadline

guard let after = topology() else {
    failSetup("cannot read final managed Space topology")
}
private let finalFocus = focusState()
private let finalMembership = spaces(for: target.windowID)?.sorted() ?? []
private let finalOnscreen = isStrictlyOnscreen(
        windowID: target.windowID,
        ownerPID: pid
    )
print(
    "RED activeSpace=\(CGSGetActiveSpace(connection)) "
        + "visibleSpaces=\(after.visibleSpaces.sorted()) "
        + "targetSpace=\(target.spaceID) targetWindow=\(target.windowID) "
        + "membership=\(finalMembership) "
        + "targetOnscreen=\(String(describing: finalOnscreen)) "
        + "frontmostPID=\(describe(pid: finalFocus.frontmostPID)) "
        + "menuBarOwnerPID=\(describe(pid: finalFocus.menuBarOwnerPID))"
)
exit(1)
