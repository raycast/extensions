import AppKit
import CoreAudio
import CoreGraphics
import Darwin
import Foundation
import RaycastSwiftMacros

struct Monitor: Encodable {
    let id: String
    let name: String
    let builtIn: Bool
}

struct Reading: Encodable {
    let current: Double
    let maximum: Double = 100
}

struct HelperError: Error, CustomStringConvertible {
    let description: String
    init(_ message: String) { description = message }
}

func displayIDs() throws -> [CGDirectDisplayID] {
    var count: UInt32 = 0
    guard CGGetOnlineDisplayList(0, nil, &count) == .success else {
        throw HelperError("macOS could not list connected displays.")
    }
    guard count > 0 else { return [] }
    var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
    guard CGGetOnlineDisplayList(count, &ids, &count) == .success else {
        throw HelperError("macOS could not list connected displays.")
    }
    return Array(ids.prefix(Int(count)))
}

func displayUUID(_ id: CGDirectDisplayID) -> String? {
    guard let uuid = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() else { return nil }
    return CFUUIDCreateString(nil, uuid) as String
}

@raycast func listMonitors() throws -> [Monitor] {
    let screens = NSScreen.screens
    return try displayIDs().compactMap { id in
        guard let uuid = displayUUID(id) else { return nil }
        let screen = screens.first { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == id }
        let builtIn = CGDisplayIsBuiltin(id) != 0
        return Monitor(id: uuid, name: screen?.localizedName ?? (builtIn ? "Built-in Display" : "External Display"), builtIn: builtIn)
    }
}

func builtInDisplay(_ uuid: String) throws -> CGDirectDisplayID {
    guard let id = try displayIDs().first(where: { displayUUID($0)?.lowercased() == uuid.lowercased() }),
          CGDisplayIsBuiltin(id) != 0 else {
        throw HelperError("The built-in display is no longer connected. Refresh the display list.")
    }
    return id
}

func brightness(_ id: CGDirectDisplayID, delta: Float?, target: Float? = nil) throws -> Float {
    guard let library = dlopen("/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices", RTLD_LAZY) else {
        throw HelperError("macOS does not expose brightness control on this system.")
    }
    defer { dlclose(library) }
    typealias GetBrightness = @convention(c) (UInt32, UnsafeMutablePointer<Float>) -> Int32
    typealias SetBrightness = @convention(c) (UInt32, Float) -> Int32
    guard let getSymbol = dlsym(library, "DisplayServicesGetBrightness"),
          let setSymbol = dlsym(library, "DisplayServicesSetBrightness") else {
        throw HelperError("macOS does not expose brightness control on this system.")
    }
    let get = unsafeBitCast(getSymbol, to: GetBrightness.self)
    let set = unsafeBitCast(setSymbol, to: SetBrightness.self)
    var value: Float = 0
    guard get(id, &value) == 0, value.isFinite, (0...1).contains(value) else {
        throw HelperError("macOS could not read the built-in display's brightness.")
    }
    if delta != nil || target != nil {
        guard set(id, target ?? min(1, max(0, value + (delta ?? 0)))) == 0 else {
            throw HelperError("macOS could not change the built-in display's brightness.")
        }
        guard get(id, &value) == 0, value.isFinite, (0...1).contains(value) else {
            throw HelperError("macOS could not read brightness after the adjustment.")
        }
    }
    return value
}

func address(_ selector: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal, _ element: AudioObjectPropertyElement = kAudioObjectPropertyElementMain) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: element)
}

func builtInSpeakers() throws -> AudioDeviceID {
    var property = address(kAudioHardwarePropertyDevices)
    var size: UInt32 = 0
    let system = AudioObjectID(kAudioObjectSystemObject)
    guard AudioObjectGetPropertyDataSize(system, &property, 0, nil, &size) == noErr else {
        throw HelperError("macOS could not list audio devices.")
    }
    var devices = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(system, &property, 0, nil, &size, &devices) == noErr else {
        throw HelperError("macOS could not list audio devices.")
    }
    for device in devices {
        var transportProperty = address(kAudioDevicePropertyTransportType)
        var transport: UInt32 = 0
        var transportSize = UInt32(MemoryLayout<UInt32>.size)
        guard AudioObjectGetPropertyData(device, &transportProperty, 0, nil, &transportSize, &transport) == noErr,
              transport == kAudioDeviceTransportTypeBuiltIn else { continue }
        var streamsProperty = address(kAudioDevicePropertyStreams, kAudioDevicePropertyScopeOutput)
        var streamsSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(device, &streamsProperty, 0, nil, &streamsSize) == noErr, streamsSize > 0 else { continue }
        var uidProperty = address(kAudioDevicePropertyDeviceUID)
        var uid: Unmanaged<CFString>?
        var uidSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        guard AudioObjectGetPropertyData(device, &uidProperty, 0, nil, &uidSize, &uid) == noErr,
              let identifier = uid?.takeRetainedValue() as String?,
              !identifier.lowercased().contains("headphone") else { continue }
        return device
    }
    throw HelperError("macOS could not find the Mac's built-in speakers.")
}

