import AppKit
import AVFoundation

final class Reader: NSObject, ObservableObject {
    enum State: String { case downloading = "Downloading voice", preparing = "Preparing", reading = "Reading", paused = "Paused", finished = "Finished", failed = "Couldn’t read" }
    @Published var state = State.preparing
    @Published private(set) var canSeek = false
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
    private var rendering: Set<Int> = []
    private var playbackID = UUID()
    private var ends: [Int64] = []
    private var origin: Int64 = 0
    private var parked: Int64 = 0
    private var nextBuffer = 0
    private var frameCounts: [Int: Int64] = [:]
    private var timer: Timer?

    override init() {
        super.init()
        engine.attach(player)
        engine.attach(pitch)
        engine.connect(player, to: pitch, format: format)
        engine.connect(pitch, to: engine.mainMixerNode, format: format)
    }

    func load(_ value: String) {
        chunks = Passages.split(value)
        guard !chunks.isEmpty else { stopPlayback(); return }
        begin()
    }

    private func begin() {
        idleRelease?.invalidate()
        stopPlayback()
        let rate = max(1, min(1.6, Float(step) / 4))
        if rate != synthesisRate {
            workers.forEach { $0.stop() }
            workers.removeAll()
            synthesisRate = rate
        }
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
            for number in index..<min(chunks.count, index + 10) {
                if ready[number] != nil || rendering.contains(number) { continue }
                let worker: VoiceWorker
                if let idle = workers.first(where: { !$0.busy }) { worker = idle }
                else if workers.count < limit {
                    worker = try VoiceWorker(voice: voice, threads: max(1, min(5, cores / limit)), speed: synthesisRate)
                    workers.append(worker)
                } else { return }
                rendering.insert(number)
                worker.render(chunks[number], format: format) { [weak self] buffer in
                    guard let self, self.session == token else { return }
                    self.rendering.remove(number)
                    guard self.state != .finished else { return }
                    guard number >= self.index - 4 && number < self.index + 10 else { self.fillQueue(); return }
                    guard let buffer else { self.fail("Couldn’t generate this passage. Retry to read it again."); return }
                    self.ready[number] = buffer
                    self.scheduleReady()
                    if self.session == token { self.fillQueue() }
                }
            }
        } catch { fail(error.localizedDescription) }
    }

    private func scheduleReady() {
        let token = playbackID
        while let source = ready[nextBuffer] {
            let number = nextBuffer
            let base = number == 0 ? 0 : ends[number - 1]
            let end = base + Int64(source.frameLength)
            if ends.count == number { ends.append(end) }
            if !canSeek { canSeek = true }
            nextBuffer += 1
            // seeking past rendered audio waits for the target, even across passages.
            if end <= origin {
                index = nextBuffer
                trimCache()
                if index == chunks.count { finish(); return }
                excerpt = chunks[index]
                continue
            }
            let skip = AVAudioFrameCount(max(0, origin - base))
            let buffer: AVAudioPCMBuffer
            if skip == 0 {
                buffer = source
            } else {
                let count = source.frameLength - skip
                guard let slice = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: count) else {
                    fail("Couldn’t seek in this passage."); return
                }
                slice.frameLength = count
                slice.floatChannelData![0].update(from: source.floatChannelData![0].advanced(by: Int(skip)), count: Int(count))
                buffer = slice
            }
            frameCounts[number] = Int64(buffer.frameLength)
            player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
                DispatchQueue.main.async {
                    guard let self, self.playbackID == token else { return }
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

    private var position: Int64 {
        guard state == .reading, let time = player.lastRenderTime.flatMap(player.playerTime(forNodeTime:)) else { return parked }
        return min(ends.last ?? origin, origin + max(0, time.sampleTime))
    }

    private func updateProgress() {
        guard index < ends.count else { return }
        let base = index == 0 ? 0 : ends[index - 1]
        let fraction = min(1, max(0, Double(position - base) / Double(max(1, ends[index] - base))))
        progress = (Double(index) + fraction) / Double(chunks.count)
    }

    func seek(_ seconds: Int) {
        guard canSeek else { return }
        idleRelease?.invalidate()
        let paused = state == .paused
        let delta = Int64(Double(seconds) * format.sampleRate / Double(synthesisRate))
        var target = max(0, position + delta)
        if ends.count == chunks.count { target = min(target, ends.last!) }
        playbackID = UUID()
        player.stop()
        timer?.invalidate()
        frameCounts.removeAll()
        origin = target
        parked = target
        index = ends.firstIndex(where: { $0 > target }) ?? ends.count
        if index == chunks.count { finish(); return }
        nextBuffer = index
        excerpt = chunks[index]
        state = paused ? .paused : .preparing
        updateProgress()
        trimCache()
        scheduleReady()
        fillQueue()
    }

    private func trimCache() {
        ready = ready.filter { $0.key >= index - 4 && $0.key < index + 10 }
    }

    private func finish() {
        index = chunks.count
        parked = ends.last ?? 0
        progress = 1
        state = .finished
        excerpt = chunks.last ?? ""
        timer?.invalidate()
        player.stop()
        engine.pause()
        idleRelease?.invalidate()
        idleRelease = Timer.scheduledTimer(withTimeInterval: 20, repeats: false) { [weak self] _ in
            self?.workers.forEach { $0.stop() }
            self?.workers.removeAll()
        }
    }

    private func finishedBuffer(_ number: Int) {
        guard number == index else { return }
        frameCounts.removeValue(forKey: number)
        index += 1
        progress = Double(index) / Double(chunks.count)
        if index == chunks.count { finish(); return }
        excerpt = chunks[index]
        if nextBuffer == index {
            player.stop()
            origin = ends[number]
            parked = origin
            timer?.invalidate()
            if state != .paused { state = .preparing }
        }
        trimCache()
        fillQueue()
    }

    func toggle() {
        switch state {
        case .reading, .preparing: parked = position; player.pause(); timer?.invalidate(); state = .paused
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
        playbackID = UUID()
        rendering.removeAll()
        ends.removeAll()
        canSeek = false
        origin = 0
        parked = 0
        nextBuffer = 0
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
