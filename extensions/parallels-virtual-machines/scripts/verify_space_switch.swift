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

private func runningVMIDs() -> Set<String>? {
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
    return Set(records.compactMap { record in
        guard
            (record["status"] as? String)?.lowercased() == "running",
            let rawID = record["uuid"] as? String
        else {
            return nil
        }
        let normalized = normalizeVMID(rawID)
        return normalized.isEmpty ? nil : normalized
    })
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

private func failSetup(_ message: String) -> Never {
    FileHandle.standardError.write(Data("SETUP-ERROR \(message)\n".utf8))
    exit(2)
}

guard CommandLine.arguments.count >= 3 else {
    failSetup(
        "usage: xcrun swift scripts/verify_space_switch.swift "
            + "<vm-uuid> <executable> [argument ...]"
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
guard let runningIDs = runningVMIDs() else {
    failSetup("cannot read running VM UUIDs from prlctl")
}
guard runningIDs == Set([compactID]) else {
    failSetup(
        "target must be the only running VM; found \(runningIDs.sorted())"
    )
}
guard let proxyPID = focusProxyPID(compactVMID: compactID) else {
    failSetup("expected exactly one regular UUID-specific Dock Helper")
}
guard let pid = consolePID() else {
    failSetup("expected exactly one regular Parallels Desktop console process")
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
    return space.ownerPID == pid
        && state.ownerPID == pid
        && state.layer == 0
        && state.bounds.width >= 800
        && state.bounds.height >= 600
        && spaces(for: space.windowID) == Set([space.spaceID])
}

guard candidates.count == 1, let target = candidates.first else {
    failSetup(
        "expected one unambiguous Parallels fullscreen VM; "
            + "found \(candidates.count)"
    )
}
guard !before.visibleSpaces.contains(target.spaceID) else {
    failSetup("target Space \(target.spaceID) is already visible")
}
guard CGSGetActiveSpace(connection) != target.spaceID else {
    failSetup("target Space \(target.spaceID) is already active")
}
guard isStrictlyOnscreen(windowID: target.windowID, ownerPID: pid) == false else {
    failSetup("target window \(target.windowID) is already onscreen")
}

print(
    "SETUP targetVM=\(compactID) visibleSpaces=\(before.visibleSpaces.sorted()) "
        + "targetSpace=\(target.spaceID) targetWindow=\(target.windowID) "
        + "targetOnscreen=false consolePID=\(pid) proxyPID=\(proxyPID)"
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

private let deadline = Date().addingTimeInterval(4)
private var consecutiveGreenSamples = 0
repeat {
    guard let current = topology() else {
        failSetup("managed Space topology disappeared during verification")
    }
    guard
        current.fullscreenSpaces.filter({
            $0.spaceID == target.spaceID
                && $0.ownerPID == target.ownerPID
                && $0.windowID == target.windowID
        }).count == 1,
        let currentStates = windowStates(),
        let currentState = currentStates[target.windowID],
        currentState.ownerPID == pid,
        currentState.layer == 0,
        currentState.bounds.width >= 800,
        currentState.bounds.height >= 600,
        let targetOnscreen = isStrictlyOnscreen(
            windowID: target.windowID,
            ownerPID: pid
        )
    else {
        failSetup("target window identity changed during verification")
    }
    guard let membership = spaces(for: target.windowID) else {
        failSetup("cannot read target window Space membership")
    }
    let green = current.visibleSpaces.contains(target.spaceID)
        && CGSGetActiveSpace(connection) == target.spaceID
        && targetOnscreen
        && membership == Set([target.spaceID])
    consecutiveGreenSamples = green ? consecutiveGreenSamples + 1 : 0
    if consecutiveGreenSamples >= 3 {
        print(
            "GREEN activeSpace=\(CGSGetActiveSpace(connection)) "
                + "visibleSpaces=\(current.visibleSpaces.sorted()) "
                + "targetSpace=\(target.spaceID) "
                + "targetWindow=\(target.windowID) "
                + "membership=\(membership.sorted()) targetOnscreen=true "
                + "stableSamples=\(consecutiveGreenSamples)"
        )
        exit(0)
    }
    Thread.sleep(forTimeInterval: 0.1)
} while Date() < deadline

guard
    let after = topology(),
    let finalMembership = spaces(for: target.windowID),
    let finalOnscreen = isStrictlyOnscreen(
        windowID: target.windowID,
        ownerPID: pid
    )
else {
    failSetup("cannot read final managed Space topology")
}
print(
    "RED activeSpace=\(CGSGetActiveSpace(connection)) "
        + "visibleSpaces=\(after.visibleSpaces.sorted()) "
        + "targetSpace=\(target.spaceID) targetWindow=\(target.windowID) "
        + "membership=\(finalMembership.sorted()) "
        + "targetOnscreen=\(finalOnscreen)"
)
exit(1)
