import Foundation
import ObjectiveC

/// Key-value access to `corebrightnessd`, which drives the logo LED.
@MainActor
public protocol LightEmitterService: AnyObject {
    func value(forKey key: String) -> Any?
    func setValue(_ value: NSNumber, forKey key: String) -> Bool
    /// Sends a key to the keyboard backlights only.
    func setKeyboardValue(_ value: NSNumber, forKey key: String)
    /// Sends a key to the displays' own modules only (brightness and True Tone), not the logo.
    func setDisplaysValue(_ value: NSNumber, forKey key: String)
    /// Sets a key whose value isn't a number, e.g. a mapping (an array of pairs).
    func setObject(_ value: AnyObject, forKey key: String) -> Bool
}

public extension LightEmitterService {
    func setObject(_ value: AnyObject, forKey key: String) -> Bool { false }
}

/// Talks to `corebrightnessd` through CoreBrightness's `BrightnessSystemClient`.
///
/// This is private API, so it's loaded dynamically and `init` returns `nil` if it isn't
/// available; callers then fall back to the documented `defaults` command.
@MainActor
public final class CoreBrightnessService: LightEmitterService {
    private typealias CopyFunction = @convention(c) (AnyObject, Selector, NSString) -> Unmanaged<AnyObject>?
    private typealias SetFunction = @convention(c) (AnyObject, Selector, AnyObject, NSString) -> Bool
    private typealias SetForKeyboardFunction = @convention(c) (AnyObject, Selector, AnyObject, NSString, UInt64) -> Bool
    private typealias SetForDisplayFunction = @convention(c) (AnyObject, Selector, AnyObject, NSString, UInt64) -> Bool

    private let client: NSObject
    private let copySelector = NSSelectorFromString("copyPropertyForKey:")
    private let setSelector = NSSelectorFromString("setProperty:forKey:")
    private let keyboardSetSelector = NSSelectorFromString("setProperty:withKey:keyboardID:")
    private let displaySetSelector = NSSelectorFromString("setProperty:withKey:andDisplay:")
    private let copyFunction: CopyFunction
    private let setFunction: SetFunction
    private let setForKeyboardFunction: SetForKeyboardFunction?
    private let setForDisplayFunction: SetForDisplayFunction?
    private let keyboardIDs: [UInt64]

    public init?() {
        let path = "/System/Library/PrivateFrameworks/CoreBrightness.framework/CoreBrightness"
        guard dlopen(path, RTLD_LAZY) != nil,
              let type = NSClassFromString("BrightnessSystemClient") as? NSObject.Type,
              type.instancesRespond(to: copySelector), type.instancesRespond(to: setSelector)
        else { return nil }
        client = type.init()
        copyFunction = unsafeBitCast(client.method(for: copySelector), to: CopyFunction.self)
        setFunction = unsafeBitCast(client.method(for: setSelector), to: SetFunction.self)
        setForKeyboardFunction = type.instancesRespond(to: keyboardSetSelector)
            ? unsafeBitCast(client.method(for: keyboardSetSelector), to: SetForKeyboardFunction.self)
            : nil
        setForDisplayFunction = type.instancesRespond(to: displaySetSelector)
            ? unsafeBitCast(client.method(for: displaySetSelector), to: SetForDisplayFunction.self)
            : nil
        keyboardIDs = Self.copyKeyboardIDs()
    }

    private static func copyKeyboardIDs() -> [UInt64] {
        let selector = NSSelectorFromString("copyKeyboardBacklightIDs")
        guard let type = NSClassFromString("KeyboardBrightnessClient") as? NSObject.Type,
              type.instancesRespond(to: selector)
        else { return [] }
        let ids = type.init().perform(selector)?.takeRetainedValue() as? [NSNumber]
        return ids?.map(\.uint64Value) ?? []
    }

    public func value(forKey key: String) -> Any? {
        // A "copy" method, so the result comes back retained.
        copyFunction(client, copySelector, key as NSString)?.takeRetainedValue()
    }

    public func setValue(_ value: NSNumber, forKey key: String) -> Bool {
        setFunction(client, setSelector, value, key as NSString)
    }

