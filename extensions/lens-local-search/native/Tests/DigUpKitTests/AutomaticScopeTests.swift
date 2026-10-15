import Foundation
import Testing
@testable import DigUpKit

@Suite struct AutomaticScopeTests {
    private func directory() throws -> URL {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensScope-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root
    }
    private func git(_ root: URL, _ args: [String]) throws {
        let process = Process(); process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = ["-c", "core.hooksPath=/dev/null", "-C", root.path] + args
        process.standardOutput = FileHandle.nullDevice; process.standardError = FileHandle.nullDevice
        process.standardInput = FileHandle.nullDevice; try process.run(); process.waitUntilExit()
        #expect(process.terminationStatus == 0)
    }
    private func repo(_ root: URL) throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try git(root, ["init", "-q"]); try git(root, ["remote", "add", "origin", "https://example.invalid/project.git"])
    }
    private func file(_ root: URL, _ name: String, _ body: String) throws -> AutomaticScope.File {
        let path = root.appendingPathComponent(name)
        try FileManager.default.createDirectory(at: path.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(body.utf8).write(to: path)
        let info = try #require(FileSystem.info(of: path.path))
        return AutomaticScope.File(path: path.path, size: info.size, modified: info.mtime)
    }
    private func scope(_ root: URL) throws -> AutomaticScope {
        let index = root.appendingPathComponent("index"); try FileManager.default.createDirectory(at: index, withIntermediateDirectories: true)
        return AutomaticScope(index: index, roots: [], codeRoots: [root.path], skipped: [], codeSkipped: [], types: [])
    }
    @Test func byteEqualCopiesKeepEditsNewFilesRestoresAndLaterEdits() throws {
        let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
        let main = root.appendingPathComponent("project"), copy = root.appendingPathComponent("codex-work/copy")
        try repo(main); try repo(copy)
        let originals = try [file(main, "same.py", "same"), file(main, "edited.py", "base")]
        let copies = try [file(copy, "same.py", "same"), file(copy, "edited.py", "edit"), file(copy, "new.py", "new")]
        let scope = try scope(root)
        var report = try scope.analyze(originals + copies)
        #expect(report.groups.count == 1)
        #expect(report.groups[0].canonical == main.path)
        #expect(report.groups[0].files.map(\.path) == [copies[0].path])
        let extra = try file(copy, "not-indexed.py", "same"); _ = try file(main, "not-indexed.py", "same")
        report = try scope.analyze(originals + copies + [extra])
        #expect(!report.groups[0].files.contains { $0.path == extra.path })
        report.restored = [copy.path]
        let reportURL = root.appendingPathComponent("index/scope-report.json")
        try JSONEncoder().encode(report).write(to: reportURL)
        _ = try file(copy, "same.py", "my later change")
        report = try scope.analyze(originals + copies.dropFirst())
        #expect(report.restored == [copy.path])
        #expect(!report.groups[0].files.contains { $0.path == copies[0].path })
    }
    @Test func sparsePrimaryDoesNotMakeCompleteWorktreesLookUnique() throws {
        let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
        let main = root.appendingPathComponent("main"), full = root.appendingPathComponent("full"), copy = root.appendingPathComponent("worktrees/copy")
        var catalog: [AutomaticScope.File] = []
        for repoURL in [main, full, copy] { try repo(repoURL); catalog.append(try file(repoURL, "README.md", "shared")) }
        for repoURL in [full, copy] { catalog += try [file(repoURL, "app.py", "actual"), file(repoURL, "model.py", repoURL == copy ? "my edit" : "source")] }
        let report = try scope(root).analyze(catalog)
        let group = try #require(report.groups.first { $0.root == copy.path })
        #expect(group.canonical == full.path)
        #expect(group.files.contains { $0.path.hasSuffix("/app.py") })
        #expect(!group.files.contains { $0.path.hasSuffix("/model.py") })
    }
    @Test func toolSnapshotsKeepLaterEditsAndAmbiguousCases() throws {
        let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
        let snapshot = root.appendingPathComponent("codex-work/work/tree-build/local-native/tool-v1.2.3")
        var files: [AutomaticScope.File] = []
        for i in 0..<150 {
            let entry = try file(snapshot, "\(i).py", "tool")
            try FileManager.default.setAttributes([.modificationDate: Date(timeIntervalSince1970: 1000)], ofItemAtPath: entry.path)
            files.append(AutomaticScope.File(path: entry.path, size: entry.size, modified: 1000))
        }
        let edit = try file(snapshot, "my-edit.py", "my changes")
        let scope = try scope(root), report = try scope.analyze(files + [edit])
        #expect(report.groups[0].uncertain == false)
        #expect(report.groups[0].files.count == 150)
        #expect(!report.groups[0].files.contains { $0.path == edit.path })
        let ambiguous = try scope.analyze(Array(files.prefix(149)))
        #expect(ambiguous.groups[0].uncertain == true)
        #expect(ambiguous.groups[0].files.isEmpty)
    }
    @Test func stagedExportsAndMalformedReportsFailClosed() throws {
        let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
        let main = root.appendingPathComponent("project"), stage = root.appendingPathComponent("next-batches-stage/export")
        try repo(main)
        let original = try file(main, "actual.py", "source"), copy = try file(stage.appendingPathComponent("tree"), "actual.py", "source")
        try Data("fixture".utf8).write(to: stage.appendingPathComponent("history.bundle"))
        try JSONSerialization.data(withJSONObject: ["source": main.path]).write(to: stage.appendingPathComponent("manifest.json"))
        let scope = try scope(root)
        let report = try scope.analyze([original, copy])
        #expect(report.groups[0].canonical == main.path); #expect(report.groups[0].files.count == 1)
        try JSONSerialization.data(withJSONObject: ["source": "relative/project"]).write(to: stage.appendingPathComponent("manifest.json"))
        #expect(try scope.analyze([original, copy]).groups[0].uncertain == true)
        let bad = Data(#"{"version":1,"updated":"","restored":[],"groups":[{"root":"relative","reason":"invalid","files":[]}]}"#.utf8)
        try bad.write(to: root.appendingPathComponent("index/scope-report.json"))
        #expect(throws: (any Error).self) { try scope.update() }
        #expect(try Data(contentsOf: root.appendingPathComponent("index/scope-report.json")) == bad)
    }
    @Test func nativeScopeWritesTheCompatibleManifestWithoutCatalogIPC() throws {
        let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
        let main = root.appendingPathComponent("project"), copy = root.appendingPathComponent("codex-work/copy")
        try repo(main); try repo(copy)
        let a = try file(main, "same.py", "same"), b = try file(copy, "same.py", "same")
        let scope = try scope(root)
        let store = try IndexStore(directory: root.appendingPathComponent("index"), file: IndexStore.codeFile)
        for (i, file) in [a, b].enumerated() {
            _ = try store.insert(Candidate(path: file.path, kind: .code, size: file.size, mtime: file.modified, inode: UInt64(i+1), device: 1))
        }
        #expect(try scope.update() == 1)
        let manifest = try JSONDecoder().decode([String].self, from: Data(contentsOf: root.appendingPathComponent("index/scope-excluded.json")))
        #expect(manifest == [b.path])
        let report = try JSONDecoder().decode(AutomaticScope.Report.self, from: Data(contentsOf: root.appendingPathComponent("index/scope-report.json")))
        #expect(report.version == 1 && report.groups[0].canonical == main.path)
    }
}
