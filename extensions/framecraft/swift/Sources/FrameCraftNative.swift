import AppKit
import Foundation
import RaycastSwiftMacros
import Vision

struct TextOverlayLayerSpec: Decodable {
  let text: String
  let fontFamily: String
  let fontSize: Double
  let fillHex: String
  let strokeHex: String
  let yOffset: Double
  let alignTop: Bool
}

struct NativeHelperError: LocalizedError, CustomStringConvertible {
  let message: String

  var errorDescription: String? { message }
  var description: String { message }
}

private func colorFromHex(_ hex: String, fallback: NSColor) -> NSColor {
  let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  guard cleaned.count == 6, let val = UInt64(cleaned, radix: 16) else {
    return fallback
  }
  let r = CGFloat((val >> 16) & 0xFF) / 255.0
  let g = CGFloat((val >> 8) & 0xFF) / 255.0
  let b = CGFloat(val & 0xFF) / 255.0
  return NSColor(srgbRed: r, green: g, blue: b, alpha: 1.0)
}

/// Renders the subtitle text layers onto a transparent PNG of the given size.
@raycast func renderTextOverlay(width: Int, height: Int, layers: [TextOverlayLayerSpec], outputPath: String) throws {
  let w = max(16, width)
  let h = max(16, height)

  guard
    let rep = NSBitmapImageRep(
      bitmapDataPlanes: nil,
      pixelsWide: w,
      pixelsHigh: h,
      bitsPerSample: 8,
      samplesPerPixel: 4,
      hasAlpha: true,
      isPlanar: false,
      colorSpaceName: .deviceRGB,
      bytesPerRow: 0,
      bitsPerPixel: 0
    )
  else {
    throw NativeHelperError(message: "Could not allocate a \(w)x\(h) bitmap for the text overlay.")
  }
  guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
    throw NativeHelperError(message: "Could not create a graphics context for the text overlay.")
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context

  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center
  paragraph.lineSpacing = 6

  for layer in layers {
    let trimmed = layer.text.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { continue }

    let fontSize = CGFloat(layer.fontSize)
    let font = NSFont(name: layer.fontFamily, size: fontSize)
      ?? NSFont.systemFont(ofSize: fontSize, weight: .semibold)
    let fillColor = colorFromHex(layer.fillHex, fallback: .white)
    let strokeColor = colorFromHex(layer.strokeHex, fallback: .black)

    let shadow = NSShadow()
    shadow.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.82)
    shadow.shadowBlurRadius = max(4.0, fontSize * 0.14)
    shadow.shadowOffset = NSSize(width: 0, height: -max(2.0, fontSize * 0.05))

    let strokeAttrs: [NSAttributedString.Key: Any] = [
      .font: font,
      .paragraphStyle: paragraph,
      .strokeColor: strokeColor,
      .strokeWidth: max(4.0, fontSize * 0.14),
      .shadow: shadow,
    ]
    let fillAttrs: [NSAttributedString.Key: Any] = [
      .font: font,
      .paragraphStyle: paragraph,
      .foregroundColor: fillColor,
    ]

    let maxBoxWidth = CGFloat(w) * 0.86
    let strokeStr = NSAttributedString(string: trimmed, attributes: strokeAttrs)
    let fillStr = NSAttributedString(string: trimmed, attributes: fillAttrs)
    let bounds = fillStr.boundingRect(
      with: NSSize(width: maxBoxWidth, height: CGFloat(h) * 0.5),
      options: [.usesLineFragmentOrigin, .usesFontLeading]
    )

    let margin = CGFloat(h) * 0.065
    // AppKit is not flipped here: y = 0 is the bottom edge.
    let baseBottomY: CGFloat
    if layer.alignTop {
      baseBottomY = CGFloat(h) - margin - ceil(bounds.height) - CGFloat(layer.yOffset)
    } else {
      baseBottomY = margin - CGFloat(layer.yOffset)
    }

    let drawRect = NSRect(
      x: (CGFloat(w) - maxBoxWidth) / 2.0,
      y: baseBottomY,
      width: maxBoxWidth,
      height: ceil(bounds.height) + fontSize * 0.35
    )
    strokeStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    fillStr.draw(with: drawRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
  }

  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()

  guard let pngData = rep.representation(using: .png, properties: [:]) else {
    throw NativeHelperError(message: "Could not encode the text overlay as PNG.")
  }
  do {
    try pngData.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
  } catch {
    throw NativeHelperError(message: "Could not write the text overlay to \(outputPath): \(error.localizedDescription)")
  }
}

/// Recognizes text in an image with Vision and returns the lines top-to-bottom, joined by newlines.
@raycast func recognizeText(imagePath: String) throws -> String {
  guard FileManager.default.fileExists(atPath: imagePath) else {
    throw NativeHelperError(message: "The image to recognize does not exist: \(imagePath)")
  }
  let handler = VNImageRequestHandler(url: URL(fileURLWithPath: imagePath), options: [:])
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US", "ja-JP"]

  try handler.perform([request])
  let observations = request.results ?? []
  // Vision's y = 0 is the bottom edge, so sort by descending midY for top-to-bottom order.
  let sorted = observations.sorted { $0.boundingBox.midY > $1.boundingBox.midY }
  let lines = sorted
    .compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty }
  return lines.joined(separator: "\n")
}

/// Puts a PNG file on the general pasteboard.
@raycast func copyPngToPasteboard(imagePath: String) throws {
  let data: Data
  do {
    data = try Data(contentsOf: URL(fileURLWithPath: imagePath))
  } catch {
    throw NativeHelperError(message: "Could not read the image to copy: \(error.localizedDescription)")
  }
  let pasteboard = NSPasteboard.general
  pasteboard.clearContents()
  guard pasteboard.setData(data, forType: .png) else {
    throw NativeHelperError(message: "Could not place the image on the clipboard.")
  }
}
