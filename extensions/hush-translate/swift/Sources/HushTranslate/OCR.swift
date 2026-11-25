import AppKit
import Foundation
import Vision
import RaycastSwiftMacros

struct OCRError: LocalizedError {
  let errorDescription: String?
  init(_ message: String) { errorDescription = message }
}

private struct Line {
  var text: String
  var minX: CGFloat
  var maxX: CGFloat
  var minY: CGFloat
  var height: CGFloat
}

/// Reads the text in an image file, for a screenshot.
@raycast func recognizeImage(path: String) throws -> Capture {
  do {
    return Capture(kind: "image", text: try recognizeText(at: URL(fileURLWithPath: path)), image: path)
  } catch {
    throw Failure(code: "ocr", message: error.localizedDescription)
  }
}

/// Recognises the text in an image and reflows it into paragraphs.
func recognizeText(at url: URL) throws -> String {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw OCRError("The image could not be opened.")
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.automaticallyDetectsLanguage = true
  try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])

  // Vision's origin is bottom-left; observations arrive in reading order.
  var lines: [Line] = []
  for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let box = observation.boundingBox
    if var last = lines.last, abs(box.minY - last.minY) < (box.height + last.height) / 3 {
      // Same row: a second fragment further along the line.
      last.text += " " + candidate.string
      last.minX = min(last.minX, box.minX)
      last.maxX = max(last.maxX, box.maxX)
      lines[lines.count - 1] = last
    } else {
      lines.append(Line(text: candidate.string, minX: box.minX, maxX: box.maxX, minY: box.minY, height: box.height))
    }
  }
  return paragraphs(from: lines)
}

/// Joins wrapped lines back into paragraphs. A line continues the previous one when it sits
/// right below it at the same size and the previous line ran all the way to the right edge.
private func paragraphs(from lines: [Line]) -> String {
  guard let first = lines.first else { return "" }
  let left = lines.map(\.minX).min() ?? 0
  let right = lines.map(\.maxX).max() ?? 1
  let fullWidth = right - (right - left) * 0.12

  var text = first.text
  for (previous, line) in zip(lines, lines.dropFirst()) {
    let gap = previous.minY - (line.minY + line.height)
    let tallest = max(previous.height, line.height)
    let wraps =
      gap < tallest * 0.8
      && abs(previous.height - line.height) < tallest * 0.3
      && previous.maxX >= fullWidth
    if !wraps {
      text += gap > tallest * 1.5 ? "\n\n" : "\n"
    } else if let end = previous.text.last, let start = line.text.first, isCJK(end), isCJK(start) {
      // Chinese and Japanese wrap without a space.
    } else {
      text += " "
    }
    text += line.text
  }
  return text
}

private func isCJK(_ character: Character) -> Bool {
  guard let scalar = character.unicodeScalars.first else { return false }
  switch scalar.value {
  case 0x2E80...0x9FFF, 0xF900...0xFAFF, 0xFF00...0xFFEF: return true
  default: return false
  }
}
