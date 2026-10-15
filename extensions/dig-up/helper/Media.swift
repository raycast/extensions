// Audio and video: AVFoundation decodes, CoreGraphics hashes frames; ffmpeg takes over for what AVFoundation can't open
// (webm, mkv, ogg, opus, wma, flv, ...). DigUp: Media+Apple.swift, MediaExtractors.swift, Media+Portable.swift.
import AVFoundation
import CoreGraphics
import CoreMedia
import Foundation
import ImageIO

private final class ResultBox<T>: @unchecked Sendable {
    var result: Result<T, Error>?
}

/// Runs async AVFoundation work from the worker thread, which waits (DigUp: runBlocking).
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

/// A stretch of audio written to a WAV for the model, or a video frame written to a PNG.
struct MediaPiece {
    let path: String
    let start: Double
    var end: Double

    var json: JSON { ["path": .string(path), "start": .double(start), "end": .double(end)] }
}

/// AVFoundation can't open this file (or can't decode it): ffmpeg may.
struct MediaUnavailable: Error, CustomStringConvertible {
    let reason: String
    var description: String { reason }
}

// MARK: ffmpeg

/// The helper's running child processes (ffmpeg, ffprobe), so the memory watchdog can end them before it ends the helper.
/// A client that kills the helper ends them itself (Foundation gives each child its own process group).
enum Children {
    private static let lock = NSLock()
    private static var running: [Int32: Process] = [:]

    static func add(_ process: Process) {
        lock.lock(); defer { lock.unlock() }
        running[process.processIdentifier] = process
    }

    static func remove(_ process: Process) {
        lock.lock(); defer { lock.unlock() }
        running[process.processIdentifier] = nil
    }

    static func killAll() {
        lock.lock(); defer { lock.unlock() }
        for pid in running.keys { kill(pid, SIGKILL) }
    }
}

/// A tool that exited with a failure, and the last thing it said on stderr ("Permission denied").
struct ToolFailure: Error, CustomStringConvertible {
    let tool: String
    let status: Int32
    let said: String
    var description: String { "\(tool) failed (\(status))" + (said.isEmpty ? "" : ": \(said)") }
}

enum FFmpeg {
    /// Looked up again until found: the helper lives long, and ffmpeg may be installed after a file needed it.
    static var ffmpeg: String? { tool("ffmpeg") }
    static var ffprobe: String? { tool("ffprobe") }

    private static let lock = NSLock()
    private static var found: [String: String] = [:]

    static func tool(_ name: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        if let path = found[name] { return path }
        let path = find(name)
        found[name] = path
        return path
    }

    /// On PATH, then where Homebrew puts it (the daemon may not have a login shell's PATH).
    private static func find(_ name: String) -> String? {
        let path = ProcessInfo.processInfo.environment["PATH"] ?? ""
        let folders = path.split(separator: ":").map(String.init) + ["/opt/homebrew/bin", "/usr/local/bin"]
        return folders.map { $0 + "/" + name }.first { FileManager.default.isExecutableFile(atPath: $0) }
    }

