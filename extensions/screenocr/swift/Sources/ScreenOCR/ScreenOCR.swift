import Cocoa
import RaycastSwiftMacros
import ScreenCaptureKit
import Vision

// Every entry point returns a JSON envelope so recognized content can never be
// mistaken for a status. Keep these shapes in sync with src/ocr/swift-result.ts.
struct BridgeResult: Encodable {
  var status: String
  var text: String?
  var message: String?
  var id: String?
  var count: Int?
}

func encodeResult(_ result: BridgeResult) -> String {
  guard let data = try? JSONEncoder().encode(result),
    let json = String(data: data, encoding: .utf8)
  else {
    return #"{"message":"Failed to encode the Swift result","status":"error"}"#
  }
  return json
}

let screenRecordingPermissionMessage =
  "Screen Recording permission is required. Enable it for Raycast in System Settings > Privacy & Security > Screen Recording."

enum CaptureResult {
  case image(CGImage)
  case cancelled
  case permissionDenied
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
    return encodeResult(BridgeResult(status: "cancelled"))
  case .permissionDenied:
    return encodeResult(BridgeResult(status: "error", message: screenRecordingPermissionMessage))
  case .failed:
    return encodeResult(BridgeResult(status: "error", message: "failed to capture image"))
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
    return encodeResult(BridgeResult(status: "error", message: "The clipboard does not contain an image."))
  }
  guard
    let image = NSImage(pasteboard: pasteboard),
    let cgImage = cgImage(from: image)
  else {
    return encodeResult(BridgeResult(status: "error", message: "The clipboard image could not be decoded."))
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
    let text = observations
      .compactMap { $0.topCandidates(1).first?.string }
      .joined(separator: separator)
    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return encodeResult(BridgeResult(status: "no-text"))
    }
    return encodeResult(BridgeResult(status: "recognized", text: text))
  } catch {
    return encodeResult(BridgeResult(status: "error", message: error.localizedDescription))
  }
}

@raycast
func detectBarcode(keepImage: Bool, playSound: Bool) async -> String {
  switch captureSelectedArea(keepImage: keepImage, playSound: playSound) {
  case .cancelled:
    return encodeResult(BridgeResult(status: "cancelled"))
  case .permissionDenied:
    return encodeResult(BridgeResult(status: "error", message: screenRecordingPermissionMessage))
  case .failed:
    return encodeResult(BridgeResult(status: "error", message: "failed to capture image"))
  case .image(let capturedImage):
    do {
      let observations = try await silencingStdout {
        try await DetectBarcodesRequest().perform(on: capturedImage)
      }
      let values = observations.compactMap(\.payloadString)
      guard !values.isEmpty else {
        return encodeResult(BridgeResult(status: "no-text"))
      }
      return encodeResult(BridgeResult(status: "recognized", text: values.joined(separator: "\n")))
    } catch {
      return encodeResult(BridgeResult(status: "error", message: error.localizedDescription))
    }
  }
}

// Snapshots every item, type and byte of the general pasteboard to a temporary
// property list so it can be restored after a temporary paste.
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
    return encodeResult(BridgeResult(status: "snapshot", id: id))
  } catch {
    return encodeResult(BridgeResult(status: "error", message: error.localizedDescription))
  }
}

// Restores a snapshot made by snapshotClipboard and always deletes its file.
// expectedChangeCount is the pasteboard version the paste produced; pass a
// negative value to restore unconditionally.
@raycast
func restoreClipboard(id: String, expectedChangeCount: Int) -> String {
  guard UUID(uuidString: id) != nil else {
    return encodeResult(BridgeResult(status: "error", message: "invalid clipboard snapshot id"))
  }
  let url = clipboardSnapshotURL(id)
  defer { try? FileManager.default.removeItem(at: url) }

  do {
    let data = try Data(contentsOf: url)
    guard let entries = try PropertyListSerialization.propertyList(from: data, format: nil) as? [[String: Data]] else {
      return encodeResult(BridgeResult(status: "error", message: "invalid clipboard snapshot"))
    }

    let items = entries.map { entry -> NSPasteboardItem in
      let item = NSPasteboardItem()
      for (type, data) in entry {
        item.setData(data, forType: NSPasteboard.PasteboardType(type))
      }
      return item
    }

    let pasteboard = NSPasteboard.general
    // Another writer changed the clipboard after our paste: keep that copy.
    if expectedChangeCount >= 0, pasteboard.changeCount != expectedChangeCount {
      return encodeResult(BridgeResult(status: "skipped"))
    }
    pasteboard.clearContents()
    if !items.isEmpty, !pasteboard.writeObjects(items) {
      return encodeResult(BridgeResult(status: "error", message: "failed to restore clipboard"))
    }
    return encodeResult(BridgeResult(status: "restored"))
  } catch {
    return encodeResult(BridgeResult(status: "error", message: error.localizedDescription))
  }
}

// The general pasteboard's change count lets a caller tell whether the clipboard
// still holds what its last write put there.
@raycast
func clipboardChangeCount() -> String {
  encodeResult(BridgeResult(status: "count", count: NSPasteboard.general.changeCount))
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
      return screenRecordingAccessMissing() ? .permissionDenied : .cancelled
    }
    image = NSImage(pasteboard: pasteboard)
  } else {
    defer { try? FileManager.default.removeItem(atPath: filePath) }
    // screencapture writes no file when the selection is cancelled, but it also
    // writes nothing when screen access is missing: report that instead.
    guard FileManager.default.fileExists(atPath: filePath) else {
      return screenRecordingAccessMissing() ? .permissionDenied : .cancelled
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

func screenRecordingAccessMissing() -> Bool {
  !CGPreflightScreenCaptureAccess()
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