import Foundation
import AVFoundation
import CoreAudio
import AudioToolbox
import RaycastSwiftMacros

struct AudioDevice: Codable {
    let id: String
    let name: String
    let isDefault: Bool
    let type: String
    let manufacturer: String?
    let inputChannels: Int
    let sampleRate: Double?
    let isConnected: Bool
}

struct AudioDeviceError: Error, Codable {
    let message: String
    let code: Int
}

@raycast func getAudioInputDevices() throws -> [AudioDevice] {
    var devices: [AudioDevice] = []
    
    // Get the default input device first
    var defaultInputDeviceID: AudioDeviceID = 0
    var defaultInputDeviceSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    var defaultInputDeviceAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let defaultResult = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &defaultInputDeviceAddress,
        0,
        nil,
        &defaultInputDeviceSize,
        &defaultInputDeviceID
    )
    
    // Get all audio devices
    var deviceListSize: UInt32 = 0
    var deviceListAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    // Get the size of the device list
    let sizeResult = AudioObjectGetPropertyDataSize(
        AudioObjectID(kAudioObjectSystemObject),
        &deviceListAddress,
        0,
        nil,
        &deviceListSize
    )
    
    guard sizeResult == noErr else {
        throw AudioDeviceError(message: "Failed to get device list size", code: Int(sizeResult))
    }
    
    let deviceCount = Int(deviceListSize) / MemoryLayout<AudioDeviceID>.size
    var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
    
    // Get the actual device list
    let listResult = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &deviceListAddress,
        0,
        nil,
        &deviceListSize,
        &deviceIDs
    )
    
    guard listResult == noErr else {
        throw AudioDeviceError(message: "Failed to get device list", code: Int(listResult))
    }
    
    // Process each device
    for deviceID in deviceIDs {
        // Check if device has input streams
        let inputChannels = getInputChannelCount(for: deviceID)
        guard inputChannels > 0 else { continue }
        
        // Get device name
        let deviceName = getDeviceName(for: deviceID) ?? "Unknown Device"
        
        // Get manufacturer
        let manufacturer = getDeviceManufacturer(for: deviceID)
        
        // Get device type/transport type
        let deviceType = getDeviceType(for: deviceID)
        
        // Get sample rate
        let sampleRate = getSampleRate(for: deviceID)
        
        // Check if device is connected
        let isConnected = isDeviceConnected(deviceID)
        
        // Check if this is the default device
        let isDefault = (defaultResult == noErr && deviceID == defaultInputDeviceID)
        
        let device = AudioDevice(
            id: String(deviceID),
            name: deviceName,
            isDefault: isDefault,
            type: deviceType,
            manufacturer: manufacturer,
            inputChannels: inputChannels,
            sampleRate: sampleRate,
            isConnected: isConnected
        )
        
        devices.append(device)
    }
    
    return devices
}

@raycast func getCurrentInputDevice() throws -> AudioDevice? {
    var defaultInputDeviceID: AudioDeviceID = 0
    var defaultInputDeviceSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    var defaultInputDeviceAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let result = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &defaultInputDeviceAddress,
        0,
        nil,
        &defaultInputDeviceSize,
        &defaultInputDeviceID
    )
    
    guard result == noErr && defaultInputDeviceID != kAudioDeviceUnknown else {
        return nil
    }
    
    let deviceName = getDeviceName(for: defaultInputDeviceID) ?? "Unknown Device"
    let manufacturer = getDeviceManufacturer(for: defaultInputDeviceID)
    let deviceType = getDeviceType(for: defaultInputDeviceID)
    let inputChannels = getInputChannelCount(for: defaultInputDeviceID)
    let sampleRate = getSampleRate(for: defaultInputDeviceID)
    let isConnected = isDeviceConnected(defaultInputDeviceID)
    
    return AudioDevice(
        id: String(defaultInputDeviceID),
        name: deviceName,
        isDefault: true,
        type: deviceType,
        manufacturer: manufacturer,
        inputChannels: inputChannels,
        sampleRate: sampleRate,
        isConnected: isConnected
    )
}

@raycast func getInputVolume() throws -> Double {
    // Get current input volume (0.0 to 1.0)
    var defaultInputDeviceID: AudioDeviceID = 0
    var defaultInputDeviceSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    var defaultInputDeviceAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let defaultResult = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &defaultInputDeviceAddress,
        0,
        nil,
        &defaultInputDeviceSize,
        &defaultInputDeviceID
    )
    
    guard defaultResult == noErr && defaultInputDeviceID != kAudioDeviceUnknown else {
        throw AudioDeviceError(message: "No default input device found", code: -1)
    }
    
    var volume: Float32 = 0.0
    var volumeSize = UInt32(MemoryLayout<Float32>.size)
    var volumeAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyVolumeScalar,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let volumeResult = AudioObjectGetPropertyData(
        defaultInputDeviceID,
        &volumeAddress,
        0,
        nil,
        &volumeSize,
        &volume
    )
    
    if volumeResult == noErr {
        return Double(volume)
    }
    
    // Fallback: try to get input gain instead
    var gainAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyVolumeDecibels,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var gain: Float32 = 0.0
    let gainResult = AudioObjectGetPropertyData(
        defaultInputDeviceID,
        &gainAddress,
        0,
        nil,
        &volumeSize,
        &gain
    )
    
    if gainResult == noErr {
        // Convert decibels to linear scale (approximation)
        return Double(min(1.0, max(0.0, (gain + 60.0) / 60.0)))
    }
    
    return 0.5 // Default fallback
}

