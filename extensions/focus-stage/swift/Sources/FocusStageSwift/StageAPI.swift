import AppKit
import FocusStageCore
import RaycastSwiftMacros

/// What the extension shows: whether a stage is up and which app it is built around.
struct StageStatus: Encodable {
    var active: Bool
    var app: String?
    var message: String?
    /// A start or end was still running, so this toggle was ignored.
    var busy: Bool?
}

/// Starts a stage, or ends the one that is running.
///
/// A stage needs a process that stays alive (the backdrop windows, the window watcher), but every
/// call from TypeScript runs this binary once and waits for it to exit. So starting spawns the same
/// binary again as `runStage`, detached and with its output discarded, and waits until it reports
/// in through the state file. Ending sends it SIGUSR1; it restores the desktop and exits.
///
/// One toggle at a time: a second call while one is still running (a fast double press) is ignored,
/// and so is a toggle while the stage is still starting or ending.
/// `hintJSON` is a `TargetHint` from `prepareToggle`, or an empty string. `menuBarURL` is opened
/// when the session ends on its own (window closed, app quit), so the menu bar icon follows.
@raycast func toggleStage(stateDirectory: String, settingsJSON: String, hintJSON: String, menuBarURL: String) async throws -> StageStatus {
    let store = StateStore(directory: stateDirectory)
    guard let lock = ToggleLock(directory: stateDirectory) else { return StageStatus(active: true, busy: true) }
    defer { lock.release() }

    if let state = store.read(), isStageProcess(state.pid) {
        guard state.phase == .active else {
            return StageStatus(active: state.phase == .starting, app: state.app, busy: true)
        }
        store.write(StageState(pid: state.pid, phase: .ending, app: state.app))
        kill(state.pid, SIGUSR1)
        await store.waitForExit(state.pid)
        return StageStatus(active: false)
    }
    // A new session must not start on top of settings an earlier one couldn't put back: it would
    // take them as the originals, and the earlier record would be overwritten.
    guard store.recoverFromCrash() else {
        return StageStatus(active: false, message: "The menu bar or Dock from the last session couldn't be restored yet. Run Reset Focus Stage, and check that Raycast may control System Events (System Settings → Privacy & Security → Automation).")
    }
    // The toggle lock stays held until the stage reports in, so no other toggle can start a second one.
    let pid = try spawnStage(arguments: [
        "runStage", json(stateDirectory), json(settingsJSON), json(hintJSON), json(menuBarURL),
    ])
    return await store.waitForStart(pid)
}

struct ToggleContext: Encodable {
    var active: Bool
    /// The window to focus, captured before Raycast closes its own window (which hands focus back
    /// to the previous app). Only when no stage is running.
    var target: TargetHint?
}

/// Whether a stage runs and, if not, the window you are looking at: one process launch instead of two.
@raycast func prepareToggle(stateDirectory: String) -> ToggleContext {
    if let state = StateStore(directory: stateDirectory).read(), isStageProcess(state.pid) {
        return ToggleContext(active: true)
    }
    return ToggleContext(active: false, target: TargetHint.capture())
}

@raycast func stageStatus(stateDirectory: String) -> StageStatus {
    StateStore(directory: stateDirectory).status()
}

struct ResetResult: Encodable {
    var stoppedProcesses: Int
    var restored: [String]
    /// The menu bar or Dock couldn't be restored; the record is kept for another try.
    var incomplete: Bool
}

