import Foundation
import CoreAudio

func setMicrophoneVolume(_ volume: Float32) {
    let audioObjectID = AudioObjectID(kAudioObjectSystemObject)
    var address = AudioObjectPropertyAddress(
        mSelector: AudioObjectPropertySelector(kAudioHardwarePropertyDefaultInputDevice),
        mScope: AudioObjectPropertyScope(kAudioObjectPropertyScopeGlobal),
        mElement: AudioObjectPropertyElement(kAudioObjectPropertyElementMaster)
    )
    var deviceID: AudioObjectID = 0
    var dataSize = UInt32(MemoryLayout.size(ofValue: deviceID))
    
    AudioObjectGetPropertyData(audioObjectID, &address, 0, nil, &dataSize, &deviceID)
    
    address.mSelector = AudioObjectPropertySelector(kAudioDevicePropertyVolumeScalar)
    address.mScope = AudioObjectPropertyScope(kAudioDevicePropertyScopeInput)
    
    var inputVolume: Float32 = volume
    var dataSizeOutput = UInt32(MemoryLayout.size(ofValue: inputVolume))
    
    AudioObjectSetPropertyData(deviceID, &address, 0, nil, dataSizeOutput, &inputVolume)
}

func getMicrophoneVolume() -> Float32 {
    let audioObjectID = AudioObjectID(kAudioObjectSystemObject)
    var address = AudioObjectPropertyAddress(
        mSelector: AudioObjectPropertySelector(kAudioHardwarePropertyDefaultInputDevice),
        mScope: AudioObjectPropertyScope(kAudioObjectPropertyScopeGlobal),
        mElement: AudioObjectPropertyElement(kAudioObjectPropertyElementMaster)
    )
    var deviceID: AudioObjectID = 0
    var dataSize = UInt32(MemoryLayout.size(ofValue: deviceID))
    
    AudioObjectGetPropertyData(audioObjectID, &address, 0, nil, &dataSize, &deviceID)
    
    address.mSelector = AudioObjectPropertySelector(kAudioDevicePropertyVolumeScalar)
    address.mScope = AudioObjectPropertyScope(kAudioDevicePropertyScopeInput)
    
    var inputVolume: Float32 = 0.0
    var dataSizeOutput = UInt32(MemoryLayout.size(ofValue: inputVolume))
    
    AudioObjectGetPropertyData(deviceID, &address, 0, nil, &dataSizeOutput, &inputVolume)
    
    return inputVolume
}

func main() {
    if CommandLine.arguments.count > 1 {
        let arg = CommandLine.arguments[1]
        if arg == "set" {
            if CommandLine.arguments.count > 2, let volume = Float32(CommandLine.arguments[2]) {
                setMicrophoneVolume(volume)
                print("Audio input volume set to \(volume)")
            } else {
                print("Error: Please provide a float value for the audio input volume")
            }
        } else if arg == "get" {
            let currentVolume = getMicrophoneVolume()
            print(currentVolume)
        } else {
            print("Error: Invalid argument")
        }
    } else {
        print("Use \"set <value>\" to set new audio input volume.\nUse \"get\" to get current audio input volume.")
    }
}

main()
