import CoreAudio
import Foundation
import RaycastSwiftMacros

@raycast func getDeviceUID(selection: String) -> String? {
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDevices, mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain)
  var size: UInt32 = 0
  guard
    AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size)
      == noErr
  else { return nil }
  var devices = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
  let status = devices.withUnsafeMutableBytes {
    AudioObjectGetPropertyData(
      AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, $0.baseAddress!)
  }
  guard status == noErr else { return nil }
  func property(_ device: AudioDeviceID, _ selector: AudioObjectPropertySelector) -> String? {
    var key = AudioObjectPropertyAddress(
      mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain)
    var value: CFString = "" as CFString
    var bytes = UInt32(MemoryLayout<CFString>.size)
    guard AudioObjectGetPropertyData(device, &key, 0, nil, &bytes, &value) == noErr else {
      return nil
    }
    return value as String
  }
  for device in devices {
    var streams = AudioObjectPropertyAddress(
      mSelector: kAudioDevicePropertyStreams, mScope: kAudioDevicePropertyScopeOutput,
      mElement: kAudioObjectPropertyElementMain)
    var streamSize: UInt32 = 0
    guard
      AudioObjectGetPropertyDataSize(device, &streams, 0, nil, &streamSize) == noErr
        && streamSize > 0
    else { continue }
    let uid = property(device, kAudioDevicePropertyDeviceUID)
    let name = property(device, kAudioObjectPropertyName) ?? ""
    if selection == String(device) || selection == uid || name.hasPrefix(selection) { return uid }
  }
  return nil
}
