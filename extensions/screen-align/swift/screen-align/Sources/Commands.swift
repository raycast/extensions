import AppKit
import CoreGraphics
import RaycastSwiftMacros

// MARK: - Reading

@raycast
func listDisplays() -> Arrangement {
    arrangement()
}

// MARK: - Arranging

/// Move one display along the axis macOS leaves free, by a signed number of points.
@raycast
func nudge(displayID: UInt32, points: Int) throws -> Arrangement {
    guard let main = mainDisplay() else { throw ScreenAlignError.needTwoDisplays }
    let info = try display(displayID)
    _ = try nudgeDisplay(displayID, by: points, along: freeAxis(target: info, main: main))
    return arrangement()
}

/// Set one display's position along the free axis, as an offset from the main display's
/// leading edge.
@raycast
func setOffset(displayID: UInt32, offset: Int) throws -> Arrangement {
    guard let main = mainDisplay() else { throw ScreenAlignError.needTwoDisplays }
    let info = try display(displayID)
    let axis = freeAxis(target: info, main: main)
    let delta = main.position(axis) + offset - info.position(axis)
    _ = try nudgeDisplay(displayID, by: delta, along: axis)
    return arrangement()
}

/// Snap to aligned starts, centers or ends — tops and bottoms side by side, left and
/// right edges when stacked.
@raycast
func align(displayID: UInt32, mode: String) throws -> Arrangement {
    guard let main = mainDisplay() else { throw ScreenAlignError.needTwoDisplays }
    let info = try display(displayID)
    let axis = freeAxis(target: info, main: main)
    let origin = alignedOrigin(target: info, to: main, mode: AlignMode(rawValue: mode) ?? .center, axis: axis)
    _ = try moveDisplay(displayID, toX: Int(origin.x), y: Int(origin.y))
    return arrangement()
}

/// Put a display on one side of the main display. Moving it to a new side changes which
/// axis is free, so the offset is reset to centerd rather than carried over meaninglessly.
@raycast
func placeBeside(displayID: UInt32, side: String) throws -> Arrangement {
    guard let main = mainDisplay(), main.id != displayID else { throw ScreenAlignError.needTwoDisplays }
    let info = try display(displayID)
    let origin: CGPoint
    switch Side(rawValue: side) ?? .right {
    case .right: origin = CGPoint(x: main.right, y: info.y)
    case .left: origin = CGPoint(x: main.left - info.width, y: info.y)
    case .above: origin = CGPoint(x: info.x, y: main.top - info.height)
    case .below: origin = CGPoint(x: info.x, y: main.bottom)
    }
    _ = try moveDisplay(displayID, toX: Int(origin.x), y: Int(origin.y))
    return arrangement()
}

struct LayoutEntry: Codable {
    let uuid: String
    let x: Int
    let y: Int
}

/// Restore a saved layout. Displays are matched by UUID, since display IDs are reassigned
/// across reconnects.
@raycast
func applyLayout(entries: [LayoutEntry]) throws -> Arrangement {
    let byUUID = Dictionary(uniqueKeysWithValues: snapshot().map { ($0.uuid, $0.id) })
    var origins: [CGDirectDisplayID: CGPoint] = [:]
    for entry in entries {
        guard let id = byUUID[entry.uuid] else { continue }
        origins[id] = CGPoint(x: entry.x, y: entry.y)
    }
    guard !origins.isEmpty else { throw ScreenAlignError.needTwoDisplays }
    try setOrigins(origins)
    return arrangement()
}

// MARK: - Ruler overlay

// The overlay has to outlive the Raycast command that starts it, so the short-lived
// command re-executes this same binary with the hidden `runRulerOverlay` entry point and
// lets the child own an flock. A second run sees the lock, reads the pid and stops it,
// which makes the command a toggle.

private func lockPath(_ name: String, in support: String) -> String {
    (support as NSString).appendingPathComponent(name)
}

private func openLock(_ path: String) throws -> Int32 {
    let descriptor = open(path, O_RDWR | O_CREAT, 0o644)
    guard descriptor >= 0 else { throw ScreenAlignError.overlayDidNotStart }
    return descriptor
}

private func isLocked(_ descriptor: Int32) -> Bool {
    guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else { return true }
    flock(descriptor, LOCK_UN)
    return false
}

private func readPid(_ path: String) -> pid_t? {
    guard let text = try? String(contentsOfFile: path, encoding: .utf8),
          let value = Int32(text.trimmingCharacters(in: .whitespacesAndNewlines)),
          value > 0
    else { return nil }
    return value
}

@raycast
func rulersAreOpen(supportPath: String) -> Bool {
    guard let descriptor = try? openLock(lockPath("overlay.lock", in: supportPath)) else { return false }
    defer { close(descriptor) }
    return isLocked(descriptor)
}

/// Returns true when the overlay was opened, false when an open overlay was closed.
@raycast
func toggleRulers(supportPath: String) throws -> Bool {
    try FileManager.default.createDirectory(atPath: supportPath, withIntermediateDirectories: true)

    let gate = try openLock(lockPath("toggle.lock", in: supportPath))
    defer { close(gate) }
    flock(gate, LOCK_EX)

    let path = lockPath("overlay.lock", in: supportPath)
    let descriptor = try openLock(path)
    defer { close(descriptor) }

    if isLocked(descriptor) {
        if let pid = readPid(path) { kill(pid, SIGTERM) }
        return false
    }

    let worker = Process()
    worker.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    let encoded = String(data: try JSONEncoder().encode(supportPath), encoding: .utf8) ?? "\"\""
    worker.arguments = ["runRulerOverlay", encoded]
    worker.standardInput = FileHandle.nullDevice
    worker.standardOutput = FileHandle.nullDevice
    worker.standardError = FileHandle.nullDevice
    try worker.run()

    // Hold the gate until the child has taken the lock and written its pid, so the next
    // run is guaranteed to see it and close it.
    let deadline = Date().addingTimeInterval(5)
    while Date() < deadline && worker.isRunning {
        if readPid(path) == worker.processIdentifier { return true }
        usleep(10_000)
    }
    worker.terminate()
    throw ScreenAlignError.overlayDidNotStart
}

/// Hidden entry point: the detached overlay process.
@raycast
func runRulerOverlay(supportPath: String) async throws {
    let descriptor = try openLock(lockPath("overlay.lock", in: supportPath))
    guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else { exit(0) }
    ftruncate(descriptor, 0)
    let pid = "\(getpid())\n"
    _ = pid.withCString { write(descriptor, $0, strlen($0)) }

    await MainActor.run { Overlay.shared.run(supportPath: supportPath) }
}
