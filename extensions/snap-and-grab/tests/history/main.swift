import Foundation
func check(_ condition: Bool, _ message: String) {
    if !condition { fputs("FAIL: \(message)\n", stderr); exit(1) }
}
let root = FileManager.default.temporaryDirectory.appendingPathComponent("capture-history-\(UUID().uuidString)")
let dedicated = root.appendingPathComponent("Screenshots")
let general = root.appendingPathComponent("Desktop")
try FileManager.default.createDirectory(at: dedicated, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: general, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: root) }
func fixture(_ folder: URL, _ name: String, _ modified: TimeInterval) throws -> URL {
    let url = folder.appendingPathComponent(name)
    try Data([0]).write(to: url)
    try FileManager.default.setAttributes([.modificationDate: Date(timeIntervalSince1970: modified)], ofItemAtPath: url.path)
    return url
}
let older = try fixture(dedicated, "Screenshot old.png", 10)
let newer = try fixture(dedicated, "Screenshot new.png", 30)
let current = try fixture(dedicated, "Screenshot current.png", 50)
let custom = try fixture(dedicated, "custom-name.jpg", 20)
_ = try fixture(dedicated, "notes.txt", 40)
_ = try fixture(dedicated, ".hidden.png", 60)
try FileManager.default.createDirectory(at: dedicated.appendingPathComponent("folder.png"), withIntermediateDirectories: true)
let history = try recentScreenshotFiles(in: dedicated, excluding: current, screenshotPrefix: "Screenshot")
check(history.map { $0.resolvingSymlinksInPath() } == [newer, custom, older].map { $0.resolvingSymlinksInPath() }, "dedicated folder history is newest-first, excluding current and non-images")
let valid = try fixture(general, "Screenshot previous.png", 20)
let personalized = try fixture(general, "My Capture yesterday.png", 30)
_ = try fixture(general, "holiday-photo.png", 40)
check(try recentScreenshotFiles(in: general, excluding: nil, screenshotPrefix: "Screenshot").map { $0.resolvingSymlinksInPath() } == [valid.resolvingSymlinksInPath()], "general folders exclude unrelated photos")
check(try recentScreenshotFiles(in: general, excluding: nil, screenshotPrefix: "My Capture").map { $0.resolvingSymlinksInPath() } == [personalized.resolvingSymlinksInPath(), valid.resolvingSymlinksInPath()], "custom screenshot prefix and earlier default names are supported")
do {
    _ = try recentScreenshotFiles(in: root.appendingPathComponent("missing"), excluding: nil, screenshotPrefix: "Screenshot")
    check(false, "history directory errors must be surfaced")
} catch { }
print("PASS: history sorting, image filtering, current-file exclusion, custom names, and directory errors")
