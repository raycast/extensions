import Foundation

/// An animation for the logo, built from the LED's own hardware fades.
public enum LogoEffect: String, CaseIterable, Sendable {
    case none
    case breathe
    case pulse
    case heartbeat
    /// The logo follows the sound the Mac is playing (see `SoundFollower`). Not a cycle of steps: the
    /// animator drives it from a `SoundLevelSource`.
    case sound

    public var title: String {
        switch self {
        case .none: "None"
        case .breathe: "Breathe"
        case .pulse: "Pulse"
        case .heartbeat: "Heartbeat"
        case .sound: "Sound"
        }
    }

    /// One cycle of the effect, repeated while it plays.
    ///
    /// To the eye, a rise from dark looks about twice as fast as a fall from lit over the same
    /// time, so rises are longer than falls, with short holds at the top. These are starting
    /// values, still to be tuned by eye on the MacBook.
    public var cycle: [FadeStep] {
        switch self {
        case .none, .sound:
            []
        case .breathe:
            // Slow and soft, like the old MacBook sleep light.
            [FadeStep(lit: false, fade: 2.0, hold: 0.5), FadeStep(lit: true, fade: 3.5, hold: 0.3)]
        case .pulse:
            [FadeStep(lit: false, fade: 0.7, hold: 0.1), FadeStep(lit: true, fade: 1.2, hold: 0.15)]
        case .heartbeat:
            // Two quick beats from dark, then a rest (about 1.55 s a cycle).
            [FadeStep(lit: true, fade: 0.12, hold: 0.05), FadeStep(lit: false, fade: 0.18, hold: 0.08),
             FadeStep(lit: true, fade: 0.12, hold: 0.05), FadeStep(lit: false, fade: 0.5, hold: 0.45)]
        }
    }

    /// The cycle, turned to start with its first step toward lit (`true`) or toward dark.
    public func cycle(startingLit lit: Bool) -> [FadeStep] {
        let steps = cycle
        let start = steps.firstIndex { $0.lit == lit } ?? 0
        return Array(steps[start...] + steps[..<start])
    }
}

/// Fade to dark or lit over `fade` seconds, then wait `hold` seconds.
public struct FadeStep: Equatable, Sendable {
    public var lit: Bool
    public var fade: Double
    public var hold: Double

    public init(lit: Bool, fade: Double, hold: Double) {
        self.lit = lit
        self.fade = fade
        self.hold = hold
    }
}

/// Animates the logo: plays the chosen effect, or holds it at the chosen brightness.
@MainActor
public final class LogoAnimator {
    public typealias Sleep = @Sendable (Double) async throws -> Void

    private let emitter: LightEmitter
    private let isDisplayAwake: @MainActor () -> Bool
    private let sleep: Sleep
    /// The sound the Mac is playing, for the Sound effect. `nil` where it can't be heard (before
    /// macOS 14.2), and the effect isn't offered.
    private let soundSource: SoundLevelSource?
    private var task: Task<Void, Never>?
    private var isAdjusting = false {
        didSet { updateActivity() }
    }
    /// Held while animating (see `updateActivity()`).
    private var activity: NSObjectProtocol?

    /// The chosen effect. It keeps its value while paused (e.g. the logo is off or the display sleeps).
    public private(set) var effect: LogoEffect = .none
    /// An effect that plays in place of the chosen one while it's set: Breathe while the battery charges
    /// (`LogoController.breathesWhileCharging`). The chosen effect keeps its value, and comes back when
    /// this is cleared. Setting it starts nothing: the next `resume()` plays it.
    public var standInEffect: LogoEffect?
    /// The effect `resume()` plays: the stand-in while there is one, otherwise the chosen effect.
    public var activeEffect: LogoEffect { standInEffect ?? effect }
    /// The Morse message being sent, if any. While it's set it takes the place of the effect, which
    /// keeps its value and comes back when the message is done or stopped.
    public private(set) var morse: MorseMessage?
    /// Called when `morse` ends by itself: a message sent once has finished, or was interrupted (the
    /// logo turned off, the display slept). Not called for `stopMorse()`.
    public var onMorseEnded: (@MainActor () -> Void)?
    /// Whether an effect (or a Morse message) is playing.
    public private(set) var isPlaying = false {
        didSet { updateActivity() }
    }
    /// Whether an effect is playing or the logo is fading to the chosen brightness.
    public var isAnimating: Bool { isPlaying || isAdjusting }

    /// Whether the Sound effect can be offered: there's a source for the sound.
    public var canFollowSound: Bool { soundSource != nil }
    /// Called when the Sound effect can't start (no permission to hear the sound, see `SoundError`). The
    /// effect is then `.none` again, and the logo fades to the chosen brightness.
    public var onSoundFailed: (@MainActor (Error) -> Void)?
    /// How often the Sound effect looks at the sound and the logo: a little less often than the daemon
    /// moves the logo (every 17.5 ms), so each write has taken effect by the next look.
    static let soundTick = 0.03

