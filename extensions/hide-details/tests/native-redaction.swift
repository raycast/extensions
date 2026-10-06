import Foundation
import AppKit

func require(_ condition: @autoclosure () -> Bool, _ message: String) {
  guard condition() else { fatalError(message) }
}

func sourceImage(alpha: UInt8 = 255) -> CGImage {
  let width = 120
  let height = 96
  var bytes = [UInt8](repeating: 0, count: width * height * 4)
  for y in 0..<height {
    for x in 0..<width {
      let offset = (y * width + x) * 4
      let intensity: UInt8 = (x / 2 + y / 3).isMultiple(of: 2) ? alpha : alpha / 5
      bytes[offset] = y < height / 2 ? intensity : 0
      bytes[offset + 1] = 0
      bytes[offset + 2] = y >= height / 2 ? intensity : 0
      bytes[offset + 3] = alpha
    }
  }
  let data = Data(bytes) as CFData
  return CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32,
                 bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
                 bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                 provider: CGDataProvider(data: data)!, decode: nil, shouldInterpolate: false,
                 intent: .defaultIntent)!
}

func pixel(_ image: CGImage, x: Int, y: Int) -> [UInt8] {
  let data = image.dataProvider!.data!
  let pointer = CFDataGetBytePtr(data)!
  let offset = y * image.bytesPerRow + x * 4
  return (0..<4).map { pointer[offset + $0] }
}

func assertUnchangedOutside(_ before: CGImage, _ after: CGImage, _ regions: [RedactionRegion]) {
  for y in 0..<before.height {
    for x in 0..<before.width {
      if !regions.contains(where: { x >= $0.x && x < $0.x + $0.width && y >= $0.y && y < $0.y + $0.height }) {
        require(pixel(before, x: x, y: y) == pixel(after, x: x, y: y), "outside pixels changed at \(x),\(y)")
      }
    }
  }
}

let box = Box(x: 11.4, y: 5.2, width: 31.2, height: 24.1)
let source = sourceImage()
let regions = try redactionRegions(boxes: [box], imageWidth: source.width, imageHeight: source.height)
let region = regions[0]
require(region.x == 11 && region.y == 5 && region.width == 32 && region.height == 25, "integral crop includes every detected pixel")
let baseline = try renderRedactions(image: source, regions: [], style: .blackout)
assertUnchangedOutside(source, baseline, [])
for style in [Style.blackout, .pixelate, .blur] {
  let rendered = try renderRedactions(image: source, regions: regions, style: style)
  assertUnchangedOutside(baseline, rendered, regions)
  var changedPixels = 0
  for y in region.y..<region.y + region.height {
    for x in region.x..<region.x + region.width {
      let output = pixel(rendered, x: x, y: y)
      require(output[3] == 255, "\(style) leaked alpha at the mask edge")
      if style == .blackout {
        require(output == [0, 0, 0, 255], "blackout must replace every pixel")
      } else {
        require(output[0] > 20 && output[2] < 2, "\(style) sampled the vertically mirrored blue region")
      }
      if output != pixel(baseline, x: x, y: y) { changedPixels += 1 }
    }
  }
  require(changedPixels > region.width * region.height / 3, "\(style) did not remove the high frequency pattern")
}

let transparent = sourceImage(alpha: 128)
let transparentBaseline = try renderRedactions(image: transparent, regions: [], style: .blackout)
assertUnchangedOutside(transparent, transparentBaseline, [])
for style in [Style.blackout, .pixelate, .blur] {
  let rendered = try renderRedactions(image: transparent, regions: regions, style: style)
  assertUnchangedOutside(transparentBaseline, rendered, regions)
  for y in region.y..<region.y + region.height {
    for x in region.x..<region.x + region.width {
      let alpha = pixel(rendered, x: x, y: y)[3]
      require(style == .blackout ? alpha == 255 : abs(Int(alpha) - 128) <= 1,
              "\(style) blended original pixels under a transparent mask")
    }
  }
}

