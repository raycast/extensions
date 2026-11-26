import AppKit
import AVFoundation

final class Reader: NSObject, ObservableObject, AVAudioPlayerDelegate {
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
    private var render: Process?
    private var audio: AVAudioPlayer?
    private var buffered: (index: Int, player: AVAudioPlayer)?
    private var timer: Timer?

    func load(_ value: String, source: String) {
        stopPlayback()
        self.source = source
        chunks = []
        value.enumerateSubstrings(in: value.startIndex..<value.endIndex, options: .bySentences) { sentence, _, _, _ in
            var phrase = ""
            for word in (sentence ?? "").split(whereSeparator: { $0.isWhitespace }) {
                if phrase.count + word.count > 220, !phrase.isEmpty { self.chunks.append(phrase); phrase = "" }
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
        index = 0
        progress = 0
        excerpt = chunks[0]
        if FileManager.default.fileExists(atPath: voice.path) {
            state = .preparing
            generate(0)
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

    private func generate(_ number: Int) {
        guard number < chunks.count else { return }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".wav")
        let model = voice.appendingPathComponent("model")
        let job = Process()
        job.executableURL = voice.appendingPathComponent("bin/sherpa-onnx-offline-tts")
        job.currentDirectoryURL = model
        job.arguments = ["--kokoro-model=model.int8.onnx", "--kokoro-voices=voices.bin", "--kokoro-tokens=tokens.txt",
                         "--kokoro-data-dir=espeak-ng-data", "--kokoro-lexicon=lexicon-us-en.txt", "--kokoro-lang=en-us",
                         "--sid=3", "--num-threads=4", "--output-filename=" + file.path, " " + chunks[number]]
        job.standardOutput = FileHandle.nullDevice
        job.standardError = FileHandle.nullDevice
        render = job
        job.terminationHandler = { task in DispatchQueue.main.async {
            defer { try? FileManager.default.removeItem(at: file) }
            guard self.render === task else { return }
            self.render = nil
            do {
                guard task.terminationStatus == 0 else { throw CocoaError(.fileReadCorruptFile) }
                let player = try AVAudioPlayer(data: Data(contentsOf: file))
                player.enableRate = true
                player.prepareToPlay()
                self.buffered = (number, player)
                self.advanceIfReady()
            } catch { self.fail("Couldn’t generate speech for this passage. Retry to read it again.") }
        } }
        do { try job.run() } catch { render = nil; fail(error.localizedDescription) }
    }

    private func advanceIfReady() {
        guard audio == nil, let next = buffered, next.index == index else { return }
        buffered = nil
        audio = next.player
        audio?.delegate = self
        audio?.rate = Float(step) / 4
        excerpt = chunks[index]
        if state != .paused { play() }
        if state != .failed { generate(index + 1) }
    }

    private func play() {
        guard audio?.play() == true else { fail("Audio playback failed. Check your sound output and retry."); return }
        state = .reading
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            guard let self, let audio = self.audio, audio.duration > 0 else { return }
            self.progress = (Double(self.index) + audio.currentTime / audio.duration) / Double(self.chunks.count)
        }
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard player === audio else { return }
        guard flag else { fail("Audio playback was interrupted."); return }
        timer?.invalidate()
        audio = nil
        index += 1
        progress = Double(index) / Double(chunks.count)
        state = index == chunks.count ? .finished : .preparing
        advanceIfReady()
    }

    func toggle() {
        switch state {
        case .reading, .preparing: audio?.pause(); timer?.invalidate(); state = .paused
        case .paused: if audio != nil { play() } else { state = .preparing }
        case .finished, .failed: begin()
        case .downloading: break
        }
    }

    func changeSpeed(_ delta: Int) {
        step = min(8, max(2, step + delta))
        UserDefaults.standard.set(step, forKey: "speedStep")
        audio?.rate = Float(step) / 4
    }

    private func fail(_ message: String) {
        stopPlayback()
        excerpt = message
        state = .failed
    }

    func stopPlayback() {
        timer?.invalidate()
        audio?.stop()
        audio = nil
        buffered = nil
        let job = render
        render = nil
        if job?.isRunning == true { job?.terminate() }
    }
}
