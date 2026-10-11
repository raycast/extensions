import Darwin
import Foundation

enum LockDuration {
    case timed(TimeInterval), indefinite

    init?(_ token: String) {
        switch token {
        case "600", "1800", "3600", "7200", "18000": self = .timed(TimeInterval(token)!)
        case "indefinite": self = .indefinite
        default: return nil
        }
    }
}

struct GuardianPolicy {
    var heartbeat: TimeInterval = 5
    var grace: TimeInterval = 1
    var startup: TimeInterval = 30
}

private var guardianSignalFD: Int32 = -1
private func guardianSignal(_ number: Int32) {
    let savedErrno = errno
    var byte: UInt8 = 1
    _ = Darwin.write(guardianSignalFD, &byte, 1)
    errno = savedErrno
}

func hasGuardianParent(_ pid: pid_t) -> Bool {
    var parentPath = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    var ownPath = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    guard pid > 1, getppid() == pid,
          proc_pidpath(pid, &parentPath, UInt32(parentPath.count)) > 0,
          proc_pidpath(getpid(), &ownPath, UInt32(ownPath.count)) > 0 else { return false }
    return parentPath == ownPath && getppid() == pid
}

func makeNonblocking(_ fd: Int32) -> Bool {
    let flags = fcntl(fd, F_GETFL)
    return flags >= 0 && fcntl(fd, F_SETFL, flags | O_NONBLOCK) == 0
}

func writePacket(_ value: [String: String], to fd: Int32) -> Bool {
    guard let data = try? JSONEncoder().encode(value) + Data([10]) else { return false }
    return data.withUnsafeBytes { Darwin.write(fd, $0.baseAddress, $0.count) } == data.count
}

