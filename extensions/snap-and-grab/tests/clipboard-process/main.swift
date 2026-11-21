import AppKit
import Foundation

let args = CommandLine.arguments
func board(_ name: String) -> NSPasteboard {
    name == "GENERAL" ? .general : NSPasteboard(name: NSPasteboard.Name(name))
}
if args[1] == "write" {
    let pb = board(args[2])
    try publishCaptureBatch(args.dropFirst(3).map { URL(fileURLWithPath: $0) }, to: pb)
    completeClipboardTransfer { exit(0) }
    RunLoop.main.run()
} else if args[1] == "probe-general" {
    let pb = NSPasteboard.general
    let saved = (pb.pasteboardItems ?? []).map { item in
        item.types.compactMap { type -> (NSPasteboard.PasteboardType, Data)? in
            guard let data = item.data(forType: type) else { return nil }
            return (type, data)
        }
    }
    let expected = args.dropFirst(2).map { URL(fileURLWithPath: $0).resolvingSymlinksInPath() }
    let child = Process()
    child.executableURL = URL(fileURLWithPath: args[0])
    child.arguments = ["write", "GENERAL"] + args.dropFirst(2)
    try child.run()
    child.waitUntilExit()
    let publishedChange = pb.changeCount
    var passed = child.terminationStatus == 0
    for delay in [0.0, 0.3] {
        if delay > 0 { RunLoop.current.run(until: Date().addingTimeInterval(delay)) }
        let urls = pb.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly:true]) as? [URL] ?? []
        let legacy = pb.propertyList(forType: NSPasteboard.PasteboardType("NSFilenamesPboardType")) as? [String] ?? []
        let actual = urls.map { $0.resolvingSymlinksInPath() }
        let legacyURLs = legacy.map { URL(fileURLWithPath: $0).resolvingSymlinksInPath() }
        let same = actual == expected && legacyURLs == expected && pb.pasteboardItems?.count == expected.count
        passed = passed && same
        print("\(same ? "PASS" : "FAIL"): after writer exit, general clipboard has \(urls.count)/\(expected.count) ordered files (delay \(delay)s)")
    }
    if pb.changeCount == publishedChange {
        let restored = saved.map { values -> NSPasteboardItem in
            let item = NSPasteboardItem()
            for (type,data) in values { item.setData(data, forType: type) }
            return item
        }
        pb.clearContents()
        if !restored.isEmpty { pb.writeObjects(restored) }
        // Restoring a multi-item clipboard needs the same finalization.
        RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        print("Previous clipboard restored")
    } else { print("Clipboard changed externally; preserved the newer content") }
    if !passed { exit(1) }
} else { exit(2) }
