import Foundation
import AppKit
import Vision
import NaturalLanguage

struct Report: Codable {
  let hits: [Hit]
  let regionCount: Int
  let output: String
  let clipboardChangeCount: Int?
}

struct Configuration {
  let inputURL: URL?
  let outputURL: URL
  let style: Style
  let padding: CGFloat
  let categories: Set<String>
  let extraWords: [String]
  let recognition: VNRequestTextRecognitionLevel
  var customRegex: CustomRegex?
}

func parseConfiguration(_ arguments: [String]) throws -> Configuration {
  guard (7...9).contains(arguments.count) else {
    throw RedactionError(message: "Usage: hide-details <input|--clipboard> <output> <style> <padding> <categories> <extra words> [fast|accurate] [custom regex]")
  }
  guard let style = Style(rawValue: arguments[3]) else {
    throw RedactionError(message: "Invalid redaction style. Choose blackout, blur, or pixelate.")
  }
  guard let padding = Double(arguments[4]), padding.isFinite, (0...1000).contains(padding) else {
    throw RedactionError(message: "Invalid padding. Enter a number from 0 to 1000 in extension preferences.")
  }
  let categories = Set(arguments[5].split(separator: ",", omittingEmptySubsequences: false)
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
    .filter { !$0.isEmpty })
  let unknown = categories.subtracting(["email", "phone", "card", "secret", "ip", "name", "face"])
  guard unknown.isEmpty else {
    throw RedactionError(message: "Unknown category: \(unknown.sorted().joined(separator: ", ")). Use email, phone, card, secret, ip, name, or face.")
  }
  let recognitionName = arguments.count > 7 ? arguments[7] : "fast"
  guard ["fast", "accurate"].contains(recognitionName) else {
    throw RedactionError(message: "Invalid text recognition. Choose fast or accurate.")
  }
  let regex = arguments.count > 8 && !arguments[8].isEmpty ? try CustomRegex(pattern: arguments[8]) : nil
  return Configuration(
    inputURL: arguments[1] == "--clipboard" ? nil : URL(fileURLWithPath: arguments[1]),
    outputURL: URL(fileURLWithPath: arguments[2]), style: style, padding: CGFloat(padding),
    categories: categories,
    extraWords: arguments[6].split(separator: ",").map { $0.filter { !$0.isWhitespace } }.filter { $0.count >= 2 },
    recognition: recognitionName == "accurate" ? .accurate : .fast,
    customRegex: regex
  )
}