    /// Runs a tool and hands its standard output to `read` as it comes (a long decode never sits in memory whole).
    /// Throws `ToolFailure` when it exits with a failure.
    static func run(_ tool: String?, _ arguments: [String], read: (Data) throws -> Void) throws {
        guard let tool else { throw MediaUnavailable(reason: "this Mac can't open it and ffmpeg isn't installed") }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: tool)
        process.arguments = arguments
        let output = Pipe()
        process.standardOutput = output
        process.standardInput = FileHandle.nullDevice
        // A file, not a pipe: a decoder that reports every broken block can't fill a pipe and stall.
        let errors = FileManager.default.temporaryDirectory.appendingPathComponent("digup-\(UUID().uuidString).err")
        FileManager.default.createFile(atPath: errors.path, contents: nil)
        defer { try? FileManager.default.removeItem(at: errors) }
        let errorFile = try FileHandle(forWritingTo: errors)
        defer { try? errorFile.close() }
        process.standardError = errorFile
        try process.run()
        Children.add(process)
        defer { Children.remove(process) }
        let reader = output.fileHandleForReading
        do {
            while true {
                let data = reader.readData(ofLength: 1 << 16)
                if data.isEmpty { break }
                try read(data)
            }
        } catch {
            process.terminate()
            process.waitUntilExit()
            throw error
        }
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            throw ToolFailure(tool: (tool as NSString).lastPathComponent, status: process.terminationStatus,
                              said: lastLine(of: errors, without: input(of: arguments)))
        }
    }

    /// The file a command reads: after `-i` for ffmpeg, last for ffprobe.
    private static func input(of arguments: [String]) -> String {
        if let flag = arguments.firstIndex(of: "-i"), flag + 1 < arguments.count { return arguments[flag + 1] }
        return arguments.last ?? ""
    }

    /// The tool's last stderr line, without the "<path>: " it puts in front.
    private static func lastLine(of url: URL, without path: String) -> String {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return "" }
        defer { try? handle.close() }
        let size = (try? handle.seekToEnd()) ?? 0
        try? handle.seek(toOffset: size > 2048 ? size - 2048 : 0)
        let text = String(decoding: handle.readDataToEndOfFile(), as: UTF8.self)
        let line = text.split(whereSeparator: \.isNewline).last.map(String.init) ?? ""
        return line.hasPrefix(path + ": ") ? String(line.dropFirst(path.count + 2)) : line
    }

    static func output(_ tool: String?, _ arguments: [String]) throws -> String {
        var data = Data()
        try run(tool, arguments) { data.append($0) }
        return String(decoding: data, as: UTF8.self)
    }

    /// Nil when ffprobe reads the file but finds no duration; throws when it can't read the file.
    static func duration(of url: URL) throws -> Double? {
        let text = try output(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of",
                                        "default=noprint_wrappers=1:nokey=1", url.path])
        guard let seconds = Double(text.trimmingCharacters(in: .whitespacesAndNewlines)) else { return nil }
        return seconds.isFinite && seconds > 0 ? seconds : nil
    }

    /// Which kinds of streams the file has. Throws when ffprobe can't read the file (DigUp marks such a file failed:
    /// AVFoundation's track list throws there).
    static func streams(of url: URL) throws -> (audio: Bool, video: Bool) {
        let text: String
        do {
            text = try output(ffprobe, ["-v", "error", "-show_entries", "stream=codec_type", "-of",
                                        "default=noprint_wrappers=1:nokey=1", url.path])
        } catch let failure as ToolFailure {
            throw ExtractError.unreadable("neither this Mac nor ffmpeg can read it"
                                          + (failure.said.isEmpty ? "" : " (\(failure.said))"))
        }
        return (text.contains("audio"), text.contains("video"))
    }

    /// MPEG-TS packets start with 0x47 every 188 bytes (or every 192 with a 4-byte timecode). DigUp: Rules.swift.
    static func isMPEGTransportStream(_ url: URL) -> Bool {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        guard let data = try? handle.read(upToCount: 600), data.count >= 400 else { return false }
        let bytes = [UInt8](data)
        return (bytes[0] == 0x47 && bytes[188] == 0x47 && bytes[376] == 0x47)
            || (bytes[4] == 0x47 && bytes[196] == 0x47 && bytes[388] == 0x47)
    }
}

// MARK: Audio

enum Audio {
    static let sampleRate = 16_000.0

    static func rms(_ samples: ArraySlice<Int16>) -> Double {
        guard !samples.isEmpty else { return 0 }
        var sum = 0.0
        for sample in samples { let value = Double(sample) / 32768; sum += value * value }
        return (sum / Double(samples.count)).squareRoot()
    }

    /// A 44-byte header and PCM16 mono at 16 kHz (DigUp: MediaExtractors.swift).
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

    /// 16 kHz mono samples of the file's first audio track, handed to `sink` as they decode. `hasAudio` is false for
    /// a file without sound. Throws `MediaUnavailable` (before any sample) when AVFoundation can't open the file and
    /// ffmpeg is the way to go.
    static func stream(_ url: URL, _ sink: ([Int16]) throws -> Void) async throws -> (hasAudio: Bool, duration: Double?) {
        do {
            return try await avStream(url, sink)
        } catch let unavailable as MediaUnavailable {
            log("audio: ffmpeg reads \(url.lastPathComponent) (AVFoundation: \(unavailable.reason))")
            return try ffmpegStream(url, sink)
        }
    }