let edgeBox = Box(x: -3.2, y: 90.5, width: 9.1, height: 30)
let edge = try redactionRegions(boxes: [edgeBox], imageWidth: 120, imageHeight: 96)[0]
require(edge.x == 0 && edge.y == 90 && edge.width == 6 && edge.height == 6, "edge mask must be clipped")
let distinct = try redactionRegions(boxes: [box, box, Box(x: 11.4, y: 5.2, width: 40, height: 24.1)], imageWidth: 120, imageHeight: 96)
require(distinct.count == 2, "geometry dedupe must retain different extents with the same origin")
let narrow = try redactionRegions(boxes: [Box(x: 0, y: 0, width: 1, height: 1)], imageWidth: 120, imageHeight: 96)
let narrowOutput = try renderRedactions(image: source, regions: narrow, style: .blackout)
require(pixel(narrowOutput, x: 0, y: 0) == [0, 0, 0, 255], "one-pixel regions must be masked")

for invalid in [Box(x: 1, y: 1, width: 0, height: 4), Box(x: .nan, y: 1, width: 4, height: 4),
                Box(x: 121, y: 1, width: 4, height: 4)] {
  do {
    _ = try redactionRegions(boxes: [invalid], imageWidth: 120, imageHeight: 96)
    fatalError("invalid geometry accepted")
  } catch is RedactionError {}
}

let first = try RedactionRegion(box: Box(x: 10, y: 4, width: 35, height: 30), imageWidth: 120, imageHeight: 96)
let second = try RedactionRegion(box: Box(x: 28, y: 12, width: 31, height: 30), imageWidth: 120, imageHeight: 96)
for style in [Style.pixelate, .blur] {
  let combined = try renderRedactions(image: source, regions: [first, second], style: style)
  let secondOnly = try renderRedactions(image: source, regions: [second], style: style)
  for y in second.y..<second.y + second.height {
    for x in second.x..<second.x + second.width {
      require(pixel(combined, x: x, y: y) == pixel(secondOnly, x: x, y: y), "\(style) sampled previously modified pixels")
    }
  }
}

for text in ["Card 4111 1111 1111 1111 Exp 12/29", "Card 4111111111111111 Ref 123456", "4111-1111-1111-1111 12/29"] {
  let result = numericDetections(text)
  require(result.hasCard && !result.hasPhone, "missed card or classified its fragments as phone in \(text)")
}
for text in ["Phone +1 415 555 0123 Ticket 123456789", "Contact (415) 555-0123 Ref 987654321", "Call 415.555.0123", "Call 415 555 0123 987654321", "4155550123 2125559876"] {
  require(numericDetections(text).hasPhone, "missed phone beside unrelated digits in \(text)")
}
let multiple = numericDetections("4111 1111 1111 1111 Phone +1 415 555 0123")
require(multiple.hasCard && multiple.hasPhone, "separate card and phone should both be classified")
require(!numericDetections("192.168.10.20").hasPhone, "IPv4 classified as phone")
require(!numericDetections("0000 0000 0000 0000").hasCard, "placeholder card classified")
require(!numericDetections("41111111111111111").hasPhone, "a long numeric run must not be split into phone fragments")
require(!numericDetections("4111 1111 1111 1112").hasCard, "invalid Luhn checksum classified")
require(!numericDetections("4111 1111 1111 1112").hasPhone, "invalid card fragments classified as phone")
require(!numericDetections("192.168.10.20 123").hasPhone, "IPv4 fragments combined into phone")
for text in ["192.168.10.20 4155550123", "4155550123 192.168.10.20", "4155550123 192. 168. 10. 20", "192 . 168 . 10 . 20 4155550123"] {
  let result = numericDetections(text)
  require(result.hasPhone && !result.hasCard, "IPv4 digits must not combine with a phone into a card in \(text)")
}
for secret in ["sk_live_AbcDef1234567890", "sk live AbcDef1234567890", "sk live AbcDef 1234567890", "rk_test_4111111111111111",
               "ghp_AbcDef1234567890123456", "github_pat_1234567890_AbcDef", "AKIA1234567890123456",
               "xoxb-1234567890-1234567890-AbcDef", "eyJ1234567890123.Abc1234567890"] {
  let result = numericDetections(secret)
  require(!result.hasPhone && !result.hasCard, "secret digits classified as a phone or card in \(secret)")
  for text in ["\(secret) +1 415 555 0123", "+1 415 555 0123 \(secret)", "🔑 \(secret) +1 415 555 0123", "\(secret) 4155550123", "\(secret) 415 555 0123"] {
    require(numericDetections(text).hasPhone, "missed a real phone beside a secret in \(text)")
  }
  require(numericDetections("\(secret) 4111 1111 1111 1111").hasCard, "missed a real card beside a secret")
}
print("Native redaction geometry, crop direction, replacement alpha, immutable source, and numeric regressions passed.")
