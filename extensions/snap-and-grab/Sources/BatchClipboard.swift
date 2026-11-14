import AppKit
import Foundation

enum BatchClipboardError: Error { case writeFailed }

private func validatedImage(_ file: URL) throws -> (Data, NSBitmapImageRep) {
    guard try file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile == true else {
        throw BatchClipboardError.writeFailed
    }
    let original = try Data(contentsOf: file)
    guard let bitmap = NSBitmapImageRep(data: original) else {
        throw BatchClipboardError.writeFailed
    }
    return (original, bitmap)
}

func validateCaptureFiles(_ files: [URL]) throws {
    for file in files { try autoreleasepool { _ = try validatedImage(file) } }
}

func publishCaptureBatch(_ files: [URL], to pasteboard: NSPasteboard) throws {
    guard !files.isEmpty else { return }
    if files.count == 1 {
        let (original, bitmap) = try validatedImage(files[0])
        let data: Data
        if original.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]) {
            data = original
        } else {
            guard let converted = bitmap.representation(using: .png, properties: [:]) else { throw BatchClipboardError.writeFailed }
            data = converted
        }
        pasteboard.clearContents()
        guard pasteboard.setData(data, forType: .png) else { throw BatchClipboardError.writeFailed }
    } else {
        // Validate the entire selection before clearing the previous clipboard.
        // Files can disappear between history enumeration and modifier release.
        try validateCaptureFiles(files)
        pasteboard.clearContents()
        guard pasteboard.writeObjects(files.map { $0 as NSURL }) else { throw BatchClipboardError.writeFailed }
    }
}

func completeClipboardTransfer(_ completion: @escaping () -> Void) {
    Timer.scheduledTimer(withTimeInterval: 0.25, repeats: false) { _ in completion() }
}