    private static func avStream(_ url: URL, _ sink: ([Int16]) throws -> Void) async throws
        -> (hasAudio: Bool, duration: Double?) {
        let asset = AVURLAsset(url: url)
        guard (try? await asset.load(.isReadable)) == true else { throw MediaUnavailable(reason: "not readable") }
        guard let tracks = try? await asset.loadTracks(withMediaType: .audio) else {
            throw MediaUnavailable(reason: "no track list")
        }
        guard let track = tracks.first else { return (false, nil) }
        let seconds = try await asset.load(.duration).seconds
        let reader: AVAssetReader
        do { reader = try AVAssetReader(asset: asset) } catch { throw MediaUnavailable(reason: describe(error)) }
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: sampleRate, AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
        ])
        reader.add(output)
        guard reader.startReading() else {
            throw MediaUnavailable(reason: reader.error?.localizedDescription ?? "can't read audio")
        }
        var started = false
        while let sampleBuffer = output.copyNextSampleBuffer() {
            guard let block = CMSampleBufferGetDataBuffer(sampleBuffer) else { continue }
            let length = CMBlockBufferGetDataLength(block)
            var chunk = [Int16](repeating: 0, count: length / 2)
            _ = chunk.withUnsafeMutableBytes { CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length,
                                                                          destination: $0.baseAddress!) }
            started = true
            try sink(chunk)
        }
        if reader.status == .failed {
            let error = reader.error ?? ExtractError.unreadable("audio decoding failed")
            if started { throw error }
            throw MediaUnavailable(reason: describe(error))   // it never decoded anything: ffmpeg may
        }
        return (true, seconds.isFinite ? seconds : nil)
    }

    /// DigUp: Media+Portable.swift AudioExtractor.windows. A file ffprobe can't read throws; one without sound has no
    /// pieces.
    private static func ffmpegStream(_ url: URL, _ sink: ([Int16]) throws -> Void) throws
        -> (hasAudio: Bool, duration: Double?) {
        guard FFmpeg.ffmpeg != nil else { throw ExtractError.unreadable("this Mac can't open it and ffmpeg isn't installed") }
        guard try FFmpeg.streams(of: url).audio else { return (false, nil) }
        var odd: UInt8?   // a byte left over when a read ends mid-sample
        try FFmpeg.run(FFmpeg.ffmpeg, ["-v", "error", "-nostdin", "-i", url.path, "-vn", "-ac", "1", "-ar",
                                       "\(Int(sampleRate))", "-f", "s16le", "-"]) { data in
            var bytes: [UInt8] = []
            bytes.reserveCapacity(data.count + 1)
            if let first = odd { bytes.append(first); odd = nil }
            bytes.append(contentsOf: data)
            if bytes.count % 2 == 1 { odd = bytes.removeLast() }
            var samples = [Int16](repeating: 0, count: bytes.count / 2)
            for i in 0..<samples.count {
                samples[i] = Int16(bitPattern: UInt16(bytes[i * 2]) | UInt16(bytes[i * 2 + 1]) << 8)
            }
            try sink(samples)
        }
        return (true, try? FFmpeg.duration(of: url))
    }
}

/// Cuts a stream of samples into `window`-second pieces `hop` seconds apart, skipping silent ones. One model input
/// ignores anything past 30 s, so windows stay ≤ 30 s. Memory stays at one window, even for a 3-hour podcast.
final class Windower: @unchecked Sendable {
    private let windowSamples: Int, hopSamples: Int, minimumSamples: Int
    private let folder: URL
    private var buffer: [Int16] = []
    private var offset = 0   // sample index of buffer[0] in the file
    private(set) var pieces: [MediaPiece] = []

    init(window: Double, hop: Double, minimum: Double, folder: URL) {
        windowSamples = Int(window * Audio.sampleRate)
        hopSamples = max(1, Int(hop * Audio.sampleRate))
        minimumSamples = Int(minimum * Audio.sampleRate)
        self.folder = folder
    }

    var samplesRead: Int { offset + buffer.count }

