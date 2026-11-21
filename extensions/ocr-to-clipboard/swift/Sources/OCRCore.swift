// Core OCR logic built on Apple's Vision framework.
// Kept free of Raycast macros so it can be compiled and tested standalone.

import AppKit
import CoreGraphics
import CoreImage
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
  /// Separate text blocks that sit far apart on the same row (table columns) with tabs.
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
  /// Names of input files that could not be read (multi-file recognition only).
  let skippedFiles: [String]

  static let empty = OCRResult(text: "", lineCount: 0, confidence: 0, languages: [], barcodes: [], skippedFiles: [])
}

// MARK: - Image loading

func loadImage(atPath path: String) throws -> CGImage {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let image = loadImage(from: source) else {
    throw OCRError(message: "Could not read an image at \(path)")
  }
  return image
}

func loadImage(from data: Data) -> CGImage? {
  guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
  return loadImage(from: source)
}

/// Decodes the first frame and applies the EXIF orientation, so portrait photos reach Vision upright.
func loadImage(from source: CGImageSource) -> CGImage? {
  guard let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
  return upright(image, orientation: orientation(of: source))
}

func orientation(of source: CGImageSource) -> CGImagePropertyOrientation {
  guard let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
    let raw = properties[kCGImagePropertyOrientation] as? UInt32,
    let orientation = CGImagePropertyOrientation(rawValue: raw)
  else { return .up }
  return orientation
}

