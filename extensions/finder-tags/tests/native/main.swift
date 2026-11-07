import Foundation
import Darwin

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    guard condition() else { fatalError(message) }
}

let directory = URL(fileURLWithPath: CommandLine.arguments[1]).appendingPathComponent("fixtures")
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: directory) }
let palette = [FinderTag(name: "Invoice", color: 4)]
var paths: [String] = []
for index in 0..<100 {
    let file = directory.appendingPathComponent("file-\(index).txt")
    expect(FileManager.default.createFile(atPath: file.path, contents: Data("fixture".utf8)), "Create fixture")
    try writeRawTags(["Keep\n6", "Uncoloured"], to: file.path)
    paths.append(file.path)
}

let added = processFiles(paths, operation: .add(["invoice"]), palette: palette)
expect(added.files.count == 100 && added.failures.isEmpty, "Tag 100 files without failures")
for path in paths {
    let raw = try readRawTags(path)
    expect(raw == ["Keep\n6", "Uncoloured", "Invoice\n4"], "Preserve raw existing tag values and use palette colour")
    let names = try URL(fileURLWithPath: path).resourceValues(forKeys: [.tagNamesKey]).tagNames ?? []
    expect(Set(names) == Set(["Keep", "Uncoloured", "Invoice"]), "Apple's resource API reads the written tags")
}
let again = processFiles(paths, operation: .add(["INVOICE"]), palette: palette)
expect(again.files.allSatisfy { !$0.changed }, "Adding a tag twice is idempotent")
let removed = processFiles(paths, operation: .remove(["invoice"]), palette: palette)
expect(removed.files.allSatisfy { $0.tags == [FinderTag(name: "Keep", color: 6), FinderTag(name: "Uncoloured", color: 0)] }, "Removal keeps other tags and colours")

let partial = processFiles([paths[0], directory.appendingPathComponent("missing").path], operation: .add(["new"]), palette: [])
expect(partial.files.count == 1 && partial.failures.count == 1, "A bad file does not fail the whole batch")
let renamed = processFiles([paths[0]], operation: .rename("new", "Invoice"), palette: palette)
expect(renamed.files.first?.tags.contains(FinderTag(name: "Invoice", color: 4)) == true, "Rename uses existing destination colour")
let caseRenamed = processFiles([paths[0]], operation: .rename("Invoice", "INVOICE"), palette: palette)
expect(caseRenamed.files.first?.tags.contains(FinderTag(name: "INVOICE", color: 4)) == true, "Case-only rename preserves colour and requested spelling")
let freshRename = processFiles([paths[0]], operation: .rename("INVOICE", "Tax"), palette: palette)
expect(freshRename.files.first?.tags.contains(FinderTag(name: "Tax", color: 4)) == true, "Rename to a new tag retains the source colour")
let merged = processFiles([paths[0]], operation: .rename("Tax", "Keep"), palette: palette)
expect(merged.files.first?.tags.filter { tagKey($0.name) == "keep" }.count == 1, "Rename merges an existing destination without duplication")
let cleared = processFiles([paths[0]], operation: .set([]), palette: [])
expect(cleared.files.first?.tags.isEmpty == true, "Remove all tags")
let clearValues = try URL(fileURLWithPath: paths[0]).resourceValues(forKeys: [.tagNamesKey, .labelNumberKey])
expect((clearValues.tagNames ?? []).isEmpty && clearValues.labelNumber == 0, "Remove all clears the legacy Finder label")

let legacyFile = directory.appendingPathComponent("legacy.txt")
FileManager.default.createFile(atPath: legacyFile.path, contents: Data())
try (legacyFile as NSURL).setResourceValue(6, forKey: .labelNumberKey)
try writeRawTags([], to: legacyFile.path)
let legacyRead = processFiles([legacyFile.path], operation: .read, palette: [])
expect(legacyRead.files.first?.tags.first?.color == 6, "Read a legacy-only Finder label")
let legacyClear = processFiles([legacyFile.path], operation: .set([]), palette: [])
expect(legacyClear.failures.isEmpty && legacyClear.files.first?.changed == true, "Clear legacy-only label")
let legacyValues = try URL(fileURLWithPath: legacyFile.path).resourceValues(forKeys: [.tagNamesKey, .labelNumberKey])
expect((legacyValues.tagNames ?? []).isEmpty && legacyValues.labelNumber == 0, "Apple API sees no legacy tag after removal")