/// Puts everything back, whatever state the stage is in. Every stage process gets SIGTERM, which
/// ends its session and restores the desktop. One that doesn't exit within 5 s (hung) is killed,
/// and what its session changed is restored from the recovery record. Notifications are always
/// resumed and the state is cleared.
///
/// Holds the toggle lock throughout, so no toggle can start a stage between collecting the stage
/// processes and clearing the shared files. A toggle holds it for at most ~5 s; if it is still held
/// after 8 s (a hung toggle call), reset goes ahead anyway: it is the way out of a stuck state.
@raycast func resetStage(stateDirectory: String) async -> ResetResult {
    let store = StateStore(directory: stateDirectory)
    let lock = await ToggleLock.acquire(directory: stateDirectory, timeout: 8)
    defer { lock?.release() }
    let pids = stageProcessPIDs()
    pids.forEach { kill($0, SIGTERM) }
    // 5 s: a stage restoring the menu bar may first wait up to 3 s for System Events.
    for _ in 0..<100 where pids.contains(where: { kill($0, 0) == 0 }) {
        try? await Task.sleep(nanoseconds: 50_000_000)
    }
    pids.filter { kill($0, 0) == 0 }.forEach { kill($0, SIGKILL) }
    let outcome = RecoveryRecord.restore(from: store.recoveryURL)
    store.clear()
    return ResetResult(stoppedProcesses: pids.count, restored: outcome.restored, incomplete: !outcome.complete)
}

/// The stage process. Only started by `toggleStage`; runs until the stage ends, then exits.
///
/// The generated entry point calls this from inside a job on the main dispatch queue. Running the
/// AppKit loop right there would block that queue for good, and everything the stage schedules on
/// it (its start, timers, signal handlers) would never run. A run-loop block starts the loop
/// outside of any dispatch job instead; this function then just never returns.
@raycast func runStage(stateDirectory: String, settingsJSON: String, hintJSON: String, menuBarURL: String) async {
    let hint = try? JSONDecoder().decode(TargetHint.self, from: Data(hintJSON.utf8))
    CFRunLoopPerformBlock(CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue) {
        StageProcess.run(
            store: StateStore(directory: stateDirectory), settingsJSON: settingsJSON, hint: hint,
            menuBarURL: URL(string: menuBarURL)
        )
    }
    CFRunLoopWakeUp(CFRunLoopGetMain())
    while true {
        try? await Task.sleep(nanoseconds: 86_400 * 1_000_000_000)
    }
}

// MARK: - Stage process

enum StageProcess {
    private static var controller: FocusController?
    private static var signalSources: [DispatchSourceSignal] = []

    static func run(store: StateStore, settingsJSON: String, hint: TargetHint?, menuBarURL: URL?) {
        let settings = (try? JSONDecoder().decode(StageSettings.self, from: Data(settingsJSON.utf8)))
            ?? StageSettings()
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let pid = ProcessInfo.processInfo.processIdentifier

        let controller = FocusController { settings }
        controller.recoveryURL = store.recoveryURL
        self.controller = controller
        controller.onChange = {
            // Also when the session ends on its own (window closed, its app quit).
            if !controller.isActive { store.write(StageState(pid: pid, phase: .ending)) }
        }
        // A toggle refreshes the menu bar itself once the session has ended.
        var endedByToggle = false
        controller.onSettled = {
            if controller.isActive {
                store.write(StageState(pid: pid, phase: .active, app: controller.focusedAppName))
            } else {
                store.clear(ifOwnedBy: pid)
                // The window restore and the fade-out have finished.
                if endedByToggle { exit(0) }
                refreshMenuBar(menuBarURL) { exit(0) }
            }
        }

        onSignal(SIGUSR1) {
            endedByToggle = true
            if !controller.isActive, !controller.isBusy { exit(0) }
            controller.exitFocus(animated: true)  // ignored unless fully started
        }
        // Raycast quitting or the process being killed must not leave every app hidden.
        for sig in [SIGTERM, SIGINT, SIGHUP] {
            onSignal(sig) {
                controller.exitFocus(animated: false)
                store.clear(ifOwnedBy: pid)
                exit(0)
            }
        }

        store.write(StageState(pid: pid, phase: .starting))
        DispatchQueue.main.async {
            switch controller.enterFocus(hint: hint) {
            case .started:
                break  // reported as active from onSettled
            case .noWindow, .busy:
                store.write(StageState(pid: pid, phase: .failed, message: "There is no window to focus."))
                exit(1)
            }
        }
        app.run()
        exit(0)
    }

