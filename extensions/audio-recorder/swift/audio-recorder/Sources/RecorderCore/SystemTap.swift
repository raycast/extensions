import AVFoundation
import CoreAudio
import Foundation

public func checkAudio(_ status: OSStatus, _ operation: String) throws {
  if status != noErr {
    throw RecorderError.message(
      "\(operation) failed (Core Audio \(status)). Check System Audio Recording permission and your audio devices."
    )
  }
}

/// Private, unmuted global process tap: playback keeps using the user's current output.
public final class SystemTap {
  private var tap: AudioObjectID = 0
  private var device: AudioObjectID = 0
  private var proc: AudioDeviceIOProcID?
  public init() {}
  public func start(queue: DispatchQueue, receive: @escaping (AVAudioPCMBuffer, UInt64) -> Void)
    throws
  {
    let description = CATapDescription(stereoGlobalTapButExcludeProcesses: [])
    description.name = "Audio Recorder System Audio"
    description.isPrivate = true
    description.muteBehavior = .unmuted
    do {
      try checkAudio(AudioHardwareCreateProcessTap(description, &tap), "Create system audio tap")
      var address = AudioObjectPropertyAddress(
        mSelector: kAudioTapPropertyFormat, mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
      var asbd = AudioStreamBasicDescription()
      var size = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
      try checkAudio(
        AudioObjectGetPropertyData(tap, &address, 0, nil, &size, &asbd), "Read tap format")
      guard let format = AVAudioFormat(streamDescription: &asbd), asbd.mBytesPerFrame > 0 else {
        throw RecorderError.message("Invalid system audio format.")
      }
      let configuration: [String: Any] = [
        kAudioAggregateDeviceNameKey: "Audio Recorder Private Capture",
        kAudioAggregateDeviceUIDKey: UUID().uuidString,
        kAudioAggregateDeviceIsPrivateKey: true,
        kAudioAggregateDeviceTapAutoStartKey: true,
        kAudioAggregateDeviceTapListKey: [
          [kAudioSubTapUIDKey: description.uuid.uuidString, kAudioSubTapDriftCompensationKey: true]
        ],
      ]
      try checkAudio(
        AudioHardwareCreateAggregateDevice(configuration as CFDictionary, &device),
        "Create private capture device")
      // HAL invokes the block on this serial queue. Copy borrowed buffers immediately.
      try checkAudio(
        AudioDeviceCreateIOProcIDWithBlock(&proc, device, queue) { _, input, inputTime, _, _ in
          let list = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: input))
          guard let first = list.first else { return }
          let frames = first.mDataByteSize / asbd.mBytesPerFrame
          guard frames > 0, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)
          else { return }
          buffer.frameLength = frames
          let destination = UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList)
          guard destination.count == list.count else { return }
          for index in 0..<list.count {
            guard let source = list[index].mData, let target = destination[index].mData else {
              return
            }
            memcpy(
              target, source,
              min(Int(list[index].mDataByteSize), Int(destination[index].mDataByteSize)))
          }
          receive(buffer, inputTime.pointee.mHostTime)
        }, "Install system capture callback")
      try checkAudio(AudioDeviceStart(device, proc), "Start system audio capture")
    } catch {
      stop()
      throw error
    }
  }
  public func stop() {
    if device != 0, let proc {
      AudioDeviceStop(device, proc)
      AudioDeviceDestroyIOProcID(device, proc)
    }
    proc = nil
    if device != 0 {
      AudioHardwareDestroyAggregateDevice(device)
      device = 0
    }
    if tap != 0 {
      AudioHardwareDestroyProcessTap(tap)
      tap = 0
    }
  }
  deinit { stop() }
}
