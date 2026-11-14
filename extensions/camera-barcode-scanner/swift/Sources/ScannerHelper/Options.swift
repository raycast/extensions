import Foundation
import Vision

struct ScannerOptions: Decodable {
  var suffix = "none"
  var gsSeparator = "omit"
  var gsReplacement = "|"
  var symbologies: [String] = ScannerOptions.allSymbologyIds
  var dedupeSeconds = 2.0
  var camera = "auto"
  var timeoutSeconds = 30.0

  static let allSymbologyIds = [
    "qr", "microQR", "dataMatrix", "aztec", "pdf417", "microPDF417", "code128", "code39",
    "code93", "ean8", "ean13", "upce", "itf14", "i2of5", "codabar", "gs1DataBar",
  ]

  private enum Key: String, CodingKey {
    case suffix, gsSeparator, gsReplacement, symbologies, dedupeSeconds, camera, timeoutSeconds
  }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: Key.self)
    suffix = try c.decodeIfPresent(String.self, forKey: .suffix) ?? suffix
    gsSeparator = try c.decodeIfPresent(String.self, forKey: .gsSeparator) ?? gsSeparator
    gsReplacement = try c.decodeIfPresent(String.self, forKey: .gsReplacement) ?? gsReplacement
    symbologies = try c.decodeIfPresent([String].self, forKey: .symbologies) ?? symbologies
    dedupeSeconds = try c.decodeIfPresent(Double.self, forKey: .dedupeSeconds) ?? dedupeSeconds
    camera = try c.decodeIfPresent(String.self, forKey: .camera) ?? camera
    timeoutSeconds = try c.decodeIfPresent(Double.self, forKey: .timeoutSeconds) ?? timeoutSeconds
  }

  static func parse(_ json: String) throws -> ScannerOptions {
    do {
      return try JSONDecoder().decode(ScannerOptions.self, from: Data(json.utf8))
    } catch {
      throw ScannerError("The scanner options are not valid JSON.")
    }
  }

  /// Vision symbologies for the requested ids. Unknown ids are ignored.
  var visionSymbologies: [VNBarcodeSymbology] {
    var result: [VNBarcodeSymbology] = []
    for id in symbologies {
      switch id {
      case "qr": result.append(.qr)
      case "microQR": result.append(.microQR)
      case "dataMatrix": result.append(.dataMatrix)
      case "aztec": result.append(.aztec)
      case "pdf417": result.append(.pdf417)
      case "microPDF417": result.append(.microPDF417)
      case "code128": result.append(.code128)
      case "code39":
        result += [.code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum]
      case "code93": result += [.code93, .code93i]
      case "ean8": result.append(.ean8)
      case "ean13": result.append(.ean13)
      case "upce": result.append(.upce)
      case "itf14": result.append(.itf14)
      case "i2of5": result += [.i2of5, .i2of5Checksum]
      case "codabar": result.append(.codabar)
      case "gs1DataBar":
        result += [.gs1DataBar, .gs1DataBarExpanded, .gs1DataBarLimited]
      default: break
      }
    }
    return result
  }
}

struct ScannerError: LocalizedError, CustomStringConvertible {
  static let camera = "Allow Raycast in System Settings > Privacy & Security > Camera."
  static let accessibility = "Allow Raycast in System Settings > Privacy & Security > Accessibility."
  static let noCamera = "No camera found. Connect a camera or unlock your iPhone near the Mac."

  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
  var description: String { message }
}
