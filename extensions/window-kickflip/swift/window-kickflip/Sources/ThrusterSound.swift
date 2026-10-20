import Foundation

enum ThrusterSound {
  static let sampleRate = 44_100

  // Original synthesized audio: filtered air noise and a soft, low landing impact.
  // The same thrust envelopes drive the visible jets, so timing cannot drift.
  static func samples() -> [Float] {
    let count = Int(FlightTiming.duration * Double(sampleRate))
    var random: UInt32 = 0x4B49434B
    var lowPass: Float = 0
    return (0..<count).map { index in
      let time = Double(index) / Double(sampleRate)
      random = 1_664_525 &* random &+ 1_013_904_223
      let noise = Float(Double(random) / Double(UInt32.max) * 2 - 1)
      lowPass += 0.16 * (noise - lowPass)
      let thrust = FlightTiming.thrust(at: time)
      let pressure = thrust.lift + 0.55 * (thrust.spin + thrust.counter)
      let hiss = (0.32 * lowPass + 0.055 * (noise - lowPass)) * pressure
      let impactTime = time - FlightTiming.touchdown
      let impact: Double
      if impactTime >= 0 {
        let attack = FlightTiming.smooth(impactTime / 0.008)
        impact = 0.22 * attack * exp(-25 * impactTime) * sin(2 * .pi * 68 * impactTime)
      } else {
        impact = 0
      }
      let tail = Float(1 - FlightTiming.smooth((time - FlightTiming.duration + 0.06) / 0.06))
      return (hiss + Float(impact)) * tail
    }
  }

  static func wavData() -> Data {
    let samples = samples()
    let byteCount = UInt32(samples.count * MemoryLayout<Int16>.size)
    var data = Data("RIFF".utf8)
    append(UInt32(36) + byteCount, to: &data)
    data.append(contentsOf: "WAVEfmt ".utf8)
    append(UInt32(16), to: &data)
    append(UInt16(1), to: &data) // PCM
    append(UInt16(1), to: &data) // Mono
    append(UInt32(sampleRate), to: &data)
    append(UInt32(sampleRate * 2), to: &data)
    append(UInt16(2), to: &data)
    append(UInt16(16), to: &data)
    data.append(contentsOf: "data".utf8)
    append(byteCount, to: &data)
    for sample in samples {
      append(Int16((max(-1, min(1, sample)) * Float(Int16.max)).rounded()), to: &data)
    }
    return data
  }

  private static func append<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
    var littleEndian = value.littleEndian
    withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
  }
}
