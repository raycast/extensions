import AppKit
import Foundation
import UniformTypeIdentifiers
import RaycastSwiftMacros

/// Text taken from the clipboard or read out of an image.
struct Capture: Encodable {
  /// "text", "image" or "empty".
  let kind: String
  var text: String?
  var image: String?
}

/// Reads what is on the clipboard: plain text as it is, an image through OCR.
/// The image is saved as a PNG in `imageDirectory` so the result can show it.
@raycast func readClipboard(imageDirectory: String) throws -> Capture {
  do {
    return try read(into: URL(fileURLWithPath: imageDirectory, isDirectory: true))
  } catch {
    throw Failure(code: "clipboard", message: error.localizedDescription)
  }
}

private func read(into imageDirectory: URL) throws -> Capture {
  let pasteboard = NSPasteboard.general
  let text = pasteboard.string(forType: .string)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

  // A copied image file (Finder, a screenshot thumbnail): its name is also on the pasteboard as text.
  let fileURLs = pasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]
  if let file = fileURLs?.first(where: isImageFile), let image = NSImage(contentsOf: file) {
    return try recognize(image, savingTo: imageDirectory)
  }

  // Apps like Numbers or Keynote put a picture next to copied text; the text wins. A browser's
  // "Copy Image" puts the image's address next to it; the image wins.
  let hasImage = pasteboard.canReadObject(forClasses: [NSImage.self], options: nil)
  if !text.isEmpty, !(hasImage && looksLikeURL(text)) {
    return Capture(kind: "text", text: text)
  }
  if hasImage, let image = NSImage(pasteboard: pasteboard) {
    return try recognize(image, savingTo: imageDirectory)
  }
  return Capture(kind: "empty")
}

private func recognize(_ image: NSImage, savingTo directory: URL) throws -> Capture {
  guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil),
    let png = NSBitmapImageRep(cgImage: cgImage).representation(using: .png, properties: [:])
  else {
    throw OCRError("The image on the clipboard could not be read.")
  }
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  let file = directory.appendingPathComponent("\(UUID().uuidString).png")
  try png.write(to: file)
  return Capture(kind: "image", text: try recognizeText(at: file), image: file.path)
}

private func isImageFile(_ url: URL) -> Bool {
  UTType(filenameExtension: url.pathExtension)?.conforms(to: .image) ?? false
}

private func looksLikeURL(_ text: String) -> Bool {
  guard !text.contains(where: \.isWhitespace), let scheme = URL(string: text)?.scheme else { return false }
  return ["http", "https", "file", "data"].contains(scheme.lowercased())
}
