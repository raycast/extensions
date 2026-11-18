import AVFoundation
import Foundation

/// One part of a beep: a tone or a pause.
struct BeepPart {
  var frequency = 0.0
  var milliseconds: Double
  var volume = 0.4
  /// Fade in and out, in milliseconds, so the tone starts and ends without a click.
  var ramp = 5.0
  /// Strength of the odd overtones (3rd, 5th, ...). A piezo beeper has some. A pure tone has none.
  var overtones: [Double] = []
  /// When set, the tone fades out with this time constant, in seconds.
  var decay: Double?

  static func pause(_ milliseconds: Double) -> BeepPart {
    BeepPart(milliseconds: milliseconds, volume: 0)
  }
}

/// The beep sounds a person can choose in the Beep Sound preference.
enum BeepSound {
  static func parts(for id: String) -> [BeepPart]? {
    switch id {
    case "piezo": [BeepPart(frequency: 2_700, milliseconds: 100, overtones: [0.3, 0.12])]
    case "clean": [BeepPart(frequency: 2_800, milliseconds: 100)]
    case "sharp": [BeepPart(frequency: 3_200, milliseconds: 80)]
    case "soft": [BeepPart(frequency: 2_000, milliseconds: 120, volume: 0.35)]
    case "double":
      [
        BeepPart(frequency: 2_800, milliseconds: 45), .pause(40),
        BeepPart(frequency: 2_800, milliseconds: 45),
      ]
    case "rising":
      [BeepPart(frequency: 2_400, milliseconds: 55), BeepPart(frequency: 3_200, milliseconds: 65)]
    case "tick": [BeepPart(frequency: 1_500, milliseconds: 35, volume: 0.5, ramp: 2, decay: 0.012)]
    default: nil
    }
  }
}

/// A short scan beep, like a handheld barcode scanner.
/// The sound is made once at startup. Audio output runs only around each beep, so an idle scanner
/// does not keep the speaker on or stop the Mac from sleeping.
@MainActor
final class Beeper {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private let buffer: AVAudioPCMBuffer?
  private let duration: Double
  private var endsAt = Date.distantPast
  private var pauseTimer: Timer?

  /// Nil when the sound is "off" or unknown.
  init?(sound: String) {
    guard let parts = BeepSound.parts(for: sound) else { return nil }
    duration = parts.reduce(0) { $0 + $1.milliseconds } / 1000
    let outputRate = engine.outputNode.outputFormat(forBus: 0).sampleRate
    let rate = outputRate > 0 ? outputRate : 48_000
    guard let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1) else {
      buffer = nil
      return
    }
    buffer = Beeper.render(parts, format: format)
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: format)
    engine.prepare()
  }

  /// Plays the beep. A new beep cuts off the one before it.
  func play() {
    guard let buffer else { return }
    if !engine.isRunning {
      do { try engine.start() } catch { return }
    }
    player.scheduleBuffer(buffer, at: nil, options: .interrupts)
    if !player.isPlaying { player.play() }
    endsAt = Date().addingTimeInterval(duration)
    // Stop audio output shortly after the beep. A quick next scan reuses the running output.
    pauseTimer?.invalidate()
    pauseTimer = Timer.scheduledTimer(withTimeInterval: duration + 0.5, repeats: false) { [weak self] _ in
      MainActor.assumeIsolated { self?.pause() }
    }
  }

  private func pause() {
    player.stop()
    engine.pause()
  }

  /// Waits until the last beep ends, so the process does not exit in the middle of it.
  func waitUntilDone() {
    let remaining = endsAt.timeIntervalSinceNow
    if remaining > 0 { Thread.sleep(forTimeInterval: min(remaining + 0.02, 0.3)) }
    pauseTimer?.invalidate()
    engine.stop()
  }

  /// Writes each part one after the other into one buffer.
  private static func render(_ parts: [BeepPart], format: AVAudioFormat) -> AVAudioPCMBuffer? {
    let rate = format.sampleRate
    let counts = parts.map { Int(rate * $0.milliseconds / 1000) }
    let total = AVAudioFrameCount(counts.reduce(0, +))
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: total),
      let samples = buffer.floatChannelData?[0]
    else { return nil }
    buffer.frameLength = total
    var start = 0
    for (part, count) in zip(parts, counts) {
      let rampFrames = max(1, Int(rate * part.ramp / 1000))
      let weights = [1.0] + part.overtones
      let weightSum = weights.reduce(0, +)
      for i in 0..<count {
        let edge = min(i, count - 1 - i)
        var gain = edge < rampFrames ? 0.5 - 0.5 * cos(Double.pi * Double(edge) / Double(rampFrames)) : 1
        if let decay = part.decay { gain *= exp(-Double(i) / rate / decay) }
        let t = Double(i) / rate
        var wave = 0.0
        for (k, weight) in weights.enumerated() {
          wave += weight * sin(2 * Double.pi * part.frequency * Double(2 * k + 1) * t)
        }
        samples[start + i] = Float(wave / weightSum * gain * part.volume)
      }
      start += count
    }
    return buffer
  }
}
