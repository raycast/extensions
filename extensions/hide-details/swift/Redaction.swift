import Foundation
import AppKit
import CoreImage

struct Box: Codable {
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct Hit: Codable {
  let kind: String
  let text: String
  let confidence: Double
  let confidenceSource: String
  let box: Box
}

enum Style: String { case pixelate, blur, blackout }

struct RedactionError: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}

struct RedactionRegion: Hashable {
  let x: Int
  let y: Int
  let width: Int
  let height: Int

  var cropRect: CGRect { CGRect(x: x, y: y, width: width, height: height) }
  var box: Box { Box(x: Double(x), y: Double(y), width: Double(width), height: Double(height)) }

  init(box: Box, imageWidth: Int, imageHeight: Int) throws {
    guard [box.x, box.y, box.width, box.height].allSatisfy({ $0.isFinite }),
          box.width > 0, box.height > 0, imageWidth > 0, imageHeight > 0 else {
      throw RedactionError(message: "Invalid redaction region. No image was published.")
    }
    let left = max(0, floor(box.x))
    let top = max(0, floor(box.y))
    let right = min(Double(imageWidth), ceil(box.x + box.width))
    let bottom = min(Double(imageHeight), ceil(box.y + box.height))
    guard left.isFinite, top.isFinite, right.isFinite, bottom.isFinite,
          right > left, bottom > top else {
      throw RedactionError(message: "Redaction region is outside the image. No image was published.")
    }
    x = Int(left)
    y = Int(top)
    width = Int(right - left)
    height = Int(bottom - top)
  }
}

func redactionRegions(boxes: [Box], imageWidth: Int, imageHeight: Int) throws -> [RedactionRegion] {
  var seen = Set<RedactionRegion>()
  return try boxes.compactMap { box in
    let region = try RedactionRegion(box: box, imageWidth: imageWidth, imageHeight: imageHeight)
    return seen.insert(region).inserted ? region : nil
  }
}

func renderRedactions(image: CGImage, regions: [RedactionRegion], style: Style) throws -> CGImage {
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  func bitmap(width: Int, height: Int) throws -> CGContext {
    guard let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
      space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      throw RedactionError(message: "Could not allocate the redacted image. Try a smaller image.")
    }
    return context
  }
  let context = try bitmap(width: image.width, height: image.height)
  context.setBlendMode(.copy)
  context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
  let ciContext = CIContext()
  for region in regions {
    let checked = try RedactionRegion(box: region.box, imageWidth: image.width, imageHeight: image.height)
    guard checked == region else {
      throw RedactionError(message: "Redaction region exceeds the image. No image was published.")
    }
    let drawRect = CGRect(x: region.x, y: image.height - region.y - region.height,
                          width: region.width, height: region.height)
    if style == .blackout {
      context.setFillColor(CGColor(gray: 0, alpha: 1))
      context.fill(drawRect)
      continue
    }
    // CGImage crops use a top-left origin; only the drawing context uses bottom-left.
    guard let crop = image.cropping(to: region.cropRect) else {
      throw RedactionError(message: "Could not crop a detected region. No image was published.")
    }
    switch style {
    case .pixelate:
      let block = max(8, min(region.width, region.height) / 8)
      let smallWidth = max(1, region.width / block)
      let smallHeight = max(1, region.height / block)
      let small = try bitmap(width: smallWidth, height: smallHeight)
      small.interpolationQuality = .low
      small.setBlendMode(.copy)
      small.draw(crop, in: CGRect(x: 0, y: 0, width: smallWidth, height: smallHeight))
      guard let tiny = small.makeImage() else {
        throw RedactionError(message: "Could not pixelate a detected region. No image was published.")
      }
      context.interpolationQuality = .none
      context.draw(tiny, in: drawRect)
    case .blur:
      guard let filter = CIFilter(name: "CIGaussianBlur") else {
        throw RedactionError(message: "Blur is unavailable. Choose Blackout in extension preferences.")
      }
      filter.setValue(CIImage(cgImage: crop).clampedToExtent(), forKey: kCIInputImageKey)
      filter.setValue(12, forKey: kCIInputRadiusKey)
      let bounds = CGRect(x: 0, y: 0, width: region.width, height: region.height)
      guard let blurred = filter.outputImage?.cropped(to: bounds),
            let rendered = ciContext.createCGImage(blurred, from: bounds) else {
        throw RedactionError(message: "Could not blur a detected region. No image was published.")
      }
      context.interpolationQuality = .none
      context.draw(rendered, in: drawRect)
    case .blackout:
      break
    }
  }
  guard let output = context.makeImage() else {
    throw RedactionError(message: "Could not create the redacted image. No image was published.")
  }
  return output
}

