import Foundation

private final class ResultBox<T>: @unchecked Sendable {
    var result: Result<T, Error>?
}

/// Runs async AVFoundation work from the synchronous indexer (one thread on purpose: simple and easy to reason about).
func runBlocking<T: Sendable>(_ operation: @escaping @Sendable () async throws -> T) throws -> T {
    let box = ResultBox<T>()
    let done = DispatchSemaphore(value: 0)
    Task.detached {
        do { box.result = .success(try await operation()) } catch { box.result = .failure(error) }
        done.signal()
    }
    done.wait()
    return try box.result!.get()
}

/// A stretch of audio written to a temporary WAV for the model, or a video frame written to a JPEG.
struct MediaPiece: Sendable {
    let path: String
    let start: Double
    var end: Double
}

/// Audio for the model: 30 s windows of 16 kHz mono (`windows`: AVFoundation on macOS, ffmpeg elsewhere), written as WAV.
enum AudioExtractor {
    static let sampleRate = 16_000.0

    static func rms(_ samples: ArraySlice<Int16>) -> Double {
        guard !samples.isEmpty else { return 0 }
        var sum = 0.0
        for sample in samples { let value = Double(sample) / 32768; sum += value * value }
        return (sum / Double(samples.count)).squareRoot()
    }

    static func writeWAV(_ samples: ArraySlice<Int16>, to url: URL) throws {
        var data = Data(capacity: 44 + samples.count * 2)
        func append(_ text: String) { data.append(contentsOf: Array(text.utf8)) }
        func append32(_ value: UInt32) { withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) } }
        func append16(_ value: UInt16) { withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) } }
        let rate = UInt32(sampleRate)
        append("RIFF"); append32(UInt32(36 + samples.count * 2)); append("WAVE")
        append("fmt "); append32(16); append16(1); append16(1); append32(rate); append32(rate * 2); append16(2); append16(16)
        append("data"); append32(UInt32(samples.count * 2))
        samples.withUnsafeBytes { data.append(contentsOf: $0) }   // Int16 is little-endian on Apple silicon
        try data.write(to: url)
    }
}

/// Video for the model: a keyframe per shot (`keyframes`: AVFoundation on macOS, ffmpeg elsewhere); the soundtrack goes
/// through `AudioExtractor`.
enum VideoExtractor {}

/// Durations from the files themselves (`duration`), for when the file system's metadata hasn't got them.
enum MediaInfo {}
