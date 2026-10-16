import Cocoa
import RaycastSwiftMacros
import ScreenCaptureKit
import Vision

// Failure and cancellation are reported to TypeScript as strings. Keep these in
// sync with src/ocr/swift-result.ts.
let errorPrefix = "Error: "
let cancelledResult = "Error: cancelled"
let noBarcodeResult = "No barcodes or QR codes detected"

enum CaptureResult {
  case image(CGImage)
  case cancelled
  case failed
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
  case .cancelled:
    return cancelledResult
  case .failed:
    return "\(errorPrefix)failed to capture image"
  case .image(let capturedImage):
    return await performOCR(
      on: capturedImage,
      fast: fast,
      languageCorrection: languageCorrection,
      ignoreLineBreaks: ignoreLineBreaks,
      customWords: customWordsList,
      languages: languages
    )
  }
}

@raycast
func recognizeClipboard(
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWordsList: [String],
  languages: [String]
) async -> String {
  let pasteboard = NSPasteboard.general
  guard NSImage.canInit(with: pasteboard) else {
    return "\(errorPrefix)The clipboard does not contain an image."
  }
  guard
    let image = NSImage(pasteboard: pasteboard),
    let cgImage = cgImage(from: image)
  else {
    return "\(errorPrefix)The clipboard image could not be decoded."
  }

  return await performOCR(
    on: cgImage,
    fast: fast,
    languageCorrection: languageCorrection,
    ignoreLineBreaks: ignoreLineBreaks,
    customWords: customWordsList,
    languages: languages
  )
}

func performOCR(
  on image: CGImage,
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWords: [String],
  languages: [String]
) async -> String {
  var request = RecognizeTextRequest()
  request.recognitionLevel = fast ? .fast : .accurate
  request.usesLanguageCorrection = languageCorrection
  request.customWords = customWords
  request.recognitionLanguages = (languages.isEmpty ? ["en-US"] : languages)
    .map { Locale.Language(identifier: $0) }

  do {
    let observations = try await silencingStdout {
      try await request.perform(on: image)
    }
    let separator = ignoreLineBreaks ? " " : "\n"
    return observations
      .compactMap { $0.topCandidates(1).first?.string }
      .joined(separator: separator)
  } catch {
    return "\(errorPrefix)\(error.localizedDescription)"
  }
}

@raycast
func detectBarcode(keepImage: Bool, playSound: Bool) async -> String {
  switch captureSelectedArea(keepImage: keepImage, playSound: playSound) {
  case .cancelled:
    return cancelledResult
  case .failed:
    return "\(errorPrefix)failed to capture image"
  case .image(let capturedImage):
    do {
      let observations = try await silencingStdout {
        try await DetectBarcodesRequest().perform(on: capturedImage)
      }
      let values = observations.compactMap(\.payloadString)
      guard !values.isEmpty else {
        return noBarcodeResult
      }
      return values.joined(separator: "\n")
    } catch {
      return "\(errorPrefix)\(error.localizedDescription)"
    }
  }
}

// Snapshots every item, type and byte of the general pasteboard to a temporary
// property list so it can be restored after a temporary paste. Returns the
// snapshot id, or an "Error: " string.
@raycast
func snapshotClipboard() -> String {
  let items: [[String: Data]] = (NSPasteboard.general.pasteboardItems ?? []).map { item in
    var entry: [String: Data] = [:]
    for type in item.types {
      if let data = item.data(forType: type) {
        entry[type.rawValue] = data
      }
    }
    return entry
  }

  let id = UUID().uuidString
  do {
    let data = try PropertyListSerialization.data(fromPropertyList: items, format: .binary, options: 0)
    try data.write(to: clipboardSnapshotURL(id), options: .atomic)
    return id
  } catch {
    return "\(errorPrefix)\(error.localizedDescription)"
  }
}

// Restores a snapshot made by snapshotClipboard and always deletes its file.
// Returns "OK" or an "Error: " string.
@raycast
func restoreClipboard(id: String) -> String {
  guard UUID(uuidString: id) != nil else {
    return "\(errorPrefix)invalid clipboard snapshot id"
  }
  let url = clipboardSnapshotURL(id)
  defer { try? FileManager.default.removeItem(at: url) }

  do {
    let data = try Data(contentsOf: url)
    guard let entries = try PropertyListSerialization.propertyList(from: data, format: nil) as? [[String: Data]] else {
      return "\(errorPrefix)invalid clipboard snapshot"
    }

    let items = entries.map { entry -> NSPasteboardItem in
      let item = NSPasteboardItem()
      for (type, data) in entry {
        item.setData(data, forType: NSPasteboard.PasteboardType(type))
      }
      return item
    }

    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    if !items.isEmpty, !pasteboard.writeObjects(items) {
      return "\(errorPrefix)failed to restore clipboard"
    }
    return "OK"
  } catch {
    return "\(errorPrefix)\(error.localizedDescription)"
  }
}

func clipboardSnapshotURL(_ id: String) -> URL {
  URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("screenocr-clipboard-\(id).plist")
}

func captureScreen(keepImage: Bool) async -> CaptureResult {
  guard let content = try? await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false) else {
    return .failed
  }

  let mainDisplayID = NSScreen.main?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
  guard let display = content.displays.first(where: { $0.displayID == mainDisplayID }) ?? content.displays.first else {
    return .failed
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

  let filter = SCContentFilter(display: display, excludingWindows: [])
  guard let image = try? await SCScreenshotManager.captureImage(
    contentFilter: filter, configuration: configuration
  ) else {
    return .failed
  }

  if keepImage {
    let pasteboardImage = NSImage(cgImage: image, size: .zero)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.writeObjects([pasteboardImage])
  }

  return .image(image)
}

func captureSelectedArea(keepImage: Bool, playSound: Bool) -> CaptureResult {
  let filePath = randomPngPath()
  let pasteboard = NSPasteboard.general
  let changeCountBefore = pasteboard.changeCount

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
    // A cancelled selection leaves the previous clipboard contents in place,
    // so only a changed pasteboard means a new capture was made.
    guard pasteboard.changeCount != changeCountBefore else {
      return .cancelled
    }
    image = NSImage(pasteboard: pasteboard)
  } else {
    defer { try? FileManager.default.removeItem(atPath: filePath) }
    // screencapture writes no file when the selection is cancelled.
    guard FileManager.default.fileExists(atPath: filePath) else {
      return .cancelled
    }
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)) else {
      return .failed
    }
    image = NSImage(data: data)
  }

  guard let image, let cgImage = cgImage(from: image) else {
    return .failed
  }
  return .image(cgImage)
}

// Prefers the largest bitmap representation so retina images keep their native
// pixel resolution instead of being rendered at point size.
func cgImage(from image: NSImage) -> CGImage? {
  let bitmaps = image.representations.compactMap { $0 as? NSBitmapImageRep }
  if let best = bitmaps.max(by: { $0.pixelsWide * $0.pixelsHigh < $1.pixelsWide * $1.pixelsHigh }),
    let cgImage = best.cgImage
  {
    return cgImage
  }
  var proposedRect = NSRect.zero
  return image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil)
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