func upright(_ image: CGImage, orientation: CGImagePropertyOrientation) -> CGImage {
  guard orientation != .up else { return image }
  let oriented = CIImage(cgImage: image).oriented(orientation)
  return CIContext().createCGImage(oriented, from: oriented.extent) ?? image
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
      if let source = CGImageSourceCreateWithURL(url as CFURL, nil), let image = loadImage(from: source) {
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

/// A text layer shorter than this is not trusted to cover the page (a stamped footer on a scan);
/// the page is rendered and recognized as well, and the richer result wins.
let trustedTextLayerLength = 200

/// Recognizes text in a list of image or PDF files and merges the results, one block per file.
/// Unreadable files are reported in `skippedFiles` rather than silently dropped.
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
  return merge(results, skippedFiles: failures)
}

/// Uses the PDF's own text layer when it covers the page, and OCR for scanned pages.
func recognizeText(inPDFAt path: String, options: OCROptions) throws -> OCRResult {
  guard let document = PDFDocument(url: URL(fileURLWithPath: path)) else {
    throw OCRError(message: "Could not open PDF at \(path)")
  }

  var pages: [OCRResult] = []
  for index in 0..<min(document.pageCount, maxPDFPages) {
    guard let page = document.page(at: index) else { continue }

    let layer = page.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let layerResult = OCRResult(
      text: layer, lineCount: layer.isEmpty ? 0 : layer.split(whereSeparator: \.isNewline).count,
      confidence: 1, languages: [], barcodes: [], skippedFiles: [])

    if layer.count >= trustedTextLayerLength {
      pages.append(layerResult)
      continue
    }

    // Scanned page, or a page whose text layer is too small to be trusted: rasterize and OCR it.
    guard let image = render(page: page, scale: pdfRenderScale) else {
      pages.append(layerResult)
      continue
    }
    let recognized = try recognizeText(in: image, options: options)
    if recognized.text.count > layer.count {
      pages.append(recognized)
    } else {
      // The text layer wins, but codes only exist in the rendered page: keep them either way.
      pages.append(
        OCRResult(
          text: layerResult.text, lineCount: layerResult.lineCount, confidence: 1, languages: [],
          barcodes: recognized.barcodes, skippedFiles: []))
    }
  }

  return merge(pages, skippedFiles: [])
}

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

func merge(_ results: [OCRResult], skippedFiles: [String]) -> OCRResult {
  let nonEmpty = results.filter { !$0.text.isEmpty || !$0.barcodes.isEmpty }
  guard !nonEmpty.isEmpty else {
    return OCRResult(text: "", lineCount: 0, confidence: 0, languages: [], barcodes: [], skippedFiles: skippedFiles)
  }

  let scored = nonEmpty.filter { $0.lineCount > 0 }
  let weightedConfidence = scored.map { $0.confidence * Double($0.lineCount) }.reduce(0, +)
  let totalLines = scored.map(\.lineCount).reduce(0, +)

  return OCRResult(
    text: nonEmpty.map(\.text).filter { !$0.isEmpty }.joined(separator: "\n\n"),
    lineCount: nonEmpty.map(\.lineCount).reduce(0, +),
    confidence: totalLines == 0 ? 0 : weightedConfidence / Double(totalLines),
    languages: nonEmpty.first { !$0.languages.isEmpty }?.languages ?? [],
    barcodes: nonEmpty.flatMap(\.barcodes),
    skippedFiles: skippedFiles + nonEmpty.flatMap(\.skippedFiles)
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
    barcodes: barcodes,
    skippedFiles: []
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

/// Horizontal extents of the table columns, inferred from every row that holds several blocks.
/// Blocks whose extents overlap (within `tolerance`) belong to the same column.
func columnExtents(rows: [[TextLine]], tolerance: CGFloat) -> [ClosedRange<CGFloat>] {
  let blocks = rows.filter { $0.count >= 2 }.flatMap { $0 }.sorted { $0.box.minX < $1.box.minX }
  var columns: [ClosedRange<CGFloat>] = []
  for block in blocks {
    if let last = columns.last, block.box.minX <= last.upperBound + tolerance {
      columns[columns.count - 1] = last.lowerBound...max(last.upperBound, block.box.maxX)
    } else {
      columns.append(block.box.minX...block.box.maxX)
    }
  }
  return columns
}

/// Index of the column a block belongs to: the one it overlaps most, if any.
func columnIndex(of block: TextLine, in columns: [ClosedRange<CGFloat>]) -> Int? {
  var best: (index: Int, overlap: CGFloat)?
  for (index, column) in columns.enumerated() {
    let overlap = min(block.box.maxX, column.upperBound) - max(block.box.minX, column.lowerBound)
    if overlap > 0, overlap > (best?.overlap ?? 0) {
      best = (index, overlap)
    }
  }
  return best?.index
}

/// Joins rows back into text.
///
/// Paragraph breaks are detected from vertical gaps: a gap is a break when it is clearly larger than
/// the document's own line spacing (lower quartile of all gaps) and than a typical line height.
/// When tabs are enabled, blocks are placed in the table columns inferred from the whole image, so a
/// row with an empty cell still gets one tab per column and values paste under the right header.
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
  let columns = options.tabBetweenColumns ? columnExtents(rows: rows, tolerance: typicalHeight) : []

  var output = ""

  for (index, row) in rows.enumerated() {
    let rowText = joinRow(row, columns: columns, columnGap: columnGap, tabs: options.tabBetweenColumns)

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

/// Joins the blocks of one row with spaces, or with tabs that reflect the table columns.
func joinRow(_ row: [TextLine], columns: [ClosedRange<CGFloat>], columnGap: CGFloat, tabs: Bool) -> String {
  guard tabs, columns.count >= 2 else {
    return row.map(\.text).joined(separator: " ")
  }

  var text = ""
  var previousColumn: Int?
  for (position, block) in row.enumerated() {
    let column = columnIndex(of: block, in: columns)
    if position == 0 {
      // Leading empty cells, e.g. a total right-aligned under the last column.
      if let column, column > 0, row.count > 1 || block.box.width < columns[column].upperBound - columns[0].lowerBound {
        text += String(repeating: "\t", count: column)
      }
    } else if let column, let previousColumn, column > previousColumn {
      text += String(repeating: "\t", count: column - previousColumn)
    } else if block.box.minX - row[position - 1].box.maxX > columnGap {
      text += "\t"
    } else {
      text += " "
    }
    text += block.text
    previousColumn = column ?? previousColumn
  }
  return text
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
