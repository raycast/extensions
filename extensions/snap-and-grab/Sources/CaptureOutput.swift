import AppKit
import Foundation

enum CaptureOutputError: Error { case missingPNG }

// Save the very same PNG bytes supplied to the clipboard by screencapture.
// An unchanged clipboard means the user cancelled: never save an older image.
@discardableResult
func saveNewCapture(from pasteboard: NSPasteboard, previousChangeCount: Int, to url: URL) throws -> Bool {
    guard pasteboard.changeCount != previousChangeCount else { return false }
    guard let png = pasteboard.data(forType: .png), NSBitmapImageRep(data: png) != nil else {
        throw CaptureOutputError.missingPNG
    }
    try png.write(to: url, options: .atomic)
    return true
}
