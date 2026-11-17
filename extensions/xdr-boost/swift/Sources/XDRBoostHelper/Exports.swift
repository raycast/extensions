import Cocoa
import os
import RaycastSwiftMacros

let helperLog = Logger(subsystem: "com.chrismessina.xdr-boost", category: "helper")

// Functions exported to TypeScript through extensions-swift-tools. `ray build` compiles this package
// to assets/compiled_raycast_swift/swift; the generated main dispatches on argv[1] = function name,
// with each argument JSON-encoded in argv[2…].
//
// `run` is the long-running boost and never returns: src/lib/helper.ts spawns it DETACHED, directly,
// instead of through its generated wrapper (which would wait for it to exit). The others are one-shots
// called through the wrappers.

enum Notifications {
    static let set = Notification.Name("com.chrismessina.xdr-boost.set")
    static let quit = Notification.Name("com.chrismessina.xdr-boost.quit")

    static func postSet(all: Double, levels: [String: Double], externalMax: Double, strategy: String, lowBattery: Double) {
        let info: [String: Any] = [
            "all": all, "levels": levels, "externalMax": externalMax, "strategy": strategy, "lowBattery": lowBattery,
        ]
        DistributedNotificationCenter.default().postNotificationName(set, object: nil, userInfo: info, deliverImmediately: true)
    }

    static func postQuit() {
        DistributedNotificationCenter.default().postNotificationName(quit, object: nil, userInfo: nil, deliverImmediately: true)
    }
}

/// Bump whenever the run/setLevels/status contract changes. The extension replaces a running helper whose
/// state file reports a different version (or none): after an extension update the old binary can keep running,
/// and it may not understand the new messages or apply the current build's limits (the headroom cap, the
/// external ceiling). A matching version proves which contract is running, not that its limits are sufficient.
/// src/lib/__tests__/protocol.test.ts pins a hash of all the helper's code to this number, so any code change forces a bump.
let helperProtocol = 12

enum Levels {
    static let range: ClosedRange<Double> = 1.0...1.75
    static func clamp(_ value: Double) -> Double { min(max(value, range.lowerBound), range.upperBound) }
    static func clamp(_ map: [String: Double]) -> [String: Double] { map.mapValues { clamp($0) } }
    static func clampGain(_ value: Double) -> Double { min(max(value, 1.0), Curve.builtInMaxGain) }
    static func strategy(_ value: String) -> String { value == "fixed" ? "fixed" : "adaptive" }
    static func batteryPercent(_ value: Double) -> Double { value.isFinite ? min(max(value, 0), 100) : 0 }
}

struct StateFile: Codable {
    let `protocol`: Int?
    let pid: Int32
    let allLevel: Double
    let levels: [String: Double]
    let externalMax: Double
    let strategy: String
    let lowBattery: Double
    let pauseReasons: [String]
    let updatedAt: String
    let displays: [DisplaySnapshot]
}

/// What `status` returns. `displays` is always the XDR displays connected right now (read live), with
/// the running helper's levels and statuses when it runs, and level 1.0 / status "off" when it doesn't.
struct HelperState: Encodable {
    /// The running helper's protocol (nil when not running, or when an old helper wrote no version).
    let `protocol`: Int?
    let running: Bool
    let pid: Int32?
    let allLevel: Double
    let levels: [String: Double]
    let externalMax: Double?
    let strategy: String?
    let lowBattery: Double?
    /// Why a running helper has paused the boost (empty when boosting or not running).
    let pauseReasons: [String]
    let gammaSupported: Bool
    let updatedAt: String?
    let displays: [DisplaySnapshot]
}

enum PidFile {
    static func url(forState state: String) -> URL {
        URL(fileURLWithPath: state).deletingLastPathComponent().appendingPathComponent("helper.pid")
    }

