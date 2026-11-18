import AVFoundation
import CoreAudio
import CoreMedia
import Foundation

/// Input-only AVFoundation capture avoids binding the microphone to an output audio engine.
/// This matters when a private system tap/aggregate is created or headphones change profiles.
final class MicrophoneCapture: NSObject, AVCaptureAudioDataOutputSampleBufferDelegate {
  private let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "audio-recorder.microphone", qos: .userInitiated)
  private var observer: NSObjectProtocol?
  var receive: ((AVAudioPCMBuffer, UInt64) -> Void)?
  var failure: ((String) -> Void)?
  private(set) var deviceName = ""
  func start(source: String = "default") throws {
    let device: AVCaptureDevice?
    if source == "built-in" {
      device = AVCaptureDevice.DiscoverySession(
        deviceTypes: [.microphone, .external], mediaType: .audio, position: .unspecified
      ).devices.first {
        $0.transportType == Int32(kAudioDeviceTransportTypeBuiltIn)
      }
    } else {
      device = AVCaptureDevice.default(for: .audio)
    }
    guard let device else {
      throw RecorderError.message("No default microphone is available.")
    }
    deviceName = device.localizedName
    let input = try AVCaptureDeviceInput(device: device)
    let output = AVCaptureAudioDataOutput()
    output.audioSettings = nil
    output.setSampleBufferDelegate(self, queue: queue)
    session.beginConfiguration()
    guard session.canAddInput(input), session.canAddOutput(output) else {
      session.commitConfiguration()
      throw RecorderError.message("Cannot configure the selected microphone.")
    }
    session.addInput(input)
    session.addOutput(output)
    session.commitConfiguration()
    observer = NotificationCenter.default.addObserver(
      forName: AVCaptureSession.runtimeErrorNotification, object: session, queue: nil
    ) { [weak self] note in
      let error = note.userInfo?[AVCaptureSessionErrorKey] as? NSError
      self?.failure?(
        "Microphone capture failed: \(error?.localizedDescription ?? "The device stopped responding.")"
      )
    }
    session.startRunning()
    guard session.isRunning else {
      throw RecorderError.message(
        "The microphone could not start. Check its permission and connection.")
    }
  }
  func captureOutput(
    _ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard CMSampleBufferDataIsReady(sampleBuffer),
      let description = CMSampleBufferGetFormatDescription(sampleBuffer),
      let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(description)
    else { return }
    let count = CMSampleBufferGetNumSamples(sampleBuffer)
    guard count > 0, let format = AVAudioFormat(streamDescription: asbd),
      let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count)),
      let clock = session.synchronizationClock
    else { return }
    buffer.frameLength = AVAudioFrameCount(count)
    let result = CMSampleBufferCopyPCMDataIntoAudioBufferList(
      sampleBuffer, at: 0, frameCount: Int32(count), into: buffer.mutableAudioBufferList)
    guard result == noErr else {
      failure?("Cannot read microphone samples (\(result)).")
      return
    }
    let timestamp = CMSyncConvertTime(
      CMSampleBufferGetPresentationTimeStamp(sampleBuffer), from: clock,
      to: CMClockGetHostTimeClock())
    guard timestamp.isValid, timestamp.isNumeric else {
      failure?("The microphone returned an invalid timestamp.")
      return
    }
    receive?(buffer, CMClockConvertHostTimeToSystemUnits(timestamp))
  }
  func stop() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
    session.stopRunning()
    queue.sync {
      receive = nil
      failure = nil
    }
  }
  deinit { stop() }
}
