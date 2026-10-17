import Foundation
import AppKit
import CryptoKit

// The bridge starts a process per call. Keep only an encrypted snapshot on disk;
// its key stays in the review command's memory and is discarded when it closes.
func saveReviewSource(_ image: CGImage, beside outputURL: URL) throws -> String {
  guard let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
    throw RedactionError(message: "Could not retain the image for review.")
  }
  let key = SymmetricKey(size: .bits256)
  guard let sealed = try AES.GCM.seal(png, using: key).combined else {
    throw RedactionError(message: "Could not retain the image for review.")
  }
  try sealed.write(to: outputURL.deletingLastPathComponent().appendingPathComponent("source.sealed"), options: .atomic)
  return key.withUnsafeBytes { Data($0).base64EncodedString() }
}

func renderReview(sourcePath: String, key: String, boxesJSON: String, style: String, outputPath: String) throws -> Int {
  guard let keyData = Data(base64Encoded: key), keyData.count == 32,
        let style = Style(rawValue: style) else {
    throw RedactionError(message: "This preview has expired. Scan the current clipboard again.")
  }
  let sealed = try AES.GCM.SealedBox(combined: Data(contentsOf: URL(fileURLWithPath: sourcePath)))
  let png = try AES.GCM.open(sealed, using: SymmetricKey(data: keyData))
  guard let loaded = NSImage(data: png),
        let image = loaded.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    throw RedactionError(message: "Could not read the review image. Scan the current clipboard again.")
  }
  let boxes = try JSONDecoder().decode([Box].self, from: Data(boxesJSON.utf8))
  let regions = try redactionRegions(boxes: boxes, imageWidth: image.width, imageHeight: image.height)
  let output = try renderRedactions(image: image, regions: regions, style: style)
  guard let encoded = NSBitmapImageRep(cgImage: output).representation(using: .png, properties: [:]) else {
    throw RedactionError(message: "Could not encode the updated preview.")
  }
  try encoded.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
  return regions.count
}