    /// Opens the menu bar command's background deeplink without bringing Raycast forward.
    private static func refreshMenuBar(_ url: URL?, then done: @escaping () -> Void) {
        guard let url else { return done() }
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = false
        NSWorkspace.shared.open(url, configuration: configuration) { _, _ in
            DispatchQueue.main.async(execute: done)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2, execute: done)
    }

    private static func onSignal(_ sig: Int32, _ handler: @escaping () -> Void) {
        signal(sig, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
        source.setEventHandler(handler: handler)
        source.resume()
        signalSources.append(source)
    }
}

// MARK: - State file

enum StagePhase: String, Codable {
    case starting, active, ending
    /// Written by a stage process right before it exits without a session.
    case failed
}

struct StageState: Codable {
    var pid: Int32
    var phase: StagePhase
    var app: String?
    var message: String?
}

struct StateStore {
    private let url: URL
    /// The running session's `RecoveryRecord`.
    let recoveryURL: URL

    init(directory: String) {
        try? FileManager.default.createDirectory(atPath: directory, withIntermediateDirectories: true)
        url = URL(fileURLWithPath: directory).appendingPathComponent("stage.json")
        recoveryURL = URL(fileURLWithPath: directory).appendingPathComponent("recovery.json")
    }

    func read() -> StageState? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(StageState.self, from: data)
    }

    func write(_ state: StageState) {
        try? JSONEncoder().encode(state).write(to: url, options: .atomic)
    }

    func clear() {
        try? FileManager.default.removeItem(at: url)
    }

    /// A stage process only removes the file while it still describes that process.
    func clear(ifOwnedBy pid: pid_t) {
        if read()?.pid == pid { clear() }
    }

    /// Called before a new stage starts, when no stage process runs. A recovery record left behind
    /// means the last session died without cleaning up: restore what it changed first.
    /// `false`: the menu bar or Dock couldn't be restored; the record is kept.
    func recoverFromCrash() -> Bool {
        var complete = true
        if FileManager.default.fileExists(atPath: recoveryURL.path) {
            complete = RecoveryRecord.restore(from: recoveryURL).complete
        }
        clear()
        return complete
    }

    func status() -> StageStatus {
        guard let state = read(), isStageProcess(state.pid),
              [.starting, .active].contains(state.phase) else { return StageStatus(active: false) }
        return StageStatus(active: true, app: state.app)
    }

