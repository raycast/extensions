import Foundation
import Darwin

func check(_ condition: @autoclosure () throws -> Bool, _ message: String) throws {
    if try !condition() { throw Failure(message) }
}
func process(_ overrides: [String: Any] = [:]) throws -> IdleProcess {
    var value: [String: Any] = ["pid": 900001, "ppid": 1, "uid": Int(getuid()), "start": "100:0", "executable": "/opt/demo/node", "name": "node", "memory": 1048576, "cpuNs": 0, "readBytes": 0, "writeBytes": 0, "foreground": false]
    value.merge(overrides) { _, new in new }
    return try JSONDecoder().decode(IdleProcess.self, from: JSONSerialization.data(withJSONObject: value))
}
func snap(_ time: Double, _ processes: [IdleProcess], awake: Double? = nil, boot: String = "test-boot") -> IdleSnapshot {
    IdleSnapshot(timestamp: time, awake: awake ?? time, boot: boot, processes: processes)
}
func rule(_ kind: String = "process") -> IdleRule {
    IdleRule(id: "rule", kind: kind, name: "Demo", executable: kind == "app" ? "/Applications/Demo.app/Contents/MacOS/Demo" : "/opt/demo/node", appPath: kind == "app" ? "/Applications/Demo.app" : nil, bundleId: kind == "app" ? "demo.app" : nil)
}
func state(_ kind: String = "process") -> IdleState {
    var value = IdleState(); value.enabled = true; value.rules = [rule(kind)]; return value
}
func observed(_ old: IdleProcess, _ new: IdleProcess, time: Double = 1060, awake: Double? = nil, boot: String = "test-boot") -> IdleState {
    var value = state()
    idleObserve(&value, snapshot: snap(1000, [old]))
    idleObserve(&value, snapshot: snap(time, [new], awake: awake, boot: boot))
    return value
}
func suite(_ name: String, _ directory: String) throws {
    switch name {
    case "threshold":
        var value = state()
        for minute in 0...179 { idleObserve(&value, snapshot: snap(1000 + Double(minute) * 60, [try process()])) }
        try check(value.instances.values.first!.quietSeconds == 10740, "premature threshold")
        idleObserve(&value, snapshot: snap(11800, [try process()]))
        try check(value.instances.values.first!.quietSeconds == 10800, "three-hour threshold")
        let before = value.instances.values.first!.episode
        idleObserve(&value, snapshot: snap(11805, [try process()]))
        try check(value.instances.values.first!.episode == before, "duplicate observation reset")
    case "activity":
        let base = try process()
        for fields: [String: Any] in [["cpuNs": 600000000], ["readBytes": 3932160], ["writeBytes": 3932160], ["foreground": true], ["cpuNs": NSNull()], ["readBytes": NSNull()], ["writeBytes": NSNull()], ["foreground": NSNull()]] {
            try check(observed(base, try process(fields)).instances.values.first!.quietSeconds == 0, "activity or unknown counted quiet: \(fields)")
        }
        try check(observed(try process(["foreground": true]), base).instances.values.first!.quietSeconds == 0, "previous foreground ignored")
        try check(observed(try process(["cpuNs": 1]), base).instances.values.first!.quietSeconds == 0, "counter decrease ignored")
        try check(observed(base, try process(["cpuNs": 599999999, "readBytes": 3932159])).instances.values.first!.quietSeconds == 60, "below thresholds not counted")
    case "gaps":
        let base = try process()
        for next in [snap(1181, [base]), snap(1060, [base], awake: 1005), snap(990, [base]), snap(1060, [base], boot: "replacement"), snap(1060, [try process(["start": "200:0"])]), snap(1060, [try process(["executable": "/opt/other/node"])])] {
            var value = state(); idleObserve(&value, snapshot: snap(1000, [base])); idleObserve(&value, snapshot: next)
            try check(value.instances.values.allSatisfy { $0.quietSeconds == 0 }, "gap or changed identity counted quiet")
        }
    case "app-members":
        var value = state("app")
        let metadata: [String: Any] = ["executable": rule("app").executable, "appPath": rule("app").appPath!, "bundleId": "demo.app", "appPid": 900001]
        let owner = try process(metadata)
        var helperData = metadata; helperData["pid"] = 900002; helperData["executable"] = "/Applications/Demo.app/Contents/MacOS/Helper"
        let helper = try process(helperData)
        idleObserve(&value, snapshot: snap(1000, [owner, helper])); idleObserve(&value, snapshot: snap(1060, [owner, helper]))
        try check(value.instances.values.first!.quietSeconds == 60, "complete group not observed")
        idleObserve(&value, snapshot: snap(1120, [owner]))
        try check(value.instances.values.first!.quietSeconds == 0, "membership change ignored")
        helperData["cpuNs"] = NSNull()
        let missing = try process(helperData)
        idleObserve(&value, snapshot: snap(1180, [owner, missing])); idleObserve(&value, snapshot: snap(1240, [owner, missing]))
        try check(value.instances.values.first!.quietSeconds == 0, "partial app treated as quiet")
    case "exclusions":
        for fields: [String: Any] in [["uid": Int(getuid()) + 1], ["executable": "/System/Applications/Notes.app/Contents/MacOS/Notes"], ["executable": "/usr/libexec/tool"], ["blockedReason": "Protected"], ["executable": "/Applications/Raycast.app/Contents/MacOS/Raycast"], ["executable": "/tmp/Resource Inspector Notifications.app/Contents/MacOS/notifications"], ["executable": "/Applications/Mail.app/Contents/MacOS/Mail", "appPath": "/Applications/Mail.app", "bundleId": "com.apple.mail"]] {
            try check(!idleEligible(try process(fields)), "protected process eligible")
        }
        try check(idleEligible(try process(["appPath": "/System/Applications/Utilities/Terminal.app", "bundleId": "com.apple.Terminal"])), "external developer tool excluded")
    case "notifications":
        let path = directory + "/notifications.sqlite", now = Date().timeIntervalSince1970
        try IdleDatabase(path).transaction { value, _ in
            value = state(); idleObserve(&value, snapshot: snap(now - 60, [try process()])); idleObserve(&value, snapshot: snap(now, [try process()]))
            for key in value.instances.keys { value.instances[key]!.quietSeconds = 10800 }
        }
        let notice = try idleClaimNotification(path, now: now)!
        try check(try idleClaimNotification(path, now: now + 1) == nil, "rate limit failed")
        try idleDelivered(path, id: notice.0.id, success: true)
        try check(try idleClaimNotification(path, now: now + 301) == nil, "repeat episode alert")
        try IdleDatabase(path).transaction { value, _ in
            idleObserve(&value, snapshot: snap(now + 60, [try process(["cpuNs": 1000000000])]))
            try check(value.notices.first!.status == "obsolete", "resumed activity left a live button")
        }
        try check(try idleNotificationAction(path, id: notice.0.id).contains("no longer"), "obsolete click accepted")
    case "force", "force-children":
        let launcher = Process(), output = Pipe()
        launcher.executableURL = URL(fileURLWithPath: "/bin/sh")
        launcher.arguments = ["-c", name == "force-children" ? "/bin/sh -c '/bin/sleep 60 & wait' </dev/null >/dev/null 2>&1 & echo $!" : "/bin/sleep 60 </dev/null >/dev/null 2>&1 & echo $!"]
        launcher.standardOutput = output
        try launcher.run(); launcher.waitUntilExit()
        let pid = Int(String(decoding: output.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines))!
        Thread.sleep(forTimeInterval: 0.1)
        let initial = try idleDecodeSnapshot(snapshot())
        let target = initial.processes.first { $0.pid == pid }!
        let action: [String: Any] = ["pid": pid, "start": target.start, "boot": initial.boot, "executable": target.executable, "action": "stop-process"]
        let children = initial.processes.filter { $0.ppid == pid }
        defer {
            _ = try? act(action)
            for child in children { _ = try? act(["pid": child.pid, "start": child.start, "boot": initial.boot, "executable": child.executable, "action": "stop-process"]) }
        }
        if name == "force-children" { try check(children.count == 1, "missing disposable child") }
        let path = directory + "/force.sqlite"
        let chosen = IdleRule(id: "sleep", kind: "process", name: "Disposable sleep", executable: target.executable, appPath: nil, bundleId: nil)
        let bound = IdleTarget(ruleID: chosen.id, boot: initial.boot, target: target, members: [target])
        let id = UUID().uuidString, episode = UUID().uuidString
        func seed(_ state: inout IdleState) {
            state.enabled = true; state.rules = [chosen]
            state.instances = [bound.key: IdleInstance(target: bound, timestamp: initial.timestamp - 1, awake: initial.awake - 1, quietSeconds: 10800, episode: episode, notified: true)]
            state.notices = [IdleNotice(id: id, instanceKey: bound.key, episode: episode, name: chosen.name, kind: chosen.kind, created: initial.timestamp, status: "pending")]
        }
        let db = try IdleDatabase(path)
        try db.transaction { value, _ in seed(&value); value.instances[bound.key]!.timestamp -= 180 }
        try check(try idleNotificationAction(path, id: id).contains("stale"), "stale observation accepted")
        try check(kill(pid_t(pid), 0) == 0, "stale click killed fixture")
        try db.transaction { value, _ in seed(&value) }
        _ = try db.execute("INSERT OR REPLACE INTO meta VALUES('paused','true')")
        try check(try idleNotificationAction(path, id: id).contains("no longer"), "pause click accepted")
        try check(kill(pid_t(pid), 0) == 0, "pause killed fixture")
        _ = try db.execute("DELETE FROM meta WHERE key='paused'")
        try db.transaction { value, _ in seed(&value) }
        let result = try idleNotificationAction(path, id: id)
        try check(result == "Target exited.", "force action failed: \(result)")
        try check(try idleNotificationAction(path, id: id).contains("no longer"), "duplicate click accepted")
        for child in children { try check(kill(pid_t(child.pid), 0) == 0, "child was recursively stopped") }
    case "storage":
        let path = directory + "/storage.sqlite", db = try IdleDatabase(path)
        try db.transaction { value, _ in value = state(); idleObserve(&value, snapshot: snap(1000, [try process()])); value.outcomes = [IdleOutcome(id: "old", name: "old", time: 0, message: "old")] }
        do { try db.transaction { value, _ in value.enabled = false; throw Failure("interrupted") } as Void } catch { }
        try db.transaction { value, _ in try check(value.enabled, "rollback lost enabled setting"); try check(value.outcomes.isEmpty, "retention failed") }
        _ = try db.execute("UPDATE inactivity_control SET revision=revision+1")
        try db.transaction { value, _ in try check(value.instances.isEmpty && value.rules.count == 1, "reset lost watches or kept observations") }
        _ = try db.execute("INSERT OR REPLACE INTO meta VALUES('paused','true')")
        try db.transaction { value, paused in try check(paused && value.instances.isEmpty, "pause ignored") }
        _ = try db.execute("UPDATE inactivity_state SET data='broken'")
        var rejected = false
        do { _ = try db.transaction { _, _ in true } } catch { rejected = true }
        try check(rejected, "damaged state silently accepted")
    default: throw Failure("Unknown test")
    }
}

do {
    try suite(CommandLine.arguments[1], CommandLine.arguments[2])
    print("passed \(CommandLine.arguments[1])")
} catch { fputs("\(error)\n", stderr); exit(1) }
