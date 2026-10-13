// Core OCR logic built on Apple's Vision framework.
// Kept free of Raycast macros so it can be compiled and tested standalone.

import AppKit
import CoreGraphics
import Foundation
import ImageIO
import PDFKit
import Vision

/// Error whose description is forwarded verbatim to TypeScript as `error.message`.
struct OCRError: Error, CustomStringConvertible {
  let message: String
  var description: String { message }
}

struct OCROptions {
  /// BCP-47 codes in priority order. Empty means "use the Mac's preferred languages".
  var languages: [String] = []
  /// Let Vision detect the script/language automatically.
  var autoDetectLanguage = true
  /// Merge consecutive lines into paragraphs instead of keeping one line per recognized line.
  var mergeLines = false
  /// Separate text blocks that sit far apart on the same row (table columns) with a tab.
  var tabBetweenColumns = true
}

struct OCRResult: Encodable {
  let text: String
  let lineCount: Int
  /// Average confidence of the recognized lines, 0...1.
  let confidence: Double
  /// Languages Vision actually used (after resolving the user's preferences).
  let languages: [String]
  /// Payloads of QR codes and barcodes found in the image.
  let barcodes: [String]

  static let empty = OCRResult(text: "", lineCount: 0, confidence: 0, languages: [], barcodes: [])
}

// MARK: - Image loading

func loadImage(atPath path: String) throws -> CGImage {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw OCRError(message: "Could not read an image at \(path)")
  }
  return image
}

func loadImage(from data: Data) -> CGImage? {
  guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

/// Returns the image on the general pasteboard: either raw image data (PNG/TIFF)
/// or an image file copied from the Finder.
func loadImageFromClipboard() throws -> CGImage {
  let pasteboard = NSPasteboard.general

  for type in [NSPasteboard.PasteboardType.png, .tiff] {
    if let data = pasteboard.data(forType: type), let image = loadImage(from: data) {
      return image
    }
  }

  let options: [NSPasteboard.ReadingOptionKey: Any] = [.urlReadingFileURLsOnly: true]
  if let urls = pasteboard.readObjects(forClasses: [NSURL.self], options: options) as? [URL] {
    for url in urls {
      if let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
      {
        return image
      }
    }
  }

  throw OCRError(message: "No image on the clipboard")
}

// MARK: - Files and PDFs

/// Maximum number of PDF pages processed per document, to keep the command responsive.
let maxPDFPages = 50

/// 144 dpi: enough for small print, and the scale at which Vision proved most reliable on scans.
let pdfRenderScale: CGFloat = 2

/// Rasterizes a PDF page, honoring its rotation.
func render(page: PDFPage, scale: CGFloat) -> CGImage? {
  let bounds = page.bounds(for: .mediaBox)
  let rotated = page.rotation % 180 != 0
  let width = Int(((rotated ? bounds.height : bounds.width) * scale).rounded())
  let height = Int(((rotated ? bounds.width : bounds.height) * scale).rounded())
  guard width > 0, height > 0,
    let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else { return nil }

  context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  context.scaleBy(x: scale, y: scale)
  context.concatenate(page.transform(for: .mediaBox))
  page.draw(with: .mediaBox, to: context)
  return context.makeImage()
}

/// Recognizes text in a list of image or PDF files and merges the results, one block per file.
func recognizeText(inFiles paths: [String], options: OCROptions) throws -> OCRResult {
  guard !paths.isEmpty else { throw OCRError(message: "No image or PDF selected") }

  var results: [OCRResult] = []
  var failures: [String] = []

  for path in paths {
    do {
      if URL(fileURLWithPath: path).pathExtension.lowercased() == "pdf" {
        results.append(try recognizeText(inPDFAt: path, options: options))
      } else {
        results.append(try recognizeText(in: try loadImage(atPath: path), options: options))
      }
    } catch {
      failures.append(URL(fileURLWithPath: path).lastPathComponent)
    }
  }

  if results.isEmpty {
    throw OCRError(message: "Could not read \(failures.joined(separator: ", "))")
  }
  return merge(results)
}

/// Uses the PDF's own text layer when it has one, and falls back to OCR for scanned pages.
func recognizeText(inPDFAt path: String, options: OCROptions) throws -> OCRResult {
  guard let document = PDFDocument(url: URL(fileURLWithPath: path)) else {
    throw OCRError(message: "Could not open PDF at \(path)")
  }

  var pages: [OCRResult] = []
  for index in 0..<min(document.pageCount, maxPDFPages) {
    guard let page = document.page(at: index) else { continue }

    if let text = page.string?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
      let lines = text.split(whereSeparator: \.isNewline).count
      pages.append(OCRResult(text: text, lineCount: lines, confidence: 1, languages: [], barcodes: []))
      continue
    }

    // Scanned page: rasterize it and OCR it.
    guard let image = render(page: page, scale: pdfRenderScale) else { continue }
    pages.append(try recognizeText(in: image, options: options))
  }

  return merge(pages)
}

