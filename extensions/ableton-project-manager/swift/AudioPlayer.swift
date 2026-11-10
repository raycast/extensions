import Accelerate
import AppKit
import AVFoundation
import Darwin
import Foundation

// 与 src/core/audio/audio-player.ts 约定的进程间通信协议。
// 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
let readyMessage = "READY"  // 经 stdout 输出 = 已开始播放
let stopCommand = "STOP"    // 经命令文件收到 = 请求淡出停止
let pauseCommand = "PAUSE"   // 经命令文件收到 = 暂停
let resumeCommand = "RESUME" // 经命令文件收到 = 续播
let restartCommand = "SEEK0" // 经命令文件收到 = 跳回开头
let seekCommandPrefix = "SEEK " // 其后跟秒数（可正负），如 "SEEK 5" / "SEEK -5" = 相对跳转
let positionPrefix = "POS " // 经 stdout 输出，其后跟 "<当前秒> <总秒>" = 播放进度

// analyze 模式：与 src/core/projects/audio-analysis.ts 约定。
// 调用 `AudioPlayer analyze <path>`，向 stdout 输出一行 JSON：
//   {"duration": 秒(Double), "rms": 0..1(Double), "peak": 0..1(Double), "centroid": 0..1 或 -1(Double), "flux": 0..1 或 -1(Double)}
// 修改字段名或格式时，audio-analysis.ts 必须同步更新。
func runAnalyze(_ path: String) -> Never {
    let url = URL(fileURLWithPath: path)
    do {
        let file = try AVAudioFile(forReading: url)
        let format = file.processingFormat
        let sampleRate = format.sampleRate
        let duration = sampleRate > 0 ? Double(file.length) / sampleRate : 0
        let channelCount = Int(format.channelCount)

        var sumOfSquares = 0.0
        var sampleCount = 0
        var peak = 0.0
        // 下混单声道边读边送进频谱分析，不保存整段音频：内存不随时长增长。
        let spectral = SpectralAnalyzer(sampleRate: sampleRate)
        let chunkFrames: AVAudioFrameCount = 65536
        // 读取出错时离末尾不超过这么多帧，就当作读完（压缩格式的长度是估算值，留些余量）。
        let endTolerance = max(Int64(chunkFrames), file.length / 100)

        while true {
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: chunkFrames) else {
                break
            }
            do {
                try file.read(into: buffer)
            } catch {
                // 某些压缩格式（如 mp3）读到结尾会抛错而不是返回 0 帧：接近末尾就当作读完，用已读到的样本收尾。
                // 离末尾还远是真实的读取 / 解码错误：报错退出，不返回只算了一部分的结果。
                if file.length - file.framePosition > endTolerance { throw error }
                break
            }
            let frames = Int(buffer.frameLength)
            if frames == 0 {
                break
            }
            if let channels = buffer.floatChannelData {
                for i in 0..<frames {
                    var frameSum = 0.0
                    for channel in 0..<channelCount {
                        let sample = Double(channels[channel][i])
                        sumOfSquares += sample * sample
                        sampleCount += 1
                        let magnitude = abs(sample)
                        if magnitude > peak { peak = magnitude }
                        frameSum += sample
                    }
                    spectral.append(Float(frameSum / Double(max(1, channelCount))))
                }
            }
        }

        let rms = sampleCount > 0 ? (sumOfSquares / Double(sampleCount)).squareRoot() : 0
        let clampedRms = max(0, min(1, rms))
        let clampedPeak = max(0, min(1, peak))
        let features = spectral.result()
        print("{\"duration\": \(duration), \"rms\": \(clampedRms), \"peak\": \(clampedPeak), \"centroid\": \(features.centroid), \"flux\": \(features.flux)}")
        fflush(stdout)
        exit(EXIT_SUCCESS)
    } catch {
        fputs("Failed to analyze audio: \(error.localizedDescription)\n", stderr)
        exit(EXIT_FAILURE)
    }
}

// 加窗 STFT，边读边算：帧不重叠（hop = fftSize），所以只要攒满一帧就处理，不必保存整段音频。
//  - centroid（亮度）：功率加权频谱质心 / Nyquist，归一到 0..1。
//    实数 FFT 的 2 倍缩放在这个比值里会上下约掉，故无需额外缩放。
//  - flux（活动量）：相邻帧"L1 归一化幅度谱"的半波正向差之和，逐帧平均；对响度不敏感，落在 0..1。
// 样本不足一帧 / 全静音 / FFT 初始化失败 → centroid 返回 -1；不足两帧 → flux 返回 -1（n/a）。
// 末尾不足一帧的样本丢弃。
final class SpectralAnalyzer {
    private static let log2n: vDSP_Length = 11
    private static let fftSize = 1 << 11 // 2048
    private static let halfSize = fftSize / 2

    private let sampleRate: Double
    private let setup: FFTSetup?

    private var window = [Float](repeating: 0, count: SpectralAnalyzer.fftSize)
    private var frame = [Float](repeating: 0, count: SpectralAnalyzer.fftSize)
    private var filled = 0

