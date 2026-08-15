import AVFoundation
import AppKit
import CoreImage
import Foundation

/// Writes snapshots and recordings into the folder chosen in the extension preferences.
struct CaptureDestination {
  let directory: URL

  init(preference: String) {
    let trimmed = preference.trimmingCharacters(in: .whitespaces)
    if !trimmed.isEmpty {
      directory = URL(
        fileURLWithPath: (trimmed as NSString).expandingTildeInPath, isDirectory: true)
    } else {
      directory =
        FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        ?? FileManager.default.homeDirectoryForCurrentUser
    }
  }

  /// A dated file name, in the same shape macOS uses for screenshots.
  ///
  /// The timestamp only resolves to the second, so two captures in quick succession would collide
  /// and the second would silently overwrite the first. A counter suffix keeps both, the same way
  /// macOS numbers duplicate screenshots.
  func url(extension ext: String, now: Date = Date()) -> URL {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
    let base = "Camera Preview \(formatter.string(from: now))"
    var candidate = directory.appendingPathComponent("\(base).\(ext)")
    var counter = 2
    while FileManager.default.fileExists(atPath: candidate.path) {
      candidate = directory.appendingPathComponent("\(base) (\(counter)).\(ext)")
      counter += 1
    }
    return candidate
  }

  /// Creates the folder if the user pointed at one that has since been removed.
  func prepare() -> Bool {
    var isDirectory: ObjCBool = false
    if FileManager.default.fileExists(atPath: directory.path, isDirectory: &isDirectory) {
      return isDirectory.boolValue
    }
    return
      (try? FileManager.default.createDirectory(
        at: directory, withIntermediateDirectories: true)) != nil
  }
}

/// Runs `body` on the main thread, through the run loop `NSApplication` is already turning.
///
/// Neither `Task { @MainActor in }` nor `DispatchQueue.main.async` gets a turn here: the preview
/// spends its life inside `NSApplication.run()`, so work queued on the main actor never runs and
/// the result of a capture would never reach the screen. Scheduling on the run loop in the common
/// modes also keeps it working while a window is being dragged.
func onMainThread(_ body: @escaping @MainActor () -> Void) {
  RunLoop.main.perform(inModes: [.common]) { MainActor.assumeIsolated(body) }
}

/// How the preview is displayed, and therefore how captures are written.
struct CaptureLook: Sendable {
  var mirror = false
  var zoom: CGFloat = 1

  /// Applies the zoom crop and the mirroring, so a file matches what the preview showed.
  func applied(to image: CIImage) -> CIImage {
    var result = image
    if zoom > 1 {
      let extent = result.extent
      let cropped = CGRect(
        x: extent.midX - extent.width / zoom / 2,
        y: extent.midY - extent.height / zoom / 2,
        width: extent.width / zoom,
        height: extent.height / zoom
      )
      result = result.cropped(to: cropped)
        .transformed(by: CGAffineTransform(translationX: -cropped.minX, y: -cropped.minY))
    }
    if mirror {
      let width = result.extent.width
      result = result.transformed(by: CGAffineTransform(scaleX: -1, y: 1))
        .transformed(by: CGAffineTransform(translationX: width, y: 0))
    }
    return result
  }
}

/// Encodes frames into a QuickTime movie.
///
/// `AVCaptureMovieFileOutput` would be less work, but it records what the camera sends rather than
/// what the preview shows, so the mirroring and the zoom would be missing from the file.
private final class MovieRecorder: @unchecked Sendable {
  private let writer: AVAssetWriter
  private let input: AVAssetWriterInput
  private let adaptor: AVAssetWriterInputPixelBufferAdaptor
  private var started = false
  let size: CGSize

  init(url: URL, size: CGSize) throws {
    // H.264 wants even dimensions.
    self.size = CGSize(
      width: (size.width / 2).rounded() * 2, height: (size.height / 2).rounded() * 2)
    writer = try AVAssetWriter(outputURL: url, fileType: .mov)
    input = AVAssetWriterInput(
      mediaType: .video,
      outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: Int(self.size.width),
        AVVideoHeightKey: Int(self.size.height),
      ]
    )
    input.expectsMediaDataInRealTime = true
    adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: input,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: Int(self.size.width),
        kCVPixelBufferHeightKey as String: Int(self.size.height),
      ]
    )
    guard writer.canAdd(input) else { throw CocoaError(.fileWriteUnknown) }
    writer.add(input)
  }

  func append(_ image: CIImage, at time: CMTime, context: CIContext) {
    if !started {
      guard writer.startWriting() else { return }
      writer.startSession(atSourceTime: time)
      started = true
    }
    guard writer.status == .writing, input.isReadyForMoreMediaData else { return }
    guard let pool = adaptor.pixelBufferPool else { return }

    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
    guard let buffer else { return }

    // The frame is scaled to the size fixed when recording started, so changing the zoom
    // mid-recording changes the framing without breaking the movie.
    let scaled = image.transformed(
      by: CGAffineTransform(
        scaleX: size.width / image.extent.width,
        y: size.height / image.extent.height))
    context.render(scaled, to: buffer)
    adaptor.append(buffer, withPresentationTime: time)
  }

  /// Finalises the movie. A failed write also deletes the partial file: a movie without its
  /// metadata exists on disk but cannot be played, which is worse than no file at all.
  func finish(completion: @escaping @Sendable (Bool) -> Void) {
    guard started, writer.status == .writing else {
      try? FileManager.default.removeItem(at: writer.outputURL)
      completion(false)
      return
    }
    input.markAsFinished()
    writer.finishWriting { [self] in
      let saved = writer.status == .completed
      if !saved { try? FileManager.default.removeItem(at: writer.outputURL) }
      completion(saved)
    }
  }
}