func merge(_ results: [OCRResult]) -> OCRResult {
  let nonEmpty = results.filter { !$0.text.isEmpty || !$0.barcodes.isEmpty }
  guard !nonEmpty.isEmpty else { return .empty }

  let scored = nonEmpty.filter { $0.lineCount > 0 }
  let confidence =
    scored.isEmpty ? 0 : scored.map { $0.confidence * Double($0.lineCount) }.reduce(0, +) / Double(scored.map(\.lineCount).reduce(0, +))

  return OCRResult(
    text: nonEmpty.map(\.text).filter { !$0.isEmpty }.joined(separator: "\n\n"),
    lineCount: nonEmpty.map(\.lineCount).reduce(0, +),
    confidence: confidence,
    languages: nonEmpty.first { !$0.languages.isEmpty }?.languages ?? [],
    barcodes: nonEmpty.flatMap(\.barcodes)
  )
}

// MARK: - Recognition

func recognizeText(in image: CGImage, options: OCROptions) throws -> OCRResult {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.automaticallyDetectsLanguage = options.autoDetectLanguage

  let supported = (try? request.supportedRecognitionLanguages()) ?? []
  var resolved = resolveLanguages(options.languages, supported: supported)
  if resolved.isEmpty {
    // Default to the languages the Mac is set up with rather than Vision's global guess,
    // which otherwise mistakes isolated capitals for other scripts.
    resolved = resolveLanguages(Locale.preferredLanguages, supported: supported)
  }
  if !resolved.isEmpty {
    request.recognitionLanguages = resolved
  }

  try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  var observations = request.results ?? []

  // Vision's detector occasionally skips isolated short tokens (a lone digit in a table cell) and
  // which ones it skips depends on the image scale. For large captures that look tabular (several
  // blocks on one row), a second pass at a smaller scale merged with the first recovers them.
  // Barcodes are detected on the small image too: cheaper, and codes survive downscaling.
  let longerSide = max(image.width, image.height)
  var barcodeImage = image
  if longerSide > 1800, let small = rescale(image, toLongerSide: secondPassLongerSide(for: image)) {
    barcodeImage = small
    if looksTabular(observations) {
      let secondPass = VNRecognizeTextRequest()
      secondPass.recognitionLevel = .accurate
      secondPass.usesLanguageCorrection = true
      secondPass.automaticallyDetectsLanguage = request.automaticallyDetectsLanguage
      secondPass.recognitionLanguages = request.recognitionLanguages
      try VNImageRequestHandler(cgImage: small, options: [:]).perform([secondPass])
      observations = mergeObservations(primary: observations, secondary: secondPass.results ?? [])
    }
  }

  let barcodeRequest = VNDetectBarcodesRequest()
  try VNImageRequestHandler(cgImage: barcodeImage, options: [:]).perform([barcodeRequest])

  // Barcode patterns sometimes read as stray letters: drop text found inside a decoded code.
  let barcodeBoxes = (barcodeRequest.results ?? []).map(\.boundingBox)
  observations.removeAll { observation in
    let center = CGPoint(x: observation.boundingBox.midX, y: observation.boundingBox.midY)
    return barcodeBoxes.contains { $0.contains(center) }
  }

  let width = CGFloat(image.width)
  let height = CGFloat(image.height)

  let lines: [TextLine] = observations.compactMap { observation in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let text = candidate.string.trimmingCharacters(in: .whitespaces)
    guard !text.isEmpty else { return nil }
    return TextLine(
      text: text,
      box: VNImageRectForNormalizedRect(observation.boundingBox, Int(width), Int(height)),
      confidence: Double(candidate.confidence))
  }

  let rows = groupIntoRows(lines)
  let text = assemble(rows: rows, options: options)
  let confidence = lines.isEmpty ? 0 : lines.map(\.confidence).reduce(0, +) / Double(lines.count)

  var barcodes: [String] = []
  for observation in barcodeRequest.results ?? [] {
    if let payload = observation.payloadStringValue, !payload.isEmpty, !barcodes.contains(payload) {
      barcodes.append(payload)
    }
  }

  return OCRResult(
    text: text,
    lineCount: rows.count,
    confidence: confidence,
    languages: resolved.isEmpty ? request.recognitionLanguages : resolved,
    barcodes: barcodes
  )
}