    private var windowed = [Float](repeating: 0, count: SpectralAnalyzer.fftSize)
    private var realp = [Float](repeating: 0, count: SpectralAnalyzer.halfSize)
    private var imagp = [Float](repeating: 0, count: SpectralAnalyzer.halfSize)
    private var magsSquared = [Float](repeating: 0, count: SpectralAnalyzer.halfSize)
    private var mags = [Float](repeating: 0, count: SpectralAnalyzer.halfSize)

    private var weightedFreqSum = 0.0
    private var powerSum = 0.0

    // flux：保存上一帧的 L1 归一化幅度谱（下标 1..<halfSize，bin0 不计）。
    private var prevNorm = [Double](repeating: 0, count: SpectralAnalyzer.halfSize)
    private var hasPrev = false
    private var fluxSum = 0.0
    private var fluxFrames = 0

    init(sampleRate: Double) {
        self.sampleRate = sampleRate
        setup = sampleRate > 0 ? vDSP_create_fftsetup(SpectralAnalyzer.log2n, FFTRadix(kFFTRadix2)) : nil
        vDSP_hann_window(&window, vDSP_Length(SpectralAnalyzer.fftSize), Int32(vDSP_HANN_DENORM))
    }

    deinit {
        if let setup { vDSP_destroy_fftsetup(setup) }
    }

    func append(_ sample: Float) {
        frame[filled] = sample
        filled += 1
        if filled == SpectralAnalyzer.fftSize {
            processFrame()
            filled = 0
        }
    }

    private func processFrame() {
        guard let setup else { return }
        let fftSize = SpectralAnalyzer.fftSize
        let halfSize = SpectralAnalyzer.halfSize

        vDSP_vmul(frame, 1, window, 1, &windowed, 1, vDSP_Length(fftSize))
        // 实数 FFT：ctoz 打包成 split complex（realp[0]=DC, imagp[0]=Nyquist），再 zrip
        realp.withUnsafeMutableBufferPointer { rp in
            imagp.withUnsafeMutableBufferPointer { ip in
                var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                windowed.withUnsafeBufferPointer { wp in
                    wp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: halfSize) { cp in
                        vDSP_ctoz(cp, 2, &split, 1, vDSP_Length(halfSize))
                    }
                }
                vDSP_fft_zrip(setup, &split, 1, SpectralAnalyzer.log2n, FFTDirection(FFT_FORWARD))
                vDSP_zvmags(&split, 1, &magsSquared, 1, vDSP_Length(halfSize)) // 功率，用于 centroid
                vDSP_zvabs(&split, 1, &mags, 1, vDSP_Length(halfSize)) // 幅度，用于 flux
            }
        }

        // centroid：功率加权（跳过 bin0）
        for k in 1..<halfSize {
            let power = Double(magsSquared[k])
            let freq = Double(k) * sampleRate / Double(fftSize)
            weightedFreqSum += freq * power
            powerSum += power
        }

        // flux：本帧幅度谱按 L1 归一化（跳过 bin0），与上一帧做半波正向差
        var magSum = 0.0
        for k in 1..<halfSize { magSum += Double(mags[k]) }
        if magSum > 0 {
            var frameFlux = 0.0
            for k in 1..<halfSize {
                let norm = Double(mags[k]) / magSum
                if hasPrev {
                    let diff = norm - prevNorm[k]
                    if diff > 0 { frameFlux += diff }
                }
                prevNorm[k] = norm
            }
            if hasPrev {
                fluxSum += frameFlux
                fluxFrames += 1
            }
            hasPrev = true
        }
    }

    func result() -> (centroid: Double, flux: Double) {
        guard setup != nil else { return (-1, -1) }

        let centroid: Double
        if powerSum > 0 {
            let nyquist = sampleRate / 2
            centroid = max(0, min(1, (weightedFreqSum / powerSum) / nyquist))
        } else {
            centroid = -1
        }

        let flux = fluxFrames > 0 ? max(0, min(1, fluxSum / Double(fluxFrames))) : -1
        return (centroid, flux)
    }
}

let arguments = CommandLine.arguments

// analyze 模式先于播放判断；命中后直接退出，不进入播放逻辑。
if arguments.count >= 2, arguments[1] == "analyze" {
  guard arguments.count >= 3 else {
    fputs("Usage: AudioPlayer analyze <audio-file-path>\n", stderr)
    exit(EXIT_FAILURE)
  }

  runAnalyze(arguments[2])
}

final class AudioPlayerDelegate: NSObject, AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(
    _ player: AVAudioPlayer,
    successfully flag: Bool
  ) {
    exit(EXIT_SUCCESS)
  }

  func audioPlayerDecodeErrorDidOccur(
    _ player: AVAudioPlayer,
    error: Error?
  ) {
    if let error {
      fputs("Audio decode error: \(error.localizedDescription)\n", stderr)
    }
    exit(EXIT_FAILURE)
  }
}

guard arguments.count >= 2 else {
  fputs("Usage: AudioPlayer <audio-file-path>\n", stderr)
  exit(EXIT_FAILURE)
}

let audioPath = arguments[1]
let audioURL = URL(fileURLWithPath: audioPath)

