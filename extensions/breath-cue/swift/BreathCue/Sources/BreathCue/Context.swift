import AppKit
import CoreAudio
import CoreGraphics
import Foundation
import RaycastSwiftMacros

/// A single snapshot of what the person is doing right now.
struct ContextSample: Encodable {
  let app: String
  let bundleId: String
  let idleSeconds: Double
  let micInUse: Bool
  let screenLocked: Bool
  let overlayRunning: Bool
}

@raycast func sampleContext(lockPath: String) -> ContextSample {
  let front = NSWorkspace.shared.frontmostApplication
  return ContextSample(
    app: front?.localizedName ?? "",
    bundleId: front?.bundleIdentifier ?? "",
    idleSeconds: idleSeconds(),
    micInUse: isAnyMicrophoneRunning(),
    screenLocked: isScreenLocked(),
    overlayRunning: isOverlayRunning(lockPath: lockPath)
  )
}

/// Seconds since the last keyboard, mouse or trackpad event. No permissions needed.
func idleSeconds() -> Double {
  guard let anyEvent = CGEventType(rawValue: ~0) else { return 0 }
  return CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: anyEvent)
}

/// True when the session is locked or another user is on the console.
func isScreenLocked() -> Bool {
  guard let dict = CGSessionCopyCurrentDictionary() as? [String: Any] else { return false }
  if let locked = dict["CGSSessionScreenIsLocked"] as? Bool, locked { return true }
  if let onConsole = dict["kCGSSessionOnConsoleKey"] as? Bool, !onConsole { return true }
  return false
}

/// True when any audio input device is being captured by some process — a reliable "on a call" signal
/// that works for Zoom, Meet in a browser, Slack huddles, FaceTime, etc. Reading this needs no permission.
func isAnyMicrophoneRunning() -> Bool {
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDevices,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )
  var size: UInt32 = 0
  guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else {
    return false
  }
  let count = Int(size) / MemoryLayout<AudioDeviceID>.size
  var devices = [AudioDeviceID](repeating: 0, count: count)
  guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &devices) == noErr else {
    return false
  }

  for device in devices where hasInputStreams(device) {
    var running: UInt32 = 0
    var runningSize = UInt32(MemoryLayout<UInt32>.size)
    var runningAddress = AudioObjectPropertyAddress(
      mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
      mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain
    )
    if AudioObjectGetPropertyData(device, &runningAddress, 0, nil, &runningSize, &running) == noErr, running != 0 {
      return true
    }
  }
  return false
}

private func hasInputStreams(_ device: AudioDeviceID) -> Bool {
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioDevicePropertyStreams,
    mScope: kAudioDevicePropertyScopeInput,
    mElement: kAudioObjectPropertyElementMain
  )
  var size: UInt32 = 0
  guard AudioObjectGetPropertyDataSize(device, &address, 0, nil, &size) == noErr else { return false }
  return size > 0
}

func isOverlayRunning(lockPath: String) -> Bool {
  guard let text = try? String(contentsOfFile: lockPath, encoding: .utf8),
    let pid = pid_t(text.trimmingCharacters(in: .whitespacesAndNewlines))
  else { return false }
  return kill(pid, 0) == 0
}
