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
        require(pixel(before, x: x, y: y) == pixel(after, x: x, y: y), "outside pixels changed at \(x),\(y): \(pixel(before, x: x, y: y)) != \(pixel(after, x: x, y: y))")
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

for text in ["Card 4111 1111 1111 1111 Exp 12/29", "Card 4111111111111111 Ref 123456", "4111-1111-1111-1111 12/29",
             "4111.1111.1111.1111", "Card 4111 . 1111 . 1111 . 1111 Exp 12/29", "3782.822463.10005", "4222.2222.2222.2"] {
  let result = numericDetections(text)
  require(result.hasCard && !result.hasPhone, "missed card or classified its fragments as phone in \(text)")
}
for text in ["Phone +1 415 555 0123 Ticket 123456789", "Contact (415) 555-0123 Ref 987654321", "Call 415.555.0123", "Call 415 555 0123 987654321", "4155550123 2125559876"] {
  require(numericDetections(text).hasPhone, "missed phone beside unrelated digits in \(text)")
}
let multiple = numericDetections("4111 1111 1111 1111 Phone +1 415 555 0123")
require(multiple.hasCard && multiple.hasPhone, "separate card and phone should both be classified")
require(!numericDetections("192.168.10.20").hasPhone, "IPv4 classified as phone")
for text in ["server 192.168.1.10", "Host 10.0.0.1 up", "Gateway 192 . 168 . 1 . 20 ready",
             "Host 10\t.\t0 . 0. 1 up", "0.0.0.0", "255.255.255.255", "🔒 server 192.168.1.10"] {
  let result = numericDetections(text)
  require(result.hasIP && !result.hasPhone && !result.hasCard, "missed IPv4 or misclassified its digits in \(text)")
}
for text in ["999.1.1.1", "1.256.1.1", "1.1.256.1", "1.1.1.256", "1192.168.1.10", "10.0.0.1000", "1.2.3"] {
  require(!numericDetections(text).hasIP, "invalid IPv4 classified in \(text)")
}
require(!numericDetections("0000 0000 0000 0000").hasCard, "placeholder card classified")
require(!numericDetections("41111111111111111").hasPhone, "a long numeric run must not be split into phone fragments")
require(!numericDetections("4111 1111 1111 1112").hasCard, "invalid Luhn checksum classified")
require(!numericDetections("4111 1111 1111 1112").hasPhone, "invalid card fragments classified as phone")
require(!numericDetections("4111.1111.1111.1112").hasCard, "invalid dotted card checksum classified")
require(!numericDetections("4111.1111.1111.1112").hasPhone, "invalid dotted card fragments classified as phone")
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


// Round-trip a synthetic image through the encrypted review snapshot. Every edit
// starts from this source, including re-enabling a mask after excluding all hits.
let reviewDirectory = URL(fileURLWithPath: CommandLine.arguments[1])
let reviewOutput = reviewDirectory.appendingPathComponent("review.png")
let sourcePath = reviewDirectory.appendingPathComponent("source.sealed").path
let reviewKey = try saveReviewSource(source, beside: reviewOutput)
let sealed = try Data(contentsOf: URL(fileURLWithPath: sourcePath))
require(!sealed.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]), "unredacted source must not be stored as PNG")
let twoBoxes = [first.box, second.box]
for style in [Style.blackout, .pixelate, .blur] {
  for boxes in [twoBoxes, [second.box], [], twoBoxes] {
    let json = String(data: try JSONEncoder().encode(boxes.map { RedactionMask(kind: "email", box: $0) }), encoding: .utf8)!
    let count = try renderReview(sourcePath: sourcePath, key: reviewKey, masksJSON: json,
                                 style: style.rawValue, outputPath: reviewOutput.path)
    require(count == boxes.count, "review count disagrees with selected regions")
    let actual = NSImage(contentsOf: reviewOutput)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let expectedRegions = try redactionRegions(boxes: boxes, imageWidth: source.width, imageHeight: source.height)
    let expected = try renderRedactions(image: source, regions: expectedRegions, style: style)
    // Normalize decoded pixels into the same RGBA layout before comparison.
    let normalized = try renderRedactions(image: actual, regions: [], style: .blackout)
    for y in 0..<expected.height {
      for x in 0..<expected.width {
        let before = pixel(expected, x: x, y: y)
        let after = pixel(normalized, x: x, y: y)
        let masked = expectedRegions.contains { x >= $0.x && x < $0.x + $0.width && y >= $0.y && y < $0.y + $0.height }
        // Core Image can round a blurred RGB channel by one level after PNG decoding.
        // Outside masks, alpha, blackout and pixelation must remain byte-exact.
        let tolerance = style == .blur && masked ? 1 : 0
        require(zip(before.prefix(3), after.prefix(3)).allSatisfy { abs(Int($0) - Int($1)) <= tolerance } && before[3] == after[3],
                "review \(style) boxes=\(boxes.count) mismatch at \(x),\(y): \(before) != \(after)")
      }
    }
  }
}
try FileManager.default.removeItem(at: reviewOutput)
for key in ["invalid", Data(repeating: 0, count: 32).base64EncodedString()] {
  do {
    _ = try renderReview(sourcePath: sourcePath, key: key, masksJSON: "[]", style: "blackout", outputPath: reviewOutput.path)
    fatalError("invalid key accepted")
  } catch {}
  require(!FileManager.default.fileExists(atPath: reviewOutput.path), "invalid key produced output")
}
print("Encrypted review snapshot, reversible exclusions, and all three styles passed pixel checks.")

