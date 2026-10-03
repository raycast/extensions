import AppKit
import CoreGraphics
import Darwin

struct Display: Codable {
    let id: String
    let name: String
    let enabled: Bool
    let builtIn: Bool
    let main: Bool
    let mirrored: Bool
    let width: Int
    let height: Int
    var warning: String? = nil
}
struct SavedDisplay: Codable {
    var name: String
    var x: Int32
    var y: Int32
    var mode: Int32?
    var cgID: UInt32?
    var builtIn: Bool?
    var disabledByUs: Bool?
    var boot: String?
    var width: Int?
    var height: Int?
}
enum Failure: Error, CustomStringConvertible {
    case message(String)
    var description: String { switch self { case .message(let text): return text } }
}
func check(_ result: CGError, _ operation: String) throws {
    guard result == .success else { throw Failure.message("\(operation) failed (macOS error \(result.rawValue)).") }
}
func online() throws -> [CGDirectDisplayID] {
    var count: UInt32 = 0
    try check(CGGetOnlineDisplayList(0, nil, &count), "Read displays")
    var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
    try check(CGGetOnlineDisplayList(count, &ids, &count), "Read displays")
    return Array(ids.prefix(Int(count)))
}
func uuid(_ id: CGDirectDisplayID) -> String? {
    guard let value = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() else { return nil }
    return CFUUIDCreateString(nil, value) as String
}
// A display without a stable UUID remains part of the native safety inventory,
// but cannot be safely targeted or cached by the extension.
func identifiedIDs(_ ids: [CGDirectDisplayID], identity: (CGDirectDisplayID) -> String?) -> [(CGDirectDisplayID, String)] {
    ids.compactMap { id in identity(id).map { (id, $0) } }
}
func bestEffortLayout(_ operation: () throws -> Void) -> String? {
    do { try operation(); return nil }
    catch { return "Display is on, but its previous layout could not be restored: \(error)" }
}
var warnings: [String: String] = [:]
func enabled(_ id: CGDirectDisplayID) -> Bool { CGDisplayIsActive(id) != 0 || CGDisplayIsInMirrorSet(id) != 0 }
typealias ConfigureEnabled = @convention(c) (CGDisplayConfigRef?, CGDirectDisplayID, Bool) -> Int32
func configureFunction() throws -> ConfigureEnabled {
    let path = "/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight"
    guard let handle = dlopen(path, RTLD_LAZY),
          let symbol = dlsym(handle, "SLSConfigureDisplayEnabled") ?? dlsym(handle, "CGSConfigureDisplayEnabled") else {
        throw Failure.message("This macOS version does not expose display switching. No displays were changed.")
    }
    return unsafeBitCast(symbol, to: ConfigureEnabled.self)
}
let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Display Switch", isDirectory: true)
let cacheURL = directory.appendingPathComponent("displays.json")
var saved: [String: SavedDisplay] = [:]
func save() throws {
    try JSONEncoder().encode(saved).write(to: cacheURL, options: .atomic)
    let handle = try FileHandle(forWritingTo: cacheURL)
    try handle.synchronize()
    try handle.close()
}
func bootIdentity() -> String {
    var value = timeval()
    var size = MemoryLayout<timeval>.size
    guard sysctlbyname("kern.boottime", &value, &size, nil, 0) == 0 else { return "unknown" }
    return "\(value.tv_sec):\(value.tv_usec)"
}
func allIDs() throws -> [CGDirectDisplayID] {
    _ = try online() // Initialize CoreGraphics before calling SkyLight.
    let handle = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY)
    guard let symbol = dlsym(handle, "SLSGetDisplayList") ?? dlsym(handle, "CGSGetDisplayList") else {
        throw Failure.message("Display recovery is unsupported on this macOS version. No displays were changed.")
    }
    typealias GetList = @convention(c) (UInt32, UnsafeMutablePointer<UInt32>?, UnsafeMutablePointer<UInt32>?) -> Int32
    let getList = unsafeBitCast(symbol, to: GetList.self)
    var count: UInt32 = 0
    var ids = [UInt32](repeating: 0, count: 128)
    guard getList(128, &ids, &count) == 0, count <= 128 else { throw Failure.message("Could not read the full display inventory.") }
    return Array(ids.prefix(Int(count)))
}
func knownID(_ key: String) throws -> CGDirectDisplayID? {
    let ids = try online()
    if let id = ids.first(where: { uuid($0)?.caseInsensitiveCompare(key) == .orderedSame }) { return id }
    guard let record = saved.first(where: { $0.key.caseInsensitiveCompare(key) == .orderedSame })?.value,
          record.disabledByUs == true, record.boot == bootIdentity(),
          let id = record.cgID, !ids.contains(id), try allIDs().contains(id),
          (CGDisplayIsBuiltin(id) != 0) == (record.builtIn == true) else { return nil }
    return id
}
func snapshot(_ ids: [CGDirectDisplayID]) throws {
    let screens = NSScreen.screens
    for (id, key) in identifiedIDs(ids, identity: uuid) {
        let name = screens.first { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == id }?.localizedName
        if enabled(id) {
            let rect = CGDisplayBounds(id)
            saved[key] = SavedDisplay(name: name ?? saved[key]?.name ?? (CGDisplayIsBuiltin(id) != 0 ? "Built-in Display" : "Display \(CGDisplayVendorNumber(id))-\(CGDisplayModelNumber(id))"), x: Int32(rect.origin.x), y: Int32(rect.origin.y), mode: CGDisplayCopyDisplayMode(id)?.ioDisplayModeID, cgID: id, builtIn: CGDisplayIsBuiltin(id) != 0, disabledByUs: false, boot: bootIdentity(), width: Int(rect.width), height: Int(rect.height))
        }
    }
    try save()
}
func displays() throws -> [Display] {
    let ids = try online()
    try snapshot(ids)
    var result = identifiedIDs(ids, identity: uuid).map { id, key in
        let rect = CGDisplayBounds(id)
        return Display(id: key, name: saved[key]?.name ?? "Display \(id)", enabled: enabled(id), builtIn: CGDisplayIsBuiltin(id) != 0, main: CGDisplayIsMain(id) != 0, mirrored: CGDisplayIsInMirrorSet(id) != 0, width: Int(rect.width), height: Int(rect.height), warning: warnings[key])
    }
    let full = try allIDs()
    for (key, record) in saved where record.disabledByUs == true && record.boot == bootIdentity() {
        guard let id = record.cgID, full.contains(id), !ids.contains(id), (CGDisplayIsBuiltin(id) != 0) == (record.builtIn == true) else { continue }
        result.append(Display(id: key, name: record.name, enabled: false, builtIn: record.builtIn == true, main: false, mirrored: false, width: record.width ?? 0, height: record.height ?? 0))
    }
    return result
}
func waitFor(_ id: CGDirectDisplayID, _ state: Bool) throws {
    for _ in 0..<40 {
        if enabled(id) == state { return }
        usleep(100_000)
    }
    throw Failure.message("macOS did not confirm the display is \(state ? "on" : "off"). Use Enable All Displays; some monitors require reconnecting the cable.")
}
func set(_ id: CGDirectDisplayID, _ state: Bool) throws {
    let ids = try online()
    let fullInventory = try allIDs()
    guard ids.contains(id) || (state && saved.values.contains(where: { $0.cgID == id && $0.disabledByUs == true && $0.boot == bootIdentity() }) && fullInventory.contains(id)) else { throw Failure.message("Display is no longer connected. Refresh and try again.") }
    if enabled(id) == state { return }
    if !state {
        // Count independent active desktops conservatively; a mirror alone is not a fallback.
        guard ids.filter({ CGDisplayIsActive($0) != 0 && $0 != id }).count > 0 else {
            throw Failure.message("The last active display cannot be turned off.")
        }
        guard CGDisplayIsInMirrorSet(id) == 0 else { throw Failure.message("Unmirror this display in System Settings before turning it off.") }
    }
    let configure = try configureFunction()
    _ = try allIDs() // Do not disable unless the recovery API is available.
    guard let key = ids.contains(id) ? uuid(id) : saved.first(where: { $0.value.cgID == id && $0.value.disabledByUs == true })?.key else {
        throw Failure.message("macOS did not provide a stable UUID for this display. No displays were changed.")
    }
    try snapshot(ids)
    if !state {
        saved[key]?.disabledByUs = true
        try save() // Persist identity before the display vanishes from public APIs.
    }
    var config: CGDisplayConfigRef?
    try check(CGBeginDisplayConfiguration(&config), "Begin display change")
    let result = configure(config, id, state)
    guard result == 0 else {
        if let config { CGCancelDisplayConfiguration(config) }
        if !state { saved[key]?.disabledByUs = false; try save() }
        throw Failure.message("Display switching is unsupported for this display (macOS error \(result)).")
    }
    try check(CGCompleteDisplayConfiguration(config, .forSession), "Apply display change")
    try waitFor(id, state)
    if state, let previous = saved[key] {
        // Power state was confirmed above; layout errors must not turn enable into a failure.
        saved[key]?.disabledByUs = false
        try save()
        warnings[key] = bestEffortLayout {
            var layout: CGDisplayConfigRef?
            var completed = false
            defer { if !completed, let layout { CGCancelDisplayConfiguration(layout) } }
            try check(CGBeginDisplayConfiguration(&layout), "Begin layout restore")
            if let modeID = previous.mode,
               let modes = CGDisplayCopyAllDisplayModes(id, [kCGDisplayShowDuplicateLowResolutionModes: true] as CFDictionary) as? [CGDisplayMode],
               let mode = modes.first(where: { $0.ioDisplayModeID == modeID }) {
                try check(CGConfigureDisplayWithDisplayMode(layout, id, mode, nil), "Restore resolution")
            }
            try check(CGConfigureDisplayOrigin(layout, id, previous.x, previous.y), "Restore position")
            try check(CGCompleteDisplayConfiguration(layout, .forSession), "Restore display layout")
            completed = true
        }
    }
}
func output<T: Encodable>(_ value: T) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    print(String(decoding: try encoder.encode(value), as: UTF8.self))
}
// CLI entry point.
do {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let lock = open(directory.appendingPathComponent("control.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard lock >= 0, flock(lock, LOCK_EX | LOCK_NB) == 0 else { throw Failure.message("Another display change is in progress. Try again.") }
    defer { flock(lock, LOCK_UN); close(lock) }
    if let data = try? Data(contentsOf: cacheURL) { saved = (try? JSONDecoder().decode([String: SavedDisplay].self, from: data)) ?? [:] }
    let args = Array(CommandLine.arguments.dropFirst())
    guard let command = args.first else { throw Failure.message("Usage: display-control list | set UUID on|off | enable-all | probe UUID") }
    switch command {
    case "list": try output(displays())
    case "set", "probe":
        guard args.count == (command == "set" ? 3 : 2), let id = try knownID(args[1]) else {
            throw Failure.message("Specify the UUID of a connected display.")
        }
        if command == "probe" {
            guard enabled(id) else { throw Failure.message("Probe requires an enabled display.") }
            // Same process restores even when disabling fails its readback; never probe the only screen.
            var restoreError: Error?
            do {
                try set(id, false)
                fputs("Disabled and verified; restoring in 2 seconds.\n", stderr)
                usleep(2_000_000)
            } catch { restoreError = error }
            try set(id, true)
            if let restoreError { throw restoreError }
        } else {
            guard ["on", "off"].contains(args[2]) else { throw Failure.message("State must be on or off.") }
            try set(id, args[2] == "on")
        }
        try output(displays())
    case "enable-all":
        var failures: [String] = []
        for display in try displays() where !display.enabled {
            do {
                guard let id = try knownID(display.id) else { throw Failure.message("Reconnect \(display.name) and try again.") }
                try set(id, true)
            } catch { failures.append(String(describing: error)) }
        }
        guard failures.isEmpty else { throw Failure.message(failures.joined(separator: "\n")) }
        try output(displays())
    default: throw Failure.message("Unknown command: \(command)")
    }
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
