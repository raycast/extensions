import AppKit
import CoreGraphics
import Foundation
import PDFKit
import RaycastSwiftMacros
import Vision

// MARK: - Types shared with TypeScript

struct OCROptions: Decodable {
  /// BCP-47 codes in priority order. Empty means automatic detection.
  let languages: [String]
  /// `true` uses Vision's fast recognizer instead of the accurate one.
  let fast: Bool
  let languageCorrection: Bool
  let customWords: [String]
  let detectBarcodes: Bool
}

/// One piece of text Vision found. Coordinates are in pixels, origin at the top left.
struct OCRLine: Encodable {
  let text: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
  let confidence: Double
}

struct OCRPage: Encodable {
  let width: Double
  let height: Double
  let lines: [OCRLine]
  let barcodes: [String]
}

struct OCRResult: Encodable {
  /// "ok", "cancelled", "noImage", "noPermission" or "unreadable".
  let status: String
  let pages: [OCRPage]

  static func failed(_ status: String) -> OCRResult { OCRResult(status: status, pages: []) }
}

/// An image plus the EXIF orientation it should be read in (photos from phones are often stored sideways).
typealias OrientedImage = (image: CGImage, orientation: CGImagePropertyOrientation)

// MARK: - Exported functions

/// Shows the system area picker (the same one as ⌘⇧4) and recognizes the selection.
/// Press Space while picking to capture a whole window instead.
@raycast func recognizeScreenArea(options: OCROptions) throws -> OCRResult {
  if !CGPreflightScreenCaptureAccess() {
    // Registers Raycast in System Settings and shows the system prompt the first time.
    CGRequestScreenCaptureAccess()
    return .failed("noPermission")
  }

  let file = FileManager.default.temporaryDirectory
    .appendingPathComponent("vision-ocr-\(UUID().uuidString).png")
  defer { try? FileManager.default.removeItem(at: file) }

  let capture = Process()
  capture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
  // -i interactive, -x no sound, -o no window shadow.
  capture.arguments = ["-i", "-x", "-o", file.path]
  try capture.run()
  capture.waitUntilExit()

  // screencapture writes nothing when the user presses Escape.
  guard let image = loadImage(at: file) else { return .failed("cancelled") }
  return try recognize([image], options: options)
}

/// Recognizes the image (or image/PDF file) currently on the clipboard.
@raycast func recognizeClipboard(options: OCROptions) throws -> OCRResult {
  let pasteboard = NSPasteboard.general
  if let urls = pasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL],
    let url = urls.first
  {
    return try recognizeFile(path: url.path, options: options)
  }
  // Prefer bitmap data (screenshots, copied images); fall back to PDF data (e.g. a selection copied in Preview).
  if let data = pasteboard.data(forType: .png) ?? pasteboard.data(forType: .tiff), let image = loadImage(data: data) {
    return try recognize([image], options: options)
  }
  if let data = pasteboard.data(forType: .pdf), let document = PDFDocument(data: data) {
    let pages = renderPages(of: document)
    return pages.isEmpty ? .failed("noImage") : try recognize(pages, options: options)
  }
  guard let image = NSImage(pasteboard: pasteboard)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    return .failed("noImage")
  }
  return try recognize([(image, .up)], options: options)
}

/// Recognizes an image file, or every page of a PDF.
@raycast func recognizeFile(path: String, options: OCROptions) throws -> OCRResult {
  let url = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
  if url.pathExtension.lowercased() == "pdf" {
    guard let document = PDFDocument(url: url) else { return .failed("unreadable") }
    let pages = renderPages(of: document)
    return pages.isEmpty ? .failed("unreadable") : try recognize(pages, options: options)
  }
  guard let image = loadImage(at: url) else { return .failed("unreadable") }
  return try recognize([image], options: options)
}

// MARK: - Recognition

private func recognize(_ images: [OrientedImage], options: OCROptions) throws -> OCRResult {
  let pages = try images.map { image, orientation -> OCRPage in
    // Vision reports boxes in the upright image, which is rotated a quarter turn for orientations 5-8.
    let quarterTurn = [.left, .leftMirrored, .right, .rightMirrored].contains(orientation)
    let width = Double(quarterTurn ? image.height : image.width)
    let height = Double(quarterTurn ? image.width : image.height)

    let text = VNRecognizeTextRequest()
    text.recognitionLevel = options.fast ? .fast : .accurate
    text.usesLanguageCorrection = options.languageCorrection
    text.customWords = options.customWords
    if options.languages.isEmpty {
      text.automaticallyDetectsLanguage = true
    } else {
      text.recognitionLanguages = options.languages
    }

    var requests: [VNRequest] = [text]
    let barcodes = VNDetectBarcodesRequest()
    if options.detectBarcodes { requests.append(barcodes) }

    try VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:]).perform(requests)

    let lines = (text.results ?? []).compactMap { observation -> OCRLine? in
      guard let candidate = observation.topCandidates(1).first else { return nil }
      let box = observation.boundingBox  // normalized, origin bottom left
      return OCRLine(
        text: candidate.string,
        x: box.minX * width,
        y: (1 - box.maxY) * height,
        width: box.width * width,
        height: box.height * height,
        confidence: Double(candidate.confidence)
      )
    }

    var seen = Set<String>()
    let payloads = (barcodes.results ?? []).compactMap(\.payloadStringValue).filter { seen.insert($0).inserted }
    return OCRPage(width: width, height: height, lines: lines, barcodes: payloads)
  }
  return OCRResult(status: "ok", pages: pages)
}

// MARK: - Image loading

private func loadImage(at url: URL) -> OrientedImage? {
  CGImageSourceCreateWithURL(url as CFURL, nil).flatMap(loadImage)
}

private func loadImage(data: Data) -> OrientedImage? {
  CGImageSourceCreateWithData(data as CFData, nil).flatMap(loadImage)
}

private func loadImage(_ source: CGImageSource) -> OrientedImage? {
  guard let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
  let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
  let raw = properties?[kCGImagePropertyOrientation] as? UInt32 ?? 1
  return (image, CGImagePropertyOrientation(rawValue: raw) ?? .up)
}

private func renderPages(of document: PDFDocument) -> [OrientedImage] {
  (0..<document.pageCount).compactMap { document.page(at: $0).flatMap(render) }.map { ($0, .up) }
}

/// Renders a PDF page upright (honoring its rotation) at 2× so small print stays legible to Vision.
private func render(_ page: PDFPage) -> CGImage? {
  let bounds = page.bounds(for: .mediaBox)
  let sideways = page.rotation % 180 != 0
  let size = NSSize(
    width: (sideways ? bounds.height : bounds.width) * 2,
    height: (sideways ? bounds.width : bounds.height) * 2)
  guard size.width > 0, size.height > 0 else { return nil }
  return page.thumbnail(of: size, for: .mediaBox).cgImage(forProposedRect: nil, context: nil, hints: nil)
}
