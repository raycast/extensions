import AVFoundation
import Foundation

public enum RecorderError: LocalizedError {
  case message(String)
  public var errorDescription: String? {
    if case .message(let text) = self { return text }
    return nil
  }
}

/// A bounded, host-time-indexed stereo mixer. All access belongs to the capture queue.
/// Each source has a separate ring; rendered slots are cleared, so missing packets become silence.
public final class TimelineMixer {
  public static let rate = 48_000.0
  public let capacity: Int
  private var mic: [Float]
  private var system: [Float]
  public private(set) var cursor: Int64 = 0
  public private(set) var lateFrames: Int64 = 0
  public private(set) var rejectedFrames: Int64 = 0
  public var combined: Bool
  public init(combined: Bool, capacity: Int = 96_000) {
    self.combined = combined
    self.capacity = capacity
    mic = .init(repeating: 0, count: capacity * 2)
    system = .init(repeating: 0, count: capacity * 2)
  }
  public func insert(_ buffer: AVAudioPCMBuffer, at start: Int64, microphone: Bool) {
    guard let channels = buffer.floatChannelData else { return }
    for i in 0..<Int(buffer.frameLength) {
      let frame = start + Int64(i)
      if frame < cursor {
        lateFrames += 1
        continue
      }
      if frame >= cursor + Int64(capacity) {
        rejectedFrames += 1
        continue
      }
      let slot = Int(frame % Int64(capacity)) * 2
      let left = channels[0][i]
      let right = channels[min(1, Int(buffer.format.channelCount) - 1)][i]
      if microphone {
        mic[slot] = left
        mic[slot + 1] = right
      } else {
        system[slot] = left
        system[slot + 1] = right
      }
    }
  }
  public func render(frames: Int) -> AVAudioPCMBuffer {
    precondition(frames > 0 && frames <= capacity)
    let format = AVAudioFormat(standardFormatWithSampleRate: Self.rate, channels: 2)!
    let result = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames))!
    result.frameLength = AVAudioFrameCount(frames)
    // -6 dB per source gives guaranteed headroom for two normalized inputs.
    let gain: Float = combined ? 0.5 : 1
    for i in 0..<frames {
      let slot = Int((cursor + Int64(i)) % Int64(capacity)) * 2
      for channel in 0..<2 {
        let value = (mic[slot + channel] + system[slot + channel]) * gain
        result.floatChannelData![channel][i] = value.isFinite ? max(-1, min(1, value)) : 0
        mic[slot + channel] = 0
        system[slot + channel] = 0
      }
    }
    cursor += Int64(frames)
    return result
  }
}

/// Persistent converter per source; input buffers must be copied before leaving HAL callbacks.
public final class PCMConverter {
  private var converter: AVAudioConverter?
  private var inputFormat: AVAudioFormat?
  public init() {}
  public func convert(_ input: AVAudioPCMBuffer) throws -> AVAudioPCMBuffer {
    let outputFormat = AVAudioFormat(standardFormatWithSampleRate: TimelineMixer.rate, channels: 2)!
    if input.format == outputFormat { return input }
    if inputFormat != input.format {
      inputFormat = input.format
      converter = AVAudioConverter(from: input.format, to: outputFormat)
      converter?.primeMethod = .none
    }
    guard let converter else { throw RecorderError.message("Unsupported audio device format.") }
    let capacity =
      AVAudioFrameCount(
        ceil(Double(input.frameLength) * TimelineMixer.rate / input.format.sampleRate)) + 64
    let output = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: capacity)!
    var sent = false
    var error: NSError?
    let status = converter.convert(to: output, error: &error) { _, state in
      if sent {
        state.pointee = .noDataNow
        return nil
      }
      sent = true
      state.pointee = .haveData
      return input
    }
    if let error { throw error }
    if status == .error { throw RecorderError.message("Audio resampling failed.") }
    return output
  }
}

/// Signal detection uses audio samples, never packet arrival as evidence of sound.
public enum AudioSignal {
  public static func peak(_ buffer: AVAudioPCMBuffer) -> Float {
    guard let channels = buffer.floatChannelData else { return 0 }
    var peak: Float = 0
    for channel in 0..<Int(buffer.format.channelCount) {
      for frame in 0..<Int(buffer.frameLength) {
        let value = abs(channels[channel][frame])
        if value.isFinite { peak = max(peak, value) }
      }
    }
    return peak
  }
}

/// A bounded peak envelope: one value per 100 ms, independent of callback block size.
public final class PeakHistory {
  private var bucketFrames = 0
  private var bucketPeak: Float = 0
  public private(set) var values: [Float] = []
  public init() {}
  public func append(peak: Float, frames: Int) {
    var remaining = frames
    while remaining > 0 {
      let count = min(4800 - bucketFrames, remaining)
      if peak.isFinite { bucketPeak = max(bucketPeak, max(0, peak)) }
      bucketFrames += count
      remaining -= count
      if bucketFrames == 4800 {
        values.append(bucketPeak)
        if values.count > 80 { values.removeFirst(values.count - 80) }
        bucketFrames = 0
        bucketPeak = 0
      }
    }
  }
}
