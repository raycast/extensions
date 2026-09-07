import Cocoa
import RaycastSwiftMacros
import ScreenCaptureKit
import Vision

private struct BridgeOutcome: Codable {
  let status: String
  let text: String?
  let message: String?

  static func recognized(_ text: String) -> BridgeOutcome {
    text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? BridgeOutcome(status: "no-text", text: nil, message: nil)
      : BridgeOutcome(status: "recognized", text: text, message: nil)
  }
  static let noText = BridgeOutcome(status: "no-text", text: nil, message: nil)
  static let cancelled = BridgeOutcome(status: "cancelled", text: nil, message: nil)
  static func error(_ message: String) -> BridgeOutcome {
    BridgeOutcome(status: "error", text: nil, message: message)
  }

  func json() -> String {
    guard let data = try? JSONEncoder().encode(self),
      let value = String(data: data, encoding: .utf8)
    else { return #"{"status":"error","message":"Failed to encode native OCR response"}"# }
    return value
  }
}

private enum CaptureResult {
  case image(CGImage)
  case cancelled
  case failure(String)
}

@raycast
func recognizeText(
  fullscreen: Bool,
  keepImage: Bool,
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWordsList: [String],
  languages: [String],
  playSound: Bool
) async -> String {
  let capture = fullscreen
    ? await captureScreen(keepImage: keepImage)
    : captureSelectedArea(keepImage: keepImage, playSound: playSound)

  switch capture {
  case .image(let image):
    return await recognize(
      image: image, fast: fast, languageCorrection: languageCorrection,
      ignoreLineBreaks: ignoreLineBreaks, customWordsList: customWordsList,
      languages: languages
    ).json()
  case .cancelled:
    return BridgeOutcome.cancelled.json()
  case .failure(let message):
    return BridgeOutcome.error(message).json()
  }
}

@raycast
func recognizeClipboardText(
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWordsList: [String],
  languages: [String]
) async -> String {
  let image: CGImage
  switch clipboardImage() {
  case .image(let capturedImage): image = capturedImage
  case .failure(let message): return BridgeOutcome.error(message).json()
  case .cancelled: return BridgeOutcome.cancelled.json()
  }
  return await recognize(
    image: image, fast: fast, languageCorrection: languageCorrection,
    ignoreLineBreaks: ignoreLineBreaks, customWordsList: customWordsList,
    languages: languages
  ).json()
}

private func recognize(
  image: CGImage,
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWordsList: [String],
  languages: [String]
) async -> BridgeOutcome {
  var request = RecognizeTextRequest()
  request.recognitionLevel = fast ? .fast : .accurate
  request.usesLanguageCorrection = languageCorrection
  request.customWords = customWordsList
  request.recognitionLanguages = (languages.isEmpty ? ["en-US"] : languages)
    .map { Locale.Language(identifier: $0) }

  do {
    let observations = try await silencingStdout { try await request.perform(on: image) }
    let separator = ignoreLineBreaks ? " " : "\n"
    return .recognized(observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: separator))
  } catch {
    return .error("Text recognition failed: \(error.localizedDescription)")
  }
}

@raycast
func detectBarcode(keepImage: Bool, playSound: Bool) async -> String {
  switch captureSelectedArea(keepImage: keepImage, playSound: playSound) {
  case .cancelled:
    return BridgeOutcome.cancelled.json()
  case .failure(let message):
    return BridgeOutcome.error(message).json()
  case .image(let image):
    do {
      let observations = try await silencingStdout { try await DetectBarcodesRequest().perform(on: image) }
      let values = observations.compactMap(\.payloadString)
      return values.isEmpty ? BridgeOutcome.noText.json() : BridgeOutcome.recognized(values.joined(separator: "\n")).json()
    } catch {
      return BridgeOutcome.error("Barcode detection failed: \(error.localizedDescription)").json()
    }
  }
}

