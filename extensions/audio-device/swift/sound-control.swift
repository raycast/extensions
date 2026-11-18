import CoreAudio
import AudioToolbox
import Foundation

// MARK: - Core Audio Helpers (Output)

func getDefaultOutputDeviceID() -> AudioDeviceID? {
    var deviceID = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &address,
        0,
        nil,
        &size,
        &deviceID
    )
    
    return status == noErr ? deviceID : nil
}

func getDeviceVolume(deviceID: AudioDeviceID) -> Float32? {
    var volume: Float32 = 0.0
    var size = UInt32(MemoryLayout<Float32>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwareServiceDeviceProperty_VirtualMainVolume,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &volume)
    return status == noErr ? volume : nil
}

func setDeviceVolume(deviceID: AudioDeviceID, volume: Float32) -> Bool {
    var vol = volume
    // Clamp volume between 0.0 and 1.0
    if vol < 0.0 { vol = 0.0 }
    if vol > 1.0 { vol = 1.0 }
    
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwareServiceDeviceProperty_VirtualMainVolume,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectSetPropertyData(deviceID, &address, 0, nil, UInt32(MemoryLayout<Float32>.size), &vol)
    return status == noErr
}

func getDeviceMute(deviceID: AudioDeviceID) -> Bool? {
    var muted: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyMute,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &muted)
    return status == noErr ? (muted != 0) : nil
}

func setDeviceMute(deviceID: AudioDeviceID, muted: Bool) -> Bool {
    var muteVal: UInt32 = muted ? 1 : 0
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyMute,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectSetPropertyData(deviceID, &address, 0, nil, UInt32(MemoryLayout<UInt32>.size), &muteVal)
    return status == noErr
}

struct AudioDevice: Encodable {
    let id: UInt32
    let name: String
    let isDefault: Bool
}

func getOutputDevices() -> [AudioDevice] {
    var size = UInt32(0)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else {
        return []
    }
    
    let count = Int(size) / MemoryLayout<AudioDeviceID>.size
    var deviceIDs = [AudioDeviceID](repeating: 0, count: count)
    
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &deviceIDs) == noErr else {
        return []
    }
    
    let defaultDeviceID = getDefaultOutputDeviceID()
    var devices: [AudioDevice] = []
    
    for id in deviceIDs {
        // Check if device has output channels
        var streamAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreams,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain
        )
        var streamSize = UInt32(0)
        AudioObjectGetPropertyDataSize(id, &streamAddress, 0, nil, &streamSize)
        if streamSize == 0 { continue }
        
        // Get device name
        var nameSize = UInt32(MemoryLayout<CFString?>.size)
        var nameAddress = AudioObjectPropertyAddress(
            mSelector: kAudioObjectPropertyName,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        var name: CFString?
        guard AudioObjectGetPropertyData(id, &nameAddress, 0, nil, &nameSize, &name) == noErr,
              let deviceName = name as String? else {
            continue
        }
        
        devices.append(AudioDevice(id: id, name: deviceName, isDefault: id == defaultDeviceID))
    }
    
    return devices
}

// MARK: - Core Audio Helpers (Input)

func getDefaultInputDeviceID() -> AudioDeviceID? {
    var deviceID = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &address,
        0,
        nil,
        &size,
        &deviceID
    )
    
    return status == noErr ? deviceID : nil
}

func getInputDeviceVolume(deviceID: AudioDeviceID) -> Float32? {
    var volume: Float32 = 0.0
    var size = UInt32(MemoryLayout<Float32>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwareServiceDeviceProperty_VirtualMainVolume,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &volume)
    return status == noErr ? volume : nil
}

func setInputDeviceVolume(deviceID: AudioDeviceID, volume: Float32) -> Bool {
    var vol = volume
    // Clamp volume between 0.0 and 1.0
    if vol < 0.0 { vol = 0.0 }
    if vol > 1.0 { vol = 1.0 }
    
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwareServiceDeviceProperty_VirtualMainVolume,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectSetPropertyData(deviceID, &address, 0, nil, UInt32(MemoryLayout<Float32>.size), &vol)
    return status == noErr
}

func getInputDeviceMute(deviceID: AudioDeviceID) -> Bool? {
    var muted: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyMute,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &muted)
    return status == noErr ? (muted != 0) : nil
}

func setInputDeviceMute(deviceID: AudioDeviceID, muted: Bool) -> Bool {
    var muteVal: UInt32 = muted ? 1 : 0
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyMute,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    
    let status = AudioObjectSetPropertyData(deviceID, &address, 0, nil, UInt32(MemoryLayout<UInt32>.size), &muteVal)
    return status == noErr
}

