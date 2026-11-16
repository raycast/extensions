import Foundation
import IOBluetooth
import CoreAudio
import RaycastSwiftMacros

// macOS only registers a Bluetooth audio device with CoreAudio once an audio
// profile (A2DP/HFP) is connected, so paired Bluetooth headphones stay
// invisible to the HAL until selected. These functions list audio-capable
// paired Bluetooth devices from IOBluetooth and open a device's audio
// connection so it appears in the HAL.

struct HalAudioDevice: Encodable {
  let id: Int
  let uid: String
  let name: String
  let isInput: Bool
  let isOutput: Bool
}

struct BtAudioDevice: Encodable {
  let name: String
  let address: String
  let connected: Bool
  let hasMic: Bool
}

enum BtAudioError: LocalizedError {
  case deviceNotFound(String)
  case didNotRegister(String)

  var errorDescription: String? {
    switch self {
    case .deviceNotFound(let query):
      "Bluetooth device not found or not paired: \(query)"
    case .didNotRegister(let name):
      "\"\(name)\" did not register as an audio device"
    }
  }
}

// MARK: - CoreAudio HAL helpers

func getHalDevices() -> [HalAudioDevice] {
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDevices,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )
  var size: UInt32 = 0
  let systemObject = AudioObjectID(kAudioObjectSystemObject)
  guard AudioObjectGetPropertyDataSize(systemObject, &address, 0, nil, &size) == noErr, size > 0 else {
    return []
  }
  let count = Int(size) / MemoryLayout<AudioObjectID>.size
  var ids = [AudioObjectID](repeating: 0, count: count)
  guard AudioObjectGetPropertyData(systemObject, &address, 0, nil, &size, &ids) == noErr else {
    return []
  }
  return ids.map { id in
    HalAudioDevice(
      id: Int(id),
      uid: stringProperty(id, kAudioDevicePropertyDeviceUID) ?? "",
      name: stringProperty(id, kAudioObjectPropertyName) ?? "",
      isInput: channelCount(id, kAudioObjectPropertyScopeInput) > 0,
      isOutput: channelCount(id, kAudioObjectPropertyScopeOutput) > 0
    )
  }
}

func stringProperty(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector) -> String? {
  var address = AudioObjectPropertyAddress(
    mSelector: selector,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )
  var value: Unmanaged<CFString>?
  var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
  guard AudioObjectGetPropertyData(object, &address, 0, nil, &size, &value) == noErr, let v = value else {
    return nil
  }
  return v.takeUnretainedValue() as String
}

func channelCount(_ object: AudioObjectID, _ scope: AudioObjectPropertyScope) -> Int {
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioDevicePropertyStreamConfiguration,
    mScope: scope,
    mElement: kAudioObjectPropertyElementMain
  )
  var size: UInt32 = 0
  guard AudioObjectGetPropertyDataSize(object, &address, 0, nil, &size) == noErr, size > 0 else { return 0 }
  let buffer = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<AudioBufferList>.alignment)
  defer { buffer.deallocate() }
  guard AudioObjectGetPropertyData(object, &address, 0, nil, &size, buffer) == noErr else { return 0 }
  let list = UnsafeMutableAudioBufferListPointer(buffer.assumingMemoryBound(to: AudioBufferList.self))
  return list.reduce(0) { $0 + Int($1.mNumberChannels) }
}

// MARK: - Bluetooth helpers

func normalizeAddress(_ s: String) -> String {
  s.lowercased().filter { $0.isHexDigit }
}

func serviceNames(_ device: IOBluetoothDevice) -> [String] {
  (device.services as? [IOBluetoothSDPServiceRecord] ?? []).compactMap { $0.getServiceName()?.lowercased() }
}

func isAudioCapable(_ device: IOBluetoothDevice) -> Bool {
  if device.deviceClassMajor == kBluetoothDeviceClassMajorAudio { return true }
  return serviceNames(device).contains {
    $0.contains("audio sink") || $0.contains("headset") || $0.contains("hands") || $0.contains("a2dp")
  }
}

func hasMicrophone(_ device: IOBluetoothDevice) -> Bool {
  let names = serviceNames(device)
  if names.contains(where: { $0.contains("hands") || $0.contains("headset") || $0.contains("microphone") }) {
    return true
  }
  // No service records available; most class-0x04 devices (earbuds) carry a
  // mic, but loudspeakers and portable audio sinks do not.
  return names.isEmpty && device.deviceClassMajor == kBluetoothDeviceClassMajorAudio
    && device.deviceClassMinor != 0x05 && device.deviceClassMinor != 0x07
}

func findBtDevice(_ query: String) -> IOBluetoothDevice? {
  let paired = (IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice]) ?? []
  let q = normalizeAddress(query)
  return paired.first {
    ($0.addressString.map { normalizeAddress($0) == q } ?? false) || $0.name == query
  }
}

func macFromUid(_ uid: String) -> String? {
  guard let range = uid.range(of: #"(?:[0-9a-fA-F]{2}[-:]){5}[0-9a-fA-F]{2}"#, options: .regularExpression)
  else { return nil }
  return normalizeAddress(String(uid[range]))
}

func halMatch(_ hal: HalAudioDevice, btAddress: String, btName: String?, direction: String) -> Bool {
  // Bluetooth devices register as separate ":input" and ":output" HAL objects
  guard direction == "input" ? hal.isInput : hal.isOutput else { return false }
  // A HAL uid carrying a Bluetooth MAC belongs to that specific radio — a
  // different MAC means a different physical device, even with the same name.
  if let mac = macFromUid(hal.uid) { return mac == btAddress }
  guard let name = btName else { return false }
  return hal.name.caseInsensitiveCompare(name) == .orderedSame
}

// MARK: - Raycast bridge

@raycast
func listBluetoothAudioDevices() -> [BtAudioDevice] {
  let paired = (IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice]) ?? []
  var seen = Set<String>()
  return paired.filter(isAudioCapable).filter {
    seen.insert($0.addressString ?? $0.name ?? "").inserted
  }.map {
    BtAudioDevice(
      name: $0.name ?? $0.addressString ?? "Unknown",
      address: $0.addressString ?? "",
      connected: $0.isConnected(),
      hasMic: hasMicrophone($0)
    )
  }
}

@raycast
func connectBluetoothAudioDevice(address: String, direction: String) throws -> HalAudioDevice {
  guard let device = findBtDevice(address) else {
    throw BtAudioError.deviceNotFound(address)
  }
  let btAddress = normalizeAddress(device.addressString ?? address)
  var openTried = false
  var bounced = false

  for i in 0..<40 {
    if let hal = getHalDevices().first(where: {
      halMatch($0, btAddress: btAddress, btName: device.name, direction: direction)
    }) {
      return hal
    }

    if !device.isConnected() {
      // openConnection blocks for many seconds on unreachable devices;
      // attempt it only once, then keep polling the HAL.
      if !openTried {
        openTried = true
        _ = device.openConnection(nil)
      }
    } else if i == 0 {
      // Link is up but no audio profile registered; nudge service connect.
      device.performSDPQuery(nil)
    } else if i == 12 && !bounced {
      // Last resort: bounce the ACL link so macOS renegotiates A2DP/HFP.
      bounced = true
      device.closeConnection()
      usleep(500_000)
      _ = device.openConnection(nil)
      device.performSDPQuery(nil)
    }
    usleep(250_000)
  }
  throw BtAudioError.didNotRegister(device.name ?? address)
}