    func feed(_ chunk: [Int16]) throws {
        buffer.append(contentsOf: chunk)
        while buffer.count >= windowSamples {
            try emit(windowSamples)
            let hop = min(hopSamples, buffer.count)
            buffer.removeFirst(hop)
            offset += hop
        }
    }

    /// The tail: new audio beyond the previous window's overlap, or the whole file if it was shorter than a window.
    func finish() throws {
        let alreadyCovered = offset == 0 ? 0 : windowSamples - hopSamples
        if buffer.count - alreadyCovered >= minimumSamples { try emit(buffer.count) }
    }

    private func emit(_ count: Int) throws {
        let slice = buffer[0..<count]
        guard Audio.rms(slice) > 0.003 else { return }   // ≈ −50 dBFS: silence isn't worth a vector
        let out = folder.appendingPathComponent(UUID().uuidString + ".wav")
        try Audio.writeWAV(slice, to: out)
        pieces.append(MediaPiece(path: out.path, start: Double(offset) / Audio.sampleRate,
                                 end: Double(offset + count) / Audio.sampleRate))
    }
}

enum AudioOps {
    struct Options {
        let window: Double, hop: Double, minimum: Double
        let folder: URL
    }

    static func options(_ a: Args) throws -> Options {
        let minimum = try a.double("minimum", 2)
        guard minimum.isFinite, minimum >= 0, minimum < 1e9 else { throw HelperFailure("'minimum' must be 0 or more") }
        return Options(window: try a.positiveDouble("window", 30), hop: try a.positiveDouble("hop", 25), minimum: minimum,
                       folder: try Pictures.makeFolder(try a.string("outDir")))
    }

    static func windows(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let (pieces, duration) = try windows(of: url, options(a))
        return ["duration": .double(duration), "pieces": .array(pieces.map(\.json))]
    }

    /// DigUp: AudioExtractor.windows. No sound: no pieces, duration 0.
    static func windows(of url: URL, _ options: Options) throws -> (pieces: [MediaPiece], duration: Double) {
        let windower = Windower(window: options.window, hop: options.hop, minimum: options.minimum, folder: options.folder)
        let info = try runBlocking { try await Audio.stream(url) { try windower.feed($0) } }
        guard info.hasAudio else { return ([], 0) }
        try windower.finish()
        return (windower.pieces, info.duration ?? Double(windower.samplesRead) / Audio.sampleRate)
    }
}

// MARK: Video

enum VideoOps {
    static func keyframes(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let audio = try AudioOps.options(a)
        let settings = Settings(interval: try a.positiveDouble("interval", 3), maxPixel: try a.positiveInt("maxPixel", 1024),
                                maxFrames: try a.positiveInt("maxFrames", 1200),
                                budget: try a.positiveInt("budget", 70, max: maxBudget),
                                folder: audio.folder)
        let video = try frames(of: url, settings)
        let sound = try AudioOps.windows(of: url, audio)
        return ["duration": .double(video.duration > 0 ? video.duration : sound.duration),
                "frames": .array(video.frames.map(\.json)), "pieces": .array(sound.pieces.map(\.json))]
    }

    struct Settings {
        let interval: Double
        let maxPixel: Int
        let maxFrames: Int
        let budget: Int
        let folder: URL
    }

    /// DigUp: VideoExtractor.keyframes. A frame every `interval` seconds, one kept per shot: a frame that looks like
    /// the previous kept one (8×8 average hash within 4 bits) only extends it. Each kept frame is sized for the
    /// encoder and written as a PNG.
    static func frames(of url: URL, _ settings: Settings) throws -> (frames: [MediaPiece], duration: Double) {
        let collector = FrameCollector(settings)
        let opened: AVResult
        do {
            opened = try runBlocking { try await avFrames(url, settings, collector) }
        } catch let unavailable as MediaUnavailable {
            log("video: ffmpeg reads \(url.lastPathComponent) (AVFoundation: \(unavailable.reason))")
            return try ffmpegFrames(url, settings, collector)
        }
        // AVFoundation opened the video but decoded no frame of it: ffmpeg may. If it can't, AVFoundation's answer
        // (no frames) stands, as in DigUp.
        if opened.opened, collector.frames.isEmpty, FFmpeg.ffmpeg != nil {
            log("video: ffmpeg reads \(url.lastPathComponent) (AVFoundation decoded no frame)")
            do {
                return try ffmpegFrames(url, settings, collector)
            } catch {
                log("video: ffmpeg can't read \(url.lastPathComponent) either: \(describe(error))")
                collector.reset()
            }
        }
        return collector.finish(duration: opened.seconds)
    }