/// Maps user-provided codes ("fr", "fr-FR", "en_US", "en-FR") onto the codes Vision supports.
func resolveLanguages(_ requested: [String], supported: [String]) -> [String] {
  var result: [String] = []
  for raw in requested {
    let code = raw.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "_", with: "-")
    guard !code.isEmpty else { continue }
    let language = code.split(separator: "-").first.map(String.init)?.lowercased() ?? code.lowercased()

    let match =
      supported.first { $0.caseInsensitiveCompare(code) == .orderedSame }
      ?? supported.first { $0.lowercased().hasPrefix(language + "-") }
      ?? supported.first { $0.lowercased() == language }

    if let match, !result.contains(match) {
      result.append(match)
    }
  }
  return result
}

// MARK: - Second pass

/// About 2.5x smaller than the original, which is where Vision kept isolated digits in testing,
/// but never below 1000 px (text becomes unreadable) nor above 2200 px (too close to the original).
func secondPassLongerSide(for image: CGImage) -> Int {
  min(max(Int(Double(max(image.width, image.height)) / 2.5), 1000), 2200)
}

/// True when some row holds several separate text blocks, as in a table or a list with markers.
func looksTabular(_ observations: [VNRecognizedTextObservation]) -> Bool {
  let lines = observations.map { TextLine(text: "", box: $0.boundingBox, confidence: 0) }
  return groupIntoRows(lines).contains { $0.count >= 2 }
}

func rescale(_ image: CGImage, toLongerSide target: Int) -> CGImage? {
  let longer = max(image.width, image.height)
  guard longer > 0, target > 0, target != longer else { return nil }
  let factor = Double(target) / Double(longer)
  let width = max(1, Int((Double(image.width) * factor).rounded()))
  let height = max(1, Int((Double(image.height) * factor).rounded()))
  guard
    let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else { return nil }
  context.interpolationQuality = .high
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return context.makeImage()
}

/// Keeps every primary observation and adds secondary ones that do not overlap any of them.
/// Bounding boxes are normalized, so observations from both scales share one coordinate space.
func mergeObservations(
  primary: [VNRecognizedTextObservation], secondary: [VNRecognizedTextObservation]
) -> [VNRecognizedTextObservation] {
  var merged = primary
  for candidate in secondary {
    // Low-confidence additions from the small image are more often noise than recovered text.
    guard let top = candidate.topCandidates(1).first, top.confidence >= 0.5 else { continue }
    let box = candidate.boundingBox
    let covered = primary.contains { existing in
      let intersection = existing.boundingBox.intersection(box)
      guard !intersection.isNull else { return false }
      let smaller = min(existing.boundingBox.width * existing.boundingBox.height, box.width * box.height)
      return smaller > 0 && (intersection.width * intersection.height) / smaller > 0.3
    }
    if !covered {
      merged.append(candidate)
    }
  }
  return merged
}

// MARK: - Layout reconstruction

struct TextLine {
  let text: String
  /// Pixel coordinates, origin bottom-left (Vision convention).
  let box: CGRect
  let confidence: Double
}

