import Cocoa
import RaycastSwiftMacros
import ScreenCaptureKit
import Vision

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
  let imgRef = fullscreen
    ? await captureScreen(keepImage: keepImage)
    : captureSelectedArea(keepImage: keepImage, playSound: playSound)

  guard let capturedImage = imgRef else {
    return "Error: failed to capture image"
  }

  var request = RecognizeTextRequest()
  request.recognitionLevel = fast ? .fast : .accurate
  request.usesLanguageCorrection = languageCorrection
  request.customWords = customWordsList
  request.recognitionLanguages = (languages.isEmpty ? ["en-US"] : languages)
    .map { Locale.Language(identifier: $0) }

  do {
    let observations = try await silencingStdout {
      try await request.perform(on: capturedImage)
    }
    let separator = ignoreLineBreaks ? " " : "\n"
    return observations
      .compactMap { $0.topCandidates(1).first?.string }
      .joined(separator: separator)
  } catch {
    return "Error: \(error.localizedDescription)"
  }
}

@raycast
func detectBarcode(keepImage: Bool, playSound: Bool) async -> String {
  guard let capturedImage = captureSelectedArea(keepImage: keepImage, playSound: playSound) else {
    return "Error: failed to capture image"
  }

  do {
    let observations = try await silencingStdout {
      try await DetectBarcodesRequest().perform(on: capturedImage)
    }
    let values = observations.compactMap(\.payloadString)
    guard !values.isEmpty else {
      return "No barcodes or QR codes detected"
    }
    return values.joined(separator: "\n")
  } catch {
    return "Error: \(error.localizedDescription)"
  }
}

func captureScreen(keepImage: Bool) async -> CGImage? {
  guard
    let content = try? await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false),
    let display = content.displays.first
  else {
    return nil
  }

  let configuration = SCStreamConfiguration()
  let scale = NSScreen.main?.backingScaleFactor ?? 2
  configuration.width = Int(CGFloat(display.width) * scale)
  configuration.height = Int(CGFloat(display.height) * scale)
  configuration.showsCursor = false

  let filter = SCContentFilter(display: display, excludingWindows: [])
  guard let image = try? await SCScreenshotManager.captureImage(
    contentFilter: filter, configuration: configuration
  ) else {
    return nil
  }

  if keepImage {
    let pasteboardImage = NSImage(cgImage: image, size: .zero)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.writeObjects([pasteboardImage])
  }

  return image
}

func captureSelectedArea(keepImage: Bool, playSound: Bool) -> CGImage? {
  let filePath = randomPngPath()
  let task = Process()
  task.launchPath = "/usr/sbin/screencapture"
  var arguments = ["-i"]
  arguments.append(keepImage ? "-c" : filePath)
  if !playSound {
    arguments.append("-x")
  }
  task.arguments = arguments
  task.launch()
  task.waitUntilExit()

  let image: NSImage?
  if keepImage {
    guard
      let pasteboard = NSPasteboard.general.pasteboardItems?.first,
      let fileType = pasteboard.types.first,
      let data = pasteboard.data(forType: fileType)
    else {
      return nil
    }
    image = NSImage(data: data)
  } else {
    defer { try? FileManager.default.removeItem(atPath: filePath) }
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)) else {
      return nil
    }
    image = NSImage(data: data)
  }

  var proposedRect = NSRect.zero
  return image?.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil)
}

func randomPngPath() -> String {
  "\(NSTemporaryDirectory())/\(UUID().uuidString).png"
}

// On macOS 26 the Vision text models log to stdout, which the Raycast bridge
// uses to read a command's return value. Mute fd 1 while Vision runs.
func silencingStdout<T>(_ body: () async throws -> T) async rethrows -> T {
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
