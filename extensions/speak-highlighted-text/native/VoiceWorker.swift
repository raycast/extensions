import AVFoundation

final class VoiceWorker {
    private let process = Process()
    private let input = Pipe()
    private let output = Pipe()
    private let queue = DispatchQueue(label: "speak-text.synthesis", qos: .userInitiated)
    private(set) var busy = false

    init(voice: URL, threads: Int, speed: Float) throws {
        process.executableURL = Bundle.main.executableURL
        process.arguments = ["--synthesize", voice.path, String(threads), String(speed)]
        process.standardInput = input
        process.standardOutput = output
        process.standardError = FileHandle.nullDevice
        _ = fcntl(input.fileHandleForWriting.fileDescriptor, F_SETNOSIGPIPE, 1)
        try process.run()
        input.fileHandleForReading.closeFile()
        output.fileHandleForWriting.closeFile()
    }

    func stop() {
        input.fileHandleForWriting.closeFile()
        if process.isRunning { process.terminate() }
    }

    func render(_ text: String, format: AVAudioFormat, completion: @escaping (AVAudioPCMBuffer?) -> Void) {
        busy = true
        queue.async {
            let buffer = try? self.receive(text, format: format)
            DispatchQueue.main.async {
                self.busy = false
                completion(buffer)
            }
        }
    }

    private func receive(_ text: String, format: AVAudioFormat) throws -> AVAudioPCMBuffer {
        let payload = Data(text.utf8)
        var length = UInt32(payload.count)
        var request = withUnsafeBytes(of: &length) { Data($0) }
        request.append(payload)
        try input.fileHandleForWriting.write(contentsOf: request)
        func read(_ count: Int) throws -> Data {
            var data = Data()
            data.reserveCapacity(count)
            while data.count < count {
                guard let part = try output.fileHandleForReading.read(upToCount: count - data.count), !part.isEmpty else {
                    throw CocoaError(.fileReadCorruptFile)
                }
                data.append(part)
            }
            return data
        }
        let frames = try read(4).withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) }
        guard frames > 0, frames <= 24_000 * 90,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { throw CocoaError(.fileReadCorruptFile) }
        buffer.frameLength = frames
        let bytes = try read(Int(frames) * 4)
        bytes.withUnsafeBytes { _ = memcpy(buffer.floatChannelData![0], $0.baseAddress!, bytes.count) }
        return buffer
    }
}