    public func setObject(_ value: AnyObject, forKey key: String) -> Bool {
        setFunction(client, setSelector, value, key as NSString)
    }

    public func setKeyboardValue(_ value: NSNumber, forKey key: String) {
        guard let setForKeyboardFunction else { return }
        for id in keyboardIDs {
            _ = setForKeyboardFunction(client, keyboardSetSelector, value, key as NSString, id)
        }
    }

    /// The displays corebrightnessd has a container for (`CBDisplayList`), read each time since
    /// displays come and go. The IDs are the CoreGraphics display IDs. A display's container passes
    /// a key to its own modules, which include its colour module (True Tone), but not the logo's.
    public func setDisplaysValue(_ value: NSNumber, forKey key: String) {
        guard let setForDisplayFunction,
              let list = self.value(forKey: "CBDisplayList") as? [String: Any],
              let ids = list["CBDisplayDeviceIDs"] as? [NSNumber]
        else { return }
        for id in ids {
            _ = setForDisplayFunction(client, displaySetSelector, value, key as NSString, id.uint64Value)
        }
    }
}

/// The logo LED, as controlled by `corebrightnessd`'s light emitter (LE) module.
///
/// None of this needs root. Changing the setting here has the same effect as Apple's
/// documented `defaults` command: `corebrightnessd` (which runs as root) saves it to the
/// root `com.apple.CoreBrightness` `LEBacklightMode` default itself.
@MainActor
public final class LightEmitter {
    enum Key {
        /// 0 = off, 2 = on. (1 also lights the logo but is saved as off, so it isn't used.)
        static let mode = "LEBacklightMode"
        /// The fade duration in seconds when the logo is darkened or relit. 0 = automatic.
        static let fadeDuration = "LEPWMFactorFadeDuration"
        /// The display state the logo follows: it fades out on "Blank" and back in on "Unblank".
        /// The keyboard backlight follows it too, but the screen doesn't.
        static let logicalState = "DisplayLogicalState"
        /// Live state, including `Factor` (0–1, the fade position).
        static let pwmState = "LEPWMState"
        /// Tells every module whether the lid is closed. While the logo's module has been told it's
        /// closed, the logo stays dark whatever `DisplayLogicalState` says.
        static let clamshell = "ClamshellUpdate"
        /// Read only: whether corebrightnessd's own lid handling last saw the lid closed. A client's
        /// `ClamshellUpdate` doesn't change it.
        static let daemonLidState = "CBClamshellState"
        /// The display's nits mapped to the logo's, as `[display nits, logo nits]` pairs.
        static let brightnessMapping = "LEPWMBrightnessNitsMapping"
    }

    enum Mode {
        static let off = 0
        static let on = 2
    }

    enum LogicalState {
        static let blank = 1
        static let unblank = 2
    }

    /// A fade duration so long that a fade started with it never visibly moves. Starting one
    /// is how the logo is held at a level (see docs/corebrightnessd.md, "Holding a level").
    static let holdDuration = 1e9

    /// How often the fade level is checked while fading to a level in between.
    static let pollInterval = 0.01

    private let service: LightEmitterService

    /// The time in seconds, from any fixed start. Fades are timed by it, not by adding up the
    /// sleeps asked for: a real sleep runs late (a 10 ms one by about 2 ms, measured), and an ease-out
    /// that counts its sleeps lets the daemon move it a frame further than planned.
    private let clock: @MainActor () -> Double

    /// Which way the logo was last told to fade (`true` is toward lit), or `nil` when that isn't
    /// known: at launch, and once the display sleeps or wakes (`corebrightnessd` changes the state
    /// itself then). It can't be read back, because `DisplayLogicalState` gives the last value
    /// sent to anything, including the keyboard. Everything here is safe with `nil`.
    private(set) var isHeadingLit: Bool?

    /// Whether the last fade duration written was `holdDuration`, so a fade heading for 0 or 1
    /// may be a hold that never gets there.
    private var lastDurationWasHold = false

    /// `clock` gives the time in seconds, e.g. `LightEmitter.uptime`. Tests pass the fake's time,
    /// which moves as their sleeps do.
    public init(service: LightEmitterService, clock: @escaping @MainActor () -> Double) {
        self.service = service
        self.clock = clock
    }

