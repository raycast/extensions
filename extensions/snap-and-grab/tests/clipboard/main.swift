import AppKit
import Foundation

func check(_ condition: Bool, _ message: String) {
    if !condition { fputs("FAIL: \(message)\n", stderr); exit(1) }
}
let folder = FileManager.default.temporaryDirectory.appendingPathComponent("capture-batch-\(UUID().uuidString)")
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: folder) }
let first = folder.appendingPathComponent("first.png")
let second = folder.appendingPathComponent("second.png")
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 3, pixelsHigh: 2, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let png = bitmap.representation(using: .png, properties: [:])!
try png.write(to: first)
try png.write(to: second)
let pb = NSPasteboard.withUniqueName()
defer { pb.releaseGlobally() }
pb.setString("original clipboard", forType: .string)
let previous = pb.changeCount
try publishCaptureBatch([], to: pb)
check(pb.changeCount == previous, "empty batch preserves clipboard")
try publishCaptureBatch([first], to: pb)
check(pb.data(forType: .png) == png, "single capture remains a pasteable PNG image")
try publishCaptureBatch([first, second], to: pb)
let urls = pb.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]
check(urls == [first,second], "multiple captures paste as ordered file URLs")
check(pb.pasteboardItems?.count == 2, "clipboard contains two distinct files")
check(FileManager.default.fileExists(atPath: first.path), "saved PNGs remain on disk")
print("Modern URL item count:", pb.pasteboardItems?.count ?? 0)
print("Aggregate file-list type present:", pb.types?.contains(NSPasteboard.PasteboardType("NSFilenamesPboardType")) ?? false)
print("Aggregate file-list path count:", (pb.propertyList(forType: NSPasteboard.PasteboardType("NSFilenamesPboardType")) as? [String])?.count ?? 0)
print("PASS: single-image clipboard, ordered multi-file clipboard, empty batch, and saved files")
let jpeg = folder.appendingPathComponent("photo.png")
try bitmap.representation(using: .jpeg, properties: [:])!.write(to: jpeg)
try validateCaptureFiles([jpeg])
try publishCaptureBatch([jpeg], to: pb)
check(pb.data(forType: .png)?.starts(with: [137,80,78,71,13,10,26,10]) == true, "non-PNG input is converted for single-image paste")
pb.clearContents()
pb.setString("keep on failure", forType: .string)
let missing = folder.appendingPathComponent("missing.png")
do { try publishCaptureBatch([first, missing], to: pb); check(false, "missing batch member must fail") } catch {}
check(pb.string(forType: .string) == "keep on failure", "validation failure preserves previous clipboard")
print("PASS: non-PNG conversion and missing-file clipboard preservation")
