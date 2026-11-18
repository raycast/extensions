import AVFoundation
import AudioToolbox
import Foundation

public enum AudioFiles {
  public static var captureSettings: [String: Any] {
    var settings = pcmFormat.settings
    settings[AVLinearPCMIsNonInterleaved] = false
    return settings
  }
  public static let pcmFormat = AVAudioFormat(standardFormatWithSampleRate: 48_000, channels: 2)!
  /// Streaming export, bounded memory. WAV is split before the RIFF 4 GiB limit.
  public static func export(
    source: URL, destination: URL, format: String, wavFrameLimit: Int64 = 1_000_000_000
  ) throws -> [URL] {
    guard ["m4a", "wav"].contains(format), wavFrameLimit > 0 else {
      throw RecorderError.message("Invalid export format or segment size.")
    }
    let input = try AVAudioFile(forReading: source)
    guard input.length > 0 else {
      throw RecorderError.message("No audio frames were captured. The recovery file was kept.")
    }
    let buffer = AVAudioPCMBuffer(pcmFormat: input.processingFormat, frameCapacity: 8192)!
    let settings: [String: Any] =
      format == "wav"
      ? [
        AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 48_000, AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false,
      ]
      : [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48_000, AVNumberOfChannelsKey: 2,
        AVEncoderBitRateKey: 256_000,
      ]
    var urls: [URL] = []
    var output: AVAudioFile?
    var segmentFrames: Int64 = 0
    let limit: Int64 = format == "wav" ? wavFrameLimit : Int64.max
    var temporary: URL?
    func closeSegment() throws {
      output?.close()
      output = nil
      if let temporary, let target = urls.last {
        try FileManager.default.moveItem(at: temporary, to: target)
      }
    }
    do {
      while input.framePosition < input.length {
        if output == nil || segmentFrames >= limit {
          try closeSegment()
          let target =
            urls.isEmpty
            ? destination
            : destination.deletingPathExtension().appendingPathExtension(
              "part\(urls.count + 1).\(format)")
          guard !FileManager.default.fileExists(atPath: target.path) else {
            throw RecorderError.message("Output already exists: \(target.lastPathComponent)")
          }
          // Preserve extension so AudioFile can infer the container type.
          // A crashed attempt may leave its partial file. Use a fresh private
          // path and preserve that file instead of failing the first recovery.
          temporary = target.deletingPathExtension().appendingPathExtension(
            "\(UUID().uuidString).encoding.\(format)")
          output = try AVAudioFile(
            forWriting: temporary!, settings: settings, commonFormat: .pcmFormatFloat32,
            interleaved: false)
          urls.append(target)
          segmentFrames = 0
        }
        let count = AVAudioFrameCount(
          min(8192, min(input.length - input.framePosition, limit - segmentFrames)))
        try input.read(into: buffer, frameCount: count)
        try output!.write(from: buffer)
        segmentFrames += Int64(buffer.frameLength)
      }
      try closeSegment()
      var exportedFrames: Int64 = 0
      for url in urls {
        let file = try AVAudioFile(forReading: url)
        exportedFrames += file.length
        guard file.processingFormat.sampleRate == 48_000, file.processingFormat.channelCount == 2,
          file.length > 0
        else {
          throw RecorderError.message("Export validation failed; original capture retained.")
        }
      }
      guard abs(exportedFrames - input.length) <= (format == "wav" ? 0 : 2048) else {
        throw RecorderError.message("Export duration validation failed; original capture retained.")
      }
      return urls
    } catch {
      output?.close()
      output = nil
      if let temporary { try? FileManager.default.removeItem(at: temporary) }
      throw error
    }
  }
}
