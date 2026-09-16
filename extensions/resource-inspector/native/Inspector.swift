import Foundation
import AppKit
import Darwin
import SQLite3

struct Failure: Error, CustomStringConvertible {
    let description: String
    init(_ message: String) { description = message }
}
func emit(_ value: Any) throws {
    let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([10]))
}
func input() throws -> [String: Any] {
    guard let value = try JSONSerialization.jsonObject(with: FileHandle.standardInput.readDataToEndOfFile()) as? [String: Any] else { throw Failure("Invalid request") }
    return value
}
func sysValue<T>(_ name: String, _ initial: T) -> T? {
    var value = initial
    var size = MemoryLayout<T>.size
    let result = withUnsafeMutablePointer(to: &value) { sysctlbyname(name, $0, &size, nil, 0) }
    return result == 0 ? value : nil
}
func sysString(_ name: String) -> String {
    var size = 0
    guard sysctlbyname(name, nil, &size, nil, 0) == 0, size > 0 else { return "unknown" }
    var buffer = [CChar](repeating: 0, count: size)
    guard sysctlbyname(name, &buffer, &size, nil, 0) == 0 else { return "unknown" }
    return String(cString: buffer)
}
func bootID() -> String { sysString("kern.bootsessionuuid") }
func awakeTime() -> Double {
    var info = mach_timebase_info_data_t()
    mach_timebase_info(&info)
    return Double(mach_absolute_time()) * Double(info.numer) / Double(info.denom) / 1e9
}
func outerApp(_ path: String) -> String? {
    guard let range = path.range(of: ".app/") else { return nil }
    return String(path[..<range.lowerBound]) + ".app"
}
func processRows() -> [[String: Any]] {
    let count = proc_listallpids(nil, 0)
    var ids = [pid_t](repeating: 0, count: Int(max(count, 1)) + 512)
    let got = ids.withUnsafeMutableBytes { proc_listallpids($0.baseAddress, Int32($0.count)) }
    var rows = [[String: Any]]()
    for pid in ids.prefix(Int(max(0, got))) where pid > 0 {
        var bsd = proc_bsdinfo()
        guard proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &bsd, Int32(MemoryLayout.size(ofValue: bsd))) == MemoryLayout.size(ofValue: bsd) else { continue }
        var path = [CChar](repeating: 0, count: 4096)
        let pathLength = proc_pidpath(pid, &path, UInt32(path.count))
        let executable = pathLength > 0 ? String(cString: path) : ""
        let shortName = withUnsafePointer(to: &bsd.pbi_name) { ptr in ptr.withMemoryRebound(to: CChar.self, capacity: 32) { String(cString: $0) } }
        var usage = rusage_info_v4()
        let readable = withUnsafeMutablePointer(to: &usage) { p in p.withMemoryRebound(to: rusage_info_t?.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V4, $0) } } == 0
        let start = "\(bsd.pbi_start_tvsec):\(bsd.pbi_start_tvusec)"
        var row: [String: Any] = ["pid": Int(pid), "ppid": Int(bsd.pbi_ppid), "uid": Int(bsd.pbi_uid), "start": start,
            "executable": executable, "name": executable.isEmpty ? shortName : URL(fileURLWithPath: executable).lastPathComponent]
        row["memory"] = readable ? usage.ri_phys_footprint as Any : NSNull()
        row["cpuNs"] = readable ? Double(usage.ri_user_time + usage.ri_system_time) as Any : NSNull()
        row["readBytes"] = readable ? Double(usage.ri_diskio_bytesread) as Any : NSNull()
        row["writeBytes"] = readable ? Double(usage.ri_diskio_byteswritten) as Any : NSNull()
        rows.append(row)
    }
    let byPID = Dictionary(uniqueKeysWithValues: rows.map { ($0["pid"] as! Int, $0) })
    let running = NSWorkspace.shared.runningApplications
    var apps = [String: [String: Any]]()
    for app in running {
        guard let url = app.bundleURL else { continue }
        let path = url.path
        if apps[path] != nil && app.activationPolicy != .regular { continue }
        let bundle = app.bundleIdentifier ?? ""
        apps[path] = ["appPath": path, "bundleId": bundle,
            "appName": bundle == "com.openai.codex" ? "Codex" : (app.localizedName ?? url.deletingPathExtension().lastPathComponent),
            "appPid": Int(app.processIdentifier)]
    }
    func chain(_ first: Int) -> [[String: Any]] {
        var result = [[String: Any]](), seen = Set<Int>(), pid = first
        while let row = byPID[pid], !seen.contains(pid), pid > 1 {
            seen.insert(pid); result.append(row); pid = row["ppid"] as! Int
        }
        return result
    }
    let ownAncestors = Set(chain(Int(getpid())).map { $0["pid"] as! Int })
    return rows.map { original in
        var row = original
        let pid = row["pid"] as! Int, executable = row["executable"] as! String
        let ancestry = chain(pid)
        for ancestor in ancestry {
            if let path = outerApp(ancestor["executable"] as! String) {
                if let info = apps[path] { row.merge(info) { _, new in new } }
                else {
                    row["appPath"] = path
                    row["appName"] = URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent
                    row["bundleId"] = Bundle(path: path)?.bundleIdentifier ?? ""
                }
                break
            }
        }
        var reason: String? = nil
        if row["uid"] as! Int != Int(getuid()) { reason = "Owned by another user or macOS" }
        if pid <= 1 || executable.hasPrefix("/System/Library/") || executable.hasPrefix("/usr/libexec/") || executable.hasPrefix("/usr/sbin/") || executable.hasPrefix("/sbin/") { reason = "macOS infrastructure" }
        if executable.isEmpty { reason = "Process identity could not be verified" }
        if ownAncestors.contains(pid) || ancestry.contains(where: { ($0["executable"] as! String).contains("/Raycast.app/") }) { reason = "Raycast and inspector processes are protected" }
        row["blockedReason"] = reason as Any? ?? NSNull()
        return row
    }
}
func systemMetrics() -> [String: Any] {
    var stats = vm_statistics64_data_t()
    var count = mach_msg_type_number_t(MemoryLayout.size(ofValue: stats) / MemoryLayout<integer_t>.size)
    let host = mach_host_self()
    defer { mach_port_deallocate(mach_task_self_, host) }
    let ok = withUnsafeMutablePointer(to: &stats) { ptr in ptr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { host_statistics64(host, HOST_VM_INFO64, $0, &count) } } == KERN_SUCCESS
    var pageSize: vm_size_t = 0
    host_page_size(host, &pageSize)
    let swap = sysValue("vm.swapusage", xsw_usage())
    return ["totalMemory": sysValue("hw.memsize", UInt64(0)) as Any? ?? NSNull(),
        "logicalCPUs": sysValue("hw.logicalcpu", Int32(0)) as Any? ?? NSNull(),
        "pressure": sysValue("kern.memorystatus_vm_pressure_level", Int32(0)) as Any? ?? NSNull(),
        "compressed": ok ? UInt64(stats.compressor_page_count) * UInt64(pageSize) as Any : NSNull(),
        "swapUsed": swap?.xsu_used as Any? ?? NSNull()]
}
func snapshot() -> [String: Any] {
    ["timestamp": Date().timeIntervalSince1970, "awake": awakeTime(), "boot": bootID(), "system": systemMetrics(), "processes": processRows()]
}
func act(_ request: [String: Any]) throws -> [String: Any] {
    guard let pid = request["pid"] as? Int, pid > 1,
          let start = request["start"] as? String, let boot = request["boot"] as? String, boot != "unknown", boot == bootID(),
          let path = request["executable"] as? String, !path.isEmpty,
          let action = request["action"] as? String,
          ["quit-app", "force-app", "stop-process", "force-process"].contains(action) else { throw Failure("Invalid or outdated process identity; refresh the list") }
    guard let current = processRows().first(where: { $0["pid"] as? Int == pid }) else { return ["status": "exited"] }
    guard current["start"] as? String == start, current["executable"] as? String == path else { throw Failure("This process has changed. Refresh before acting.") }
    if let reason = current["blockedReason"] as? String { throw Failure(reason) }
    if action.hasSuffix("app") {
        guard current["appPid"] as? Int == pid, let app = NSRunningApplication(processIdentifier: pid_t(pid)) else { throw Failure("This application is no longer available") }
        let accepted = action == "quit-app" ? app.terminate() : app.forceTerminate()
        return ["status": accepted ? "requested" : "rejected"]
    }
    guard kill(pid_t(pid), action == "stop-process" ? SIGTERM : SIGKILL) == 0 else {
        if errno == ESRCH { return ["status": "exited"] }
        throw Failure(String(cString: strerror(errno)))
    }
    return ["status": "requested"]
}