func volumeChannels(_ device: AudioDeviceID) throws -> [AudioObjectPropertyElement] {
    var master = address(kAudioDevicePropertyVolumeScalar, kAudioDevicePropertyScopeOutput)
    var settable = DarwinBoolean(false)
    if AudioObjectHasProperty(device, &master),
       AudioObjectIsPropertySettable(device, &master, &settable) == noErr, settable.boolValue {
        return [kAudioObjectPropertyElementMain]
    }
    var property = address(kAudioDevicePropertyStreamConfiguration, kAudioDevicePropertyScopeOutput)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(device, &property, 0, nil, &size) == noErr,
          size >= MemoryLayout<AudioBufferList>.size else {
        throw HelperError("macOS could not read the built-in speaker channels.")
    }
    let memory = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { memory.deallocate() }
    guard AudioObjectGetPropertyData(device, &property, 0, nil, &size, memory) == noErr else {
        throw HelperError("macOS could not read the built-in speaker channels.")
    }
    let buffers = UnsafeMutableAudioBufferListPointer(memory.assumingMemoryBound(to: AudioBufferList.self))
    let count = buffers.reduce(0) { $0 + Int($1.mNumberChannels) }
    guard count > 0 else { throw HelperError("The built-in speakers have no output channels.") }
    let channels = (1...count).map { AudioObjectPropertyElement($0) }
    for channel in channels {
        var channelProperty = address(kAudioDevicePropertyVolumeScalar, kAudioDevicePropertyScopeOutput, channel)
        var writable = DarwinBoolean(false)
        guard AudioObjectHasProperty(device, &channelProperty),
              AudioObjectIsPropertySettable(device, &channelProperty, &writable) == noErr, writable.boolValue else {
            throw HelperError("macOS does not expose built-in speaker volume control.")
        }
    }
    return channels
}

func speakerVolume(delta: Float?, target: Float? = nil) throws -> Float {
    let device = try builtInSpeakers()
    let channels = try volumeChannels(device)
    func read(_ channel: AudioObjectPropertyElement) throws -> Float {
        var property = address(kAudioDevicePropertyVolumeScalar, kAudioDevicePropertyScopeOutput, channel)
        var value: Float = 0
        var size = UInt32(MemoryLayout<Float>.size)
        guard AudioObjectGetPropertyData(device, &property, 0, nil, &size, &value) == noErr,
              value.isFinite, (0...1).contains(value) else {
            throw HelperError("macOS could not read the built-in speaker volume.")
        }
        return value
    }
    let values = try channels.map(read)
    var offset = delta
    if let target {
        // A shared offset preserves channel balance until a channel reaches its limit.
        var lower: Float = -1
        var upper: Float = 1
        for _ in 0..<24 {
            let middle = (lower + upper) / 2
            let mean = values.map { min(1, max(0, $0 + middle)) }.reduce(0, +) / Float(values.count)
            if mean < target { lower = middle } else { upper = middle }
        }
        offset = target == 0 ? -1 : target == 1 ? 1 : (lower + upper) / 2
    }
    if let offset {
        for (channel, current) in zip(channels, values) {
            var property = address(kAudioDevicePropertyVolumeScalar, kAudioDevicePropertyScopeOutput, channel)
            var target = min(1, max(0, current + offset))
            guard AudioObjectSetPropertyData(device, &property, 0, nil, UInt32(MemoryLayout<Float>.size), &target) == noErr else {
                throw HelperError("macOS could not change the built-in speaker volume.")
            }
        }
    }
    return try channels.map(read).reduce(0, +) / Float(channels.count)
}

func controlReading(uuid: String, control: String, delta: Float?, target: Float? = nil) throws -> Reading {
    let id = try builtInDisplay(uuid)
    let value: Float
    switch control {
    case "luminance": value = try brightness(id, delta: delta, target: target)
    case "volume": value = try speakerVolume(delta: delta, target: target)
    default: throw HelperError("macOS does not expose contrast control for the built-in display.")
    }
    return Reading(current: Double(value) * 100)
}

@raycast func readControl(uuid: String, control: String) throws -> Reading {
    try controlReading(uuid: uuid, control: control, delta: nil)
}

@raycast func adjustControl(uuid: String, control: String, amount: Float) throws -> Reading {
    guard amount.isFinite, amount != 0, abs(amount) <= 100 else {
        throw HelperError("The adjustment must be a percentage between -100 and 100.")
    }
    return try controlReading(uuid: uuid, control: control, delta: amount / 100)
}

@raycast func setControl(uuid: String, control: String, percent: Float) throws -> Reading {
    guard percent.isFinite, (0...100).contains(percent) else {
        throw HelperError("The default level must be between 0% and 100%.")
    }
    return try controlReading(uuid: uuid, control: control, delta: nil, target: percent / 100)
}