    /// The time since the Mac started, in seconds: the clock for the real hardware.
    public static func uptime() -> Double { ProcessInfo.processInfo.systemUptime }

    /// The setting, read from `corebrightnessd`. `nil` if it isn't available.
    public var setting: LogoIllumination? {
        guard let mode = (service.value(forKey: Key.mode) as? NSNumber)?.intValue else { return nil }
        return mode == Mode.off ? .off : .on
    }

    @discardableResult
    public func setSetting(_ setting: LogoIllumination) -> Bool {
        service.setValue(NSNumber(value: setting == .on ? Mode.on : Mode.off), forKey: Key.mode)
    }

    /// How long the logo takes to fade when it's darkened or relit. 0 restores the automatic duration.
    /// It applies to the next fade; a fade in progress keeps its duration.
    @discardableResult
    public func setFadeDuration(_ seconds: Double) -> Bool {
        lastDurationWasHold = seconds >= Self.holdDuration
        return service.setValue(NSNumber(value: max(0, seconds)), forKey: Key.fadeDuration)
    }

    /// Fades the logo out (`false`) or back in (`true`) over the fade duration.
    /// Doesn't change the setting: while it's off, the logo stays dark either way.
    /// Ignored if the logo is already heading that way (or held after doing so).
    ///
    /// The keyboard backlight would darken too, so it's told straight away that the display is
    /// still on, which it can do without its light visibly changing.
    private func setLit(_ lit: Bool, keepingKeyboardLit keepKeyboard: Bool = true) {
        _ = service.setValue(NSNumber(value: lit ? LogicalState.unblank : LogicalState.blank),
                             forKey: Key.logicalState)
        isHeadingLit = lit
        if !lit, keepKeyboard { setKeyboardLit(true) }
    }

    /// Starts a fade the other way that's too slow to see. That stops the logo where it is, and
    /// makes heading `lit` a change again (see docs/corebrightnessd.md, "Holding a level").
    private func turnRound(from lit: Bool, keepingKeyboardLit keepKeyboard: Bool = true) {
        setFadeDuration(Self.holdDuration)
        setLit(!lit, keepingKeyboardLit: keepKeyboard)
    }

    /// Call when the display sleeps or wakes: `corebrightnessd` changes the state it sends
    /// the logo itself, and the keyboard should follow the display again.
    public func displayDidChange(isAwake: Bool) {
        isHeadingLit = nil
        setKeyboardLit(isAwake)
    }

    /// Tells the keyboard backlight whether the display is on, without affecting the logo.
    private func setKeyboardLit(_ lit: Bool) {
        service.setKeyboardValue(NSNumber(value: lit ? LogicalState.unblank : LogicalState.blank),
                                 forKey: Key.logicalState)
    }

    // MARK: - The lid

    /// Whether corebrightnessd sees the lid closed, or `nil` if it can't say (e.g. after a macOS
    /// update renamed the key). It's the daemon's own view, which only a real lid change moves, so
    /// it reads `true` once the daemon has darkened everything for a closed lid, whatever
    /// `overrideLid()` has told the logo since.
    public var isLidClosed: Bool? {
        (service.value(forKey: Key.daemonLidState) as? NSNumber)?.boolValue
    }

    /// Whether the logo has been told the lid is open while it's closed (see `overrideLid()`), or
    /// `nil` at launch, when a previous run that didn't quit cleanly may have left it so.
    private var lidOverride: Bool?

    /// Whether the logo has been told the lid is open while it's closed (see `overrideLid()`).
    public var isLidOverridden: Bool { lidOverride == true }

