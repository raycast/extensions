// sound-control: volume and mute for Core Audio devices, used by Priority Audio Switch.
// Build: npm run build-sound-control (swiftc -O swift/sound-control.swift -o assets/sound-control)
//
// Usage:
//   sound-control all <output|input>                       Volume (0-100) and mute of every device, as JSON
//   sound-control volume <output|input> <deviceID> <0-100> Set the volume
//   sound-control mute <output|input> <deviceID> toggle    Toggle mute and print the new state (true/false)

import AudioToolbox
import CoreAudio
import Foundation

enum Direction: String {
    case output, input

    var scope: AudioObjectPropertyScope {
        self == .output ? kAudioDevicePropertyScopeOutput : kAudioDevicePropertyScopeInput
    }

    var defaultDeviceSelector: AudioObjectPropertySelector {
        self == .output ? kAudioHardwarePropertyDefaultOutputDevice : kAudioHardwarePropertyDefaultInputDevice
    }
}

func address(
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}

/// Reads a fixed-size property value, or nil when the device does not have it.
func read<T: BitwiseCopyable>(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope, initial: T) -> T? {
    var addr = address(selector, scope)
    var value = initial
    var size = UInt32(MemoryLayout<T>.size)
    return AudioObjectGetPropertyData(object, &addr, 0, nil, &size, &value) == noErr ? value : nil
}

func write<T: BitwiseCopyable>(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope, _ value: T) -> Bool {
    var addr = address(selector, scope)
    var copy = value
    return AudioObjectSetPropertyData(object, &addr, 0, nil, UInt32(MemoryLayout<T>.size), &copy) == noErr
}

func deviceName(_ id: AudioDeviceID) -> String? {
    var addr = address(kAudioObjectPropertyName)
    var name: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &name) == noErr, let name else { return nil }
    return name.takeRetainedValue() as String
}

func hasStreams(_ id: AudioDeviceID, _ direction: Direction) -> Bool {
    var addr = address(kAudioDevicePropertyStreams, direction.scope)
    var size = UInt32(0)
    return AudioObjectGetPropertyDataSize(id, &addr, 0, nil, &size) == noErr && size > 0
}

func allDeviceIDs() -> [AudioDeviceID] {
    let system = AudioObjectID(kAudioObjectSystemObject)
    var addr = address(kAudioHardwarePropertyDevices)
    var size = UInt32(0)
    guard AudioObjectGetPropertyDataSize(system, &addr, 0, nil, &size) == noErr else { return [] }
    var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(system, &addr, 0, nil, &size, &ids) == noErr else { return [] }
    return ids
}

func volume(_ id: AudioDeviceID, _ direction: Direction) -> Float32? {
    read(id, kAudioHardwareServiceDeviceProperty_VirtualMainVolume, direction.scope, initial: Float32(0))
}

func isMuted(_ id: AudioDeviceID, _ direction: Direction) -> Bool? {
    read(id, kAudioDevicePropertyMute, direction.scope, initial: UInt32(0)).map { $0 != 0 }
}

struct DeviceInfo: Encodable {
    let name: String
    let volume: Int?
    let muted: Bool?
    let isDefault: Bool
}

/// Every device with streams in this direction, keyed by device ID.
func allInfo(_ direction: Direction) -> [String: DeviceInfo] {
    let defaultID = read(AudioObjectID(kAudioObjectSystemObject), direction.defaultDeviceSelector, kAudioObjectPropertyScopeGlobal, initial: AudioDeviceID(0))
    var result: [String: DeviceInfo] = [:]
    for id in allDeviceIDs() where hasStreams(id, direction) {
        guard let name = deviceName(id) else { continue }
        result[String(id)] = DeviceInfo(
            name: name,
            volume: volume(id, direction).map { Int(($0 * 100).rounded()) },
            muted: isMuted(id, direction),
            isDefault: id == defaultID
        )
    }
    return result
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("Error: \(message)\n".utf8))
    exit(1)
}

func usage() -> Never {
    fail("usage: sound-control all <output|input> | volume <output|input> <deviceID> <0-100> | mute <output|input> <deviceID> toggle")
}

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 2, let direction = Direction(rawValue: args[1]) else { usage() }

switch args[0] {
case "all":
    let data = (try? JSONEncoder().encode(allInfo(direction))) ?? Data("{}".utf8)
    print(String(decoding: data, as: UTF8.self))

case "volume":
    guard args.count == 4, let id = AudioDeviceID(args[2]), let percent = Float32(args[3]) else { usage() }
    let level = min(max(percent / 100, 0), 1)
    if !write(id, kAudioHardwareServiceDeviceProperty_VirtualMainVolume, direction.scope, level) {
        fail("could not set the volume")
    }

case "mute":
    guard args.count == 4, let id = AudioDeviceID(args[2]), args[3] == "toggle" else { usage() }
    guard let muted = isMuted(id, direction) else { fail("the device has no mute control") }
    if !write(id, kAudioDevicePropertyMute, direction.scope, UInt32(muted ? 0 : 1)) {
        fail("could not change mute")
    }
    print(muted ? "false" : "true")

default:
    usage()
}
