import Foundation
import AppKit
import SQLite3

// Shared by the sampler and notification application. All persisted decisions are
// serialized with history/settings writes; no notification contains a raw PID action.
struct IdleProcess: Codable {
    let pid: Int, ppid: Int, uid: Int
    let start: String, executable: String, name: String
    let memory: Double?, cpuNs: Double?, readBytes: Double?, writeBytes: Double?
    let appPath: String?, appName: String?, bundleId: String?, appPid: Int?
    let appBlockedReason: String?, blockedReason: String?, foreground: Bool?
    var identity: String { "\(pid):\(start):\(executable)" }
}
struct IdleSnapshot: Codable {
    let timestamp: Double, awake: Double, boot: String
    let processes: [IdleProcess]
}
struct IdleRule: Codable {
    let id: String, kind: String, name: String, executable: String
    let appPath: String?, bundleId: String?
}
struct IdleTarget: Codable {
    let ruleID: String, boot: String, target: IdleProcess, members: [IdleProcess]
    var key: String { "\(ruleID):\(boot):\(target.identity)" }
    var memory: Double? {
        let values = members.compactMap(\.memory)
        return values.count == members.count ? values.reduce(0, +) : nil
    }
}
struct IdleInstance: Codable {
    var target: IdleTarget
    var timestamp: Double, awake: Double, quietSeconds: Double
    var episode: String, notified: Bool
}
struct IdleNotice: Codable {
    let id: String, instanceKey: String, episode: String, name: String, kind: String, created: Double
    var status: String
}
struct IdleOutcome: Codable {
    let id: String, name: String, time: Double, message: String
}
struct IdleState: Codable {
    var version = 1
    var revision = 0
    var enabled = false
    var thresholdSeconds: Double = 10800
    var rules = [IdleRule]()
    var instances = [String: IdleInstance]()
    var notices = [IdleNotice]()
    var outcomes = [IdleOutcome]()
    var lastNotification: Double = 0
}

func idleEligible(_ process: IdleProcess) -> Bool {
    guard process.pid > 1, process.uid == Int(getuid()), process.blockedReason == nil,
          !process.executable.isEmpty else { return false }
    let path = process.executable
    if ["/System/", "/usr/lib/", "/usr/libexec/", "/usr/sbin/", "/sbin/", "/Library/Apple/"].contains(where: { path.hasPrefix($0) }) { return false }
    if let app = outerApp(path), app == process.appPath,
       let bundle = process.bundleId, bundle.hasPrefix("com.apple."), !bundle.hasPrefix("com.apple.dt.") { return false }
    if path.contains("/Raycast.app/") || path.contains("/Resource Inspector Notifications.app/") || path.hasSuffix("/assets/inspector") { return false }
    return true
}

func idleTargets(_ snapshot: IdleSnapshot, rules: [IdleRule]) -> [IdleTarget] {
    guard snapshot.boot != "unknown", !snapshot.boot.isEmpty else { return [] }
    return rules.flatMap { rule -> [IdleTarget] in
        if rule.kind == "app" {
            let members = snapshot.processes.filter { $0.appPath == rule.appPath && $0.bundleId == rule.bundleId }
            let owners = members.filter { $0.pid == $0.appPid && $0.executable == rule.executable }
            guard owners.count == 1, let owner = owners.first, owner.appBlockedReason == nil,
                  !members.isEmpty, members.allSatisfy(idleEligible) else { return [] }
            return [IdleTarget(ruleID: rule.id, boot: snapshot.boot, target: owner, members: members)]
        }
        return snapshot.processes.filter { $0.executable == rule.executable && outerApp($0.executable) == nil && idleEligible($0) }
            .map { IdleTarget(ruleID: rule.id, boot: snapshot.boot, target: $0, members: [$0]) }
    }
}

