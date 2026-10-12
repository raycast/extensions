@preconcurrency import AVFoundation
import CoreGraphics
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

enum AudioExtractor {
    static let sampleRate = 16_000.0

    /// Decodes audio (a file, or a video's soundtrack) to 16 kHz mono and writes `window`-second WAV pieces `hop`
    /// seconds apart, skipping silent ones. One model input ignores anything past 30 s, so windows stay ≤ 30 s.
    /// Streams: memory stays at one window, even for a 3-hour podcast.
    static func windows(of url: URL, window: Double, hop: Double, minimum: Double = 2, to folder: URL) async throws
        -> (pieces: [MediaPiece], duration: Double) {
        let asset = AVURLAsset(url: url)
        guard let track = try await asset.loadTracks(withMediaType: .audio).first else { return ([], 0) }
        let duration = try await asset.load(.duration).seconds
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: sampleRate, AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
        ])
        reader.add(output)
        guard reader.startReading() else { throw reader.error ?? ExtractError.unreadable("can't read audio") }

        let windowSamples = Int(window * sampleRate), hopSamples = Int(hop * sampleRate)
        var buffer: [Int16] = []
        var offset = 0   // sample index of buffer[0] in the file
        var pieces: [MediaPiece] = []
        func emit(_ count: Int) throws {
            let slice = buffer[0..<count]
            guard rms(slice) > 0.003 else { return }   // ≈ −50 dBFS: silence isn't worth a vector
            let out = folder.appendingPathComponent(UUID().uuidString + ".wav")
            try writeWAV(slice, to: out)
            pieces.append(MediaPiece(path: out.path, start: Double(offset) / sampleRate,
                                     end: Double(offset + count) / sampleRate))
        }
        while let sampleBuffer = output.copyNextSampleBuffer() {
            guard let block = CMSampleBufferGetDataBuffer(sampleBuffer) else { continue }
            let length = CMBlockBufferGetDataLength(block)
            var chunk = [Int16](repeating: 0, count: length / 2)
            _ = chunk.withUnsafeMutableBytes { CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length,
                                                                          destination: $0.baseAddress!) }
            buffer.append(contentsOf: chunk)
            while buffer.count >= windowSamples {
                try emit(windowSamples)
                buffer.removeFirst(hopSamples)
                offset += hopSamples
            }
        }
        if reader.status == .failed { throw reader.error ?? ExtractError.unreadable("audio decoding failed") }
        // The tail: new audio beyond the previous window's overlap, or the whole file if it was shorter than a window.
        let alreadyCovered = offset == 0 ? 0 : windowSamples - hopSamples
        if buffer.count - alreadyCovered >= Int(minimum * sampleRate) { try emit(buffer.count) }
        return (pieces, duration.isFinite ? duration : Double(offset + buffer.count) / sampleRate)
    }

    private static func rms(_ samples: ArraySlice<Int16>) -> Double {
        guard !samples.isEmpty else { return 0 }
        var sum = 0.0
        for sample in samples { let value = Double(sample) / 32768; sum += value * value }
        return (sum / Double(samples.count)).squareRoot()
    }

    private static func writeWAV(_ samples: ArraySlice<Int16>, to url: URL) throws {
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

enum VideoExtractor {
    /// Samples a frame every `interval` seconds and keeps one per shot: a frame that looks like the previous kept one
    /// (8×8 average hash within 4 bits) only extends it. Screen recordings and lectures shrink a lot.
    /// Google's Video Moments Finder also matches queries against per-frame vectors.
    static func keyframes(of url: URL, every interval: Double, maxPixel: Int, maxFrames: Int = 1200, to folder: URL)
        async throws -> (frames: [MediaPiece], duration: Double, hasAudio: Bool) {
        let asset = AVURLAsset(url: url)
        let duration = try await asset.load(.duration).seconds
        let hasAudio = !(try await asset.loadTracks(withMediaType: .audio)).isEmpty
        guard duration.isFinite, duration > 0, !(try await asset.loadTracks(withMediaType: .video)).isEmpty
        else { return ([], duration.isFinite ? duration : 0, hasAudio) }

        let step = max(interval, duration / Double(maxFrames))
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: maxPixel, height: maxPixel)
        let tolerance = CMTime(seconds: step / 2, preferredTimescale: 600)
        generator.requestedTimeToleranceBefore = tolerance
        generator.requestedTimeToleranceAfter = tolerance
        let times = stride(from: min(0.5, duration / 2), to: duration, by: step).map {
            CMTime(seconds: $0, preferredTimescale: 600)
        }

        var frames: [MediaPiece] = []
        var lastHash: UInt64?
        for await result in generator.images(for: times) {
            guard case let .success(_, image, actualTime) = result else { continue }
            let hash = averageHash(image)
            if let lastHash, (hash ^ lastHash).nonzeroBitCount <= 4 { continue }
            lastHash = hash
            let out = folder.appendingPathComponent(UUID().uuidString + ".jpg")
            try ImageExtractor.write(image, to: out, png: false)
            frames.append(MediaPiece(path: out.path, start: max(0, actualTime.seconds), end: duration))
        }
        // Each kept frame stands for the stretch until the next kept frame.
        for index in frames.indices.dropLast() { frames[index].end = frames[index + 1].start }
        return (frames, duration, hasAudio)
    }

    static func averageHash(_ image: CGImage) -> UInt64 {
        let side = 8
        var pixels = [UInt8](repeating: 0, count: side * side)
        let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(data: buffer.baseAddress, width: side, height: side, bitsPerComponent: 8,
                                          bytesPerRow: side, space: CGColorSpaceCreateDeviceGray(),
                                          bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
            context.interpolationQuality = .low
            context.draw(image, in: CGRect(x: 0, y: 0, width: side, height: side))
            return true
        }
        guard drawn else { return 0 }
        let mean = pixels.reduce(0) { $0 + Int($1) } / pixels.count
        var hash: UInt64 = 0
        for (index, pixel) in pixels.enumerated() where Int(pixel) > mean { hash |= 1 << UInt64(index) }
        return hash
    }
}

enum MediaInfo {
    /// Duration from the file itself, for when Spotlight hasn't indexed it yet.
    static func duration(of url: URL) -> Double? {
        let seconds = try? runBlocking { try await AVURLAsset(url: url).load(.duration).seconds }
        return seconds.flatMap { $0.isFinite && $0 > 0 ? $0 : nil }
    }
}
