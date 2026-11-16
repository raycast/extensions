import Cocoa
import IOKit.ps
import os

let boosterLog = Logger(subsystem: "com.chrismessina.xdr-boost", category: "booster")

// The boost: a 1×1 EDR trigger window keeps each XDR panel in EDR mode, and the display's
// transfer (gamma) table is multiplied by the level, so values above 1.0 map into the EDR
// headroom. The table belongs to this process: WindowServer restores it when we exit, crash,
// or are killed — that is the off switch of last resort.
//
// Ported from Headroom (MIT, © 2026 fichl), Sources/Gamma.swift at 6e7c20a: the trigger window,
// the plain-table capture, the 0.5 s layout-change debounce and the 1 s re-assert timer.
// Headroom in turn credits xdr-lift (MIT, © 2026 Yihan Zhu) for the trigger window setup and
// Illuminate (MIT, © 2026 Jonas Fackelmeyer) for the linear scale with an identity-ramp fallback.

enum DisplayStatus: String, Codable {
    case off
    case boosted
    /// Boosted, but only as far as the panel's current headroom allows (below the requested level).
    case limited
    case waiting
    case edrUnavailable = "edr-unavailable"
    /// Paused for a system reason (screen locked, screen saver, sleep, Low Power Mode …): plain table, no trigger.
    case paused
}

struct DisplaySnapshot: Codable {
    let uuid: String
    let id: UInt32
    let name: String
    let builtIn: Bool
    let potentialEDR: Double
    let currentEDR: Double
    let level: Double
    /// The LIGHT gain actually applied (from the table factor via the curve, capped by headroom); 1.0 when nothing is written.
    /// A different unit from `level`, which is a position on the Off → Max scale.
    let effectiveLevel: Double
    let status: DisplayStatus
}

final class Booster {
    typealias Table = (r: [CGGammaValue], g: [CGGammaValue], b: [CGGammaValue])

    private static let engageTimeout: TimeInterval = 10
    private static let retryInterval: TimeInterval = 60
    /// A headroom dip must last this long before we lower the table (Space switches dip briefly).
    private static let dipGrace: TimeInterval = 2
    private static let driftTolerance: Float = 0.01
    /// Headroom above which EDR counts as engaged (Illuminate's EngagementMachine readyThreshold, MIT).
    private static let engagedHeadroom = 1.05
    private static let factorStep: Double = 0.01

    private final class Target {
        let id: CGDirectDisplayID
        let uuid: String
        let builtIn: Bool
        let profile: Curve.Profile
        let base: Table
        var trigger: NSWindow?
        var status: DisplayStatus = .off
        var waitingSince = Date()
        var retryAt: Date?
        var lowSince: Date?
        var effective: Double = 1.0
        var writtenLast: Float?
        /// What `apply` last acted on: level + strategy + ceiling. Only a change to this writes at once;
        /// headroom movement under "adaptive" is `tick`'s business, dip grace included.
        var requestKey = ""
        var frame: NSRect = .zero

        init(id: CGDirectDisplayID, uuid: String, name: String, base: Table) {
            self.id = id
            self.uuid = uuid
            builtIn = CGDisplayIsBuiltin(id) != 0
            profile = Curve.profile(name: name, builtIn: builtIn)
            self.base = base
        }
    }

    /// The "All Displays" level: applies to every display without its own level, including ones that connect later.
    private(set) var allLevel: Double
    /// Per-display levels by hardware UUID. Kept while a display is unplugged, so it comes back at its own level.
    private(set) var levels: [String: Double]
    /// Max LIGHT gain for external XDR displays under the "fixed" strategy.
    private(set) var externalMax: Double
    private(set) var strategy: String
    /// Pause while on battery power below this charge percentage; 0 = never.
    private(set) var lowBattery: Double
    /// Why the boost is paused, if it is. A SET, after Illuminate's SuspensionState (MIT): clearing one reason
    /// (the screen saver stopping) cannot resume the boost while another (the lock screen) still holds.
    private(set) var pauseReasons: Set<String> = []
    var isPaused: Bool { !pauseReasons.isEmpty }
    var onChange: (() -> Void)?

    private var targets: [Target] = []
    private var tickTimer: Timer?
    private var reassertTimer: Timer?
    private var batteryTimer: Timer?
    private var started = false
    private var builtSignature = ""
    private var pendingRebuild: DispatchWorkItem?