/// Turns the camera's frames into files, applying the same look the preview has.
///
/// Frames arrive continuously; when nothing is being captured they are dropped straight away, so
/// idling costs no more than a lock and a couple of nil checks.
final class FrameGrabber: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked
  Sendable
{
  /// Held per instance rather than statically: a shared `CIContext` is not `Sendable`, and this
  /// class is only ever used from the capture queue anyway.
  private let context = CIContext()
  private let lock = NSLock()
  private var look = CaptureLook()
  private var photoRequest: (url: URL, completion: @MainActor (Bool) -> Void)?
  private var recorder: MovieRecorder?
  private var recordingFinished: (@MainActor (Bool) -> Void)?

  /// Keeps the capture side in step with what the preview is showing.
  func update(look newLook: CaptureLook) {
    lock.lock()
    look = newLook
    lock.unlock()
  }

  /// Saves the next frame to `url`.
  ///
  /// A second request while one is pending is ignored rather than replacing it — replacing would
  /// silently drop the first completion, leaving its caller waiting forever.
  func savePhoto(to url: URL, completion: @escaping @MainActor (Bool) -> Void) {
    lock.lock()
    if photoRequest == nil { photoRequest = (url, completion) }
    lock.unlock()
  }

  /// Starts writing frames to `url`. `completion` runs once the movie has been finalised.
  func startRecording(to url: URL, completion: @escaping @MainActor (Bool) -> Void) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard recorder == nil else { return false }
    recordingFinished = completion
    // The recorder is created on the first frame, when the frame size is known.
    pendingRecordingURL = url
    return true
  }

  /// Stops the recording and finalises the movie. `afterFinish` runs once the file is complete,
  /// whether or not it saved — the quit path uses it to hold the app open until then.
  func stopRecording(then afterFinish: (@Sendable () -> Void)? = nil) {
    lock.lock()
    let recorder = self.recorder
    let finished = recordingFinished
    self.recorder = nil
    pendingRecordingURL = nil
    recordingFinished = nil
    lock.unlock()

    guard let recorder else {
      if let finished { onMainThread { finished(false) } }
      afterFinish?()
      return
    }
    recorder.finish { saved in
      if let finished { onMainThread { finished(saved) } }
      afterFinish?()
    }
  }

  private var pendingRecordingURL: URL?

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    lock.lock()
    let photo = photoRequest
    photoRequest = nil
    let currentLook = look
    let startURL = pendingRecordingURL
    let activeRecorder = recorder
    lock.unlock()

    guard photo != nil || startURL != nil || activeRecorder != nil else { return }
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      if let photo { onMainThread { photo.completion(false) } }
      return
    }

    let image = currentLook.applied(to: CIImage(cvPixelBuffer: pixels))

    if let photo {
      let saved = writeJPEG(image, to: photo.url)
      let finish = photo.completion
      onMainThread { finish(saved) }
    }

    let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    if let startURL {
      lock.lock()
      // Stop can arrive between the two locked sections. Creating the recorder anyway would leave
      // it appending frames forever, with the controller convinced nothing is recording.
      guard recordingFinished != nil else {
        pendingRecordingURL = nil
        lock.unlock()
        return
      }
      pendingRecordingURL = nil
      recorder = try? MovieRecorder(url: startURL, size: image.extent.size)
      let created = recorder
      let finished = recordingFinished
      if created == nil { recordingFinished = nil }
      lock.unlock()

      guard let created else {
        if let finished { onMainThread { finished(false) } }
        return
      }
      created.append(image, at: time, context: context)
      return
    }
    activeRecorder?.append(image, at: time, context: context)
  }

  private func writeJPEG(_ image: CIImage, to url: URL) -> Bool {
    guard let rendered = context.createCGImage(image, from: image.extent) else { return false }
    let data = NSBitmapImageRep(cgImage: rendered)
      .representation(using: .jpeg, properties: [.compressionFactor: 0.9])
    guard let data else { return false }
    // Atomic, so a failed write never leaves a half-written image behind.
    return (try? data.write(to: url, options: .atomic)) != nil
  }
}
