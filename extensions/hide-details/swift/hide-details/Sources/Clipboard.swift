import AppKit
import Foundation

protocol ClipboardPasteboard {
  var changeCount: Int { get }
  var pasteboardItems: [NSPasteboardItem]? { get }
  func clearContents() -> Int
  func setData(_ data: Data?, forType type: NSPasteboard.PasteboardType) -> Bool
  func writeObjects(_ objects: [NSPasteboardWriting]) -> Bool
}

extension NSPasteboard: ClipboardPasteboard {}

enum ClipboardError: LocalizedError {
  case noImage
  case changed
  case unreadableOutput
  case writeFailed
  case restoreFailed

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
    case .restoreFailed:
      return "Could not copy the redacted image or fully restore the previous clipboard. Copy the original again."
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

func copyClipboardImage(outputURL: URL, expectedChangeCount: Int?, pasteboard: ClipboardPasteboard = NSPasteboard.general) throws {
  guard let data = try? Data(contentsOf: outputURL),
        let representation = NSBitmapImageRep(data: data),
        representation.cgImage != nil else { throw ClipboardError.unreadableOutput }
  let originalChangeCount = pasteboard.changeCount
  if let expectedChangeCount, originalChangeCount != expectedChangeCount { throw ClipboardError.changed }
  let items = pasteboard.pasteboardItems
  var backupComplete = items != nil
  // Save readable representations before clearing. Unavailable formats must not block a new copy.
  let originals = (items ?? []).compactMap { item -> NSPasteboardItem? in
    let saved = NSPasteboardItem()
    for type in item.types {
      guard let originalData = item.data(forType: type), saved.setData(originalData, forType: type) else {
        backupComplete = false
        continue
      }
    }
    return saved.types.isEmpty ? nil : saved
  }
  guard pasteboard.changeCount == originalChangeCount else { throw ClipboardError.changed }
  let clearedChangeCount = pasteboard.clearContents()
  guard pasteboard.changeCount == clearedChangeCount else { throw ClipboardError.changed }
  if pasteboard.setData(data, forType: .png) { return }
  // A concurrent copy belongs to the user, so never replace it with the saved clipboard.
  guard pasteboard.changeCount == clearedChangeCount else { throw ClipboardError.changed }
  let restoreChangeCount = pasteboard.clearContents()
  guard pasteboard.changeCount == restoreChangeCount else { throw ClipboardError.changed }
  guard originals.isEmpty || pasteboard.writeObjects(originals) else { throw ClipboardError.restoreFailed }
  guard backupComplete else { throw ClipboardError.restoreFailed }
  throw ClipboardError.writeFailed
}