    init(allLevel: Double, levels: [String: Double], externalMax: Double, strategy: String, lowBattery: Double) {
        self.allLevel = allLevel
        self.levels = levels
        self.externalMax = externalMax
        self.strategy = strategy
        self.lowBattery = lowBattery
        let ws = NSWorkspace.shared.notificationCenter
        ws.addObserver(self, selector: #selector(scheduleRebuild), name: NSWorkspace.screensDidWakeNotification, object: nil)
        ws.addObserver(self, selector: #selector(scheduleRebuild), name: NSWorkspace.didWakeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged),
                                               name: NSApplication.didChangeScreenParametersNotification, object: nil)
    }

    func level(for uuid: String) -> Double { levels[uuid] ?? allLevel }

    /// The TABLE factor for a target at this headroom: its level placed under the display's maximum light gain
    /// (which, under "adaptive", follows the headroom), gamma-encoded. See Curve.swift.
    private func factor(for target: Target, headroom: Double) -> Double {
        let nominal = level(for: target.uuid)
        guard nominal > 1.0 else { return 1.0 }
        let maxGain = Curve.maxGain(strategy: strategy, profile: target.profile, builtIn: target.builtIn, headroom: headroom, externalMax: externalMax)
        return Curve.tableFactor(level: nominal, maxGain: maxGain, maxLevel: Levels.range.upperBound)
    }

    /// xdr-lift's cap, gamma-encoded.
    private static func tableCap(headroom: Double) -> Double {
        Curve.tableFactor(gain: Curve.headroomSafety * headroom)
    }

    var wantsBoost: Bool {
        allLevel > 1.0 || levels.values.contains { $0 > 1.0 }
    }

    // MARK: - Public

    func start() {
        CGDisplayRestoreColorSyncSettings() // capture plain profile tables, never boosted ones
        reconcile()
        started = true
        batteryTimer = Self.timer(every: 60, tolerance: 10) { [weak self] in self?.checkBattery() }
        updateTimers()
        checkBattery()
        tick()
        onChange?()
    }

    /// The tick and re-assert timers run only while started and not paused, so a long lock or sleep costs no
    /// wakeups. The battery timer keeps running: it is what clears the low-battery pause.
    private func updateTimers() {
        if started && !isPaused {
            guard tickTimer == nil else { return }
            tickTimer = Self.timer(every: 0.25, tolerance: 0.05) { [weak self] in self?.tick() }
            reassertTimer = Self.timer(every: 1.0, tolerance: 0.2) { [weak self] in self?.reassert() }
        } else {
            tickTimer?.invalidate(); tickTimer = nil
            reassertTimer?.invalidate(); reassertTimer = nil
        }
    }

    private static func timer(every interval: TimeInterval, tolerance: TimeInterval, _ body: @escaping () -> Void) -> Timer {
        let timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in body() }
        timer.tolerance = tolerance
        return timer
    }

    /// A display still connected under the same ID keeps its table, factor and status (only its trigger is
    /// re-placed if the layout moved), so plugging in or rearranging one display never resets another.
    private func reconcile() {
        builtSignature = Self.layoutSignature
        boosterLog.notice("reconcile: all \(self.allLevel, privacy: .public), levels \(self.levels, privacy: .public), layout \(self.builtSignature, privacy: .public)")
        var next: [Target] = []
        for screen in Self.xdrScreens {
            guard let id = Self.displayID(screen), let uuid = Self.uuid(id) else { continue }
            if let kept = targets.first(where: { $0.uuid == uuid && $0.id == id }) {
                if let old = kept.trigger, kept.frame != screen.frame {
                    old.orderOut(nil)
                    kept.trigger = Self.makeTrigger(on: screen, builtIn: kept.builtIn)
                }
                kept.frame = screen.frame
                next.append(kept)
                continue
            }
            boosterLog.notice("new target \(id, privacy: .public) \(uuid, privacy: .public) \(screen.localizedName, privacy: .public): potential EDR \(screen.maximumPotentialExtendedDynamicRangeColorComponentValue, privacy: .public), current \(screen.maximumExtendedDynamicRangeColorComponentValue, privacy: .public)")
            let target = Target(id: id, uuid: uuid, name: screen.localizedName, base: Self.plainTable(id))
            target.frame = screen.frame
            next.append(target)
        }
        for gone in targets where !next.contains(where: { $0 === gone }) {
            boosterLog.notice("target gone \(gone.id, privacy: .public) \(gone.uuid, privacy: .public)")
            gone.trigger?.orderOut(nil)
            gone.trigger = nil
        }
        targets = next
        let now = Date()
        for target in targets { apply(target, now: now) }
    }