    /// Lets the logo light while the lid is closed: tells corebrightnessd the lid is open, then the
    /// keyboard alone that it's closed, so the keyboard stays dark. The daemon sends the real lid
    /// state only when the lid opens or closes, so this lasts until then (see docs/corebrightnessd.md,
    /// "The lid"). Call it once the daemon has handled the lid closing (`isLidClosed`), or its own
    /// update would come after this one.
    ///
    /// The displays are told the lid is closed again too. Otherwise True Tone, told the lid is open,
    /// adapts external displays to the covered light sensor: on a Mac with two external displays it
    /// tinted both warm and dim (a colour matrix of 0.91/0.85/0.71). Told it's closed, they went back
    /// to neutral and the logo stayed lit.
    public func overrideLid() {
        _ = service.setValue(NSNumber(value: false), forKey: Key.clamshell)
        service.setKeyboardValue(NSNumber(value: true), forKey: Key.clamshell)
        service.setDisplaysValue(NSNumber(value: true), forKey: Key.clamshell)
        lidOverride = true
    }

    /// Ends `overrideLid()`: the logo goes dark again, as it does by itself for a closed lid. At
    /// launch, it ends one a previous run may have left. If the lid has opened since,
    /// corebrightnessd has already sent that, so nothing is written.
    public func endLidOverride() {
        guard lidOverride != false else { return }
        lidOverride = false
        if isLidClosed == true { _ = service.setValue(NSNumber(value: true), forKey: Key.clamshell) }
    }

    /// The lid opened: corebrightnessd has told every module itself, so any override is over.
    public func lidDidOpen() {
        lidOverride = false
    }

    /// Where the logo is in a fade, from 0 (dark) to 1 (fully lit).
    public var fadeLevel: Double? {
        ((service.value(forKey: Key.pwmState) as? [String: Any])?["Factor"] as? NSNumber)?.doubleValue
    }

    // MARK: - The display's brightness

    /// A mapping of every display brightness to 1000 logo nits: with it, `AppliedNits` is the most the
    /// ambient light allows (`MaxNitsRestriction`), whatever the display's brightness.
    public static let flatMapping: [[Double]] = [[0, 1000], [3.402823e38, 1000]]

    /// corebrightnessd's own mapping on the MacBook Pro with PROLED XDR Display (macOS 27.2), put back
    /// when the one LogoLight replaced is lost (see `LogoController.untieBrightnessFromDisplay()`).
    public static let defaultMapping: [[Double]] = [
        [0, 0], [0.1, 12.5], [16.84, 12.5], [34.12, 28.62], [50, 45.37], [69.11, 65.52], [140, 150],
        [300, 300], [600, 1000], [3.402823e38, 1000],
    ]

    /// Whether a mapping gives every display brightness the same logo nits, as `flatMapping` does.
    public static func isFlat(_ mapping: [[Double]]) -> Bool {
        guard let first = mapping.first, first.count == 2 else { return false }
        return mapping.allSatisfy { $0.count == 2 && $0[1] == first[1] }
    }

    /// How corebrightnessd maps the display's nits to the logo's (`LEPWMBrightnessNitsMapping`), or `nil`
    /// if it doesn't say.
    public var brightnessMapping: [[Double]]? {
        guard let pairs = service.value(forKey: Key.brightnessMapping) as? [[NSNumber]], !pairs.isEmpty
        else { return nil }
        return pairs.map { $0.map(\.doubleValue) }
    }

    /// Replaces the mapping of the display's nits to the logo's. corebrightnessd takes it at the next
    /// change of the display's nits, even of one, or when the display's brightness is written again
    /// as it is (`DisplayBrightness.rewrite()`); until then the old one holds (see
    /// docs/corebrightnessd.md, "Brightness mappings").
    @discardableResult
    public func setBrightnessMapping(_ mapping: [[Double]]) -> Bool {
        service.setObject(mapping.map { $0.map { NSNumber(value: $0) } } as NSArray, forKey: Key.brightnessMapping)
    }

    // MARK: - Fades

    /// How much longer than its `duration` a fade may take to reach a target that moved on
    /// (see `fade(following:over:sleep:)`) before it's started again instead.
    static let followSlack = 2.0

    /// How long a new fade takes to start moving. `corebrightnessd` moves the logo in frames,
    /// about every 17.5 ms, and a restarted fade first moved 18–20 ms after it was started
    /// (measured; see docs/corebrightnessd.md, "Easing onto a level").
    static let startLatency = 0.018

