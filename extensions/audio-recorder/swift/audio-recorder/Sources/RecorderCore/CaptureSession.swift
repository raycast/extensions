import AVFoundation
import CoreAudio
import Foundation

public struct CaptureMetrics: Codable {
  public var frames: Int64 = 0
  public var microphoneBuffers: Int64 = 0
  public var systemBuffers: Int64 = 0
  public var droppedBuffers: Int64 = 0
  public var lateFrames: Int64 = 0
  public var rejectedFrames: Int64 = 0
  public var peak: Float = 0
  public var maximumPeak: Float = 0
  public var waveform: [Float] = []
  public var microphonePeak: Float = 0
  public var systemPeak: Float = 0
  public var paused = false
}

/// Capture runs independently of Raycast. The serial processing queue owns all mutable audio state.
public final class CaptureSession {
  private let queue = DispatchQueue(label: "audio-recorder.processing", qos: .userInitiated)
  private let tapQueue = DispatchQueue(label: "audio-recorder.hal", qos: .userInitiated)
  private let slots = DispatchSemaphore(value: 16)
  private var tap: SystemTap?
  private var microphone: MicrophoneCapture?
  private var listeners: [(AudioObjectPropertyAddress, AudioObjectPropertyListenerBlock)] = []
  private var writer: AVAudioFile?
  private var timer: DispatchSourceTimer?
  private var mixer: TimelineMixer
  private var micConverter = PCMConverter(), systemConverter = PCMConverter()
  private var anchor = 0.0, pauseBegan: Double?, pausedSeconds = 0.0
  private var lastMicrophoneArrival = 0.0
  private var active = false
  private var metrics = CaptureMetrics()
  private let history = PeakHistory()
  private var failureReported = false
  private var reconfigurationPending = false
  private var reconfigurations: [Date] = []
  private let mode: String
  private let microphoneSource: String
  public private(set) var microphoneName = ""
  public var onFailure: ((String) -> Void)?
  public init(mode: String, microphoneSource: String = "default") {
    self.mode = mode
    self.microphoneSource = microphoneSource
    mixer = TimelineMixer(combined: mode == "both")
  }
  public func start(at url: URL) throws {
    guard ["microphone", "system", "both"].contains(mode) else {
      throw RecorderError.message("Unknown recording mode.")
    }
    try queue.sync {
      writer = try AVAudioFile(forWriting: url, settings: AudioFiles.captureSettings)
      anchor = AVAudioTime.seconds(forHostTime: mach_absolute_time())
      active = false
    }
    do {
      if mode != "microphone" {
        let tap = SystemTap()
        self.tap = tap
        try tap.start(queue: tapQueue) { [weak self] buffer, host in
          self?.enqueue(buffer, host: host, mic: false)
        }
      }
      if mode != "system" { try startMicrophone() }
      // Rebuild capture sources when default routes change, retaining the same host timeline.
      for selector in [
        kAudioHardwarePropertyDefaultInputDevice, kAudioHardwarePropertyDefaultOutputDevice,
      ] {
        var address = AudioObjectPropertyAddress(
          mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal,
          mElement: kAudioObjectPropertyElementMain)
        var currentDevice = Self.defaultDevice(selector)
        let block: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
          let next = Self.defaultDevice(selector)
          guard next != currentDevice else { return }
          currentDevice = next
          self?.scheduleReconfiguration()
        }
        try checkAudio(
          AudioObjectAddPropertyListenerBlock(
            AudioObjectID(kAudioObjectSystemObject), &address, queue, block),
          "Observe audio device changes")
        listeners.append((address, block))
      }
      queue.sync {
        anchor = AVAudioTime.seconds(forHostTime: mach_absolute_time())
        lastMicrophoneArrival = anchor
        active = true
      }
      let timer = DispatchSource.makeTimerSource(queue: queue)
      timer.schedule(
        deadline: .now() + .milliseconds(300), repeating: .milliseconds(20),
        leeway: .milliseconds(5))
      timer.setEventHandler { [weak self] in self?.flush() }
      self.timer = timer
      timer.resume()
    } catch {
      _ = stop()
      throw error
    }
  }
  private static func defaultDevice(_ selector: AudioObjectPropertySelector) -> AudioObjectID {
    var address = AudioObjectPropertyAddress(
      mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain)
    var device: AudioObjectID = 0
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    AudioObjectGetPropertyData(
      AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &device)
    return device
  }
  private func startMicrophone() throws {
    let microphone = MicrophoneCapture()
    self.microphone = microphone
    microphone.receive = { [weak self] buffer, host in self?.enqueue(buffer, host: host, mic: true)
    }
    microphone.failure = { [weak self] message in self?.fail(message) }
    try microphone.start(source: microphoneSource)
    microphoneName = microphone.deviceName
  }
  private func scheduleReconfiguration() {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.queue.sync(execute: { self.active }), !self.reconfigurationPending else {
        return
      }
      self.reconfigurationPending = true
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in self?.reconfigure() }
    }
  }
  private func reconfigure() {
    reconfigurationPending = false
    guard queue.sync(execute: { active }) else { return }
    reconfigurations.removeAll { Date().timeIntervalSince($0) > 10 }
    guard reconfigurations.count < 4 else {
      fail(
        "The audio device is repeatedly disconnecting. Recording was saved; reconnect the device and start again."
      )
      return
    }
    reconfigurations.append(Date())
    microphone?.stop()
    microphone = nil
    tap?.stop()
    tap = nil
    queue.sync {
      micConverter = PCMConverter()
      systemConverter = PCMConverter()
    }
    do {
      if mode != "microphone" {
        let tap = SystemTap()
        self.tap = tap
        try tap.start(queue: tapQueue) { [weak self] buffer, host in
          self?.enqueue(buffer, host: host, mic: false)
        }
      }
      if mode != "system" { try startMicrophone() }
    } catch {
      fail(
        "Audio device reconnection failed: \(error.localizedDescription). Captured audio was saved."
      )
    }
  }
  private func enqueue(_ buffer: AVAudioPCMBuffer, host: UInt64, mic: Bool) {
    guard slots.wait(timeout: .now()) == .success else {
      fail(
        "Audio processing could not keep up. Recording was stopped to avoid silently losing audio.")
      return
    }
    queue.async { [weak self] in
      guard let self else { return }
      defer { self.slots.signal() }
      if mic { self.lastMicrophoneArrival = AVAudioTime.seconds(forHostTime: mach_absolute_time()) }
      guard self.active, self.pauseBegan == nil else { return }
      do {
        let converted = try (mic ? self.micConverter : self.systemConverter).convert(buffer)
        let sourcePeak = AudioSignal.peak(converted)
        if mic {
          self.metrics.microphonePeak = max(self.metrics.microphonePeak, sourcePeak)
        } else {
          self.metrics.systemPeak = max(self.metrics.systemPeak, sourcePeak)
        }
        let seconds = AVAudioTime.seconds(forHostTime: host)
        let frame = Int64(
          ((seconds - self.anchor - self.pausedSeconds) * TimelineMixer.rate).rounded())
        self.mixer.insert(converted, at: frame, microphone: mic)
        if mic { self.metrics.microphoneBuffers += 1 } else { self.metrics.systemBuffers += 1 }
      } catch { self.fail(error.localizedDescription) }
    }
  }
  private func flush(to explicitTarget: Int64? = nil) {
    guard active else { return }
    let now = pauseBegan ?? AVAudioTime.seconds(forHostTime: mach_absolute_time())
    if mode != "system", pauseBegan == nil, now - lastMicrophoneArrival > 5 {
      fail(
        "The microphone stopped delivering audio. Recording was saved; check microphone permissions and reconnect your input device."
      )
    }
    let target =
      explicitTarget ?? max(0, Int64((now - anchor - pausedSeconds - 0.3) * TimelineMixer.rate))
    do {
      while mixer.cursor < target {
        let block = mixer.render(frames: Int(min(960, target - mixer.cursor)))
        try writer?.write(from: block)
        var peak: Float = 0
        for channel in 0..<2 {
          for i in 0..<Int(block.frameLength) {
            peak = max(peak, abs(block.floatChannelData![channel][i]))
          }
        }
        metrics.peak = peak
        metrics.maximumPeak = max(metrics.maximumPeak, peak)
        history.append(peak: peak, frames: Int(block.frameLength))
        metrics.waveform = history.values
        metrics.frames = mixer.cursor
      }
      metrics.lateFrames = mixer.lateFrames
      metrics.rejectedFrames = mixer.rejectedFrames
      if mixer.rejectedFrames > 0 {
        fail("Audio timestamps exceeded the synchronization buffer. Recording was stopped safely.")
      }
    } catch {
      fail("Cannot write recording: \(error.localizedDescription). The capture file was retained.")
    }
  }
  public func setPaused(_ paused: Bool) throws {
    try queue.sync {
      guard active else { throw RecorderError.message("No active recording.") }
      if paused && pauseBegan == nil {
        let now = AVAudioTime.seconds(forHostTime: mach_absolute_time())
        flush(to: max(0, Int64((now - anchor - pausedSeconds) * TimelineMixer.rate)))
        pauseBegan = now
      } else if !paused, let began = pauseBegan {
        pausedSeconds += AVAudioTime.seconds(forHostTime: mach_absolute_time()) - began
        pauseBegan = nil
        micConverter = PCMConverter()
        systemConverter = PCMConverter()
      }
      metrics.paused = pauseBegan != nil
    }
  }
  public func snapshot(resetLevels: Bool = true) -> CaptureMetrics {
    queue.sync {
      let result = metrics
      if resetLevels {
        metrics.microphonePeak = 0
        metrics.systemPeak = 0
      }
      return result
    }
  }
  private func fail(_ message: String) {
    queue.async { [weak self] in
      guard let self, self.active, !self.failureReported else { return }
      self.failureReported = true
      DispatchQueue.main.async { self.onFailure?(message) }
    }
  }
  @discardableResult public func stop() -> CaptureMetrics {
    for (var address, block) in listeners {
      AudioObjectRemovePropertyListenerBlock(
        AudioObjectID(kAudioObjectSystemObject), &address, queue, block)
    }
    listeners.removeAll()
    microphone?.stop()
    microphone = nil
    tap?.stop()
    tap = nil
    return queue.sync {
      timer?.cancel()
      timer = nil
      let now = pauseBegan ?? AVAudioTime.seconds(forHostTime: mach_absolute_time())
      if active { flush(to: max(0, Int64((now - anchor - pausedSeconds) * TimelineMixer.rate))) }
      active = false
      writer?.close()
      writer = nil
      return metrics
    }
  }
  deinit { stop() }
}