func idleInterval(_ old: IdleInstance, _ target: IdleTarget, timestamp: Double, awake: Double) -> Double {
    let wall = timestamp - old.timestamp, elapsed = awake - old.awake
    guard target.key == old.target.key, wall > 0, wall <= 120, elapsed > 0,
          abs(wall - elapsed) < 3,
          Set(target.members.map(\.identity)) == Set(old.target.members.map(\.identity)) else { return 0 }
    let previous = Dictionary(uniqueKeysWithValues: old.target.members.map { ($0.identity, $0) })
    var cpu = 0.0, disk = 0.0
    for process in target.members {
        guard let before = previous[process.identity], process.foreground == false, before.foreground == false,
              let c = process.cpuNs, let pc = before.cpuNs, c >= pc,
              let r = process.readBytes, let pr = before.readBytes, r >= pr,
              let w = process.writeBytes, let pw = before.writeBytes, w >= pw,
              [c, pc, r, pr, w, pw].allSatisfy({ $0.isFinite && $0 >= 0 }) else { return 0 }
        cpu += c - pc
        disk += r - pr + w - pw
    }
    return cpu / 1e9 / elapsed * 100 < 1 && disk / elapsed < 65536 ? elapsed : 0
}

func idleObserve(_ state: inout IdleState, snapshot: IdleSnapshot) {
    guard state.enabled else { return }
    var next = [String: IdleInstance]()
    for target in idleTargets(snapshot, rules: state.rules) {
        let old = state.instances[target.key]
        // A repeated foreground/manual recording must not destroy a valid baseline.
        if let old, snapshot.timestamp >= old.timestamp, snapshot.timestamp - old.timestamp < 30 {
            next[target.key] = old
            continue
        }
        let elapsed = old.map { idleInterval($0, target, timestamp: snapshot.timestamp, awake: snapshot.awake) } ?? 0
        next[target.key] = IdleInstance(target: target, timestamp: snapshot.timestamp, awake: snapshot.awake,
            quietSeconds: elapsed > 0 ? (old!.quietSeconds + elapsed) : 0,
            episode: elapsed > 0 ? old!.episode : UUID().uuidString,
            notified: elapsed > 0 ? old!.notified : false)
    }
    state.instances = next
    for index in state.notices.indices where ["pending", "posting"].contains(state.notices[index].status) {
        let notice = state.notices[index]
        if next[notice.instanceKey]?.episode != notice.episode { state.notices[index].status = "obsolete" }
    }
}