// Compare mixed face/text rendering against each style, including shared geometry.
for style in [Style.blackout, .pixelate, .blur] {
  let face = RedactionMask(kind: "face", box: first.box)
  let text = RedactionMask(kind: "email", box: second.box)
  let sameBoxText = RedactionMask(kind: "custom", box: first.box)
  for masks in [[face, text], [text], [face], [], [face, text], [face, sameBoxText]] {
    let rendered = try renderMasks(image: source, masks: masks, style: style, blurFaces: true)
    let allRegions = try redactionRegions(boxes: masks.map(\.box), imageWidth: source.width, imageHeight: source.height)
    require(rendered.regionCount == allRegions.count, "mixed styles must count distinct geometry once")
    assertUnchangedOutside(baseline, rendered.image, allRegions)
    let faceOnly = try renderRedactions(image: source, regions: [first], style: .blur)
    let firstText = try renderRedactions(image: source, regions: [first], style: style)
    let secondText = try renderRedactions(image: source, regions: [second], style: style)
    let json = String(data: try JSONEncoder().encode(masks), encoding: .utf8)!
    let count = try renderReview(sourcePath: sourcePath, key: reviewKey, masksJSON: json,
                                 style: style.rawValue, outputPath: reviewOutput.path, blurFaces: true)
    require(count == rendered.regionCount, "review must preserve mixed style region counts")
    let actual = NSImage(contentsOf: reviewOutput)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let review = try renderRedactions(image: actual, regions: [], style: .blackout)
    for y in 0..<source.height {
      for x in 0..<source.width {
        let mask = masks.last { $0.box.x <= Double(x) && Double(x) < $0.box.x + $0.box.width &&
                               $0.box.y <= Double(y) && Double(y) < $0.box.y + $0.box.height }
        let expected = mask.map { $0.kind == "face" ? faceOnly : ($0.box.x == first.box.x ? firstText : secondText) } ?? baseline
        let outputPixel = pixel(rendered.image, x: x, y: y)
        let expectedPixel = pixel(expected, x: x, y: y)
        require(zip(outputPixel, expectedPixel).allSatisfy { abs(Int($0) - Int($1)) <= 1 },
                "face blur or overlapping text used the wrong style \(style) at \(x),\(y): \(outputPixel) != \(expectedPixel)")
        require(zip(outputPixel, pixel(review, x: x, y: y)).allSatisfy { abs(Int($0) - Int($1)) <= 1 },
                "review lost face blur after excluding or restoring a mask")
      }
    }
  }
  let masks = [RedactionMask(kind: "face", box: first.box), RedactionMask(kind: "email", box: second.box)]
  let disabled = try renderMasks(image: source, masks: masks, style: style, blurFaces: false)
  let original = try renderRedactions(image: source, regions: [first, second], style: style)
  for y in 0..<source.height {
    for x in 0..<source.width {
      require(pixel(disabled.image, x: x, y: y) == pixel(original, x: x, y: y),
              "disabled face blur must preserve the selected style")
    }
  }
}
print("Face blur, overlapping text styles, distinct counts, and reversible review passed pixel checks.")