    /// The share of the way to a level after which the fade hands over to an ease-out onto it.
    static let landingStart = 0.7

    /// The most fades an ease-out onto a level starts. Each one flips `DisplayLogicalState`, and
    /// every Blank dims the keyboard a little, although it's told Unblank straight after: 4–6 of
    /// them dipped it from 0.197 to about 0.17, which doesn't show, but 70 dipped it to 0.13.
    static let maxLandingSegments = 6

    /// How many of the latest polls give the logo's speed when it hands over to the ease-out:
    /// 70 ms, about 4 of the daemon's frames.
    private static let speedPolls = 8

    /// Fades the logo to `level` (0 dark … 1 fully lit) over about `duration` seconds, and holds
    /// it there until the next change. The logo still adapts to ambient light, scaled by the level.
    ///
    /// A level in between is eased onto at the end, which takes a little longer than `duration`
    /// (see `fade(following:over:sleep:)`).
    public func fade(to level: Double, over duration: Double, sleep: LogoAnimator.Sleep) async throws {
        _ = try await run(following: { level }, over: duration, sleep: sleep)
    }

    /// Like `fade(to:over:sleep:)`, and returns how long it took, on the clock. It's longer than
    /// `duration` when the fade eases onto a level in between.
    ///
    /// With `waitingForRise`, a fade from dark all the way to lit is timed from when the logo starts
    /// to rise. corebrightnessd holds such a rise back until the display shows a frame (its
    /// display-ready gate), which took up to 0.17 s with an idle screen; a quick flash timed from
    /// the write was cut short by that much. The wait counts in the time returned.
    public func timedFade(to level: Double, over duration: Double, sleep: LogoAnimator.Sleep,
                          waitingForRise: Bool = false) async throws -> Double {
        try await run(following: { level }, over: duration, sleep: sleep, waitingForRise: waitingForRise).time
    }

    /// Called as the logo starts to rise from dark. corebrightnessd holds such a rise back until the
    /// display shows a new frame (its display-ready gate), which with nothing changing on screen
    /// took its full 0.5 s timeout. The app redraws something tiny here, so a frame comes at once.
    public var onRiseFromDark: (@MainActor () -> Void)?

    /// The longest corebrightnessd holds back a rise from dark: its display-ready gate gives up
    /// waiting for a frame after 0.5 s (see docs/corebrightnessd.md, "The lid").
    static let gateTimeout = 0.6

    /// Like `fade(to:over:sleep:)`, but reads the target again on every poll, e.g. while a slider
    /// is dragged. While it keeps moving the same way, the fade carries on and follows the latest
    /// target, instead of stopping and starting again from rest each time. It stops short when
    /// the target turns round, reaches 0 or 1, or runs too far ahead for this fade to catch up in
    /// time, so that a new fade can take over. A followed target the fast fade was about to pass
    /// can be missed by a poll's travel, so that counts as stopping short too (when it's more than
    /// 0.02 off): a new fade from rest lands precisely.
    ///
    /// A fade is cut short to stop at a level in between, so it would stop at speed. Instead, once
    /// the target has settled (unchanged for two polls) and the logo has covered 70% of the way to
    /// it, a few short fades ease it on, slowing to a stop (see `land(from:on:speed:following:sleep:)`).
    /// If the target changes meanwhile, it stops short.
    ///
    /// Returns the target the logo was stopped at, or `nil` if it stopped short.
    @discardableResult
    public func fade(following level: () -> Double, over duration: Double,
                     sleep: LogoAnimator.Sleep) async throws -> Double? {
        try await run(following: level, over: duration, sleep: sleep).target
    }

    /// What a fade did: the target it stopped the logo at (`nil` if it stopped short), and how
    /// long it took, on the clock.
    private struct Outcome {
        var target: Double?
        var time: Double
    }

