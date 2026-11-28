import AVFoundation
import Foundation

@main
struct ThrusterSoundTests {
  static func main() throws {
    let samples = ThrusterSound.samples()
    assert(samples.count == Int(FlightTiming.duration * Double(ThrusterSound.sampleRate)))
    assert(samples.allSatisfy { $0.isFinite && abs($0) < 0.5 })
    assert(samples.first == 0 && abs(samples.last!) < 0.0000001)

    func rms(from start: Double, to end: Double) -> Float {
      let range = Int(start * Double(ThrusterSound.sampleRate))..<Int(end * Double(ThrusterSound.sampleRate))
      return sqrt(samples[range].reduce(0) { $0 + $1 * $1 } / Float(range.count))
    }
    assert(rms(from: 0, to: 0.04) == 0)
    assert(rms(from: 0.2, to: 0.35) > 0.01) // Lift
    assert(rms(from: 0.9, to: 1) > 0.01) // Roll
    assert(rms(from: 1.45, to: 1.55) > 0.01) // Counter-thrust
    assert(rms(from: 1.74, to: 1.86) == 0) // Coast before landing
    assert(rms(from: 2.12, to: 2.3) > 0.01) // Landing jets
    assert(rms(from: 2.34, to: 2.42) > 0.01) // Touchdown

    // Decode through the production playback API without playing through the speakers.
    let player = try AVAudioPlayer(data: ThrusterSound.wavData())
    assert(abs(player.duration - FlightTiming.duration) < 1 / Double(ThrusterSound.sampleRate))
    assert(player.numberOfChannels == 1 && player.format.sampleRate == Double(ThrusterSound.sampleRate))
    print("Native audio checks passed: valid PCM, duration, quiet amplitude, smooth endpoints, and synchronized bursts.")
  }
}