    /// Collects the kept frames: hash filter, sizing, PNG.
    final class FrameCollector: @unchecked Sendable {
        let settings: Settings
        private(set) var frames: [MediaPiece] = []
        private var lastHash: UInt64?

        init(_ settings: Settings) { self.settings = settings }

        func reset() { frames = []; lastHash = nil }

        /// `image` is the frame as the generator or ffmpeg made it (long side ≤ maxPixel).
        func offer(_ image: CGImage, start: Double, end: Double) throws {
            let hash = averageHash(image)
            if let lastHash, (hash ^ lastHash).nonzeroBitCount <= 4 { return }
            lastHash = hash
            // DigUp writes the frame as a JPEG (quality 0.9) and the model's decoder reads that.
            let scratch = try Pictures.scratch(image, png: false)
            let out = settings.folder.appendingPathComponent(UUID().uuidString + ".png")
            _ = try Pictures.sizeAndWrite(scratch, budget: settings.budget, to: out)
            frames.append(MediaPiece(path: out.path, start: max(0, start), end: end))
        }

        /// Each kept frame stands for the stretch until the next kept frame; the last one until the end.
        func finish(duration: Double) -> (frames: [MediaPiece], duration: Double) {
            for index in frames.indices { frames[index].end = index + 1 < frames.count ? frames[index + 1].start : duration }
            return (frames, duration)
        }
    }

    private struct AVResult: Sendable {
        let seconds: Double
        let opened: Bool
    }