/// Groups observations that sit on the same baseline into rows, ordered top-to-bottom then left-to-right.
func groupIntoRows(_ lines: [TextLine]) -> [[TextLine]] {
  let sorted = lines.sorted { $0.box.midY > $1.box.midY }
  var rows: [[TextLine]] = []

  for line in sorted {
    if let last = rows.last, let reference = last.first, sharesRow(reference.box, line.box) {
      rows[rows.count - 1].append(line)
    } else {
      rows.append([line])
    }
  }

  return rows.map { $0.sorted { $0.box.minX < $1.box.minX } }
}

private func sharesRow(_ a: CGRect, _ b: CGRect) -> Bool {
  let overlap = min(a.maxY, b.maxY) - max(a.minY, b.minY)
  return overlap > 0.5 * min(a.height, b.height)
}

/// Joins rows back into text.
///
/// Paragraph breaks are detected from vertical gaps: a gap is a break when it is clearly larger than
/// the document's own line spacing (lower quartile of all gaps) and than a typical line height.
/// Blocks far apart on the same row (table columns) are separated with a tab when enabled.
func assemble(rows: [[TextLine]], options: OCROptions) -> String {
  guard !rows.isEmpty else { return "" }

  let boxes = rows.map { row in row.dropFirst().reduce(row[0].box) { $0.union($1.box) } }
  let heights = boxes.map(\.height).sorted()
  let typicalHeight = heights[heights.count / 2]

  let gaps = zip(boxes, boxes.dropFirst()).map { $0.minY - $1.maxY }.sorted()
  let lineSpacing = gaps.count >= 3 ? gaps[gaps.count / 4] : 0
  let breakThreshold = max(0.8 * typicalHeight, 1.8 * lineSpacing)

  // Roughly two "em" of empty space: wider than any word gap, narrower than most column gutters.
  let columnGap = 2 * typicalHeight

  var output = ""

  for (index, row) in rows.enumerated() {
    var rowText = row[0].text
    for (previous, current) in zip(row, row.dropFirst()) {
      let gap = current.box.minX - previous.box.maxX
      rowText += (options.tabBetweenColumns && gap > columnGap) ? "\t" : " "
      rowText += current.text
    }

    if index > 0 {
      let gap = boxes[index - 1].minY - boxes[index].maxY

      if gap > breakThreshold {
        output += "\n\n"
      } else if !options.mergeLines {
        output += "\n"
      } else if output.hasSuffix("-"), rowText.first?.isLowercase == true {
        // Re-join a word hyphenated across lines.
        output.removeLast()
      } else {
        output += " "
      }
    }

    output += rowText
  }

  return output
}

// MARK: - Capture hand-off

/// Loads Vision's text model ahead of time (about 200 ms) so the real capture is recognized warm.
func warmUpVision() {
  guard
    let context = CGContext(
      data: nil, width: 64, height: 64, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
    let image = context.makeImage()
  else { return }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
}

/// Blocks until the caller signals that the capture file is complete (`readyMarker` exists),
/// that the user cancelled (`cancelMarker` exists), the timeout elapses, or the parent process is gone.
func waitForCapture(readyMarker: String, cancelMarker: String, timeoutSeconds: Double) throws {
  let deadline = Date().addingTimeInterval(timeoutSeconds)
  let fileManager = FileManager.default
  while true {
    if fileManager.fileExists(atPath: readyMarker) { return }
    if fileManager.fileExists(atPath: cancelMarker) { throw OCRError(message: "cancelled") }
    if getppid() == 1 { throw OCRError(message: "cancelled") }
    if Date() > deadline { throw OCRError(message: "Timed out waiting for the capture") }
    Thread.sleep(forTimeInterval: 0.015)
  }
}

// MARK: - Permissions

/// Whether the responsible app (Raycast) may capture the screen. Optionally triggers the system prompt.
func screenCaptureAccess(request: Bool) -> Bool {
  if CGPreflightScreenCaptureAccess() {
    return true
  }
  return request ? CGRequestScreenCaptureAccess() : false
}