    private func run(following level: () -> Double, over duration: Double,
                     sleep: LogoAnimator.Sleep, waitingForRise: Bool = false) async throws -> Outcome {
        let started = clock()
        let first = min(max(level(), 0), 1)
        var target = first
        // Unknown: assume the far end, so the fade goes all the way.
        let current = fadeLevel ?? (target < 0.5 ? 1 : 0)
        guard abs(target - current) >= 0.005 else {
            stay(at: target, over: duration)
            return Outcome(target: target, time: 0)
        }

        let lit = target > current
        let end: Double = lit ? 1 : 0
        let isAllTheWay = abs(target - end) < 0.001

        // The fade must start now with the new duration, and a fade only starts when it changes
        // direction. So if it's already heading this way (or held after doing so), stop it first.
        // When that isn't known, the turn-round is either ignored or too slow to see.
        if isHeadingLit == nil || isHeadingLit == lit { turnRound(from: lit) }
        // A fade's duration covers the whole way to 0 or 1, so stretch it to reach the
        // target in about `duration`.
        let fadeTime = isAllTheWay ? duration
            : duration / FadeCurve.timeFraction(toReach: abs(target - current) / abs(end - current))
        setFadeDuration(fadeTime)
        setLit(lit)
        if lit, current <= 0 { onRiseFromDark?() }

        // After every sleep, a cancelled fade stops without writing anything more. `Task.sleep`
        // returns normally when it's cancelled after its time is up but before the task resumes,
        // e.g. when the display sleeps then: a hold written after that would relight the keyboard
        // and leave the endless duration.
        if isAllTheWay {
            var fadeTime = duration
            if waitingForRise, lit, current <= 0 {
                let deadline = clock() + Self.gateTimeout
                while (fadeLevel ?? 1) <= 0, clock() < deadline {
                    try await sleep(Self.pollInterval)
                    try Task.checkCancellation()
                }
                // It had been moving for about a frame when that was seen.
                fadeTime = max(0, duration - Self.startLatency)
            }
            try await sleep(fadeTime)
            try Task.checkCancellation()
            return Outcome(target: target, time: clock() - started)
        }
        var waited = 0.0
        // Where the logo was when the target last changed, and how many polls ago that was.
        var origin = current
        var steadyPolls = 0
        // The latest polls, for the logo's speed.
        var recent: [(time: Double, level: Double)] = []
        // Only a followed target is tried again: the next fade's target doesn't change, so the
        // adjust loop always ends.
        func stopped(at target: Double, time: Double) -> Outcome {
            if target != first, let held = fadeLevel, abs(held - target) > 0.02 {
                return Outcome(target: nil, time: time)
            }
            return Outcome(target: target, time: time)
        }
        while let now = fadeLevel, waited < fadeTime {
            let latest = min(max(level(), 0), 1)
            if latest != target {
                let isAhead = lit ? latest > now : latest < now
                let reachedIn = fadeTime * FadeCurve.timeFraction(toReach: abs(latest - current) / abs(end - current))
                guard isAhead, abs(latest - end) >= 0.001, reachedIn - waited <= Self.followSlack * duration
                else {
                    turnRound(from: lit)
                    return Outcome(target: nil, time: waited)
                }
                target = latest
                origin = now
                steadyPolls = 0
            }
            if lit ? now >= target : now <= target { break }
            recent.append((waited, now))
            if recent.count > Self.speedPolls { recent.removeFirst() }
            if steadyPolls >= 2, abs(now - origin) >= Self.landingStart * abs(target - origin) {
                var speed = 0.0
                if let a = recent.first, let b = recent.last, b.time > a.time {
                    speed = (b.level - a.level) / (b.time - a.time)
                }
                let reached = try await land(from: now, on: target, speed: speed, following: level, sleep: sleep)
                let time = clock() - started
                return reached ? stopped(at: target, time: time) : Outcome(target: nil, time: time)
            }
            try await sleep(Self.pollInterval)
            try Task.checkCancellation()
            waited = clock() - started
            steadyPolls += 1
        }
        turnRound(from: lit) // and hold it there
        return stopped(at: target, time: clock() - started)
    }