    private static func avFrames(_ url: URL, _ settings: Settings, _ collector: FrameCollector) async throws -> AVResult {
        let asset = AVURLAsset(url: url)
        guard (try? await asset.load(.isReadable)) == true else { throw MediaUnavailable(reason: "not readable") }
        guard let duration = try? await asset.load(.duration).seconds,
              let tracks = try? await asset.loadTracks(withMediaType: .video)
        else { throw MediaUnavailable(reason: "no track list") }
        guard duration.isFinite, duration > 0, !tracks.isEmpty
        else { return AVResult(seconds: duration.isFinite ? duration : 0, opened: false) }

        let step = max(settings.interval, duration / Double(settings.maxFrames))
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: settings.maxPixel, height: settings.maxPixel)
        let tolerance = CMTime(seconds: step / 2, preferredTimescale: 600)
        generator.requestedTimeToleranceBefore = tolerance
        generator.requestedTimeToleranceAfter = tolerance
        let times = stride(from: min(0.5, duration / 2), to: duration, by: step).map {
            CMTime(seconds: $0, preferredTimescale: 600)
        }
        for await result in generator.images(for: times) {
            guard case let .success(_, image, actualTime) = result else { continue }
            try collector.offer(image, start: actualTime.seconds, end: duration)
        }
        return AVResult(seconds: duration, opened: true)
    }

    /// DigUp: VideoExtractor.averageHash. 8×8 gray cells brighter than the mean are 1.
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

    /// DigUp: Media+Portable.swift keyframes. Frame n is the one shown at first + n × step: fps's slots start at
    /// `first`, and round=up gives each slot the last frame at or before it. Every frame is decoded anyway, so reading
    /// from the start costs nothing over seeking, and an MPEG-TS has no index. Two changes to DigUp's command: the scale
    /// never enlarges a frame (research 01 §5), and `-fps_mode passthrough` writes one file per slot. The fps filter's
    /// first frame gets pts 1 (`first` rounded up onto its 1/fps grid), and image2's default constant rate would write
    /// it twice, timing every later frame one step late (ffmpeg 8.0.1).
    private static func ffmpegFrames(_ url: URL, _ settings: Settings, _ collector: FrameCollector) throws
        -> (frames: [MediaPiece], duration: Double) {
        collector.reset()
        guard FFmpeg.ffmpeg != nil else {
            throw ExtractError.unreadable("this Mac can't open the video and ffmpeg isn't installed")
        }
        let streams = try FFmpeg.streams(of: url)
        let duration = try FFmpeg.duration(of: url) ?? 0
        guard duration > 0, streams.video else { return ([], duration) }
        let step = max(settings.interval, duration / Double(settings.maxFrames))
        let first = min(0.5, duration / 2)
        let prefix = "frame-\(UUID().uuidString)-"
        let longSide = settings.maxPixel
        try FFmpeg.run(FFmpeg.ffmpeg, ["-v", "error", "-nostdin", "-i", url.path, "-an", "-vf",
                                       "fps=fps=\(1 / step):start_time=\(first):round=up,"
                                       + "scale='min(iw,\(longSide))':'min(ih,\(longSide))':force_original_aspect_ratio=decrease",
                                       "-fps_mode", "passthrough", "-q:v", "3", "-f", "image2",
                                       settings.folder.appendingPathComponent(prefix + "%06d.jpg").path]) { _ in }
        let names = try FileManager.default.contentsOfDirectory(atPath: settings.folder.path)
            .filter { $0.hasPrefix(prefix) }.sorted()
        defer { for name in names { try? FileManager.default.removeItem(at: settings.folder.appendingPathComponent(name)) } }
        for (index, name) in names.enumerated() {
            let start = first + Double(index) * step
            guard start < duration else { continue }   // fps can fill a slot past the end
            guard let image = Pictures.readFull(settings.folder.appendingPathComponent(name)) else { continue }
            try collector.offer(image, start: start, end: duration)
        }
        return collector.finish(duration: duration)
    }

    /// The frame shown at `seconds`, its long side at most `pixels`, as a JPEG for a preview.
    static func frame(at seconds: Double, of url: URL, pixels: Int, to out: URL) throws {
        do {
            let image = try runBlocking { () async throws -> CGImage in
                let asset = AVURLAsset(url: url)
                guard (try? await asset.load(.isReadable)) == true else { throw MediaUnavailable(reason: "not readable") }
                let generator = AVAssetImageGenerator(asset: asset)
                generator.appliesPreferredTrackTransform = true
                generator.maximumSize = CGSize(width: pixels, height: pixels)
                generator.requestedTimeToleranceBefore = CMTime(seconds: 0.5, preferredTimescale: 600)
                generator.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)
                return try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
            }
            try Pictures.write(image, to: out, png: out.pathExtension.lowercased() == "png")
        } catch {
            try ffmpegFrame(at: seconds, of: url, pixels: pixels, to: out, cause: error)
        }
    }

    /// DigUp: Media+Portable.swift frame(at:). Seeking before reading starts at the keyframe before the moment and
    /// decodes on to it. An MPEG-TS has no index, so its seek lands on the moment itself and nothing decodes until the
    /// next keyframe: seek to a while before and read on.
    private static func ffmpegFrame(at seconds: Double, of url: URL, pixels: Int, to out: URL, cause: Error) throws {
        guard FFmpeg.ffmpeg != nil else { throw cause }
        let at = max(0, seconds)
        let rest = ["-frames:v", "1", "-vf",
                    "scale='min(iw,\(pixels))':'min(ih,\(pixels))':force_original_aspect_ratio=decrease",
                    "-q:v", "3", "-y", out.path]
        let lead = FFmpeg.isMPEGTransportStream(url) ? min(at, 12) : 0   // x264 keeps up to 250 frames between keyframes
        try? FileManager.default.removeItem(at: out)
        try? FFmpeg.run(FFmpeg.ffmpeg, ["-v", "error", "-nostdin", "-ss", String(at - lead), "-i", url.path]
                        + (lead > 0 ? ["-ss", String(lead)] : []) + rest) { _ in }
        if !FileManager.default.fileExists(atPath: out.path) {
            try? FFmpeg.run(FFmpeg.ffmpeg, ["-v", "error", "-nostdin", "-i", url.path, "-ss", String(at)] + rest) { _ in }
        }
        guard FileManager.default.fileExists(atPath: out.path) else {
            throw ExtractError.unreadable("no frame at \(seconds) s")
        }
    }
}