var customInfo = Data(repeating: 0, count: 32)
customInfo[8] = 0x04
customInfo[9] = 0x20
_ = customInfo.withUnsafeBytes { setxattr(paths[0], finderInfoAttribute, $0.baseAddress, $0.count, 0, 0) }
let infoChange = processFiles([paths[0]], operation: .add(["Invoice"]), palette: palette)
expect(infoChange.failures.isEmpty, "Update tag alongside unrelated Finder flags")
let savedInfo = try readAttribute(finderInfoAttribute, path: paths[0])
expect(savedInfo?[8] == 0x04 && savedInfo?[9] == 0x28, "Preserve all unrelated Finder flags while setting the label bits")

let link = directory.appendingPathComponent("link")
try FileManager.default.createSymbolicLink(atPath: link.path, withDestinationPath: paths[1])
let linked = processFiles([link.path], operation: .add(["unsafe"]), palette: [])
expect(linked.files.isEmpty && linked.failures.count == 1, "Skip symbolic links")
let targetTags = try readRawTags(paths[1])
expect(!targetTags.contains("unsafe\n0"), "Symbolic link target untouched")

let bad = processFiles([paths[1]], operation: .add(["fake\n6"]), palette: [])
expect(bad.failures.count == 1, "Reject metadata suffix injection")
let corrupt = directory.appendingPathComponent("corrupt.txt")
FileManager.default.createFile(atPath: corrupt.path, contents: Data())
let invalid = Data("invalid plist".utf8)
_ = invalid.withUnsafeBytes { setxattr(corrupt.path, tagAttribute, $0.baseAddress, $0.count, 0, 0) }
expect(processFiles([corrupt.path], operation: .add(["new"]), palette: []).failures.count == 1, "Do not overwrite malformed existing metadata")

let catalogFile = directory.appendingPathComponent("finder.plist")
let catalogData = try PropertyListSerialization.data(fromPropertyList: ["values": ["FinderTagDict": ["value": ["FinderTags": [["n": "Invoice", "l": 4], ["n": "Unknown", "l": 88], ["n": ""]]]]]], format: .binary, options: 0)
try catalogData.write(to: catalogFile)
expect(finderCatalog(sharedTags: nil, at: catalogFile.path, favoriteNames: []).tags == [FinderTag(name: "Invoice", color: 4), FinderTag(name: "Unknown", color: 0)], "Read the nested FinderTags palette and clamp unknown colours")
let fallback = finderCatalog(sharedTags: nil, at: "/does-not-exist", favoriteNames: ["", "Blue", "Grey", "Work", "BLUE"], labelNames: ["None", "Gray", "Green", "Purple", "Blue", "Yellow", "Red", "Orange"])
expect(fallback.tags == [FinderTag(name: "Blue", color: 4), FinderTag(name: "Grey", color: 1), FinderTag(name: "Work", color: 0)], "Missing synced preferences retain Finder favourites, deduplicated and coloured by name")
expect(!fallback.warnings.isEmpty, "Incomplete catalogue reports its fallback")
let liveTags = [FinderTag(name: "Custom", color: 5)]
expect(finderCatalog(sharedTags: liveTags, at: catalogFile.path, favoriteNames: ["Red"]).tags == liveTags, "Live catalogue takes precedence over stale synced tags and favourites")
expect(finderCatalog(sharedTags: [], at: catalogFile.path, favoriteNames: ["Red"]).tags.isEmpty, "An empty live catalogue does not resurrect deleted tags")
expect(sharedFinderTag(name: "Client / Design", url: URL(string: "x-apple-findertag:Client%20%2F%20Design")!, color: 3) == FinderTag(name: "Client / Design", color: 3), "Read custom shared-list tag names without URL mangling")
expect(sharedFinderTag(name: "Folder", url: URL(fileURLWithPath: "/tmp"), color: 3) == nil, "Do not treat unrelated shared-list items as tags")
expect(sharedFinderTag(name: "bad\n6", url: URL(string: "x-apple-findertag:bad")!, color: 0) == nil, "Reject invalid catalogue names")
let folder = processFiles([directory.path], operation: .add(["Invoice"]), palette: palette)
expect(folder.failures.isEmpty && folder.files.first?.tags.first?.name == "Invoice", "Tag folders as well as regular files")
let mountPath = try volumeMountPath(directory.path)
expect(mountPath.hasPrefix("/"), "Resolve a containing volume for Spotlight diagnostics")
print("Passed native tests: 100-file round trip, colour and Finder-flag preservation, legacy-label removal, idempotency, rename and merge, partial failures, symlinks, validation, malformed metadata, and palette fallback.")