    /// How bright the logo glows (with no effect) or peaks (with one), from 0 (dimmest) to 1.
    public var brightness: Double = 1 {
        didSet { brightness = min(max(brightness, 0), 1) }
    }

    /// How long a change of brightness takes to fade, e.g. while the slider moves.
    public var brightnessFadeDuration = 0.25
    /// How long the logo takes to settle at the chosen brightness after an effect stops, a wake or
    /// a launch. Slower than the slider, so coming back from dark doesn't snap on.
    public var transitionDuration = 0.8

    public init(emitter: LightEmitter, isDisplayAwake: @escaping @MainActor () -> Bool, sleep: @escaping Sleep,
                soundSource: SoundLevelSource? = nil) {
        self.emitter = emitter
        self.isDisplayAwake = isDisplayAwake
        self.sleep = sleep
        self.soundSource = soundSource
    }

    /// The logo's fade level for a brightness: never quite dark, and perceptually even
    /// (the eye is more sensitive to changes when the logo is dim).
    public static func level(forBrightness brightness: Double) -> Double {
        let b = min(max(brightness, 0), 1)
        return b >= 1 ? 1 : 0.02 + 0.98 * b * b
    }

    /// The fade level for the current brightness.
    public var level: Double { Self.level(forBrightness: brightness) }

    /// Chooses an effect without starting it.
    public func select(_ effect: LogoEffect) {
        self.effect = effect
    }

    /// Starts (or restarts) the active effect (the chosen one, or its stand-in), or with no effect, fades
    /// to the chosen brightness. An effect starts with the step that leads away from where the logo is:
    /// a rise when it's dark (e.g. just turned on), a fall when it's lit (e.g. relit by a wake).
    public func resume() {
        let effect = activeEffect
        // The sound source is kept listening when the Sound effect carries on, e.g. after a wake.
        cancel(keepingSound: morse == nil && effect == .sound)
        if let morse {
            playMorse(morse)
        } else if effect == .none {
            adjustBrightness(over: transitionDuration)
        } else if effect == .sound {
            playSound()
        } else {
            let isDark = (emitter.fadeLevel ?? 1) < level / 2
            play(effect.cycle(startingLit: isDark))
        }
    }

    /// Sends `message` in Morse, replacing the effect until it's done (once) or stopped (a loop). Call
    /// only while the logo is lit and the display is awake, as for `resume()`. Returns false, changing
    /// nothing, if the message has no character Morse can send.
    @discardableResult
    public func startMorse(_ message: MorseMessage) -> Bool {
        guard MorseCode.canSend(message.text) else { return false }
        morse = message
        resume()
        return true
    }

    /// Forgets the Morse message, without starting anything else: the caller resumes, or not.
    public func stopMorse() {
        morse = nil
    }

    /// Switches the loop of the Morse message being sent, without restarting it: on, it carries on
    /// after this pass; off, it ends after it.
    public func setMorseLoops(_ loops: Bool) {
        morse?.loops = loops
    }

    private func playMorse(_ message: MorseMessage) {
        // From dark, with a word gap first, so the first dot can't be mistaken for the logo going out.
        let isDark = (emitter.fadeLevel ?? 1) < 0.05
        let leadIn = isDark ? [] : [FadeStep(lit: false, fade: 0.3, hold: 7 * MorseCode.unit)]
        // At full brightness: both ends are plain hardware fades, with no easing to stretch the timing.
        play(MorseCode.steps(for: message.text), leadIn: leadIn, peak: 1)
    }

    /// Applies a new brightness. A playing effect picks it up at its next step.
    public func brightnessDidChange() {
        guard !isPlaying else { return }
        // A fade already under way follows the newest value, so dragging a slider doesn't
        // restart the fade at every step.
        if !isAdjusting { adjustBrightness(over: brightnessFadeDuration) }
    }

    /// Stops animating, leaving the logo as it is, e.g. because it's being turned off or the
    /// display went to sleep.
    public func pause() {
        cancel()
        endMorseUnlessLooping()
    }

    /// Stops animating and hands the logo back to the system, fully lit, e.g. before quitting.
    /// The chosen effect and brightness are kept.
    public func reset() {
        cancel()
        endMorseUnlessLooping()
        emitter.restore(displayAwake: isDisplayAwake())
    }

    /// A message sent once has ended without being stopped: let the owner know.
    private func endMorseUnlessLooping() {
        guard let morse, !morse.loops else { return }
        self.morse = nil
        onMorseEnded?()
    }

