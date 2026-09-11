import Cocoa
import RaycastSwiftMacros
import Vision

/// Inoh's dictionary, definitions, and distractors are English only, so there
/// is nothing to gain from recognizing other scripts.
private let recognitionLanguage = "en-US"

/// Channel value at or below which a frame counts as blank. Deliberately low:
/// only a frame that is essentially pure black should qualify.
private let blankFrameBrightnessCeiling: UInt8 = 8

private let unreadableImageMessage = "Could not read the captured image"

/// What a capture-and-recognize attempt produced.
///
/// Crosses the Raycast Swift bridge as JSON. The bridge generates only
/// `Promise<any>` on the TypeScript side, so `src/lib/screen-ocr-outcome.ts`
/// re-establishes this shape as a discriminated union.
struct ScreenOcrOutcome: Encodable {
  enum Status: String, Encodable {
    case recognized
    case cancelled
    case noTextFound
    case blankCapture
    case failed
  }

  let status: Status
  /// The recognized text; empty for every status other than `recognized`.
  let text: String
  /// Set only when `status` is `failed`.
  let errorMessage: String?

  static func recognized(_ text: String) -> ScreenOcrOutcome {
    ScreenOcrOutcome(status: .recognized, text: text, errorMessage: nil)
  }

  static let cancelled = ScreenOcrOutcome(status: .cancelled, text: "", errorMessage: nil)
  static let noTextFound = ScreenOcrOutcome(status: .noTextFound, text: "", errorMessage: nil)
  static let blankCapture = ScreenOcrOutcome(status: .blankCapture, text: "", errorMessage: nil)

  static func failed(_ message: String) -> ScreenOcrOutcome {
    ScreenOcrOutcome(status: .failed, text: "", errorMessage: message)
  }
}

/// Outcome of putting the region-select crosshair on screen.
private enum RegionCapture {
  case captured(CGImage)
  case cancelled
  case failed(String)
}

/// Lets the user drag out a screen region, then recognizes the English text in
/// it on-device with Vision.
///
/// - Returns: The recognized text, or why there is none.
@raycast
func recognizeTextInSelectedRegion() async -> ScreenOcrOutcome {
  switch captureSelectedRegion() {
  case .cancelled:
    return .cancelled
  case .failed(let message):
    return .failed(message)
  case .captured(let image):
    return await recognizeText(in: image)
  }
}

private func recognizeText(in image: CGImage) async -> ScreenOcrOutcome {
  var request = RecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = [Locale.Language(identifier: recognitionLanguage)]

  do {
    let observations = try await silencingStdout {
      try await request.perform(on: image)
    }

    // A caption wrapped onto two lines is one sentence, so join with a space
    // rather than a newline.
    let recognizedText = observations
      .compactMap { $0.topCandidates(1).first?.string }
      .joined(separator: " ")
      .trimmingCharacters(in: .whitespacesAndNewlines)

    if recognizedText.isEmpty {
      return isEffectivelyBlank(image) ? .blankCapture : .noTextFound
    }
    return .recognized(recognizedText)
  } catch {
    return .failed(error.localizedDescription)
  }
}

private func captureSelectedRegion() -> RegionCapture {
  let capturePath = "\(NSTemporaryDirectory())/\(UUID().uuidString).png"
  defer { try? FileManager.default.removeItem(atPath: capturePath) }

  let screencapture = Process()
  screencapture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
  // -i drags out a region; -x keeps the shutter sound quiet during a video.
  screencapture.arguments = ["-i", "-x", capturePath]

  do {
    try screencapture.run()
  } catch {
    return .failed("Could not run screencapture: \(error.localizedDescription)")
  }
  screencapture.waitUntilExit()

  // Reason: pressing Esc during the drag is a cancellation, not a failure, and
  // it must stay distinguishable so the command can exit without a toast.
  // Treat both signals as cancellation so this holds however screencapture
  // reports it: a non-zero exit, or a zero exit with no file written.
  guard screencapture.terminationStatus == 0,
    let imageData = try? Data(contentsOf: URL(fileURLWithPath: capturePath))
  else {
    return .cancelled
  }

  var proposedRect = NSRect.zero
  guard
    let image = NSImage(data: imageData)?
      .cgImage(forProposedRect: &proposedRect, context: nil, hints: nil)
  else {
    return .failed(unreadableImageMessage)
  }
  return .captured(image)
}

/// Averages the whole frame down to a single pixel and reports whether that
/// pixel is essentially black.
///
/// Reason: macOS blanks DRM-protected video before any screen capture sees it,
/// so a Netflix or Apple TV+ subtitle arrives as a black rectangle rather than
/// as an error. A denied Screen Recording permission looks the same. Detecting
/// it lets the command explain itself instead of claiming there was no text in
/// a caption the user can plainly see.
///
/// Only consulted once recognition has already come up empty, so a dark frame
/// carrying legible subtitles is never affected.
private func isEffectivelyBlank(_ image: CGImage) -> Bool {
  var averagedPixel: [UInt8] = [0, 0, 0, 0]
  guard
    let context = CGContext(
      data: &averagedPixel,
      width: 1,
      height: 1,
      bitsPerComponent: 8,
      bytesPerRow: 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )
  else {
    return false
  }

  context.interpolationQuality = .medium
  context.draw(image, in: CGRect(x: 0, y: 0, width: 1, height: 1))

  let brightestChannel = max(averagedPixel[0], averagedPixel[1], averagedPixel[2])
  return brightestChannel <= blankFrameBrightnessCeiling
}

/// Runs `body` with file descriptor 1 pointed at /dev/null.
///
/// Reason: on macOS 26 the Vision text models log to stdout, which is the same
/// channel the Raycast Swift bridge reads a command's return value from. An
/// unsilenced Vision call corrupts the result.
private func silencingStdout<T>(_ body: () async throws -> T) async rethrows -> T {
  fflush(stdout)
  let originalStdout = dup(1)
  let devNull = open("/dev/null", O_WRONLY)
  dup2(devNull, 1)
  close(devNull)
  defer {
    fflush(stdout)
    dup2(originalStdout, 1)
    close(originalStdout)
  }
  return try await body()
}
