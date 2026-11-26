import AppKit
import AVFoundation

final class Reader: NSObject, ObservableObject {
    enum State: String { case downloading = "Downloading voice", preparing = "Preparing", reading = "Reading", paused = "Paused", finished = "Finished", failed = "Couldn’t read" }
    @Published var state = State.preparing
    @Published var source = "Selection"
    @Published var excerpt = ""
    @Published var progress = 0.0
    @Published var step = min(8, max(2, (UserDefaults.standard.object(forKey: "speedStep") as? Int) ?? 4))

    private let voice = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("kokoro-1.0-sherpa-1.12.20")
    private var chunks: [String] = []
    private var index = 0
    private var install: Process?
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let pitch = AVAudioUnitTimePitch()
    private let format = AVAudioFormat(standardFormatWithSampleRate: 24_000, channels: 1)!
    private var synthesisRate: Float = 1
    private var idleRelease: Timer?
    private var workers: [VoiceWorker] = []
    private var session = UUID()
    private var ready: [Int: AVAudioPCMBuffer] = [:]
    private var nextJob = 0
    private var nextBuffer = 0
    private var frameCounts: [Int: Int64] = [:]
    private var completedFrames: Int64 = 0
    private var timer: Timer?

    override init() {
        super.init()
        engine.attach(player)
        engine.attach(pitch)
        engine.connect(player, to: pitch, format: format)
        engine.connect(pitch, to: engine.mainMixerNode, format: format)
    }

    func load(_ value: String, source: String) {
        stopPlayback()
        self.source = source
        chunks = []
        value.enumerateSubstrings(in: value.startIndex..<value.endIndex, options: .bySentences) { sentence, _, _, _ in
            var phrase = ""
            for word in (sentence ?? "").split(whereSeparator: { $0.isWhitespace }) {
                let limit = self.chunks.count < 2 ? 38 : self.chunks.count < 4 ? 72 : 150
                if phrase.count + word.count > limit, !phrase.isEmpty { self.chunks.append(phrase); phrase = "" }
                var remainder = word
                while remainder.count > 220 {
                    self.chunks.append(String(remainder.prefix(220)))
                    remainder = remainder.dropFirst(220)
                }
                phrase += (phrase.isEmpty ? "" : " ") + remainder
            }
            if !phrase.isEmpty { self.chunks.append(phrase) }
        }
        if chunks.isEmpty { chunks = [String(value.prefix(220))] }
        begin()
    }

    private func begin() {
        idleRelease?.invalidate()
        let rate = max(1, min(1.6, Float(step) / 4))
        if rate != synthesisRate {
            workers.forEach { $0.stop() }
            workers.removeAll()
            synthesisRate = rate
        }
        resetQueue()
        progress = 0
        excerpt = chunks[0]
        if FileManager.default.fileExists(atPath: voice.path) {
            state = .preparing
            fillQueue()
            return
        }
        state = .downloading
        guard install == nil else { return }
        let job = Process()
        job.executableURL = URL(fileURLWithPath: "/bin/bash")
        job.arguments = [Bundle.main.resourceURL!.appendingPathComponent("install-voice.sh").path, voice.path]
        install = job
        job.terminationHandler = { task in DispatchQueue.main.async {
            self.install = nil
            if task.terminationStatus == 0 { self.begin() }
            else { self.fail("Couldn’t install the voice. Check your connection and available disk space, then retry.") }
        } }
        do { try job.run() } catch { install = nil; fail(error.localizedDescription) }
    }