// A single loop owns and reaps this child. An unreaped child keeps its PID reserved,
// including after exit, so escalation cannot target a process that reused the PID.
func supervise(_ duration: LockDuration, policy: GuardianPolicy = GuardianPolicy(), workerArguments: [String]? = nil) -> Int32 {
    let parentPID = getppid()
    let startedAt = ProcessInfo.processInfo.systemUptime
    var commands = [Int32](repeating: -1, count: 2)
    var events = [Int32](repeating: -1, count: 2)
    var wake = [Int32](repeating: -1, count: 2)
    guard pipe(&commands) == 0, pipe(&events) == 0, pipe(&wake) == 0 else {
        for fd in commands + events + wake where fd >= 0 { close(fd) }
        emit(.error, "Could not create recovery pipes", reason: "guardianStartup")
        return 1
    }
    defer { for fd in [commands[1], events[0], wake[0], wake[1]] { close(fd) } }
    guard (commands + events + wake).allSatisfy({ fcntl($0, F_SETFD, FD_CLOEXEC) == 0 }),
          [commands[1], events[0], wake[0], wake[1], STDOUT_FILENO].allSatisfy(makeNonblocking) else {
        close(commands[0]); close(events[1])
        emit(.error, "Could not arm recovery pipes", reason: "guardianStartup")
        return 1
    }
    guardianSignalFD = wake[1]
    let oldTERM = signal(SIGTERM, guardianSignal)
    let oldINT = signal(SIGINT, guardianSignal)
    let oldCHLD = signal(SIGCHLD, SIG_DFL)
    defer {
        signal(SIGTERM, oldTERM); signal(SIGINT, oldINT); signal(SIGCHLD, oldCHLD)
        guardianSignalFD = -1
    }
    var actions: posix_spawn_file_actions_t?
    guard posix_spawn_file_actions_init(&actions) == 0 else {
        close(commands[0]); close(events[1])
        emit(.error, "Could not prepare the input worker", reason: "guardianStartup")
        return 1
    }
    defer { posix_spawn_file_actions_destroy(&actions) }
    let setupResults = [posix_spawn_file_actions_adddup2(&actions, commands[0], STDIN_FILENO),
                        posix_spawn_file_actions_adddup2(&actions, events[1], STDOUT_FILENO)]
        + (commands + events + wake).map { posix_spawn_file_actions_addclose(&actions, $0) }
    guard setupResults.allSatisfy({ $0 == 0 }) else {
        close(commands[0]); close(events[1])
        emit(.error, "Could not connect the input worker", reason: "guardianStartup")
        return 1
    }
    let executable = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL.path
    let arguments = [executable] + (workerArguments ?? ["--worker", String(getpid())])
    let pointers = arguments.map { strdup($0) } + [nil]
    defer { for pointer in pointers { free(pointer) } }
    var child: pid_t = 0
    let spawnError = pointers.withUnsafeBufferPointer { buffer in
        posix_spawn(&child, executable, &actions, nil, UnsafeMutablePointer(mutating: buffer.baseAddress!), environ)
    }
    close(commands[0]); close(events[1])
    guard spawnError == 0 else {
        emit(.error, "Could not start the input worker", reason: "guardianStartup")
        return 1
    }

    enum State { case preparing, armed, active, releasing }
    var state = State.preparing
    var lastHeartbeat = startedAt
    var deadline: TimeInterval?
    var releaseAt: TimeInterval?
    var recoveryReason: String?
    var outputUsable = true
    var eventsClosed = false
    var pending = Data()
    var terminal: [String: String]?
    var sawError = false
    var childStatus: Int32 = 0

    func release(_ reason: String, at now: TimeInterval) {
        guard state != .releasing else { return }
        state = .releasing
        recoveryReason = reason
        releaseAt = now
        _ = writePacket(["command": "release", "reason": reason], to: commands[1])
    }
    func publish(_ packet: [String: String], at now: TimeInterval) {
        guard outputUsable else { return }
        if !writePacket(packet, to: STDOUT_FILENO) {
            outputUsable = false
            release("watchdog", at: now)
        }
    }
    func consume(_ line: Data, at now: TimeInterval) {
        guard let packet = try? JSONDecoder().decode([String: String].self, from: line) else {
            release("watchdog", at: now); return
        }
        if let kind = packet["kind"] {
            switch kind {
            case "prepared" where state == .preparing:
                state = .armed
                if !writePacket(["command": "activate"], to: commands[1]) { release("watchdog", at: now) }
            case "active" where state == .armed:
                guard let raw = packet["uptime"], let activation = Double(raw), activation.isFinite,
                      activation >= startedAt, activation <= now else { release("watchdog", at: now); return }
                state = .active
                lastHeartbeat = activation
                if case let .timed(seconds) = duration { deadline = activation + seconds }
            case "heartbeat" where state == .active: lastHeartbeat = now
            default: release("watchdog", at: now)
            }
        } else if let raw = packet["phase"], let phase = LockPhase(rawValue: raw) {
            if phase == .ready { terminal = packet }
            else {
                if phase == .error { sawError = true }
                publish(packet, at: now)
            }
        } else { release("watchdog", at: now) }
    }

    while true {
        let outputFaults = Int16(POLLERR | POLLHUP | POLLNVAL)
        var descriptors = [
            pollfd(fd: eventsClosed ? -1 : events[0], events: Int16(POLLIN), revents: 0),
            pollfd(fd: wake[0], events: Int16(POLLIN), revents: 0),
            pollfd(fd: outputUsable ? STDOUT_FILENO : -1, events: outputFaults, revents: 0),
        ]
        _ = poll(&descriptors, nfds_t(descriptors.count), 50)
        let now = ProcessInfo.processInfo.systemUptime
        if descriptors[2].revents & outputFaults != 0 {
            outputUsable = false
            release("watchdog", at: now)
        }
        if descriptors[1].revents != 0 {
            var bytes = [UInt8](repeating: 0, count: 32)
            _ = read(wake[0], &bytes, bytes.count)
            release("watchdog", at: now)
        }
        if descriptors[0].revents != 0 {
            var bytes = [UInt8](repeating: 0, count: 4096)
            let count = read(events[0], &bytes, bytes.count)
            if count > 0 {
                pending.append(contentsOf: bytes.prefix(count))
                while let end = pending.firstIndex(of: 10) {
                    let line = Data(pending[..<end])
                    pending.removeSubrange(...end)
                    consume(line, at: ProcessInfo.processInfo.systemUptime)
                }
                if pending.count > 8192 { release("watchdog", at: now) }
            } else if count == 0 || (count < 0 && errno != EAGAIN && errno != EINTR) {
                eventsClosed = true
            }
        }
        let waited = waitpid(child, &childStatus, WNOHANG)
        if waited == child { break }
        if waited < 0 && errno != EINTR {
            fputs("guardian lost child ownership\n", stderr)
            return 1
        }
        let current = ProcessInfo.processInfo.systemUptime
        if eventsClosed && state != .releasing {
            if terminal != nil || sawError { state = .releasing; releaseAt = current }
            else { release("watchdog", at: current) }
        }
        if getppid() != parentPID || parentPID == 1 { release("watchdog", at: current) }
        switch state {
        case .preparing, .armed:
            if current - startedAt >= policy.startup { release("watchdog", at: current) }
        case .active:
            if let deadline, current >= deadline { release("timeout", at: current) }
            else if current - lastHeartbeat >= policy.heartbeat { release("watchdog", at: current) }
        case .releasing:
            if let releaseAt, current - releaseAt >= policy.grace {
                if recoveryReason == nil { recoveryReason = "watchdog" }
                _ = kill(child, SIGKILL)
            }
        }
    }
    if let recoveryReason {
        if outputUsable {
            _ = writePacket(["phase": "ready", "message": "Input Lock released", "reason": recoveryReason], to: STDOUT_FILENO)
        }
        return outputUsable ? 0 : 1
    }
    if let terminal {
        return writePacket(terminal, to: STDOUT_FILENO) ? 0 : 1
    }
    if !sawError && outputUsable {
        _ = writePacket(["phase": "error", "message": "The input worker exited unexpectedly", "reason": "workerExited"], to: STDOUT_FILENO)
    }
    return 1
}

#if GUARDIAN_TESTING
func testWorker(_ mode: String) -> Never {
    _ = makeNonblocking(STDOUT_FILENO)
    fputs("test-worker-pid:\(getpid())\n", stderr)
    if mode == "startupFailure" { emit(.error, "test startup failure", reason: "test"); exit(1) }
    if mode == "delayed" { usleep(350_000) }
    writeJSON(["kind": "prepared"])
    let input = FileHandle.standardInput
    let activate = input.availableData
    guard String(data: activate, encoding: .utf8)?.contains("activate") == true else { exit(1) }
    writeJSON(["kind": "active", "uptime": String(ProcessInfo.processInfo.systemUptime)])
    writeJSON(["phase": "locked", "message": "test worker", "pid": String(getpid())])
    if mode == "frozen" { raise(SIGSTOP) }
    if mode == "normal" { emit(.ready, "test normal unlock", reason: "touchID"); exit(0) }
    _ = makeNonblocking(STDIN_FILENO)
    var lastBeat = ProcessInfo.processInfo.systemUptime
    while true {
        var bytes = [UInt8](repeating: 0, count: 1024)
        let count = read(STDIN_FILENO, &bytes, bytes.count)
        if count == 0 { exit(0) }
        if count > 0 { emit(.ready, "test release", reason: "testRelease"); exit(0) }
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastBeat >= 0.05 { writeJSON(["kind": "heartbeat"]); lastBeat = now }
        usleep(10_000)
    }
}
#endif