func luhn(_ digits: String) -> Bool {
  let numbers = digits.compactMap { $0.asciiValue }.map { Int($0) - 48 }
  guard (13...19).contains(numbers.count), numbers.count == digits.count,
        numbers.allSatisfy({ (0...9).contains($0) }), numbers.contains(where: { $0 != 0 }) else { return false }
  var sum = 0
  for (index, number) in numbers.reversed().enumerated() {
    var value = number
    if index % 2 == 1 {
      value *= 2
      if value > 9 { value -= 9 }
    }
    sum += value
  }
  return sum % 10 == 0
}

let secretExpression = try! NSRegularExpression(pattern: "(?:sk|rk)[_\\s]+(?:live|test)[_\\s]+(?:[A-Za-z]+[ \\t]+[0-9]{8,19}(?![0-9])|[A-Za-z0-9]+)|ghp[_\\s]+[A-Za-z0-9]{20,}|github[_\\s]+pat[_\\s]+[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}")

struct NumericDetections {
  let hasCard: Bool
  let hasPhone: Bool
}

func numericDetections(_ text: String) -> NumericDetections {
  let source = text as NSString
  let fullRange = NSRange(location: 0, length: source.length)
  let runExpression = try! NSRegularExpression(pattern: "(?<![0-9])[0-9]+(?:[ \\t-]+[0-9]+)*(?![0-9])")
  let groupExpression = try! NSRegularExpression(pattern: "[0-9]+")
  let ipv4Expression = try! NSRegularExpression(pattern: "(?<![0-9])(?:[0-9]{1,3}[ \\t]*\\.[ \\t]*){3}[0-9]{1,3}(?![0-9])")
  let ipv4Ranges = ipv4Expression.matches(in: text, range: fullRange).compactMap { match -> NSRange? in
    let components = source.substring(with: match.range).split(separator: ".").map { $0.trimmingCharacters(in: .whitespaces) }
    return components.allSatisfy({ Int($0).map { (0...255).contains($0) } == true }) ? match.range : nil
  }
  let secretRanges = secretExpression.matches(in: text, range: fullRange).map(\.range)
  let excludedNumericRanges = ipv4Ranges + secretRanges
  var cardRanges: [NSRange] = []
  for run in runExpression.matches(in: text, range: fullRange) {
    let groups = groupExpression.matches(in: text, range: run.range).map(\.range)
    for start in groups.indices {
      var digits = ""
      for end in start..<groups.count {
        digits += source.substring(with: groups[end])
        if digits.count > 19 { break }
        let candidate = NSRange(location: groups[start].location,
                                length: NSMaxRange(groups[end]) - groups[start].location)
        if luhn(digits), !excludedNumericRanges.contains(where: { NSIntersectionRange($0, candidate).length > 0 }) {
          cardRanges.append(candidate)
        }
      }
    }
  }
  var excludedPhoneRanges = cardRanges + excludedNumericRanges
  for run in runExpression.matches(in: text, range: fullRange) {
    let groups = groupExpression.matches(in: text, range: run.range).map(\.range)
    guard groups.count >= 4 else { continue }
    for start in 0...(groups.count - 4) {
      let end = start + 3
      if groups[start...end].allSatisfy({ $0.length == 4 }) {
        excludedPhoneRanges.append(NSRange(location: groups[start].location,
                                            length: NSMaxRange(groups[end]) - groups[start].location))
      }
    }
  }
  let phoneExpression = try! NSRegularExpression(pattern: "(?<![0-9])\\+?\\(?[0-9]+(?:[ \\t().-]+[0-9]+)*\\)?(?![0-9])")
  var hasPhone = false
  for run in phoneExpression.matches(in: text, range: fullRange) {
    let groups = groupExpression.matches(in: text, range: run.range).map(\.range)
    for start in groups.indices {
      var digitCount = 0
      for end in start..<groups.count {
        digitCount += groups[end].length
        if digitCount > 15 { break }
        guard digitCount >= 8 else { continue }
        let candidate = NSRange(location: groups[start].location,
                                length: NSMaxRange(groups[end]) - groups[start].location)
        if !excludedPhoneRanges.contains(where: { NSIntersectionRange($0, candidate).length > 0 }) {
          hasPhone = true
          break
        }
      }
      if hasPhone { break }
    }
    if hasPhone { break }
  }
  return NumericDetections(hasCard: !cardRanges.isEmpty, hasPhone: hasPhone)
}
