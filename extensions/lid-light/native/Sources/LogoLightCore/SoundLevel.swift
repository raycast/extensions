import Foundation

/// Where the sound the Mac is playing comes from, for the Sound effect: the system's audio (see
/// `SystemAudioLevel`), or a stand-in in tests and `tools/livecheck`.
@MainActor
public protocol SoundLevelSource: AnyObject {
    /// Starts listening. Throws if the sound can't be heard (no permission, no tap API).
    func start() throws
    /// Stops listening. Safe to call when not started.
    func stop()
    /// How loud the sound is right now, from 0 (silence) to 1 (as loud as it has been lately). See
    /// `LoudnessMeter`.
    var loudness: Double { get }
}

/// Why the sound can't be followed.
public enum SoundError: Error, Equatable, LocalizedError {
    /// The system audio tap API needs macOS 14.2.
    case unsupportedSystem
    /// macOS didn't let LogoLight hear the system's audio (the "System Audio Recording Only"
    /// permission), or the tap couldn't be set up. The status is Core Audio's.
    case cannotListen(status: Int32)

    public var errorDescription: String? {
        switch self {
        case .unsupportedSystem:
            "Following the sound needs macOS 14.2 or later."
        case let .cannotListen(status):
            "LogoLight couldn't listen to the sound your Mac plays (Core Audio error \(status)). "
                + "Allow LogoLight under System Audio Recording Only in System Settings › Privacy & Security "
                + "› Screen & System Audio Recording."
        }
    }
}

/// Turns the audio's level into a loudness from 0 to 1, for the logo to follow.
///
/// Each buffer of audio gives its RMS level. A fast-attack, quick-release envelope follows it, so a
/// beat shows at once and the logo falls back between beats, and a slowly falling ceiling tracks the
/// loudest the music has been lately, so quiet music uses the whole range too and the Mac's volume
/// setting doesn't matter. The loudness is the envelope against the ceiling in decibels: 0 dB (as loud
/// as it has been) is 1, and `range` dB below that is 0. Below `silence` dBFS the loudness is 0, so the
/// logo rests when nothing plays.
///
/// Pure arithmetic, used from the audio thread under a lock and tested without audio.
public struct LoudnessMeter: Sendable {
    /// How quickly the envelope falls after a beat, in seconds (its time constant): a beat is gone,
    /// 24 dB down, in about 0.17 s. (0.12 s felt slow: the logo's fall waits for the envelope's.)
    public var release = 0.06
    /// How quickly the ceiling falls after a loud passage, in seconds (its time constant).
    public var ceilingDecay = 4.0
    /// The loudness range shown, in dB: this far below the ceiling is 0.
    public var range = 24.0
    /// Below this level (RMS, in dBFS) the sound counts as silence.
    public var silence = -60.0
    /// The ceiling never falls below this (RMS, in dBFS): the noise of a near-silent track doesn't
    /// fill the range.
    public var floor = -45.0

    public private(set) var envelope = 0.0
    public private(set) var ceiling = 0.0
    public private(set) var loudness = 0.0

    public init() {}

    /// Feeds the RMS level of `seconds` of audio (0…1, linear).
    public mutating func add(rms: Double, seconds: Double) {
        let dt = max(seconds, 0)
        envelope = max(rms, envelope * exp(-dt / release))
        ceiling = max(envelope, ceiling * exp(-dt / ceilingDecay), Self.amplitude(dB: floor))
        guard envelope > Self.amplitude(dB: silence) else {
            loudness = 0
            return
        }
        let dB = 20 * log10(envelope / ceiling)
        loudness = min(max(1 + dB / range, 0), 1)
    }

    /// The RMS of interleaved or mono float samples.
    public static func rms(of samples: UnsafeBufferPointer<Float>) -> Double {
        guard !samples.isEmpty else { return 0 }
        var sum = 0.0
        for sample in samples { sum += Double(sample) * Double(sample) }
        return (sum / Double(samples.count)).squareRoot()
    }

    static func amplitude(dB: Double) -> Double { pow(10, dB / 20) }
}

/// Decides, tick by tick, how the logo moves after the sound, using as few writes as it can.
///
/// The logo's only control is a hardware fade toward dark or lit, and every fade toward dark dims the
/// keyboard backlight a little (see `LightEmitter`), so the follower doesn't retarget the fade on every
/// tick. It starts a rise when the sound is louder than the logo is bright, lets that fade run (it
/// heads for fully lit) until the logo has caught up with the sound, and then either falls, if the sound
/// has dropped meanwhile, or holds. A fall runs the same way, and one toward silence is left to end at
/// dark by itself, so the next rise is a change of state and costs nothing extra. So a beat costs one
/// fade down, and a steady sound settles with one hold and then nothing at all.
public struct SoundFollower: Sendable {
    public enum Action: Equatable, Sendable {
        case none
        /// Stop the logo where it is.
        case hold
        /// Start a fade toward lit (`up`) or dark, reaching `target` in about `time` seconds.
        case move(up: Bool, target: Double, time: Double)
    }

    public enum Motion: Equatable, Sendable {
        case still, rising, falling
    }

    /// How far the sound must be from the logo before it moves. A hold stops the logo at speed, so it
    /// can come to rest a frame's travel off; the deadband stops that being chased.
    public var deadband = 0.05
    /// About how long a rise takes to reach its target, in seconds: two or three of the daemon's frames
    /// after the start latency, so a beat pops. (0.08 s felt slow by eye.)
    public var riseTime = 0.05
    /// About how long a fall takes, in seconds. A little slower than the rise, as the eye sees a fall as
    /// slower. (0.2 s felt slow by eye.)
    public var fallTime = 0.1

    public private(set) var motion: Motion = .still

    public init() {}

    /// The level for a loudness: its share of the way to `peak`, squared so equal steps in loudness look
    /// equal (the eye sees light logarithmically, which is why the brightness slider squares its value
    /// too). Silence is dark.
    public func level(forLoudness loudness: Double, peak: Double) -> Double {
        let l = min(max(loudness, 0), 1)
        return min(max(peak, 0), 1) * l * l
    }

    /// What to do now, with the logo at `now` and the sound asking for `target`.
    public mutating func decide(now: Double, target: Double) -> Action {
        let target = min(max(target, 0), 1)
        let above = target - now
        switch motion {
        case .rising:
            // Let it run until it has caught up with the sound, or the sound has dropped below it.
            if above >= deadband { return .none }
            if above <= -deadband { return fall(to: target) }
            // A fade to full ends there by itself; holding it would only leave the endless duration.
            if target >= 0.995 {
                if now >= 0.995 { motion = .still }
                return .none
            }
            motion = .still
            return .hold
        case .falling:
            if above <= -deadband { return .none }
            if above >= deadband { return rise(to: target) }
            // A fade to dark ends there by itself, and the next rise is then a change of state.
            if target <= 0.005 {
                if now <= 0.005 { motion = .still }
                return .none
            }
            motion = .still
            return .hold
        case .still:
            if above >= deadband { return rise(to: target) }
            if above <= -deadband { return fall(to: target) }
            return .none
        }
    }

    private mutating func rise(to target: Double) -> Action {
        motion = .rising
        return .move(up: true, target: target, time: riseTime)
    }

    private mutating func fall(to target: Double) -> Action {
        motion = .falling
        return .move(up: false, target: target, time: fallTime)
    }
}