// A single JSON document makes schema changes and concurrent callback handling
// atomic without keeping a database connection or process alive between samples.
final class IdleDatabase {
    let db: OpaquePointer
    init(_ path: String) throws {
        var connection: OpaquePointer?
        guard sqlite3_open_v2(path, &connection, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK, let value = connection else {
            if let connection { sqlite3_close(connection) }
            throw Failure("Cannot open inactivity state")
        }
        db = value
        sqlite3_busy_timeout(db, 5000)
    }
    deinit { sqlite3_close(db) }
    func execute(_ sql: String, _ text: String? = nil) throws -> String? {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw Failure(String(cString: sqlite3_errmsg(db))) }
        defer { sqlite3_finalize(statement) }
        if let text {
            guard sqlite3_bind_text(statement, 1, text, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self)) == SQLITE_OK else { throw Failure("Cannot bind inactivity state") }
        }
        let result = sqlite3_step(statement)
        guard result == SQLITE_DONE || result == SQLITE_ROW else { throw Failure(String(cString: sqlite3_errmsg(db))) }
        if result == SQLITE_ROW, let bytes = sqlite3_column_text(statement, 0) { return String(cString: bytes) }
        return nil
    }
    func transaction<T>(_ body: (inout IdleState, Bool) throws -> T) throws -> T {
        _ = try execute("BEGIN IMMEDIATE")
        var committed = false
        defer { if !committed { _ = try? execute("ROLLBACK") } }
        _ = try execute("CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        _ = try execute("CREATE TABLE IF NOT EXISTS inactivity_control(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL)")
        _ = try execute("INSERT OR IGNORE INTO inactivity_control VALUES(1,0)")
        _ = try execute("CREATE TABLE IF NOT EXISTS inactivity_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)")
        let revision = Int(try execute("SELECT revision FROM inactivity_control WHERE id=1") ?? "0") ?? 0
        var state = IdleState()
        if let json = try execute("SELECT data FROM inactivity_state WHERE id=1") {
            do { state = try JSONDecoder().decode(IdleState.self, from: Data(json.utf8)) }
            catch { throw Failure("Inactivity data could not be read. No targets were changed.") }
        }
        guard state.version == 1 else { throw Failure("Unsupported inactivity data version") }
        let paused = try execute("SELECT value FROM meta WHERE key='paused'") == "true"
        if state.revision != revision || paused || !state.enabled {
            idleReset(&state)
            state.revision = revision
        }
        let cutoff = Date().timeIntervalSince1970 - 7 * 86400
        state.outcomes.removeAll { $0.time < cutoff }
        state.notices.removeAll { $0.created < cutoff }
        for index in state.notices.indices where state.notices[index].status == "posting" && Date().timeIntervalSince1970 - state.notices[index].created > 120 { state.notices[index].status = "obsolete" }
        let result = try body(&state, paused)
        let encoded = try JSONEncoder().encode(state)
        _ = try execute("INSERT OR REPLACE INTO inactivity_state VALUES(1,?)", String(decoding: encoded, as: UTF8.self))
        _ = try execute("COMMIT")
        committed = true
        return result
    }
}
func idleReset(_ state: inout IdleState) {
    state.instances.removeAll()
    for index in state.notices.indices where ["pending", "posting", "acting"].contains(state.notices[index].status) { state.notices[index].status = "obsolete" }
}
func idleJSON<T: Encodable>(_ value: T) throws -> Any {
    try JSONSerialization.jsonObject(with: JSONEncoder().encode(value))
}
func idleDecodeSnapshot(_ value: Any) throws -> IdleSnapshot {
    try JSONDecoder().decode(IdleSnapshot.self, from: JSONSerialization.data(withJSONObject: value))
}
func inactivity(_ request: [String: Any]) throws -> Any {
    guard let path = request["path"] as? String, let operation = request["operation"] as? String else { throw Failure("Missing inactivity request") }
    let db = try IdleDatabase(path)
    return try db.transaction { state, paused in
        switch operation {
        case "status": break
        case "clear-results":
            idleReset(&state)
            state.notices.removeAll()
            state.outcomes.removeAll()
        case "configure":
            if let enabled = request["enabled"] as? Bool { state.enabled = enabled }
            if let threshold = request["thresholdSeconds"] as? Double {
                guard [7200.0, 10800.0].contains(threshold) else { throw Failure("Choose two or three hours") }
                state.thresholdSeconds = threshold
            }
            idleReset(&state)
        case "remove":
            guard let id = request["id"] as? String else { throw Failure("Missing watch") }
            state.rules.removeAll { $0.id == id }
            state.instances = state.instances.filter { $0.value.target.ruleID != id }
            for index in state.notices.indices where state.instances[state.notices[index].instanceKey] == nil { state.notices[index].status = "obsolete" }
        case "watch":
            guard let kind = request["kind"] as? String, ["app", "process"].contains(kind),
                  let pid = request["pid"] as? Int, let start = request["start"] as? String,
                  request["boot"] as? String == bootID(), let executable = request["executable"] as? String else { throw Failure("Refresh before watching this target") }
            let snap = try idleDecodeSnapshot(snapshot())
            guard let process = snap.processes.first(where: { $0.pid == pid && $0.start == start && $0.executable == executable }), idleEligible(process) else { throw Failure("This target cannot be watched") }
            if kind == "app" {
                guard process.appPid == pid, process.appPath != nil, process.bundleId != nil, process.appBlockedReason == nil else { throw Failure("Select one identifiable application") }
            } else if outerApp(process.executable) != nil { throw Failure("Watch the owning application instead of an app helper") }
            let id = kind == "app" ? "app:\(process.appPath!):\(process.bundleId!)" : "process:\(process.executable)"
            if !state.rules.contains(where: { $0.id == id }) {
                state.rules.append(IdleRule(id: id, kind: kind, name: kind == "app" ? (process.appName ?? process.name) : process.name,
                    executable: executable, appPath: kind == "app" ? process.appPath : nil, bundleId: kind == "app" ? process.bundleId : nil))
            }
        case "observe":
            if !paused && state.enabled, let value = request["snapshot"] { idleObserve(&state, snapshot: try idleDecodeSnapshot(value)) }
        default: throw Failure("Unknown inactivity operation")
        }
        return ["state": try idleJSON(state), "paused": paused]
    }
}