    /// Eases the logo from `start` onto `target`, out of a fade that's moving at `speed` (per
    /// second), and holds it there. This is the hybrid that was measured on the MacBook (see
    /// docs/corebrightnessd.md, "Easing onto a level"): it stopped at 10–17% of the move's top
    /// speed, where cutting the fade short stopped at 44–89%.
    ///
    /// The logo follows the ease-out `1 - (1 - u)²` over `2 · distance / speed`, which starts at
    /// the fade's speed, kept between 0.15 and 1.2 s. That's split into a fixed few segments, so
    /// the keyboard doesn't visibly dim (see `maxLandingSegments`). Each segment starts a new
    /// fade, from rest, long enough to cover its part of the way by the segment's end, after the
    /// start latency. A fade only starts on a change of direction, so it's turned round first
    /// when it's already heading that way. Segments end on the clock, and a segment's fade is held
    /// once it has covered most of its part: a late poll would otherwise let the daemon move it
    /// another frame at the spring's top speed, and the next segment would overcorrect.
    ///
    /// Stops at the target if the logo gets there early. If the target changes, it holds the logo
    /// where it is and stops short. Returns whether it got there.
    private func land(from start: Double, on target: Double, speed: Double, following level: () -> Double,
                      sleep: LogoAnimator.Sleep) async throws -> Bool {
        let distance = target - start
        let length = abs(speed) > 0.01 ? min(max(2 * abs(distance) / abs(speed), 0.15), 1.2) : 0.3
        let count = length < 0.4 ? 4 : Self.maxLandingSegments
        let segment = max(0.05, length / Double(count))
        let isPast = { (now: Double) in distance > 0 ? now >= target : now <= target }
        // Holding it again would only cost writes.
        func stop() { if !lastDurationWasHold { hold() } }
        let landingStart = clock()
        segments: for i in 1...count {
            guard let now = fadeLevel, !isPast(now) else { break }
            // A segment whose time is up before its fade could start (after a stall) is skipped,
            // so it doesn't write a fade that's replaced at once. The last one always gets its time.
            if i < count, landingStart + segment * Double(i) - clock() < Self.startLatency { continue }
            let u = Double(i) / Double(count)
            let waypoint = start + distance * (1 - (1 - u) * (1 - u))
            let delta = waypoint - now
            let up = delta > 0
            let toEnd = up ? 1 - now : now
            // Where this segment's fade is held, a quarter of its part short of the waypoint.
            var holdAt: Double?
            // Past the waypoint (a late poll or a short frame let the fade on): wait there for the
            // ease-out to catch up, instead of turning back, which would bounce.
            let isAhead = up != (distance > 0)
            if abs(delta) >= 0.0005, toEnd > 1e-4, !isAhead {
                if isHeadingLit == nil || isHeadingLit == up { turnRound(from: up) }
                let share = FadeCurve.springTime(toReach: abs(delta) / toEnd)
                setFadeDuration(max(0.001, segment - Self.startLatency) / share)
                setLit(up)
                holdAt = waypoint - 0.25 * delta
            } else {
                stop() // close enough for now, so the last segment's fade doesn't carry it on
            }
            var segmentEnd = landingStart + segment * Double(i)
            if i == count { segmentEnd = max(segmentEnd, clock() + segment) }
            while true {
                let left = segmentEnd - clock()
                guard left > 1e-6 else { break }
                try await sleep(min(Self.pollInterval, left))
                try Task.checkCancellation()
                if min(max(level(), 0), 1) != target {
                    stop()
                    return false
                }
                guard let now = fadeLevel, !isPast(now) else { break segments }
                if let mark = holdAt, up ? now >= mark : now <= mark {
                    stop()
                    holdAt = nil
                }
            }
        }
        stop()
        return true
    }

    // MARK: - Following the sound

    /// Starts a fade toward lit (`up`) or dark from `current` (the fade level, as the caller has just
    /// read it) that reaches `target` about `time` seconds from now, and runs on past it, toward 1 or 0,
    /// until the next write. For the Sound effect (`SoundFollower`), which retargets often and stops the
    /// logo with `holdNow()`: unlike `fade(to:over:sleep:)` it doesn't poll, ease on or hold, so it costs
    /// one write (two when a fade heading the same way, or one whose heading isn't known, has to be
    /// turned round first).
    public func move(up: Bool, from current: Double, toward target: Double, in time: Double) {
        let end: Double = up ? 1 : 0
        let whole = abs(end - current)
        guard whole > 1e-4 else { return }
        if isHeadingLit == nil || isHeadingLit == up { turnRound(from: up) }
        let share = abs(target - current) / whole
        // A fade's duration covers the whole way to 0 or 1, so stretch it to reach the target in
        // about `time`, after the start latency. All the way, it's just the time.
        let duration = share >= 0.95 ? time : max(0.001, time - Self.startLatency) / FadeCurve.springTime(toReach: share)
        setFadeDuration(duration)
        setLit(up)
        if up, current <= 0 { onRiseFromDark?() }
    }