    /// Up to 5 s: the window move into place can take a moment with slow apps.
    func waitForStart(_ pid: pid_t) async -> StageStatus {
        for _ in 0..<100 {
            if let state = read(), state.pid == pid {
                switch state.phase {
                case .active: return StageStatus(active: true, app: state.app)
                case .failed:
                    clear()
                    return StageStatus(active: false, message: state.message)
                case .starting, .ending: break
                }
            }
            if kill(pid, 0) != 0 {
                clear(ifOwnedBy: pid)
                return StageStatus(active: false, message: "Focus Stage stopped unexpectedly.")
            }
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
        kill(pid, SIGTERM)  // don't leave a stuck stage process behind; SIGTERM restores the desktop
        return StageStatus(active: false, message: "Focus Stage did not start in time.")
    }

    /// The stage exits once the window is restored and the fade-out is done (well under 1 s).
    func waitForExit(_ pid: pid_t) async {
        for _ in 0..<100 where kill(pid, 0) == 0 {
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
    }
}

/// Serializes `toggleStage` calls. Not blocking: a toggle that finds another one running is dropped.
final class ToggleLock {
    private let descriptor: Int32

    init?(directory: String) {
        let fd = open(URL(fileURLWithPath: directory).appendingPathComponent("toggle.lock").path,
                      O_CREAT | O_RDWR | O_CLOEXEC, 0o644)
        guard fd >= 0 else { return nil }
        guard flock(fd, LOCK_EX | LOCK_NB) == 0 else {
            close(fd)
            return nil
        }
        descriptor = fd
    }

    /// Waits for the lock instead of giving up right away. nil if it is still held after `timeout`.
    static func acquire(directory: String, timeout: TimeInterval) async -> ToggleLock? {
        let deadline = Date().addingTimeInterval(timeout)
        while true {
            if let lock = ToggleLock(directory: directory) { return lock }
            if Date() >= deadline { return nil }
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
    }

    func release() {
        flock(descriptor, LOCK_UN)
        close(descriptor)
    }
}

// MARK: - Process helpers

private var executablePath: String {
    (Bundle.main.executablePath.map { URL(fileURLWithPath: $0).resolvingSymlinksInPath().path }) ?? CommandLine.arguments[0]
}

/// Every live stage process, including ones the state file lost track of.
private func stageProcessPIDs() -> [pid_t] {
    let ps = Process()
    ps.executableURL = URL(fileURLWithPath: "/bin/ps")
    ps.arguments = ["-axo", "pid=,command="]
    let output = Pipe()
    ps.standardOutput = output
    ps.standardError = FileHandle.nullDevice
    guard (try? ps.run()) != nil else { return [] }
    let text = String(decoding: output.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
    ps.waitUntilExit()
    let marker = "\(executablePath) runStage"
    let own = ProcessInfo.processInfo.processIdentifier
    return text.split(separator: "\n").compactMap { line in
        let trimmed = line.drop { $0 == " " }
        guard trimmed.contains(marker), let space = trimmed.firstIndex(of: " "),
              let pid = pid_t(trimmed[..<space]), pid != own else { return nil }
        return pid
    }
}

/// Guards against a stale state file whose PID now belongs to another process.
private func isStageProcess(_ pid: pid_t) -> Bool {
    guard pid > 0, kill(pid, 0) == 0 else { return false }
    var buffer = [CChar](repeating: 0, count: Int(MAXPATHLEN) * 4)
    guard proc_pidpath(pid, &buffer, UInt32(buffer.count)) > 0 else { return false }
    return URL(fileURLWithPath: String(cString: buffer)).resolvingSymlinksInPath().path == executablePath
}

/// The generated entry point decodes every argument after the function name as JSON.
private func json(_ string: String) -> String {
    String(decoding: (try? JSONEncoder().encode(string)) ?? Data("\"\"".utf8), as: UTF8.self)
}

private struct SpawnError: LocalizedError {
    let code: Int32
    var errorDescription: String? { "Could not start the stage process (\(String(cString: strerror(code))))." }
}

/// Detached (own session) so it outlives this call, and with stdio on /dev/null so the caller,
/// which reads this process's output until the pipe closes, isn't kept waiting.
/// The child inherits Raycast as its responsible process, so it uses Raycast's Accessibility permission.
private func spawnStage(arguments: [String]) throws -> pid_t {
    var attributes: posix_spawnattr_t?
    posix_spawnattr_init(&attributes)
    defer { posix_spawnattr_destroy(&attributes) }
    // CLOEXEC_DEFAULT: the child must not inherit the toggle lock (or any other descriptor).
    posix_spawnattr_setflags(&attributes, Int16(POSIX_SPAWN_SETSID | POSIX_SPAWN_CLOEXEC_DEFAULT))

    var actions: posix_spawn_file_actions_t?
    posix_spawn_file_actions_init(&actions)
    defer { posix_spawn_file_actions_destroy(&actions) }
    posix_spawn_file_actions_addopen(&actions, 0, "/dev/null", O_RDONLY, 0)
    posix_spawn_file_actions_addopen(&actions, 1, "/dev/null", O_WRONLY, 0)
    posix_spawn_file_actions_addopen(&actions, 2, "/dev/null", O_WRONLY, 0)

    let path = executablePath
    var argv: [UnsafeMutablePointer<CChar>?] = ([path] + arguments).map { strdup($0) } + [nil]
    defer { argv.forEach { free($0) } }

    var pid: pid_t = 0
    let result = posix_spawn(&pid, path, &actions, &attributes, &argv, environ)
    guard result == 0 else { throw SpawnError(code: result) }
    return pid
}
