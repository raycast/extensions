// The microphone helper for Grokcast. `ray build` compiles this package with
// Raycast's Swift tools into `assets/compiled_raycast_swift/recorder`.
//
// `microphoneAccess` and `requestMicrophoneAccess` are called through the generated
// TypeScript bindings. `record` streams audio, so the extension starts the binary
// itself (`recorder record <sampleRate> <maxSeconds>`) and reads stdout as it arrives.

import AVFoundation
import Foundation
import RaycastSwiftMacros

/// The macOS microphone permission of the host app (Raycast or Tinycast).
@raycast func microphoneAccess() -> String {
  switch AVCaptureDevice.authorizationStatus(for: .audio) {
  case .authorized: "authorized"
  case .denied: "denied"
  case .restricted: "restricted"
  case .notDetermined: "notDetermined"
  @unknown default: "denied"
  }
}

/// Shows the macOS microphone prompt when the user has not answered it yet.
@raycast func requestMicrophoneAccess() async -> Bool {
  await AVCaptureDevice.requestAccess(for: .audio)
}

enum RecorderError: Error, LocalizedError {
  case noInputDevice
  case unsupportedFormat

  var errorDescription: String? {
    switch self {
    case .noInputDevice: "No microphone is available."
    case .unsupportedFormat: "The microphone format cannot be converted."
    }
  }
}

/// Kept for the life of the process so the event handlers stay installed.
private var eventSources: [any DispatchSourceProtocol] = []

/// Streams mono, signed 16-bit little-endian PCM at `sampleRate` to stdout.
///
/// Recording stops on SIGTERM or SIGINT, when the parent process exits, or after
/// `maxSeconds`. The process then exits directly, so nothing follows the audio.
///
/// Stdin is not used: Tinycast closes it at once.
@raycast func record(sampleRate: Double, maxSeconds: Double) async throws {
  let engine = AVAudioEngine()
  let input = engine.inputNode
  let inputFormat = input.outputFormat(forBus: 0)
  guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
    throw RecorderError.noInputDevice
  }
  guard
    let outputFormat = AVAudioFormat(
      commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: true),
    let converter = AVAudioConverter(from: inputFormat, to: outputFormat)
  else {
    throw RecorderError.unsupportedFormat
  }

  let stdout = FileHandle.standardOutput
  input.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { buffer, _ in
    let ratio = sampleRate / inputFormat.sampleRate
    let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up)) + 1
    guard let converted = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: capacity) else {
      return
    }
    var supplied = false
    var conversionError: NSError?
    converter.convert(to: converted, error: &conversionError) { _, status in
      if supplied {
        status.pointee = .noDataNow
        return nil
      }
      supplied = true
      status.pointee = .haveData
      return buffer
    }
    guard conversionError == nil, converted.frameLength > 0,
      let samples = converted.int16ChannelData
    else { return }
    stdout.write(Data(bytes: samples[0], count: Int(converted.frameLength) * 2))
  }

  try engine.start()

  let stop: @Sendable () -> Never = {
    engine.stop()
    input.removeTap(onBus: 0)
    exit(EXIT_SUCCESS)
  }

  signal(SIGINT, SIG_IGN)
  signal(SIGTERM, SIG_IGN)
  eventSources = [SIGINT, SIGTERM].map { number -> any DispatchSourceProtocol in
    let source = DispatchSource.makeSignalSource(signal: number, queue: .global())
    source.setEventHandler { stop() }
    source.resume()
    return source
  }

  // Stop when the extension goes away without stopping the recorder.
  let parent = DispatchSource.makeProcessSource(
    identifier: getppid(), eventMask: .exit, queue: .global())
  parent.setEventHandler { stop() }
  parent.resume()
  eventSources.append(parent)
  if getppid() == 1 { stop() }

  DispatchQueue.global().asyncAfter(deadline: .now() + maxSeconds) { stop() }

  // Wait. `stop` ends the process.
  while true {
    try await Task.sleep(nanoseconds: 3_600_000_000_000)
  }
}