// SQLite transactions live in one short-lived helper process; no native Node addon or daemon.
func database(_ request: [String: Any]) throws -> [Any] {
    guard let path = request["path"] as? String, let statements = request["statements"] as? [[String: Any]] else { throw Failure("Invalid database request") }
    var db: OpaquePointer?
    guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else { if let db { sqlite3_close(db) }; throw Failure("Cannot open local history") }
    defer { sqlite3_close(db) }
    sqlite3_busy_timeout(db, 5000)
    func error() -> Failure { Failure(String(cString: sqlite3_errmsg(db))) }
    guard sqlite3_exec(db, "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; BEGIN IMMEDIATE", nil, nil, nil) == SQLITE_OK else { throw error() }
    var committed = false
    defer { if !committed { sqlite3_exec(db, "ROLLBACK", nil, nil, nil) } }
    var results = [Any]()
    for statement in statements {
        guard let sql = statement["sql"] as? String else { throw Failure("Missing SQL") }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { throw error() }
        defer { sqlite3_finalize(stmt) }
        for (index, value) in (statement["params"] as? [Any] ?? []).enumerated() {
            let slot = Int32(index + 1)
            var result: Int32 = SQLITE_OK
            if value is NSNull { result = sqlite3_bind_null(stmt, slot) }
            else if let text = value as? String { result = sqlite3_bind_text(stmt, slot, text, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self)) }
            else if let number = value as? NSNumber { result = sqlite3_bind_double(stmt, slot, number.doubleValue) }
            else { throw Failure("Invalid database parameter") }
            guard result == SQLITE_OK else { throw error() }
        }
        var rows = [[String: Any]]()
        var step = sqlite3_step(stmt)
        while step == SQLITE_ROW {
            var row = [String: Any]()
            for col in 0..<sqlite3_column_count(stmt) {
                let name = String(cString: sqlite3_column_name(stmt, col))
                switch sqlite3_column_type(stmt, col) {
                case SQLITE_INTEGER: row[name] = sqlite3_column_int64(stmt, col)
                case SQLITE_FLOAT: row[name] = sqlite3_column_double(stmt, col)
                case SQLITE_TEXT: row[name] = String(cString: sqlite3_column_text(stmt, col))
                default: row[name] = NSNull()
                }
            }
            rows.append(row); step = sqlite3_step(stmt)
        }
        guard step == SQLITE_DONE else { throw error() }
        results.append(rows)
    }
    guard sqlite3_exec(db, "COMMIT", nil, nil, nil) == SQLITE_OK else { throw error() }
    committed = true
    return results
}

umask(0o077)
do {
    switch CommandLine.arguments.dropFirst().first ?? "" {
    case "snapshot": try emit(snapshot())
    case "action": try emit(act(input()))
    case "database": try emit(database(input()))
    default: throw Failure("Expected snapshot, action, or database")
    }
} catch {
    try? emit(["error": String(describing: error)])
    exit(1)
}