    static func read(_ url: URL) -> Int32? {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        return Int32(text.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    /// Alive AND a helper `run` for this same state file. `kill(pid, 0)` alone is not enough: after a
    /// crash or a power loss the pid file survives, and after a reboot its pid can belong to an unrelated
    /// process. Identity is the argv (`<bin> run <level> <JSON state path>`), not the executable path,
    /// so a helper started from another install (dev vs Store, or before an update) is still found.
    static func isHelper(_ pid: Int32, state: String) -> Bool {
        guard pid > 0, kill(pid, 0) == 0, let args = arguments(of: pid), args.count >= 4, args[1] == "run",
              let path = try? JSONDecoder().decode(String.self, from: Data(args[3].utf8)) else { return false }
        return path == state
    }

    /// The argv of a process owned by this user, from `KERN_PROCARGS2`:
    /// an Int32 argc, the exec path, NUL padding, then argc NUL-terminated arguments.
    private static func arguments(of pid: Int32) -> [String]? {
        var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        var buffer = [UInt8](repeating: 0, count: size)
        guard sysctl(&mib, 3, &buffer, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        let argc = Int(buffer.withUnsafeBytes { $0.loadUnaligned(as: Int32.self) })
        var i = MemoryLayout<Int32>.size
        while i < size, buffer[i] != 0 { i += 1 } // exec path
        while i < size, buffer[i] == 0 { i += 1 } // padding
        var args: [String] = []
        while args.count < argc, i < size {
            let start = i
            while i < size, buffer[i] != 0 { i += 1 }
            args.append(String(decoding: buffer[start..<i], as: UTF8.self))
            i += 1
        }
        return args.count == argc ? args : nil
    }
}

// MARK: - run

/// Never returns while any display is boosted. Argument order matters: `PidFile.isHelper` reads the state path
/// from argv[3] (src/lib/__tests__/protocol.test.ts checks the TypeScript side).
@raycast func run(
    level: Double, state: String, levels: [String: Double], externalMax: Double, strategy: String, lowBattery: Double
) throws {
    let all = Levels.clamp(level)
    let perDisplay = Levels.clamp(levels)
    let ceiling = Levels.clampGain(externalMax)
    let mode = Levels.strategy(strategy)
    let batteryFloor = Levels.batteryPercent(lowBattery)
    let pidURL = PidFile.url(forState: state)

    // Single instance: hand the levels to the running helper instead.
    if let pid = PidFile.read(pidURL), PidFile.isHelper(pid, state: state) {
        helperLog.notice("run: helper \(pid, privacy: .public) already running; handing it all \(all, privacy: .public), levels \(perDisplay, privacy: .public)")
        Notifications.postSet(all: all, levels: perDisplay, externalMax: ceiling, strategy: mode, lowBattery: batteryFloor)
        return
    }
    guard all > 1.0 || perDisplay.values.contains(where: { $0 > 1.0 }) else { return } // everything off

    try FileManager.default.createDirectory(at: pidURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try "\(getpid())\n".write(to: pidURL, atomically: true, encoding: .utf8)
    helperLog.notice("run: started pid \(getpid(), privacy: .public) at all \(all, privacy: .public), levels \(perDisplay, privacy: .public)")

    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    Session.current = Session(
        all: all, levels: perDisplay, externalMax: ceiling, strategy: mode, lowBattery: batteryFloor,
        statePath: state, pidURL: pidURL)
    Session.current?.begin()
    app.run()
}

/// Owns the booster for the life of the `run` process.
final class Session {
    static var current: Session?

    private let booster: Booster
    private let statePath: String
    private let pidURL: URL
    private var signalSources: [DispatchSourceSignal] = []
    private var raycastExit: DispatchSourceProcess?
    private let dateFormatter = ISO8601DateFormatter()
    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }()

    init(
        all: Double, levels: [String: Double], externalMax: Double, strategy: String, lowBattery: Double,
        statePath: String, pidURL: URL
    ) {
        booster = Booster(allLevel: all, levels: levels, externalMax: externalMax, strategy: strategy, lowBattery: lowBattery)
        self.statePath = statePath
        self.pidURL = pidURL
    }

    func begin() {
        booster.onChange = { [weak self] in self?.writeState() }

        let center = DistributedNotificationCenter.default()
        center.addObserver(forName: Notifications.set, object: nil, queue: .main) { [weak self] note in
            guard let self else { return }
            let info = note.userInfo ?? [:]
            helperLog.notice("set notification: \(String(describing: info), privacy: .public)")
            // Anything short of a complete snapshot is not from this build of the extension: ignore it.
            guard let all = (info["all"] as? NSNumber)?.doubleValue, let raw = info["levels"] as? [String: Any],
                  let ceiling = (info["externalMax"] as? NSNumber)?.doubleValue,
                  let mode = info["strategy"] as? String,
                  let batteryFloor = (info["lowBattery"] as? NSNumber)?.doubleValue else {
                helperLog.error("set notification without a complete snapshot; ignored")
                return
            }
            self.booster.replaceIntent(
                all: Levels.clamp(all),
                levels: Levels.clamp(raw.compactMapValues { ($0 as? NSNumber)?.doubleValue }),
                externalMax: Levels.clampGain(ceiling),
                strategy: Levels.strategy(mode),
                lowBattery: Levels.batteryPercent(batteryFloor)
            )
            if !self.booster.wantsBoost { self.quit() }
        }
        center.addObserver(forName: Notifications.quit, object: nil, queue: .main) { [weak self] _ in self?.quit() }

        // SIGTERM / SIGINT: same as quit. SIGKILL needs no handler: WindowServer restores the table.
        for sig in [SIGTERM, SIGINT] {
            signal(sig, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
            source.setEventHandler { [weak self] in
                helperLog.notice("signal \(sig, privacy: .public)")
                self?.quit()
            }
            source.resume()
            signalSources.append(source)
        }

        watchRaycast()
        observePauseReasons()
        booster.start()
    }

    /// Raycast quitting: same as quit. Only Raycast can turn the boost off, so the boost must not outlive it; with
    /// After Restart on, the menu bar command starts it again once Raycast is back. Raycast is an agent app
    /// (LSUIElement), and NSWorkspace posts no terminate notification for those, so watch its process instead.
    /// A helper that cannot find Raycast quits rather than boost with nothing to end it.
    private func watchRaycast() {
        guard let raycast = NSRunningApplication.runningApplications(withBundleIdentifier: "com.raycast.macos").first else {
            helperLog.error("Raycast is not running; quitting")
            quit()
        }
        let source = DispatchSource.makeProcessSource(identifier: raycast.processIdentifier, eventMask: .exit, queue: .main)
        source.setEventHandler { [weak self] in
            helperLog.notice("Raycast quit")
            self?.quit()
        }
        source.resume()
        raycastExit = source
        // Raycast may have exited between the lookup and the registration; don't rely on the source reporting it.
        if raycast.isTerminated || kill(raycast.processIdentifier, 0) != 0 {
            helperLog.notice("Raycast quit")
            quit()
        }
    }

    /// The system states that pause the boost (after Illuminate's SuspensionReason, MIT). Low battery is
    /// polled in `Booster.checkBattery`.
    private func observePauseReasons() {
        let distributed = DistributedNotificationCenter.default()
        let workspace = NSWorkspace.shared.notificationCenter
        func on(_ center: NotificationCenter, _ name: String, _ reason: String, _ active: Bool) {
            center.addObserver(forName: Notification.Name(name), object: nil, queue: .main) { [weak self] _ in
                self?.booster.setPaused(reason, active)
            }
        }
        on(distributed, "com.apple.screensaver.didstart", "screen-saver", true)
        on(distributed, "com.apple.screensaver.didstop", "screen-saver", false)
        on(distributed, "com.apple.screenIsLocked", "screen-locked", true)
        on(distributed, "com.apple.screenIsUnlocked", "screen-locked", false)
        on(workspace, NSWorkspace.sessionDidResignActiveNotification.rawValue, "session-inactive", true)
        on(workspace, NSWorkspace.sessionDidBecomeActiveNotification.rawValue, "session-inactive", false)
        on(workspace, NSWorkspace.willSleepNotification.rawValue, "system-sleep", true)
        on(workspace, NSWorkspace.didWakeNotification.rawValue, "system-sleep", false)
        on(workspace, NSWorkspace.screensDidSleepNotification.rawValue, "displays-asleep", true)
        on(workspace, NSWorkspace.screensDidWakeNotification.rawValue, "displays-asleep", false)
        // The notifications only report changes: a helper started while locked, in the screen saver, or in a
        // switched-out session must read the current state too.
        let session = CGSessionCopyCurrentDictionary() as? [String: Any] ?? [:]
        booster.setPaused("screen-locked", session["CGSSessionScreenIsLocked"] as? Bool ?? false)
        booster.setPaused("session-inactive", session[kCGSessionOnConsoleKey as String] as? Bool == false)
        let saver = NSWorkspace.shared.runningApplications.contains { $0.bundleIdentifier == "com.apple.ScreenSaver.Engine" }
        booster.setPaused("screen-saver", saver)
        booster.setPaused("low-power-mode", ProcessInfo.processInfo.isLowPowerModeEnabled)
        NotificationCenter.default.addObserver(forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: .main) { [weak self] _ in
            self?.booster.setPaused("low-power-mode", ProcessInfo.processInfo.isLowPowerModeEnabled)
        }
    }

    func quit() -> Never {
        helperLog.notice("quit")
        booster.stop()
        CGDisplayRestoreColorSyncSettings()
        if PidFile.read(pidURL) == getpid() { try? FileManager.default.removeItem(at: pidURL) }
        exit(0)
    }

    private func writeState() {
        let file = StateFile(
            protocol: helperProtocol,
            pid: getpid(),
            allLevel: booster.allLevel,
            levels: booster.levels,
            externalMax: booster.externalMax,
            strategy: booster.strategy,
            lowBattery: booster.lowBattery,
            pauseReasons: booster.pauseReasons.sorted(),
            updatedAt: dateFormatter.string(from: Date()),
            displays: booster.snapshots
        )
        guard let data = try? encoder.encode(file) else { return }
        try? data.write(to: URL(fileURLWithPath: statePath), options: .atomic)
    }
}

// MARK: - one-shots

/// A stale pid file is removed.
@raycast func status(state: String) -> HelperState {
    let pidURL = PidFile.url(forState: state)
    var running = false
    var pid: Int32?
    if let read = PidFile.read(pidURL) {
        running = PidFile.isHelper(read, state: state)
        if running {
            pid = read
        } else {
            helperLog.notice("status: pid \(read, privacy: .public) is not a live helper; removing stale pid file")
            try? FileManager.default.removeItem(at: pidURL)
        }
    }
    let decoded = running
        ? (try? Data(contentsOf: URL(fileURLWithPath: state))).flatMap { try? JSONDecoder().decode(StateFile.self, from: $0) }
        : nil
    // Trust the state file only when the running helper wrote it (same pid): otherwise it is another
    // process's leftovers, and its protocol and intent say nothing about the helper that is running now.
    let file = decoded?.pid == pid ? decoded : nil
    // An old helper's state file doesn't decode (different shape) or carries no version: report nil.
    let runningProtocol = running ? file?.protocol : nil
    let known = Dictionary((file?.displays ?? []).map { ($0.uuid, $0) }, uniquingKeysWith: { a, _ in a })
    let displays: [DisplaySnapshot] = Booster.xdrScreens.compactMap { screen in
        guard let id = Booster.displayID(screen), let uuid = Booster.uuid(id) else { return nil }
        let live = known[uuid]
        return DisplaySnapshot(
            uuid: uuid,
            id: id,
            name: screen.localizedName,
            builtIn: CGDisplayIsBuiltin(id) != 0,
            potentialEDR: Double(screen.maximumPotentialExtendedDynamicRangeColorComponentValue),
            currentEDR: Double(screen.maximumExtendedDynamicRangeColorComponentValue),
            level: live?.level ?? (running ? (file?.levels[uuid] ?? file?.allLevel ?? 1.0) : 1.0),
            effectiveLevel: live?.effectiveLevel ?? 1.0,
            status: live?.status ?? .off
        )
    }
    return HelperState(
        protocol: runningProtocol,
        running: running,
        pid: pid,
        allLevel: running ? (file?.allLevel ?? 1.0) : 1.0,
        levels: running ? (file?.levels ?? [:]) : [:],
        externalMax: running ? file?.externalMax : nil,
        strategy: running ? file?.strategy : nil,
        lowBattery: running ? file?.lowBattery : nil,
        pauseReasons: running ? (file?.pauseReasons ?? []) : [],
        gammaSupported: gammaSupported(),
        updatedAt: file?.updatedAt,
        displays: displays
    )
}

/// The helper quits by itself when the snapshot boosts nothing.
@raycast func setLevels(all: Double, levels: [String: Double], externalMax: Double, strategy: String, lowBattery: Double) {
    Notifications.postSet(
        all: Levels.clamp(all), levels: Levels.clamp(levels), externalMax: Levels.clampGain(externalMax),
        strategy: Levels.strategy(strategy), lowBattery: Levels.batteryPercent(lowBattery))
}

@raycast func quit() {
    Notifications.postQuit()
}

/// False on M5 Pro / M5 Max: there `CGSetDisplayTransferByTable` succeeds and reads back correctly but has no
/// visible effect (FB22273730), and that cannot be detected at runtime, so the CPU name decides. After
/// Illuminate's GammaCompatibility (MIT, https://github.com/fackelmeyer/illuminate).
func gammaSupported() -> Bool {
    var size = 0
    guard sysctlbyname("machdep.cpu.brand_string", nil, &size, nil, 0) == 0, size > 0 else { return true }
    var buffer = [CChar](repeating: 0, count: size)
    guard sysctlbyname("machdep.cpu.brand_string", &buffer, &size, nil, 0) == 0 else { return true }
    let words = String(cString: buffer).split(separator: " ")
    guard let chip = words.firstIndex(of: "M5"), words.index(after: chip) < words.endIndex else { return true }
    return !["Pro", "Max"].contains(words[words.index(after: chip)])
}