    /// Plays `leadIn` once, then `cycle` over and over: an effect until it's stopped, a Morse message
    /// (which has a `peak`) while its loop is on, which can be switched while it plays. Lit steps go to
    /// `peak`, or the chosen brightness without one. A message that ends (its loop off at the end of
    /// a pass) is cleared, and what was there before resumes (the effect or the brightness).
    private func play(_ cycle: [FadeStep], leadIn: [FadeStep] = [], peak: Double? = nil) {
        isPlaying = true
        let cycleHold = cycle.reduce(0) { $0 + $1.hold }
        task = Task { [weak self] in
            // Easing onto a peak below full takes longer than the step's fade. The time it ran over
            // is taken from the holds that follow, as far as they go, so the cycle keeps its length:
            // Heartbeat's short holds can't absorb its beats' easing, but its rest can.
            var owed = 0.0
            var steps = leadIn + cycle
            playing: while true {
                for step in steps {
                    guard let self, !Task.isCancelled else { return }
                    // The display can go away without a sleep notification, e.g. when the lid is
                    // closed with an external display attached. Stop until the next wake.
                    guard self.isDisplayAwake() else { break playing }
                    do {
                        // Morse code (which has a `peak`) keeps every flash and gap its length, timed
                        // from when the logo moves: a rise corebrightnessd holds back delays the rest
                        // of the message, rather than cutting a dot short or squeezing the next gap.
                        let exact = peak != nil
                        let took = try await self.emitter.timedFade(to: step.lit ? peak ?? self.level : 0,
                                                                    over: step.fade, sleep: self.sleep,
                                                                    waitingForRise: exact)
                        if exact {
                            try await self.sleep(step.hold)
                            continue
                        }
                        owed = min(owed + max(0, took - step.fade), cycleHold)
                        let hold = max(0, step.hold - owed)
                        owed -= step.hold - hold
                        try await self.sleep(hold)
                    } catch {
                        break playing
                    }
                }
                guard peak == nil || self?.morse?.loops == true else {
                    // Done. (Cancelled at the last moment: whoever cancelled has taken over.)
                    guard let self, !Task.isCancelled else { return }
                    if self.morse?.loops == false {
                        self.morse = nil
                        self.onMorseEnded?()
                    }
                    self.resume() // replaces this task, which then ends as a cancelled one
                    return
                }
                steps = cycle
            }
            if let self, !Task.isCancelled { self.endMorseUnlessLooping() }
            self?.taskDidEnd()
        }
    }

    /// Follows the sound (see `SoundFollower`) until stopped. If the sound can't be heard, the effect is
    /// dropped and the owner told (`onSoundFailed`).
    private func playSound() {
        guard let soundSource else { return soundFailed(SoundError.unsupportedSystem) }
        do {
            try soundSource.start()
        } catch {
            return soundFailed(error)
        }
        isPlaying = true
        task = Task { [weak self] in
            var follower = SoundFollower()
            while let self, !Task.isCancelled, self.isDisplayAwake() {
                let target = follower.level(forLoudness: soundSource.loudness, peak: self.level)
                if let now = self.emitter.fadeLevel {
                    switch follower.decide(now: now, target: target) {
                    case .none: break
                    case .hold: self.emitter.holdNow()
                    case let .move(up, target, time): self.emitter.move(up: up, from: now, toward: target, in: time)
                    }
                }
                do { try await self.sleep(Self.soundTick) } catch { break }
            }
            // The display went away (or the sleep failed): stop listening, as a pause does.
            guard let self, !Task.isCancelled else { return }
            soundSource.stop()
            self.taskDidEnd()
        }
    }

    private func soundFailed(_ error: Error) {
        effect = .none
        onSoundFailed?(error)
        adjustBrightness(over: transitionDuration)
    }

    /// Fades to the chosen brightness over `duration`. A fade follows changes made meanwhile
    /// (a slider being dragged), and anything it couldn't follow gets a new fade, at the
    /// slider's speed.
    private func adjustBrightness(over duration: Double) {
        isAdjusting = true
        task = Task { [weak self] in
            var applied: Double?
            var duration = duration
            while let self, !Task.isCancelled, applied != self.level {
                do {
                    applied = try await self.emitter.fade(following: { self.level }, over: duration, sleep: self.sleep)
                } catch {
                    break
                }
                duration = self.brightnessFadeDuration
            }
            self?.taskDidEnd()
        }
    }

    /// Holds off App Nap while animating: its timer coalescing would make fades stop late and
    /// effects lose their rhythm. The Mac can still sleep.
    private func updateActivity() {
        if isAnimating, activity == nil {
            activity = ProcessInfo.processInfo.beginActivity(
                options: .userInitiatedAllowingIdleSystemSleep, reason: "Animating the Apple logo")
        } else if !isAnimating, let activity {
            ProcessInfo.processInfo.endActivity(activity)
            self.activity = nil
        }
    }

    /// Clears up after a task that stopped by itself. A running task is only ever replaced or
    /// stopped through `cancel()`, which has already done this, so a cancelled one leaves it.
    private func taskDidEnd() {
        guard !Task.isCancelled else { return }
        task = nil
        isPlaying = false
        isAdjusting = false
    }

    /// Stops whatever is animating, and stops listening to the sound unless the Sound effect is about to
    /// carry on (`keepingSound`).
    private func cancel(keepingSound: Bool = false) {
        task?.cancel()
        task = nil
        isPlaying = false
        isAdjusting = false
        if !keepingSound { soundSource?.stop() }
    }
}
