// Core Audio helpers: device list, names, UIDs, transport types, default devices, volume and mute.

import AudioToolbox
import CoreAudio
import Foundation

/// A failure with a short message for the user (shown in the extension's toasts).
struct AudioError: Error, CustomStringConvertible, LocalizedError {
    let description: String
    var errorDescription: String? { description }
}

enum Direction: String {
    case output, input

    init(parsing value: String) throws {
        guard let direction = Direction(rawValue: value) else { throw AudioError(description: "Unknown direction \(value)") }
        self = direction
    }

    var scope: AudioObjectPropertyScope {
        self == .output ? kAudioDevicePropertyScopeOutput : kAudioDevicePropertyScopeInput
    }

    var defaultDeviceSelector: AudioObjectPropertySelector {
        self == .output ? kAudioHardwarePropertyDefaultOutputDevice : kAudioHardwarePropertyDefaultInputDevice
    }
}

let systemObject = AudioObjectID(kAudioObjectSystemObject)

func address(
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}

/// Reads a fixed-size property value, or nil when the object does not have it.
func property<T: BitwiseCopyable>(
    _ object: AudioObjectID,
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal,
    initial: T
) -> T? {
    var addr = address(selector, scope)
    var value = initial
    var size = UInt32(MemoryLayout<T>.size)
    return AudioObjectGetPropertyData(object, &addr, 0, nil, &size, &value) == noErr ? value : nil
}

func setProperty<T: BitwiseCopyable>(
    _ object: AudioObjectID,
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal,
    value: T
) -> Bool {
    var addr = address(selector, scope)
    var copy = value
    return AudioObjectSetPropertyData(object, &addr, 0, nil, UInt32(MemoryLayout<T>.size), &copy) == noErr
}

func readString(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector) -> String? {
    var addr = address(selector)
    var value: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(object, &addr, 0, nil, &size, &value) == noErr, let value else { return nil }
    return value.takeRetainedValue() as String
}

func hasStreams(_ id: AudioDeviceID, _ direction: Direction) -> Bool {
    var addr = address(kAudioDevicePropertyStreams, direction.scope)
    var size = UInt32(0)
    return AudioObjectGetPropertyDataSize(id, &addr, 0, nil, &size) == noErr && size > 0
}

func allDeviceIDs() -> [AudioDeviceID] {
    var addr = address(kAudioHardwarePropertyDevices)
    var size = UInt32(0)
    guard AudioObjectGetPropertyDataSize(systemObject, &addr, 0, nil, &size) == noErr else { return [] }
    var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(systemObject, &addr, 0, nil, &size, &ids) == noErr else { return [] }
    return ids
}

/// Transport type names, as the extension expects them ("builtin", "usb", "bluetooth", …).
func transportName(_ id: AudioDeviceID) -> String? {
    guard let type = property(id, kAudioDevicePropertyTransportType, initial: UInt32(0)) else { return nil }
    switch type {
    case kAudioDeviceTransportTypeBuiltIn: return "builtin"
    case kAudioDeviceTransportTypeAggregate: return "aggregate"
    case kAudioDeviceTransportTypeAutoAggregate: return "autoaggregate"
    case kAudioDeviceTransportTypeVirtual: return "virtual"
    case kAudioDeviceTransportTypePCI: return "pci"
    case kAudioDeviceTransportTypeUSB: return "usb"
    case kAudioDeviceTransportTypeFireWire: return "firewire"
    case kAudioDeviceTransportTypeBluetooth: return "bluetooth"
    case kAudioDeviceTransportTypeBluetoothLE: return "bluetoothle"
    case kAudioDeviceTransportTypeHDMI: return "hdmi"
    case kAudioDeviceTransportTypeDisplayPort: return "displayport"
    case kAudioDeviceTransportTypeAirPlay: return "airplay"
    case kAudioDeviceTransportTypeAVB: return "avb"
    case kAudioDeviceTransportTypeThunderbolt: return "thunderbolt"
    default: return "unknown"
    }
}

func device(_ id: AudioDeviceID) -> Device? {
    guard let uid = readString(id, kAudioDevicePropertyDeviceUID), let name = readString(id, kAudioObjectPropertyName)
    else { return nil }
    return Device(
        id: String(id),
        uid: uid,
        name: name,
        isInput: hasStreams(id, .input),
        isOutput: hasStreams(id, .output),
        transportType: transportName(id)
    )
}

func devices(_ direction: Direction) -> [Device] {
    allDeviceIDs().filter { hasStreams($0, direction) }.compactMap(device)
}

func defaultDeviceID(_ direction: Direction) -> AudioDeviceID? {
    guard let id = property(systemObject, direction.defaultDeviceSelector, initial: AudioDeviceID(0)), id != 0 else { return nil }
    return id
}

/// A device ID from the extension, checked against the devices of this direction.
func deviceID(_ value: String, _ direction: Direction) throws -> AudioDeviceID {
    guard let id = AudioDeviceID(value), hasStreams(id, direction) else {
        throw AudioError(description: "No \(direction.rawValue) device exists with id \(value)")
    }
    return id
}

func volume(_ id: AudioDeviceID, _ direction: Direction) -> Float32? {
    property(id, kAudioHardwareServiceDeviceProperty_VirtualMainVolume, direction.scope, initial: Float32(0))
}

func isMuted(_ id: AudioDeviceID, _ direction: Direction) -> Bool? {
    property(id, kAudioDevicePropertyMute, direction.scope, initial: UInt32(0)).map { $0 != 0 }
}
