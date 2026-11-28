// The functions the extension calls (src/audio-device.ts imports them with `swift:../swift`). Each returns a
// Promise on the TypeScript side; a thrown AudioError rejects it with its message.

import AudioToolbox
import CoreAudio
import Foundation
import RaycastSwiftMacros

struct Device: Encodable {
    /// Core Audio object ID; changes when the device reconnects.
    let id: String
    /// Persistent device UID.
    let uid: String
    let name: String
    let isInput: Bool
    let isOutput: Bool
    let transportType: String?
}

struct DeviceState: Encodable {
    let devices: [Device]
    /// Missing when the direction has no default device (no devices at all).
    let current: Device?
}

struct VolumeInfo: Encodable {
    /// 0–100, missing when the device has no volume control.
    let volume: Int?
    let muted: Bool?
}

/// The devices of a direction ("output" or "input") and the current default device.
@raycast func deviceState(direction: String) throws -> DeviceState {
    let direction = try Direction(parsing: direction)
    let list = devices(direction)
    let currentID = defaultDeviceID(direction).map(String.init)
    return DeviceState(devices: list, current: list.first { $0.id == currentID })
}

/// Make a device the default for its direction. For output, `systemSounds` also moves system sounds to it.
@raycast func setDefaultDevice(direction: String, id: String, systemSounds: Bool) throws {
    let direction = try Direction(parsing: direction)
    let device = try deviceID(id, direction)
    guard setProperty(systemObject, direction.defaultDeviceSelector, value: device) else {
        throw AudioError(description: "Could not switch to the device")
    }
    if direction == .output && systemSounds {
        guard setProperty(systemObject, kAudioHardwarePropertyDefaultSystemOutputDevice, value: device) else {
            throw AudioError(description: "Could not move system sounds to the device")
        }
    }
}

/// Volume and mute of every device in this direction, keyed by device ID.
@raycast func volumes(direction: String) throws -> [String: VolumeInfo] {
    let direction = try Direction(parsing: direction)
    var result: [String: VolumeInfo] = [:]
    for id in allDeviceIDs() where hasStreams(id, direction) {
        result[String(id)] = VolumeInfo(
            volume: volume(id, direction).map { Int(($0 * 100).rounded()) },
            muted: isMuted(id, direction)
        )
    }
    return result
}

/// Set the volume (0–100).
@raycast func setVolume(direction: String, id: String, percent: Int) throws {
    let direction = try Direction(parsing: direction)
    let device = try deviceID(id, direction)
    let level = Float32(min(max(percent, 0), 100)) / 100
    guard setProperty(device, kAudioHardwareServiceDeviceProperty_VirtualMainVolume, direction.scope, value: level) else {
        throw AudioError(description: "Could not set the volume")
    }
}

/// Toggle mute and return the new state.
@raycast func toggleMute(direction: String, id: String) throws -> Bool {
    let direction = try Direction(parsing: direction)
    let device = try deviceID(id, direction)
    guard let muted = isMuted(device, direction) else { throw AudioError(description: "The device has no mute control") }
    guard setProperty(device, kAudioDevicePropertyMute, direction.scope, value: UInt32(muted ? 0 : 1)) else {
        throw AudioError(description: "Could not change mute")
    }
    return !muted
}
