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
  let customRegex: CustomRegex?
}

func parseConfiguration(
  inputPath: String?, outputPath: String, style: String, padding: String,
  categories: String, extraWords: String, recognition: String, customRegex: String
) throws -> Configuration {
  guard let style = Style(rawValue: style) else {
    throw RedactionError(message: "Invalid redaction style. Choose blackout, blur, or pixelate.")
  }
  guard let padding = Double(padding), padding.isFinite, (0...1000).contains(padding) else {
    throw RedactionError(message: "Invalid padding. Enter a number from 0 to 1000 in extension preferences.")
  }
  let categories = Set(categories.split(separator: ",", omittingEmptySubsequences: false)
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
    .filter { !$0.isEmpty })
  let unknown = categories.subtracting(["email", "phone", "card", "secret", "ip", "name", "face"])
  guard unknown.isEmpty else {
    throw RedactionError(message: "Unknown category: \(unknown.sorted().joined(separator: ", ")). Use email, phone, card, secret, ip, name, or face.")
  }
  guard ["fast", "accurate"].contains(recognition) else {
    throw RedactionError(message: "Invalid text recognition. Choose fast or accurate.")
  }
  let regex = customRegex.isEmpty ? nil : try CustomRegex(pattern: customRegex)
  return Configuration(
    inputURL: inputPath.map { URL(fileURLWithPath: $0) },
    outputURL: URL(fileURLWithPath: outputPath), style: style, padding: CGFloat(padding),
    categories: categories,
    extraWords: extraWords.split(separator: ",").map { $0.filter { !$0.isWhitespace } }.filter { $0.count >= 2 },
    recognition: recognition == "accurate" ? .accurate : .fast,
    customRegex: regex
  )
}

func redact(_ configuration: Configuration) throws -> Report {
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
    let numeric = numericDetections(text)
    if numeric.hasIP { try add(kind: "ip", text: text, confidence: confidence, rect: rect) }
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