func redact(_ configuration: Configuration) throws -> Report {
  var configuration = configuration
  let image: CGImage
  let clipboardChangeCount: Int?
  if let inputURL = configuration.inputURL {
    guard let loaded = NSImage(contentsOf: inputURL),
          let bitmap = loaded.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
      throw RedactionError(message: "Could not read the input image. Choose a PNG, JPEG, or TIFF image.")
    }
    image = bitmap
    clipboardChangeCount = nil
  } else {
    let clipboard = try readClipboardImage()
    image = clipboard.image
    clipboardChangeCount = clipboard.changeCount
  }
  let width = image.width
  let height = image.height
  var hits: [Hit] = []
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = configuration.recognition
  // Revision 3 can fail during Neural Engine compilation on macOS.
  if request.recognitionLevel == .accurate { request.revision = VNRecognizeTextRequestRevision2 }
  request.usesLanguageCorrection = false
  let faceRequest = VNDetectFaceRectanglesRequest()
  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  if configuration.customRegex != nil || !configuration.categories.isDisjoint(with: ["email", "phone", "card", "secret", "ip", "name"]) {
    try handler.perform([request])
  }
  if configuration.categories.contains("face") { try handler.perform([faceRequest]) }

  func pixelBox(_ rectangle: CGRect) throws -> Box {
    let padding = Double(configuration.padding)
    return try RedactionRegion(box: Box(
      x: Double(rectangle.minX) * Double(width) - padding,
      y: (1 - Double(rectangle.maxY)) * Double(height) - padding,
      width: Double(rectangle.width) * Double(width) + padding * 2,
      height: Double(rectangle.height) * Double(height) + padding * 2
    ), imageWidth: width, imageHeight: height).box
  }

  func add(kind: String, text: String, confidence: Float, rect: CGRect, confidenceSource: String = "ocr") throws {
    guard kind == "custom" || configuration.categories.contains(kind) else { return }
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    hits.append(Hit(kind: kind, text: String(trimmed.prefix(80)), confidence: Double(confidence),
                    confidenceSource: confidenceSource, box: try pixelBox(rect)))
  }

  let email = try NSRegularExpression(pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", options: [.caseInsensitive])
  let ip = try NSRegularExpression(pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b")
  func matches(_ expression: NSRegularExpression, _ text: String) -> Bool {
    expression.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
  }
  let nameTagger = configuration.categories.contains("name") ? NLTagger(tagSchemes: [.nameType]) : nil
  for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let text = candidate.string
    let compact = text.filter { !$0.isWhitespace }
    let rect = observation.boundingBox
    let confidence = candidate.confidence
    if try configuration.customRegex?.matches(text) == true {
      try add(kind: "custom", text: text, confidence: confidence, rect: rect)
    }
    if matches(email, compact) { try add(kind: "email", text: text, confidence: confidence, rect: rect) }
    if matches(secretExpression, text) { try add(kind: "secret", text: text, confidence: confidence, rect: rect) }
    if matches(ip, compact) { try add(kind: "ip", text: text, confidence: confidence, rect: rect) }
    let numeric = numericDetections(text)
    if numeric.hasCard { try add(kind: "card", text: text, confidence: confidence, rect: rect) }
    if numeric.hasPhone { try add(kind: "phone", text: text, confidence: confidence, rect: rect) }
    if configuration.extraWords.contains(where: { compact.localizedCaseInsensitiveContains($0) }) {
      try add(kind: "name", text: text, confidence: 1, rect: rect, confidenceSource: "rule")
    }
    if let tagger = nameTagger {
      tagger.string = text
      var names: [String] = []
      tagger.enumerateTags(in: text.startIndex..<text.endIndex, unit: .word, scheme: .nameType) { tag, range in
        if tag == .personalName { names.append(String(text[range])) }
        return true
      }
      for name in names { try add(kind: "name", text: name, confidence: confidence, rect: rect) }
    }
  }
  for face in faceRequest.results ?? [] {
    try add(kind: "face", text: "face", confidence: face.confidence, rect: face.boundingBox, confidenceSource: "face")
  }
  let regions = try redactionRegions(boxes: hits.map(\.box), imageWidth: width, imageHeight: height)
  let output = try renderRedactions(image: image, regions: regions, style: configuration.style)
  guard let png = NSBitmapImageRep(cgImage: output).representation(using: .png, properties: [:]) else {
    throw RedactionError(message: "Could not encode the redacted image. No image was published.")
  }
  try png.write(to: configuration.outputURL, options: .atomic)
  return Report(hits: hits, regionCount: regions.count, output: configuration.outputURL.path,
                clipboardChangeCount: clipboardChangeCount)
}

let arguments = CommandLine.arguments
if arguments.count > 1, arguments[1] == "--copy-clipboard" {
  guard (3...4).contains(arguments.count),
        arguments.count == 3 || (Int(arguments[3]).map { $0 >= 0 } == true) else {
    fputs("Usage: hide-details --copy-clipboard <output.png> [expected clipboard change count]\n", stderr)
    exit(2)
  }
  do {
    try copyClipboardImage(outputURL: URL(fileURLWithPath: arguments[2]),
                           expectedChangeCount: arguments.count > 3 ? Int(arguments[3]) : nil)
  } catch {
    fputs("\(error.localizedDescription)\n", stderr)
    exit(1)
  }
  exit(0)
}

let configuration: Configuration
do {
  configuration = try parseConfiguration(arguments)
} catch {
  fputs("\(error.localizedDescription)\n", stderr)
  exit(2)
}
do {
  let report = try redact(configuration)
  FileHandle.standardOutput.write(try JSONEncoder().encode(report))
} catch {
  fputs("\(error.localizedDescription)\n", stderr)
  exit(error is CustomRegexError ? 2 : 1)
}