    /// Stops the logo where it is, with a fade the other way that's too slow to see.
    public func holdNow() {
        hold()
    }

    /// Stops the logo where it is.
    private func hold() {
        if let heading = isHeadingLit {
            turnRound(from: heading)
        } else {
            // Heading unknown: each write is either ignored or starts a fade too slow to see.
            setFadeDuration(Self.holdDuration)
            setLit(false)
            setLit(true)
        }
    }

    /// Keeps the logo at a target it has (about) reached. A fade may still be under way, e.g. from
    /// an effect step that was cancelled, and it would carry the logo on past the target.
    private func stay(at target: Double, over duration: Double) {
        if target <= 0.001 || target >= 0.999 {
            // A fade toward an end stops there by itself, unless it's a hold. A hold heading that
            // way is replaced by a real fade, so the end isn't left with the endless duration.
            let lit = target >= 0.999
            if isHeadingLit != lit || lastDurationWasHold {
                if isHeadingLit == lit { turnRound(from: lit) }
                setFadeDuration(duration)
                setLit(lit)
            }
        } else if isHeadingLit == nil || !lastDurationWasHold {
            hold()
        }
        // Otherwise this has already held it. Holding it again would only flip the state, at
        // every step of a slow drag, and every Blank dims the keyboard a little.
    }

    /// Back to normal: fully lit (when the display is on), with the automatic fade duration.
    /// This also releases a level held by `fade(to:over:sleep:)`.
    public func restore(displayAwake: Bool) {
        if isHeadingLit != false, (fadeLevel ?? 1) < 0.999 {
            // Held after fading toward lit: turn it round (without moving) so relighting is a change.
            turnRound(from: true, keepingKeyboardLit: displayAwake)
        }
        setFadeDuration(0)
        if displayAwake { setLit(true) }
    }
}

/// The shape of the logo's fades, measured on the real hardware (see docs/corebrightnessd.md,
/// "The fade curve"): progress toward 0 or 1 at each 5% of the fade's duration.
public enum FadeCurve {
    static let progress: [Double] = [0, 0.04, 0.13, 0.24, 0.37, 0.48, 0.57, 0.66, 0.74, 0.79, 0.84,
                                     0.88, 0.91, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995, 1, 1]

    /// The critically damped spring fitted to the table: the share of the way a fade has covered
    /// after `s` of its duration.
    public static func springProgress(_ s: Double) -> Double {
        let k = 6.51
        return s <= 0 ? 0 : 1 - (1 + k * s) * exp(-k * s)
    }

    /// The fraction of a fade's duration the spring takes to cover `fraction` of the way. Unlike
    /// `timeFraction(toReach:)` it's smooth for the short distances of an ease-out's segments.
    public static func springTime(toReach fraction: Double) -> Double {
        let goal = min(max(fraction, 0), 0.999)
        var low = 0.0, high = 3.0
        for _ in 0..<50 {
            let middle = (low + high) / 2
            if springProgress(middle) < goal { low = middle } else { high = middle }
        }
        return max(1e-4, (low + high) / 2)
    }

    /// The fraction of a fade's duration it takes to cover `fraction` of the way.
    public static func timeFraction(toReach fraction: Double) -> Double {
        let goal = min(max(fraction, 0), 1)
        let step = 1 / Double(progress.count - 1)
        for i in 1..<progress.count where progress[i] >= goal {
            let span = progress[i] - progress[i - 1]
            let within = span > 0 ? (goal - progress[i - 1]) / span : 1
            return max(0.05, (Double(i - 1) + within) * step)
        }
        return 1
    }
}
