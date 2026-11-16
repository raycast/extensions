import Foundation
import IOBluetooth
import CoreAudio

// Companion to the audio-devices binary: macOS only registers a Bluetooth audio
// device with CoreAudio once an audio profile (A2DP/HFP) is connected, so paired
// Bluetooth headphones stay invisible to the HAL until selected.
// This helper lists paired audio-capable Bluetooth devices from IOBluetooth and
// can open a device's audio connection so it appears in the HAL.

// MARK: - CoreAudio HAL helpers

func getHalDevices() -> [[String: Any]] {
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
        [
            "id": Int(id),
            "uid": stringProperty(id, kAudioDevicePropertyDeviceUID) ?? "",
            "name": stringProperty(id, kAudioObjectPropertyName) ?? "",
            "isInput": channelCount(id, kAudioObjectPropertyScopeInput) > 0,
            "isOutput": channelCount(id, kAudioObjectPropertyScopeOutput) > 0,
        ]
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
    // mic, but loudspeakers/portable audio sinks do not.
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

func halMatch(_ hal: [String: Any], btAddress: String, btName: String?, direction: String) -> Bool {
    // Bluetooth devices register as separate ":input" and ":output" HAL objects
    guard hal[direction == "input" ? "isInput" : "isOutput"] as? Bool == true else { return false }
    let uid = normalizeAddress(hal["uid"] as? String ?? "")
    if !uid.isEmpty && uid.contains(btAddress) { return true }
    if let name = btName, let halName = hal["name"] as? String, halName.caseInsensitiveCompare(name) == .orderedSame {
        return true
    }
    return false
}

func emitJson(_ object: Any) {
    if let data = try? JSONSerialization.data(withJSONObject: object),
       let text = String(data: data, encoding: .utf8) {
        print(text)
    }
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

// MARK: - Commands

let args = Array(CommandLine.arguments.dropFirst())

func listCommand() {
    let paired = (IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice]) ?? []
    var seen = Set<String>()
    let devices: [[String: Any]] = paired.filter(isAudioCapable).filter {
        seen.insert($0.addressString ?? $0.name ?? "").inserted
    }.map {
        [
            "name": $0.name ?? $0.addressString ?? "Unknown",
            "address": $0.addressString ?? "",
            "connected": $0.isConnected(),
            "hasMic": hasMicrophone($0),
        ]
    }
    emitJson(devices)
}

func connectCommand(_ query: String, direction: String) {
    guard let device = findBtDevice(query) else {
        fail("Bluetooth device not found or not paired: \(query)")
    }
    let btAddress = normalizeAddress(device.addressString ?? query)
    var openTried = false
    var bounced = false

    for i in 0..<40 {
        if let hal = getHalDevices().first(where: {
            halMatch($0, btAddress: btAddress, btName: device.name, direction: direction)
        }) {
            emitJson(hal)
            exit(0)
        }

        if !device.isConnected() {
            // openConnection blocks for many seconds on unreachable devices;
            // attempt it only once, then keep polling the HAL.
            if !openTried {
                openTried = true
                let result = device.openConnection(nil)
                if result != kIOReturnSuccess {
                    fputs("openConnection returned \(result), continuing anyway\n", stderr)
                }
            }
        } else if i == 0 {
            // Link is up but no audio profile registered; nudge service connect.
            device.performSDPQuery(nil)
        } else if i == 12 && !bounced && device.isConnected() {
            // Last resort: bounce the ACL link so macOS renegotiates A2DP/HFP.
            bounced = true
            device.closeConnection()
            usleep(500_000)
            _ = device.openConnection(nil)
            device.performSDPQuery(nil)
        }
        usleep(250_000)
    }
    fail("\"\(device.name ?? query)\" did not register as an audio \(direction) device")
}

switch args.first {
case "list":
    listCommand()
case "connect":
    guard let query = args.dropFirst().first(where: { !$0.hasPrefix("--") }) else {
        fail("usage: bt-audio connect <address|name> [--input|--output]")
    }
    connectCommand(query, direction: args.contains("--input") ? "input" : "output")
default:
    fail("usage: bt-audio list | connect <address|name> [--input|--output]")
}