    private func fillQueue() {
        let cores = ProcessInfo.processInfo.activeProcessorCount
        let limit = min(chunks.count, cores >= 4 ? 2 : 1)
        let token = session
        do {
            while nextJob < chunks.count && nextJob < index + 10 {
                let worker: VoiceWorker
                if let idle = workers.first(where: { !$0.busy }) { worker = idle }
                else if workers.count < limit {
                    worker = try VoiceWorker(voice: voice, threads: max(1, min(5, cores / limit)), speed: synthesisRate)
                    workers.append(worker)
                } else { return }
                let number = nextJob
                nextJob += 1
                worker.render(chunks[number], format: format) { [weak self] buffer in
                    guard let self, self.session == token else { return }
                    guard let buffer else { self.fail("Couldn’t generate this passage. Retry to read it again."); return }
                    self.ready[number] = buffer
                    self.scheduleReady()
                    if self.session == token { self.fillQueue() }
                }
            }
        } catch { fail(error.localizedDescription) }
    }

    private func scheduleReady() {
        let token = session
        while let buffer = ready.removeValue(forKey: nextBuffer) {
            let number = nextBuffer
            nextBuffer += 1
            frameCounts[number] = Int64(buffer.frameLength)
            player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
                DispatchQueue.main.async {
                    guard let self, self.session == token else { return }
                    self.finishedBuffer(number)
                }
            }
        }
        if state == .preparing { startWhenReady() }
    }

    private func startWhenReady() {
        guard nextBuffer > index else { return }
        // a very short opening needs a little runway before a long sentence.
        let queuedSeconds = Double(frameCounts.values.reduce(0, +)) / format.sampleRate
        guard nextBuffer == chunks.count || nextBuffer > index + 1 || queuedSeconds >= 0.9 * Double(step) / (4 * Double(synthesisRate)) else { return }
        do {
            if !engine.isRunning { try engine.start() }
            pitch.rate = Float(step) / (4 * synthesisRate)
            player.play()
            state = .reading
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in self?.updateProgress() }
        } catch { fail("Couldn’t start audio playback. Check your sound output and retry.") }
    }

    private func updateProgress() {
        guard let time = player.lastRenderTime.flatMap(player.playerTime(forNodeTime:)),
              let frames = frameCounts[index] else { return }
        let fraction = min(1, max(0, Double(time.sampleTime - completedFrames) / Double(frames)))
        progress = (Double(index) + fraction) / Double(chunks.count)
    }

    private func finishedBuffer(_ number: Int) {
        guard number == index else { return }
        completedFrames += frameCounts.removeValue(forKey: number) ?? 0
        index += 1
        progress = Double(index) / Double(chunks.count)
        if index == chunks.count {
            state = .finished
            timer?.invalidate()
            player.stop()
            engine.pause()
            idleRelease = Timer.scheduledTimer(withTimeInterval: 20, repeats: false) { [weak self] _ in
                self?.workers.forEach { $0.stop() }
                self?.workers.removeAll()
            }
        } else {
            excerpt = chunks[index]
            if nextBuffer == index {
                player.stop()
                completedFrames = 0
                timer?.invalidate()
                if state != .paused { state = .preparing }
            }
            fillQueue()
        }
    }

    func toggle() {
        switch state {
        case .reading, .preparing: player.pause(); timer?.invalidate(); state = .paused
        case .paused:
            state = .preparing
            startWhenReady()
        case .finished, .failed: begin()
        case .downloading: break
        }
    }

    func changeSpeed(_ delta: Int) {
        step = min(8, max(2, step + delta))
        UserDefaults.standard.set(step, forKey: "speedStep")
        pitch.rate = Float(step) / (4 * synthesisRate)
    }

    private func fail(_ message: String) {
        stopPlayback()
        workers.forEach { $0.stop() }
        workers.removeAll()
        excerpt = message
        state = .failed
    }

    private func resetQueue() {
        session = UUID()
        index = 0
        nextJob = 0
        nextBuffer = 0
        completedFrames = 0
        ready.removeAll()
        frameCounts.removeAll()
    }

    func stopPlayback() {
        resetQueue()
        timer?.invalidate()
        player.stop()
        engine.pause()
        workers.removeAll { worker in
            guard worker.busy else { return false }
            worker.stop()
            return true
        }
    }
}