// MARK: - Helper Functions

private func getInputChannelCount(for deviceID: AudioDeviceID) -> Int {
    var streamConfigAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreamConfiguration,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var streamConfigSize: UInt32 = 0
    let sizeResult = AudioObjectGetPropertyDataSize(
        deviceID,
        &streamConfigAddress,
        0,
        nil,
        &streamConfigSize
    )
    
    guard sizeResult == noErr else { return 0 }
    
    let bufferListPointer = UnsafeMutablePointer<AudioBufferList>.allocate(capacity: 1)
    defer { bufferListPointer.deallocate() }
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &streamConfigAddress,
        0,
        nil,
        &streamConfigSize,
        bufferListPointer
    )
    
    guard result == noErr else { return 0 }
    
    var bufferList = bufferListPointer.pointee
    var totalChannels = 0
    
    let bufferCount = Int(bufferList.mNumberBuffers)
    if bufferCount > 0 {
        withUnsafePointer(to: &bufferList.mBuffers) { buffersPtr in
            for i in 0..<bufferCount {
                let buffer = (buffersPtr + i).pointee
                totalChannels += Int(buffer.mNumberChannels)
            }
        }
    }
    
    return totalChannels
}

private func getDeviceName(for deviceID: AudioDeviceID) -> String? {
    var nameAddress = AudioObjectPropertyAddress(
        mSelector: kAudioObjectPropertyName,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var cfStringName: CFString = "" as CFString
    var nameSize = UInt32(MemoryLayout<CFString>.size)
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &nameAddress,
        0,
        nil,
        &nameSize,
        &cfStringName
    )
    
    guard result == noErr else { return nil }
    return cfStringName as String
}

private func getDeviceManufacturer(for deviceID: AudioDeviceID) -> String? {
    var manufacturerAddress = AudioObjectPropertyAddress(
        mSelector: kAudioObjectPropertyManufacturer,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var cfStringManufacturer: CFString = "" as CFString
    var manufacturerSize = UInt32(MemoryLayout<CFString>.size)
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &manufacturerAddress,
        0,
        nil,
        &manufacturerSize,
        &cfStringManufacturer
    )
    
    guard result == noErr else { return nil }
    return cfStringManufacturer as String
}

private func getDeviceType(for deviceID: AudioDeviceID) -> String {
    var transportTypeAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyTransportType,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var transportType: UInt32 = 0
    var transportTypeSize = UInt32(MemoryLayout<UInt32>.size)
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &transportTypeAddress,
        0,
        nil,
        &transportTypeSize,
        &transportType
    )
    
    guard result == noErr else { return "Unknown" }
    
    switch transportType {
    case kAudioDeviceTransportTypeBuiltIn:
        return "Built-in"
    case kAudioDeviceTransportTypeUSB:
        return "USB"
    case kAudioDeviceTransportTypeBluetooth:
        return "Bluetooth"
    case kAudioDeviceTransportTypeBluetoothLE:
        return "Bluetooth LE"
    case kAudioDeviceTransportTypeHDMI:
        return "HDMI"
    case kAudioDeviceTransportTypeDisplayPort:
        return "DisplayPort"
    case kAudioDeviceTransportTypeAirPlay:
        return "AirPlay"
    case kAudioDeviceTransportTypeAVB:
        return "AVB"
    case kAudioDeviceTransportTypeThunderbolt:
        return "Thunderbolt"
    default:
        return "External"
    }
}

private func getSampleRate(for deviceID: AudioDeviceID) -> Double? {
    var sampleRateAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyNominalSampleRate,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var sampleRate: Float64 = 0.0
    var sampleRateSize = UInt32(MemoryLayout<Float64>.size)
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &sampleRateAddress,
        0,
        nil,
        &sampleRateSize,
        &sampleRate
    )
    
    guard result == noErr else { return nil }
    return sampleRate
}

private func isDeviceConnected(_ deviceID: AudioDeviceID) -> Bool {
    var isAliveAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceIsAlive,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    var isAlive: UInt32 = 0
    var isAliveSize = UInt32(MemoryLayout<UInt32>.size)
    
    let result = AudioObjectGetPropertyData(
        deviceID,
        &isAliveAddress,
        0,
        nil,
        &isAliveSize,
        &isAlive
    )
    
    return result == noErr && isAlive != 0
} 