func idleClaimNotification(_ path: String, now: Double = Date().timeIntervalSince1970) throws -> (IdleNotice, IdleInstance)? {
    try IdleDatabase(path).transaction { state, paused in
        guard state.enabled, !paused, now >= state.lastNotification + 300 else { return nil }
        let ready = state.instances.values.filter {
            !$0.notified && $0.quietSeconds >= state.thresholdSeconds && now >= $0.timestamp && now - $0.timestamp <= 120
        }.sorted { ($0.target.memory ?? 0) > ($1.target.memory ?? 0) }
        guard let candidate = ready.first(where: { candidate in
            !state.notices.contains { $0.instanceKey == candidate.target.key && $0.episode == candidate.episode && ["posting", "pending", "acting"].contains($0.status) }
        }), let rule = state.rules.first(where: { $0.id == candidate.target.ruleID }) else { return nil }
        let notice = IdleNotice(id: UUID().uuidString, instanceKey: candidate.target.key, episode: candidate.episode,
            name: rule.name, kind: rule.kind, created: now, status: "posting")
        state.notices.append(notice)
        // Reserve the rate limit before leaving the transaction. A failed delivery
        // may be retried in five minutes; a process crash cannot create a flood.
        state.lastNotification = now
        return (notice, candidate)
    }
}
@discardableResult
func idleDelivered(_ path: String, id: String, success: Bool) throws -> Bool {
    try IdleDatabase(path).transaction { state, _ in
        guard let index = state.notices.firstIndex(where: { $0.id == id }), state.notices[index].status == "posting" else { return false }
        let notice = state.notices[index]
        guard var instance = state.instances[notice.instanceKey], instance.episode == notice.episode else { state.notices[index].status = "obsolete"; return false }
        state.notices[index].status = success ? "pending" : "failed"
        instance.notified = success
        state.instances[notice.instanceKey] = instance
        return success
    }
}

// Only the notification delegate calls this. The public CLI deliberately exposes
// no action-by-notification-ID command or destructive URL handler.
func idleNotificationAction(_ path: String, id: String) throws -> String {
    let db = try IdleDatabase(path)
    let claimed: Bool = try db.transaction { state, _ in
        guard let index = state.notices.firstIndex(where: { $0.id == id }), state.notices[index].status == "pending" else { return false }
        state.notices[index].status = "acting"
        return true
    }
    guard claimed else { return "This notification is no longer actionable." }
    return try db.transaction { state, paused in
        guard let index = state.notices.firstIndex(where: { $0.id == id }) else { return "This notification has expired." }
        let notice = state.notices[index]
        var message: String
        do {
            guard state.enabled, !paused, notice.status == "acting", let instance = state.instances[notice.instanceKey],
                  instance.episode == notice.episode, instance.notified, instance.quietSeconds >= state.thresholdSeconds,
                  let rule = state.rules.first(where: { $0.id == instance.target.ruleID }) else { throw Failure("Monitoring changed; nothing was stopped.") }
            let current = try idleDecodeSnapshot(snapshot())
            guard let target = idleTargets(current, rules: [rule]).first(where: { $0.key == instance.target.key }),
                  idleInterval(instance, target, timestamp: current.timestamp, awake: current.awake) > 0 else { throw Failure("Target changed, became active, or measurements are stale; nothing was stopped.") }
            let process = target.target
            let result = try act(["pid": process.pid, "start": process.start, "boot": target.boot, "executable": process.executable,
                "action": rule.kind == "app" ? "force-app" : "force-process"])
            if result["status"] as? String == "rejected" { message = "Force Quit was rejected." }
            else {
                // Observe once after a short bounded wait. Never send another signal.
                Thread.sleep(forTimeInterval: 0.15)
                let remains = processRows().contains { $0["pid"] as? Int == process.pid && $0["start"] as? String == process.start }
                message = remains ? "Force Quit requested; exit not yet confirmed." : "Target exited."
            }
        } catch { message = String(describing: error) }
        state.notices[index].status = "consumed"
        state.outcomes.append(IdleOutcome(id: id, name: notice.name, time: Date().timeIntervalSince1970, message: message))
        return message
    }
}