    /// Replaces the whole intent, unplugged displays included. An empty `levels` clears overrides. Displays whose
    /// own request (level, strategy, ceiling) did not change are left alone (`apply` checks `requestKey`).
    func replaceIntent(all: Double, levels newLevels: [String: Double], externalMax newMax: Double, strategy newStrategy: String, lowBattery newLowBattery: Double) {
        boosterLog.notice("intent: all \(all, privacy: .public), levels \(newLevels, privacy: .public), externalMax \(newMax, privacy: .public), strategy \(newStrategy, privacy: .public)")
        allLevel = all
        levels = newLevels
        externalMax = newMax
        strategy = newStrategy
        lowBattery = newLowBattery
        checkBattery()
        reapply()
    }

    func stop() {
        boosterLog.notice("stop")
        pendingRebuild?.cancel()
        tearDown()
    }

    var snapshots: [DisplaySnapshot] {
        targets.compactMap { target in
            guard let screen = Self.screen(for: target.id) else { return nil }
            return DisplaySnapshot(
                uuid: target.uuid,
                id: target.id,
                name: screen.localizedName,
                builtIn: target.builtIn,
                potentialEDR: Double(screen.maximumPotentialExtendedDynamicRangeColorComponentValue),
                currentEDR: Double(screen.maximumExtendedDynamicRangeColorComponentValue),
                level: level(for: target.uuid),
                effectiveLevel: Curve.gain(tableFactor: target.effective),
                status: target.status
            )
        }
    }

    // MARK: - Pausing

    /// Adds or clears one pause reason. The first reason releases every display (plain table, trigger hidden,
    /// so the panel can leave EDR and its higher backlight); clearing the last one re-engages them.
    func setPaused(_ reason: String, _ active: Bool) {
        let wasPaused = isPaused
        if active { pauseReasons.insert(reason) } else { pauseReasons.remove(reason) }
        boosterLog.notice("pause \(reason, privacy: .public)=\(active, privacy: .public); reasons \(self.pauseReasons.sorted(), privacy: .public)")
        updateTimers()
        if !wasPaused && isPaused {
            for target in targets {
                target.trigger?.orderOut(nil)
                target.trigger = nil
                writePlain(target)
                target.status = .paused
                target.lowSince = nil
                target.retryAt = nil
            }
            onChange?()
        } else if wasPaused && !isPaused {
            for target in targets {
                target.status = .off
                target.requestKey = ""
            }
            reapply()
        } else {
            onChange?()
        }
    }

    /// A Mac without a battery never pauses for this.
    func checkBattery() {
        let low: Bool = {
            guard lowBattery > 0, let charge = Self.batteryOnBatteryPower() else { return false }
            return charge < lowBattery
        }()
        if low != pauseReasons.contains("low-battery") { setPaused("low-battery", low) }
    }

