// Reads the live process table the way Mac Performance Monitor does (its
// ProcessReader.swift and AppGrouping.swift), so the extension can group an app's
// helpers under it. The app keeps this in memory and does not record it, and
// TypeScript cannot make these system calls, so this small Swift helper does.

import Darwin
import Foundation
import RaycastSwiftMacros

/// One running process, as macOS reports it.
struct RunningProcess: Encodable {
    let pid: Int32
    /// Full path of the executable, or nil when macOS will not reveal it.
    let path: String?
    /// The resource coalition macOS accounts this process to. An app and every
    /// helper working for it share one, including XPC services such as WebKit's
    /// content processes, whose parent process is launchd rather than the app.
    let coalitionId: UInt64?
    /// The process macOS holds responsible for this one: the app, for its helpers.
    let responsiblePid: Int32?
    /// "Safari" when this is the main executable of Safari.app, otherwise nil.
    let appName: String?

    // Write nil as JSON null (instead of leaving the key out), so every field
    // always exists on the TypeScript side.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(pid, forKey: .pid)
        try container.encode(path, forKey: .path)
        try container.encode(coalitionId, forKey: .coalitionId)
        try container.encode(responsiblePid, forKey: .responsiblePid)
        try container.encode(appName, forKey: .appName)
    }

    enum CodingKeys: String, CodingKey {
        case pid, path, coalitionId, responsiblePid, appName
    }
}

/// Every process running on this Mac.
@raycast func listRunningProcesses() -> [RunningProcess] {
    var result: [RunningProcess] = []
    // CFBundleExecutable per bundle path, so each Info.plist is read once per call.
    var mainExecutableByBundle: [String: String?] = [:]

    for pid in allPids() {
        let path = executablePath(pid)
        var appName: String? = nil
        if let path = path {
            appName = mainAppName(executablePath: path, cache: &mainExecutableByBundle)
        }
        result.append(
            RunningProcess(
                pid: pid,
                path: path,
                coalitionId: coalitionId(pid),
                responsiblePid: responsiblePid(pid),
                appName: appName))
    }
    return result
}

/// The PIDs of every running process.
private func allPids() -> [Int32] {
    // Called with no buffer, proc_listallpids returns how many processes exist.
    // Leave room for a few that start between the two calls.
    let count = proc_listallpids(nil, 0)
    if count <= 0 {
        return []
    }
    var pids = [Int32](repeating: 0, count: Int(count) + 32)
    let filled = pids.withUnsafeMutableBufferPointer { buffer in
        proc_listallpids(buffer.baseAddress, Int32(buffer.count * MemoryLayout<Int32>.size))
    }
    if filled <= 0 {
        return []
    }

    var result: [Int32] = []
    for pid in pids.prefix(Int(filled)) where pid > 0 {
        result.append(pid)
    }
    return result
}

/// The executable's full path, or nil when macOS refuses (some system processes).
private func executablePath(_ pid: Int32) -> String? {
    // 4096 is PROC_PIDPATHINFO_MAXSIZE, which Swift does not import.
    var buffer = [CChar](repeating: 0, count: 4096)
    let length = proc_pidpath(pid, &buffer, UInt32(buffer.count))
    if length <= 0 {
        return nil
    }
    return String(cString: buffer)
}

/// The process's resource coalition id. Flavor 20 is PROC_PIDCOALITIONINFO, which
/// is not in the public SDK; it fills the resource and jetsam coalition ids and
/// three reserved words. Same call as Mac Performance Monitor's ProcessReader.
private func coalitionId(_ pid: Int32) -> UInt64? {
    var words: (UInt64, UInt64, UInt64, UInt64, UInt64) = (0, 0, 0, 0, 0)
    let size = Int32(MemoryLayout.size(ofValue: words))
    let filled = withUnsafeMutablePointer(to: &words) { pointer in
        proc_pidinfo(pid, 20, 0, pointer, size)
    }
    if filled != size || words.0 == 0 {
        return nil
    }
    return words.0
}

/// responsibility_get_pid_responsible_for_pid is private libsystem API, so it is
/// looked up by name at runtime. RTLD_DEFAULT is -2. Nil if macOS lacks it.
private typealias ResponsibleFor = @convention(c) (pid_t) -> pid_t
private let responsibleFor: ResponsibleFor? = {
    guard let symbol = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "responsibility_get_pid_responsible_for_pid") else {
        return nil
    }
    return unsafeBitCast(symbol, to: ResponsibleFor.self)
}()

/// The process macOS holds responsible for `pid`, or nil when the call fails
/// (it does for many root processes).
private func responsiblePid(_ pid: Int32) -> Int32? {
    guard let responsibleFor = responsibleFor else {
        return nil
    }
    let responsible = responsibleFor(pid)
    if responsible <= 0 {
        return nil
    }
    return responsible
}

/// "Name" for a path ending in `Name.app/Contents/MacOS/<executable>` when that
/// executable is the bundle's main one (its CFBundleExecutable); nil otherwise.
/// A second binary in Contents/MacOS, such as a bundled helper, is not the app.
private func mainAppName(executablePath: String, cache: inout [String: String?]) -> String? {
    let parts = executablePath.split(separator: "/")
    if parts.count < 4 || parts[parts.count - 2] != "MacOS" || parts[parts.count - 3] != "Contents" {
        return nil
    }
    let bundleFolder = parts[parts.count - 4]
    if !bundleFolder.hasSuffix(".app") || bundleFolder.count <= 4 {
        return nil
    }
    let bundlePath = "/" + parts.dropLast(3).joined(separator: "/")

    var mainExecutable: String? = nil
    if let cached = cache[bundlePath] {
        mainExecutable = cached
    } else {
        mainExecutable = Bundle(path: bundlePath)?.infoDictionary?["CFBundleExecutable"] as? String
        cache[bundlePath] = mainExecutable
    }

    // Without a readable Info.plist the executable is taken to be the main one.
    if let mainExecutable = mainExecutable, mainExecutable != String(parts[parts.count - 1]) {
        return nil
    }
    return String(bundleFolder.dropLast(4))
}