// 忽略 SIGPIPE：父进程(Raycast 命令)被回收后 stdout 管道断裂，
// 写进度不再因 SIGPIPE 被杀，播放得以在后台继续。
signal(SIGPIPE, SIG_IGN)

fputs("PLAYER_START pid=\(getpid()) path=\(audioPath)\n", stderr)

do {
  let player = try AVAudioPlayer(contentsOf: audioURL)
  let delegate = AudioPlayerDelegate()

  player.delegate = delegate
  player.prepareToPlay()

  guard player.play() else {
    fputs("Failed to start audio playback.\n", stderr)
    exit(EXIT_FAILURE)
  }

  print(readyMessage)
  fflush(stdout)

  // 状态文件：每 0.5s 原子写入 "<当前秒> <总秒> <PLAYING|PAUSED>"，
  // 供切回来的命令进程(没有 stdout 管道)轮询出实时进度与暂停态。
  let statusURL = arguments.count >= 4 ? URL(fileURLWithPath: arguments[3]) : nil

  func writeStatus() {
    guard let statusURL else { return }
    let state = player.isPlaying ? "PLAYING" : "PAUSED"
    let line = "\(player.currentTime) \(player.duration) \(state)\n"
    try? line.data(using: .utf8)?.write(to: statusURL, options: .atomic)
  }

  writeStatus()

  // 定时向 stdout 汇报播放进度：POS <当前秒> <总秒>，上层据此显示 "已播放 / 总时长"。
  // 同时刷新状态文件，让后台进度跨进程可读。
  let progressTimer = Timer(timeInterval: 0.5, repeats: true) { _ in
    print("\(positionPrefix)\(player.currentTime) \(player.duration)")
    fflush(stdout)
    writeStatus()
  }
  RunLoop.main.add(progressTimer, forMode: .common)

  var isStopping = false

  func stopPlayback() {
    guard !isStopping else { return }
    isStopping = true

    player.setVolume(0, fadeDuration: 0.2)

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
      player.stop()
      exit(EXIT_SUCCESS)
    }
  }

  // 看门狗：Raycast 退出(⌘Q)后，脱离的播放进程随之淡出停止。
  let watchdogTimer = Timer(timeInterval: 2.0, repeats: true) { _ in
    if NSRunningApplication.runningApplications(withBundleIdentifier: "com.raycast.macos").isEmpty {
      stopPlayback()
    }
  }
  RunLoop.main.add(watchdogTimer, forMode: .common)

  // 响应 SIGTERM：让其他进程(重开命令 / 菜单栏)能停掉这个后台播放。
  signal(SIGTERM, SIG_IGN)
  let terminationSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
  terminationSource.setEventHandler {
    stopPlayback()
  }
  terminationSource.resume()

  // 命令文件：任何进程(本命令 / 切回来的命令)向其追加命令行，
  // 播放进程轮询读取 → pause / resume / seek / restart 跨进程生效。
  // 不再从 stdin 收命令：命令进程被回收后 stdin 失效，而命令文件在磁盘上长存。
  if arguments.count >= 3 {
    let commandURL = URL(fileURLWithPath: arguments[2])
    var commandOffset: UInt64 = 0

    func handleCommand(_ raw: String) {
      let command = raw.trimmingCharacters(in: .whitespacesAndNewlines)
      if command.isEmpty { return }
      if command == stopCommand {
        DispatchQueue.main.async { stopPlayback() }
      } else if command == pauseCommand {
        DispatchQueue.main.async { player.pause() }
      } else if command == resumeCommand {
        DispatchQueue.main.async { player.play() }
      } else if command == restartCommand {
        DispatchQueue.main.async { player.currentTime = 0 }
      } else if command.hasPrefix(seekCommandPrefix) {
        let arg = String(command.dropFirst(seekCommandPrefix.count)).trimmingCharacters(in: .whitespaces)
        if let delta = Double(arg) {
          DispatchQueue.main.async {
            let target = player.currentTime + delta
            player.currentTime = max(0, min(player.duration, target))
          }
        }
      }
      // 未知命令忽略
    }

    let commandTimer = Timer(timeInterval: 0.15, repeats: true) { _ in
      guard let handle = try? FileHandle(forReadingFrom: commandURL) else { return }
      defer { try? handle.close() }
      do {
        try handle.seek(toOffset: commandOffset)
      } catch {
        return
      }
      let data = handle.readDataToEndOfFile()
      if data.isEmpty { return }
      // 只处理到最后一个换行为止，残缺行留到下一轮。
      guard let text = String(data: data, encoding: .utf8),
            let lastNewline = text.lastIndex(of: "\n") else { return }
      let consumed = text[...lastNewline]
      commandOffset += UInt64(consumed.utf8.count)
      for line in consumed.split(separator: "\n", omittingEmptySubsequences: true) {
        handleCommand(String(line))
      }
    }
    RunLoop.main.add(commandTimer, forMode: .common)
  }

  RunLoop.main.run()
} catch {
  fputs("Failed to load audio: \(error.localizedDescription)\n", stderr)
  exit(EXIT_FAILURE)
}
