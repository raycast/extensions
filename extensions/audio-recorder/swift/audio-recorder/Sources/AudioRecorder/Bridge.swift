import AVFoundation
import AppKit
import Darwin
import Foundation
import RaycastSwiftMacros

/// Follow Raycast's Dimmer pattern: the build-produced executable starts a detached copy of itself.
@raycast
func startRecorder(statePath: String) throws {
  let root = URL(fileURLWithPath: statePath, isDirectory: true)
  try FileManager.default.createDirectory(
    at: root, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
  let encodedPath = String(decoding: try JSONEncoder().encode(statePath), as: UTF8.self)
  let worker = Process()
  worker.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
  worker.arguments = ["runRecorderWorker", encodedPath]
  worker.standardInput = FileHandle.nullDevice
  worker.standardOutput = FileHandle.nullDevice
  worker.standardError = FileHandle.nullDevice
  try worker.run()
}

@raycast
func runRecorderWorker(statePath: String) {
  _ = setsid()
  // The synchronous proxy enters AppKit on the entry thread, before Swift main
  // suspends. A main-queue/actor block around application.run starves queued work.
  precondition(Thread.isMainThread)
  let application = NSApplication.shared
  let controller = Controller(root: URL(fileURLWithPath: statePath, isDirectory: true))
  application.setActivationPolicy(.accessory)
  application.delegate = controller
  application.run()
}

@raycast
func recorderCommand(statePath: String, payload: String) throws -> String {
  let root = URL(fileURLWithPath: statePath, isDirectory: true)
  _ = try JSONDecoder().decode(Request.self, from: Data(payload.utf8))
  let requests = root.appendingPathComponent("requests")
  try FileManager.default.createDirectory(
    at: requests, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
  let request = requests.appendingPathComponent(UUID().uuidString).appendingPathExtension("json")
  let reply = request.deletingPathExtension().appendingPathExtension("reply")
  defer {
    try? FileManager.default.removeItem(at: request)
    try? FileManager.default.removeItem(at: reply)
  }
  try Data(payload.utf8).write(to: request, options: .atomic)
  let deadline = Date().addingTimeInterval(15)
  while Date() < deadline {
    if let result = try? Data(contentsOf: reply) { return String(decoding: result, as: UTF8.self) }
    Thread.sleep(forTimeInterval: 0.05)
  }
  throw NSError(
    domain: "AudioRecorder", code: 1,
    userInfo: [
      NSLocalizedDescriptionKey:
        "The recording worker did not respond. Reopen Audio Recorder and retry."
    ])
}

struct AudioInspection: Encodable {
  let frames: Int64
  let sampleRate: Double
  let channels: UInt32
  let duration: Double
  let peak: Float
  let rms: Double
}
@raycast
func inspectRecording(filePath: String) throws -> AudioInspection {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: filePath))
  let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: 8192)!
  var sum = 0.0
  var peak: Float = 0
  var samples: Int64 = 0
  while file.framePosition < file.length {
    try file.read(into: buffer)
    for channel in 0..<Int(buffer.format.channelCount) {
      for index in 0..<Int(buffer.frameLength) {
        let value = buffer.floatChannelData![channel][index]
        sum += Double(value * value)
        peak = max(peak, abs(value))
        samples += 1
      }
    }
  }
  return AudioInspection(
    frames: file.length, sampleRate: file.processingFormat.sampleRate,
    channels: file.processingFormat.channelCount,
    duration: Double(file.length) / file.processingFormat.sampleRate, peak: peak,
    rms: sqrt(sum / Double(max(1, samples))))
}