func getInputDevices() -> [AudioDevice] {
    var size = UInt32(0)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else {
        return []
    }
    
    let count = Int(size) / MemoryLayout<AudioDeviceID>.size
    var deviceIDs = [AudioDeviceID](repeating: 0, count: count)
    
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &deviceIDs) == noErr else {
        return []
    }
    
    let defaultDeviceID = getDefaultInputDeviceID()
    var devices: [AudioDevice] = []
    
    for id in deviceIDs {
        // Check if device has input channels
        var streamAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreams,
            mScope: kAudioDevicePropertyScopeInput,
            mElement: kAudioObjectPropertyElementMain
        )
        var streamSize = UInt32(0)
        AudioObjectGetPropertyDataSize(id, &streamAddress, 0, nil, &streamSize)
        if streamSize == 0 { continue }
        
        // Get device name
        var nameSize = UInt32(MemoryLayout<CFString?>.size)
        var nameAddress = AudioObjectPropertyAddress(
            mSelector: kAudioObjectPropertyName,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        var name: CFString?
        guard AudioObjectGetPropertyData(id, &nameAddress, 0, nil, &nameSize, &name) == noErr,
              let deviceName = name as String? else {
            continue
        }
        
        devices.append(AudioDevice(id: id, name: deviceName, isDefault: id == defaultDeviceID))
    }
    
    return devices
}

// MARK: - Main Logic

func printDevicesJSON(_ devices: [AudioDevice]) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = .prettyPrinted
    if let data = try? encoder.encode(devices),
       let json = String(data: data, encoding: .utf8) {
        print(json)
    } else {
        print("[]")
    }
}

func main() {
    let args = CommandLine.arguments
    
    if args.count < 2 {
        printUsage()
        exit(0)
    }
    
    let command = args[1]
    
    // Handle list commands first as they don't require a specific device
    if command == "list" {
        printDevicesJSON(getOutputDevices())
        exit(0)
    }
    
    if command == "list-input" {
        printDevicesJSON(getInputDevices())
        exit(0)
    }

    if command == "get-all" {
        printVolumeInfoJSON(getAllOutputVolumeInfo())
        exit(0)
    }

    if command == "get-all-input" {
        printVolumeInfoJSON(getAllInputVolumeInfo())
        exit(0)
    }
    
    // Determine if this is an input command
    let isInputCommand = command.hasSuffix("-input") || command == "mute-input"
    
    // For other commands, determine target device
    var targetDeviceID: AudioDeviceID?
    
    // Determine minimum arg count for each command (without device ID)
    // get / get-input: [exe, cmd] = 2
    // set / set-input: [exe, cmd, volume] = 3
    // mute / mute-input: [exe, cmd, subcmd] = 3
    let minArgs: Int
    switch command {
    case "get", "get-input":
        minArgs = 2
    case "set", "set-input", "mute", "mute-input":
        minArgs = 3
    default:
        minArgs = 2
    }
    
    // Only treat the last arg as a device ID if there are more args than the command requires
    if args.count > minArgs, let lastArg = args.last, let id = AudioDeviceID(lastArg) {
        targetDeviceID = id
    }
    
    // Fallback to default device if no specific ID provided
    if targetDeviceID == nil {
        if isInputCommand {
            guard let defaultID = getDefaultInputDeviceID() else {
                print("Error: Could not find default input device")
                exit(1)
            }
            targetDeviceID = defaultID
        } else {
            guard let defaultID = getDefaultOutputDeviceID() else {
                print("Error: Could not find default output device")
                exit(1)
            }
            targetDeviceID = defaultID
        }
    }
    
    guard let deviceID = targetDeviceID else {
        print("Error: Invalid device ID")
        exit(1)
    }
    
    switch command {
    // MARK: Output commands
    case "get":
        if let vol = getDeviceVolume(deviceID: deviceID) {
            print("\(Int(round(vol * 100)))")
        } else {
            print("Error: Failed to get volume")
            exit(1)
        }
        
    case "set":
        if args.count < 3 {
            print("Error: Missing volume argument")
            exit(1)
        }
        if let vol = Float(args[2]) {
            if setDeviceVolume(deviceID: deviceID, volume: vol / 100.0) {
                // Success
            } else {
                print("Error: Failed to set volume")
                exit(1)
            }
        } else {
            print("Error: Invalid volume value")
            exit(1)
        }
        
    case "mute":
        if args.count < 3 {
            print("Error: Missing mute command (get, on, off, toggle)")
            exit(1)
        }
        let subCommand = args[2]
        
        switch subCommand {
        case "get":
            if let muted = getDeviceMute(deviceID: deviceID) {
                print(muted ? "true" : "false")
            } else {
                print("Error: Failed to get mute state")
                exit(1)
            }
        case "on":
            if !setDeviceMute(deviceID: deviceID, muted: true) {
                print("Error: Failed to mute")
                exit(1)
            }
        case "off":
            if !setDeviceMute(deviceID: deviceID, muted: false) {
                print("Error: Failed to unmute")
                exit(1)
            }
        case "toggle":
            if let currentMute = getDeviceMute(deviceID: deviceID) {
                if setDeviceMute(deviceID: deviceID, muted: !currentMute) {
                    print(!currentMute ? "true" : "false")
                } else {
                    print("Error: Failed to toggle mute")
                    exit(1)
                }
            } else {
                print("Error: Failed to get current mute state")
                exit(1)
            }
        default:
            print("Error: Unknown mute command: \(subCommand)")
            exit(1)
        }
    
    // MARK: Input commands
    case "get-input":
        if let vol = getInputDeviceVolume(deviceID: deviceID) {
            print("\(Int(round(vol * 100)))")
        } else {
            print("Error: Failed to get input volume")
            exit(1)
        }
        
    case "set-input":
        if args.count < 3 {
            print("Error: Missing volume argument")
            exit(1)
        }
        if let vol = Float(args[2]) {
            if setInputDeviceVolume(deviceID: deviceID, volume: vol / 100.0) {
                // Success
            } else {
                print("Error: Failed to set input volume")
                exit(1)
            }
        } else {
            print("Error: Invalid volume value")
            exit(1)
        }
        
    case "mute-input":
        if args.count < 3 {
            print("Error: Missing mute command (get, on, off, toggle)")
            exit(1)
        }
        let subCommand = args[2]
        
        switch subCommand {
        case "get":
            if let muted = getInputDeviceMute(deviceID: deviceID) {
                print(muted ? "true" : "false")
            } else {
                print("Error: Failed to get input mute state")
                exit(1)
            }
        case "on":
            if !setInputDeviceMute(deviceID: deviceID, muted: true) {
                print("Error: Failed to mute input")
                exit(1)
            }
        case "off":
            if !setInputDeviceMute(deviceID: deviceID, muted: false) {
                print("Error: Failed to unmute input")
                exit(1)
            }
        case "toggle":
            if let currentMute = getInputDeviceMute(deviceID: deviceID) {
                if setInputDeviceMute(deviceID: deviceID, muted: !currentMute) {
                    print(!currentMute ? "true" : "false")
                } else {
                    print("Error: Failed to toggle input mute")
                    exit(1)
                }
            } else {
                print("Error: Failed to get current input mute state")
                exit(1)
            }
        default:
            print("Error: Unknown mute-input command: \(subCommand)")
            exit(1)
        }
        
    default:
        printUsage()
        exit(1)
    }
}