    private static func batteryOnBatteryPower() -> Double? {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef] else { return nil }
        for source in list {
            guard let desc = IOPSGetPowerSourceDescription(info, source)?.takeUnretainedValue() as? [String: Any],
                  desc[kIOPSTypeKey] as? String == kIOPSInternalBatteryType,
                  desc[kIOPSPowerSourceStateKey] as? String == kIOPSBatteryPowerValue,
                  let current = desc[kIOPSCurrentCapacityKey] as? Double,
                  let max = desc[kIOPSMaxCapacityKey] as? Double, max > 0 else { continue }
            return current / max * 100
        }
        return nil
    }

    // MARK: - Per-target state machine

    private func reapply() {
        let now = Date()
        for target in targets { apply(target, now: now) }
        tick()
        onChange?()
    }

    private func apply(_ target: Target, now: Date) {
        // On/off follows the level the user chose: the computed gain can be 1.0 under "adaptive"
        // (headroom not open yet, or a bright slider), and that must not switch a requested boost off.
        let nominal = level(for: target.uuid)
        let key = "\(nominal)|\(strategy)|\(externalMax)"
        let changed = key != target.requestKey
        target.requestKey = key
        if isPaused {
            if target.status != .paused {
                target.trigger?.orderOut(nil)
                target.trigger = nil
                writePlain(target)
                target.status = .paused
            }
            return
        }
        if nominal <= 1.0 {
            guard target.status != .off else { return }
            target.trigger?.orderOut(nil)
            target.trigger = nil
            writePlain(target)
            target.status = .off
            target.lowSince = nil
            target.retryAt = nil
            return
        }
        switch target.status {
        case .off:
            guard let screen = Self.screen(for: target.id) else { return }
            target.trigger = Self.makeTrigger(on: screen, builtIn: target.builtIn)
            target.status = .waiting
            target.waitingSince = now
        case .boosted, .limited:
            // Only a display whose own request changed writes now, even when the change is smaller than the
            // headroom step (1.7495 → 1.75). Untouched displays stay on `tick`'s policy, dip grace included,
            // so changing or plugging in one display never rewrites another.
            guard changed else { return }
            target.lowSince = nil
            let wanted = factor(for: target, headroom: Self.headroom(target.id))
            write(target, factor: wanted)
            target.status = boostStatus(target, wanted: wanted)
        case .waiting, .edrUnavailable, .paused:
            break
        }
    }

    private func boostStatus(_ target: Target, wanted: Double) -> DisplayStatus {
        target.effective < wanted - Self.factorStep || target.effective <= 1.0 + 1e-6 ? .limited : .boosted
    }

    /// Every 0.25 s. Writes min(the curve's factor for the live headroom, `tableCap`), so light never exceeds
    /// 0.95 × the panel's current headroom. Rises apply at once; drops (including to unity, and EDR loss) wait
    /// out `dipGrace` so a Space switch can't flash.
    private func tick() {
        guard !isPaused else { return }
        let now = Date()
        var changed = false
        let before = targets.map(\.effective)
        for target in targets {
            // A requested boost stays engaged even when the computed gain is 1.0.
            guard level(for: target.uuid) > 1.0 else { continue }
            let headroom = Self.headroom(target.id)
            let wanted = factor(for: target, headroom: headroom)
            let desired = min(wanted, Self.tableCap(headroom: headroom))
            switch target.status {
            case .off, .paused:
                continue
            case .waiting:
                if headroom > Self.engagedHeadroom {
                    boosterLog.notice("engaged \(target.id, privacy: .public): headroom \(headroom, privacy: .public) after \(now.timeIntervalSince(target.waitingSince), privacy: .public) s")
                    write(target, factor: desired)
                    target.status = boostStatus(target, wanted: wanted)
                    changed = true
                } else if now.timeIntervalSince(target.waitingSince) >= Self.engageTimeout {
                    // Writing a boosted table without headroom clips and washes out: write nothing.
                    boosterLog.error("edr-unavailable \(target.id, privacy: .public): headroom stayed \(headroom, privacy: .public) for \(Self.engageTimeout, privacy: .public) s; retrying in \(Self.retryInterval, privacy: .public) s")
                    target.status = .edrUnavailable
                    target.trigger?.orderOut(nil)
                    target.trigger = nil
                    target.retryAt = now.addingTimeInterval(Self.retryInterval)
                    changed = true
                }
            case .edrUnavailable:
                guard let retryAt = target.retryAt, now >= retryAt, let screen = Self.screen(for: target.id) else { continue }
                boosterLog.notice("retry \(target.id, privacy: .public)")
                target.trigger = Self.makeTrigger(on: screen, builtIn: target.builtIn)
                target.status = .waiting
                target.waitingSince = now
                target.retryAt = nil
                changed = true
            case .boosted, .limited:
                // Unity and EDR loss are their own transitions, not subject to factorStep: a boost the curve
                // no longer wants is removed even when it is tiny, and a display that lost EDR goes back to waiting
                // even when its table is already plain. Both still wait out the dip grace.
                let edrLost = headroom <= Self.engagedHeadroom
                let toUnity = desired <= 1.0 && target.effective > 1.0 + 1e-9
                if !edrLost && desired > target.effective + Self.factorStep {
                    target.lowSince = nil
                    write(target, factor: desired)
                } else if edrLost || toUnity || desired < target.effective - Self.factorStep {
                    if target.lowSince == nil { target.lowSince = now }
                    guard let since = target.lowSince, now.timeIntervalSince(since) >= Self.dipGrace else { continue }
                    boosterLog.notice("headroom \(headroom, privacy: .public) on \(target.id, privacy: .public) for \(Self.dipGrace, privacy: .public) s: lowering \(target.effective, privacy: .public) -> \(desired, privacy: .public)")
                    target.lowSince = nil
                    write(target, factor: desired) // a factor <= 1 writes the plain table
                    if edrLost {
                        target.status = .waiting
                        target.waitingSince = now
                        changed = true
                        continue
                    }
                } else {
                    target.lowSince = nil
                }
                let status = boostStatus(target, wanted: wanted)
                if status != target.status { target.status = status; changed = true }
            }
        }
        // Report whenever the applied output moved, not only on status changes.
        if !changed { changed = zip(before, targets.map(\.effective)).contains { abs($0 - $1) > 1e-9 } }
        if changed { onChange?() }
    }

    // MARK: - Tables

    private func reassert() {
        guard !isPaused else { return }
        let before = targets.map(\.effective)
        // A display switched off whose plain-table write was rejected still holds the boosted table: retry.
        for target in targets where target.status == .off && target.writtenLast != nil { writePlain(target) }
        for target in targets where target.status == .boosted || target.status == .limited {
            guard let written = target.writtenLast else { continue }
            let readBack = Self.lastEntry(target.id)
            if let readBack, abs(readBack - written) <= Self.driftTolerance { continue }
            boosterLog.notice("re-assert \(target.id, privacy: .public): read back \(readBack ?? -1, privacy: .public), wrote \(written, privacy: .public)")
            write(target, factor: target.effective)
        }
        // A repair can change the applied output (the writer re-caps it): report it, like tick does.
        if zip(before, targets.map(\.effective)).contains(where: { abs($0 - $1) > 1e-9 }) { onChange?() }
    }

    /// The only writer of a boosted table, so the headroom cap holds on every path: engage, level change,
    /// raise, lower, and re-assert. Never writes light above 0.95 × the panel's current headroom, read here.
    private func write(_ target: Target, factor requested: Double) {
        let headroom = Self.headroom(target.id)
        let factor = min(requested, Self.tableCap(headroom: headroom))
        guard factor > 1.0 else { writePlain(target); return }
        if factor < requested { boosterLog.debug("cap \(target.id, privacy: .public): asked \(requested, privacy: .public), headroom \(headroom, privacy: .public)") }
        let k = Float(factor)
        var r = target.base.r.map { $0 * k }, g = target.base.g.map { $0 * k }, b = target.base.b.map { $0 * k }
        let result = CGSetDisplayTransferByTable(target.id, UInt32(r.count), &r, &g, &b)
        // A rejected write changed nothing on screen: keep the previous output, so the status stays true and
        // the next tick or re-assert tries again.
        guard result == .success else {
            boosterLog.error("write \(target.id, privacy: .public) × \(factor, privacy: .public) rejected: \(result.rawValue, privacy: .public)")
            return
        }
        boosterLog.debug("write \(target.id, privacy: .public) × \(factor, privacy: .public)")
        target.effective = factor
        target.writtenLast = max(r.last ?? 0, g.last ?? 0, b.last ?? 0)
    }

    private func writePlain(_ target: Target) {
        guard target.writtenLast != nil else { target.effective = 1.0; return }
        var r = target.base.r, g = target.base.g, b = target.base.b
        let result = CGSetDisplayTransferByTable(target.id, UInt32(r.count), &r, &g, &b)
        // Keep tracking the boosted table when restoring it failed: tearDown still restores ColorSync for it.
        guard result == .success else {
            boosterLog.error("plain \(target.id, privacy: .public) rejected: \(result.rawValue, privacy: .public)")
            return
        }
        boosterLog.debug("plain \(target.id, privacy: .public)")
        target.effective = 1.0
        target.writtenLast = nil
    }

    private static func lastEntry(_ id: CGDirectDisplayID) -> Float? {
        let n = 256
        var r = [CGGammaValue](repeating: 0, count: n), g = r, b = r
        var count: UInt32 = 0
        guard CGGetDisplayTransferByTable(id, UInt32(n), &r, &g, &b, &count) == .success, count > 0 else { return nil }
        let i = Int(count) - 1
        return max(r[i], g[i], b[i])
    }

    private static func plainTable(_ id: CGDirectDisplayID) -> Table {
        let n = 256
        var r = [CGGammaValue](repeating: 0, count: n), g = r, b = r
        var count: UInt32 = 0
        if CGGetDisplayTransferByTable(id, UInt32(n), &r, &g, &b, &count) == .success, count > 1,
           let peak = (r + g + b).max(), peak > 0.01, peak <= 1.003 {
            let c = Int(count)
            return (Array(r.prefix(c)), Array(g.prefix(c)), Array(b.prefix(c)))
        }
        // Unusable reading (already boosted, or empty): fall back to an identity ramp.
        let ramp = (0..<n).map { CGGammaValue($0) / CGGammaValue(n - 1) }
        return (ramp, ramp, ramp)
    }

    // MARK: - Trigger window

    private static func makeTrigger(on screen: NSScreen, builtIn: Bool) -> NSWindow {
        // Built-in: top-left, hidden by the rounded display corner. External (Pro Display XDR):
        // top-right, because its corners are square and the top-left pixel sits on the Apple menu.
        let x = builtIn ? screen.frame.minX : screen.frame.maxX - 1
        let frame = NSRect(x: x, y: screen.frame.maxY - 1, width: 1, height: 1)
        let w = NSWindow(contentRect: frame, styleMask: [.borderless], backing: .buffered, defer: false)
        w.level = NSWindow.Level(rawValue: Int(CGShieldingWindowLevel()) + 1)
        w.collectionBehavior = [.stationary, .canJoinAllSpaces, .ignoresCycle, .fullScreenAuxiliary]
        w.isOpaque = false
        w.backgroundColor = .clear
        w.hasShadow = false
        w.ignoresMouseEvents = true
        w.hidesOnDeactivate = false
        w.isReleasedWhenClosed = false
        w.animationBehavior = .none
        w.sharingType = .none
        if let v = EDRView(value: 2.0) { w.contentView = v }
        w.orderFrontRegardless()
        return w
    }

    // MARK: - Screens

    static var xdrScreens: [NSScreen] {
        NSScreen.screens.filter { $0.maximumPotentialExtendedDynamicRangeColorComponentValue > 1.0 }
    }

    static func displayID(_ s: NSScreen) -> CGDirectDisplayID? {
        (s.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value
    }

    /// Stable across reconnects and reboots, unlike CGDirectDisplayID.
    static func uuid(_ id: CGDirectDisplayID) -> String? {
        guard let cf = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() else { return nil }
        return CFUUIDCreateString(nil, cf) as String?
    }

    private static func screen(for id: CGDirectDisplayID) -> NSScreen? {
        NSScreen.screens.first { displayID($0) == id }
    }

    /// The live EDR headroom; 1.0 (none) when the screen is gone.
    private static func headroom(_ id: CGDirectDisplayID) -> Double {
        Double(screen(for: id)?.maximumExtendedDynamicRangeColorComponentValue ?? 1.0)
    }

    /// The screen layout plus which screens are XDR-capable. Current EDR headroom is left out on purpose:
    /// it changes constantly and also posts didChangeScreenParameters. Potential headroom is in, because a
    /// display that just reconnected can report it a moment AFTER its frame appears; without it, that
    /// later change would never trigger a rebuild and the display would stay unboosted.
    private static var layoutSignature: String {
        NSScreen.screens.map { "\($0.frame):\($0.maximumPotentialExtendedDynamicRangeColorComponentValue > 1.0)" }
            .joined(separator: "|")
    }

    private func tearDown() {
        started = false
        updateTimers()
        batteryTimer?.invalidate(); batteryTimer = nil
        let hadTable = targets.contains { $0.writtenLast != nil }
        targets.forEach { $0.trigger?.orderOut(nil) }
        targets.removeAll()
        if hadTable { CGDisplayRestoreColorSyncSettings() }
    }

    @objc private func screensChanged() {
        let now = Self.layoutSignature
        guard now != builtSignature else { return }
        boosterLog.notice("layout changed: \(self.builtSignature, privacy: .public) -> \(now, privacy: .public)")
        scheduleRebuild()
    }

    @objc private func scheduleRebuild() {
        boosterLog.notice("rebuild in 0.5 s")
        pendingRebuild?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            self.reconcile()
            self.tick()
            self.onChange?()
        }
        pendingRebuild = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: work)
    }
}
