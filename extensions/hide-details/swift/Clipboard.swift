import AppKit
import Foundation

enum ClipboardError: LocalizedError {
  case noImage
  case changed
  case unreadableOutput
  case writeFailed

  var errorDescription: String? {
    switch self {
    case .noImage:
      return "Clipboard has no image. Copy a screenshot first."
    case .changed:
      return "The clipboard changed while scanning. The newer clipboard was kept. Scan the current clipboard again."
    case .unreadableOutput:
      return "Could not read the redacted image. Scan the current clipboard again."
    case .writeFailed:
      return "Could not copy the redacted image. Try copying it again."
    }
  }
}

func readClipboardImage(pasteboard: NSPasteboard = .general) throws -> (image: CGImage, changeCount: Int) {
  let changeCount = pasteboard.changeCount
  var image: CGImage?
  for type in [NSPasteboard.PasteboardType.png, .tiff] {
    if let data = pasteboard.data(forType: type),
       let representation = NSBitmapImageRep(data: data),
       let cg = representation.cgImage {
      image = cg
      break
    }
  }
  if image == nil,
     let objects = pasteboard.readObjects(forClasses: [NSImage.self], options: nil),
     let native = objects.first as? NSImage {
    image = native.cgImage(forProposedRect: nil, context: nil, hints: nil)
  }
  guard pasteboard.changeCount == changeCount else { throw ClipboardError.changed }
  guard let image else { throw ClipboardError.noImage }
  return (image, changeCount)
}

func copyClipboardImage(outputURL: URL, expectedChangeCount: Int?, pasteboard: NSPasteboard = .general) throws {
  guard let data = try? Data(contentsOf: outputURL),
        let representation = NSBitmapImageRep(data: data),
        representation.cgImage != nil else { throw ClipboardError.unreadableOutput }
  if let expectedChangeCount, pasteboard.changeCount != expectedChangeCount { throw ClipboardError.changed }
  pasteboard.clearContents()
  guard pasteboard.setData(data, forType: .png) else { throw ClipboardError.writeFailed }
}