private func captureScreen(keepImage: Bool) async -> CaptureResult {
  let content: SCShareableContent
  do {
    content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
  } catch {
    return .failure("Failed to access screen contents: \(error.localizedDescription)")
  }

  let mainDisplayID = NSScreen.main?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
  guard let display = content.displays.first(where: { $0.displayID == mainDisplayID }) ?? content.displays.first else {
    return .failure("No display is available for capture")
  }

  let configuration = SCStreamConfiguration()
  if let mode = CGDisplayCopyDisplayMode(display.displayID) {
    configuration.width = mode.pixelWidth
    configuration.height = mode.pixelHeight
  } else {
    configuration.width = display.width
    configuration.height = display.height
  }
  configuration.showsCursor = false

  do {
    let image = try await SCScreenshotManager.captureImage(
      contentFilter: SCContentFilter(display: display, excludingWindows: []),
      configuration: configuration
    )
    if keepImage {
      let pasteboardImage = NSImage(cgImage: image, size: .zero)
      NSPasteboard.general.clearContents()
      guard NSPasteboard.general.writeObjects([pasteboardImage]) else {
        return .failure("Captured the screen but could not keep the image in the clipboard")
      }
    }
    return .image(image)
  } catch {
    return .failure("Failed to capture screen: \(error.localizedDescription)")
  }
}

private func captureSelectedArea(keepImage: Bool, playSound: Bool) -> CaptureResult {
  let filePath = randomPngPath()
  defer { try? FileManager.default.removeItem(atPath: filePath) }
  let task = Process()
  task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
  var arguments = ["-i", keepImage ? "-c" : filePath]
  if !playSound { arguments.append("-x") }
  task.arguments = arguments
  let standardError = Pipe()
  task.standardError = standardError
  let pasteboardChangeCount = NSPasteboard.general.changeCount

  do {
    try task.run()
  } catch {
    return .failure("Failed to start screen capture: \(error.localizedDescription)")
  }
  let errorData = standardError.fileHandleForReading.readDataToEndOfFile()
  task.waitUntilExit()
  let errorOutput = String(data: errorData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

  guard task.terminationStatus == 0 else {
    return errorOutput.isEmpty ? .cancelled : .failure("Screen capture failed: \(errorOutput)")
  }

  let image: NSImage?
  if keepImage {
    guard NSPasteboard.general.changeCount != pasteboardChangeCount else {
      return .failure("Screen capture completed without a new clipboard image")
    }
    image = NSImage(pasteboard: NSPasteboard.general)
  } else {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)) else {
      return .failure("Screen capture completed without an image")
    }
    image = NSImage(data: data)
  }

  guard let image else { return .failure("The captured image could not be decoded") }
  var proposedRect = NSRect.zero
  guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    return .failure("The captured image could not be decoded")
  }
  return .image(cgImage)
}

private func clipboardImage() -> CaptureResult {
  let pasteboard = NSPasteboard.general
  if let image = NSImage(pasteboard: pasteboard) {
    var proposedRect = NSRect.zero
    if let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) {
      return .image(cgImage)
    }
  }
  if let urls = pasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [NSURL],
    !urls.isEmpty {
    for fileURL in urls {
      let url = fileURL as URL
      guard url.isFileURL, let image = NSImage(contentsOf: url) else { continue }
      var proposedRect = NSRect.zero
      if let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) {
        return .image(cgImage)
      }
    }
    return .failure("The copied file is unsupported or could not be decoded as an image")
  }
  return .failure("No supported image found in the clipboard")
}

private func randomPngPath() -> String {
  "\(NSTemporaryDirectory())/\(UUID().uuidString).png"
}

// On macOS 26 the Vision text models log to stdout, which the Raycast bridge
// uses to read a command's return value. Mute fd 1 while Vision runs.
private func silencingStdout<T>(_ body: () async throws -> T) async rethrows -> T {
  fflush(stdout)
  let original = dup(1)
  let devNull = open("/dev/null", O_WRONLY)
  dup2(devNull, 1)
  close(devNull)
  defer {
    fflush(stdout)
    dup2(original, 1)
    close(original)
  }
  return try await body()
}