struct VolumeInfoEntry: Encodable {
    let name: String
    let volume: Int?
    let muted: Bool?
    let isDefault: Bool
}

func getAllOutputVolumeInfo() -> [String: VolumeInfoEntry] {
    var result: [String: VolumeInfoEntry] = [:]
    for device in getOutputDevices() {
        let vol = getDeviceVolume(deviceID: device.id)
        let mute = getDeviceMute(deviceID: device.id)
        result[String(device.id)] = VolumeInfoEntry(
            name: device.name,
            volume: vol != nil ? Int(round(vol! * 100)) : nil,
            muted: mute,
            isDefault: device.isDefault
        )
    }
    return result
}

func getAllInputVolumeInfo() -> [String: VolumeInfoEntry] {
    var result: [String: VolumeInfoEntry] = [:]
    for device in getInputDevices() {
        let vol = getInputDeviceVolume(deviceID: device.id)
        let mute = getInputDeviceMute(deviceID: device.id)
        result[String(device.id)] = VolumeInfoEntry(
            name: device.name,
            volume: vol != nil ? Int(round(vol! * 100)) : nil,
            muted: mute,
            isDefault: device.isDefault
        )
    }
    return result
}

func printVolumeInfoJSON(_ info: [String: VolumeInfoEntry]) {
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(info),
       let json = String(data: data, encoding: .utf8) {
        print(json)
    } else {
        print("{}")
    }
}

func printUsage() {
    print("""
    Usage:
      sound-control list                        List output devices (JSON)
      sound-control get [deviceID]              Get volume (0-100)
      sound-control set <0-100> [deviceID]      Set volume
      sound-control mute get [deviceID]         Get mute state
      sound-control mute on [deviceID]          Mute
      sound-control mute off [deviceID]         Unmute
      sound-control mute toggle [deviceID]      Toggle mute

      sound-control get-all                      Get volume+mute for all output devices (JSON)
      sound-control get-all-input                Get volume+mute for all input devices (JSON)

      sound-control list-input                  List input devices (JSON)
      sound-control get-input [deviceID]        Get input volume (0-100)
      sound-control set-input <0-100> [deviceID] Set input volume
      sound-control mute-input get [deviceID]   Get input mute state
      sound-control mute-input on [deviceID]    Mute input
      sound-control mute-input off [deviceID]   Unmute input
      sound-control mute-input toggle [deviceID] Toggle input mute
    """)
}

main()
