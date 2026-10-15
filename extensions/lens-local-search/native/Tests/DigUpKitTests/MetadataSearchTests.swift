import Foundation
import Testing
@testable import DigUpKit

@Suite struct MetadataSearchTests {
    @Test func literalFiltersRunBeforeLimitAndNeedNoEmbeddings() throws {
        let root = URL(fileURLWithPath: FolderSelection.realPath(FileManager.default.temporaryDirectory.path))
            .appendingPathComponent("LensMetadata-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root.appendingPathComponent("index"))
        for (i, name) in ["other.pdf", "RE-note.txt", "report.PDF", "Lecture 15.pdf", "RE-2026.pdf", "some.pdf"].enumerated() {
            let path = root.appendingPathComponent(name).path
            try Data("content".utf8).write(to: URL(fileURLWithPath: path))
            _ = try store.insert(Candidate(path: path, kind: name.hasSuffix("txt") ? .doc : .pdf, size: 7,
                                           mtime: Double(100 - i), inode: UInt64(i + 1), device: 1))
        }
        let search = try Searcher(store: store, loadVectors: false)
        let hits = try search.files(roots: [root.path], skipped: [], extensions: ["pdf"], containing: "RE", limit: 1)
        #expect(hits.map { ($0.path as NSString).lastPathComponent } == ["report.PDF"])
        #expect(try search.files(roots: [root.path], skipped: [], extensions: ["pdf"], containing: "missing").isEmpty)
        let prefix = try search.files(roots: [root.path], skipped: [], extensions: ["pdf"], containing: "RE", matching: .prefix)
        #expect(prefix.map { ($0.path as NSString).lastPathComponent } == ["report.PDF", "RE-2026.pdf"])
        let suffix = try search.files(roots: [root.path], skipped: [], extensions: ["pdf"], containing: "15", matching: .suffix)
        #expect(suffix.map { ($0.path as NSString).lastPathComponent } == ["Lecture 15.pdf"])
        #expect(!search.vectorsLoaded)
    }

    @Test func composedPredicatesApplyBeforeLimitsAndNeedNoEmbeddings() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensPredicate-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root.appendingPathComponent("index"))
        for name in ["Lecture 2.pdf", "RE-draft-2.pdf", "RE-1.pdf", "RE-final-2.pdf", "RE-2.txt"] {
            let path = root.appendingPathComponent(name).path
            try Data("data".utf8).write(to: URL(fileURLWithPath: path))
            _ = try store.insert(Candidate(path: path, kind: name.hasSuffix("txt") ? .doc : .pdf, size: 4, mtime: 10, inode: UInt64(name.utf8.count), device: 1))
        }
        let rule = FilePredicate(op: "and", args: [FilePredicate(op: "ext_is", value: "pdf"), FilePredicate(op: "and", args: [
            FilePredicate(op: "name_prefix", value: "RE"), FilePredicate(op: "and", args: [FilePredicate(op: "name_contains", value: "2"), FilePredicate(op: "not", args: [FilePredicate(op: "name_contains", value: "draft")])])])])
        #expect(rule.valid())
        let search = try Searcher(store: store, loadVectors: false)
        #expect(try search.files(roots: [root.path], skipped: [], filter: rule, limit: 1).map { ($0.path as NSString).lastPathComponent } == ["RE-final-2.pdf"])
        #expect(!search.vectorsLoaded)
        let unknown = FilePredicate(op: "not", args: [FilePredicate(op: "width_gt", value: "1000")])
        #expect(unknown.matches(path: "/a.png", kind: .image, size: 4, modified: 10, info: [:]) == nil)
        #expect(!FilePredicate(op: "run_shell", value: "anything").valid())
        #expect(!FilePredicate(op: "and", args: []).valid())
        #expect(!FilePredicate(op: "size_lt", value: "nan").valid())
        let either = FilePredicate(op: "or", args: [FilePredicate(op: "name_contains", value: "Lecture"), FilePredicate(op: "name_contains", value: "final")])
        #expect(try search.files(roots: [root.path], skipped: [], filter: either).count == 2)
    }

    @Test func subjectEvidenceKeepsAnAttributeOnlyMatchBelowTheJointMatch() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensSubject-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root)
        func vector(_ x: Float, _ y: Float) -> [Float] {
            var result = [Float](repeating: 0, count: Vectors.dimension)
            let norm = sqrt(x*x+y*y); result[0] = x/norm; result[1] = y/norm; return result
        }
        for (i, pair) in [(Float(1), Float(0)), (0.7, 0.7), (0, 1), (-1, 0), (0, -1)].enumerated() {
            let id = try store.insert(Candidate(path: "/images/\(i).png", kind: .image, size: 10, mtime: 10, inode: UInt64(i+1), device: 1))
            try store.addSegment(file: id, kind: .image, modality: .image, vector: vector(pair.0, pair.1))
        }
        let search = try Searcher(store: store)
        let attribute = vector(1, 0), subject = vector(0, 1)
        #expect(try search.search("", queryVector: attribute, limit: 5, zGate: 0).first?.path == "/images/0.png")
        let joint = try search.search("", queryVector: attribute, limit: 5, zGate: 0, focusVector: subject)
        #expect(joint.first?.path == "/images/1.png")
        let filtered = try search.search("", queryVector: attribute, limit: 1, zGate: 0, filter: FilePredicate(op: "name_contains", value: "1.png"))
        #expect(filtered.first?.path == "/images/1.png")
    }

    @Test func fileExclusionsPruneAndRestoreWithoutEmbeddingOrFingerprintReset() throws {
        let root = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("LensScope-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = root.appendingPathComponent("actual.py")
        try Data("print(1)".utf8).write(to: source)
        let store = try IndexStore(directory: root.appendingPathComponent("index"), file: IndexStore.codeFile)
        var options = IndexOptions(); options.code = true
        let original = try Indexer(store: store, options: options, makeEmbedder: { fatalError("must not embed") })
        #expect(try original.sync([root]).added == 1)
        options.excludedFiles = [source.path]
        let excluded = try Indexer(store: store, options: options, makeEmbedder: { fatalError("must not embed") })
        #expect(try excluded.sync([root]).removed == 1)
        #expect(try original.sync([root]).added == 1)
        #expect(!original.workerIsRunning && !excluded.workerIsRunning)
    }
}

@Suite struct MetadataPagingTests {
    @Test func pagesPreserveTiesAndApplyKindsBeforeLimits() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensPages-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root.appendingPathComponent("index"))
        for (i, name) in ["a.png", "b.txt", "c.png", "d.txt", "e.txt"].enumerated() {
            let path = root.appendingPathComponent(name).path
            try Data("data".utf8).write(to: URL(fileURLWithPath: path))
            _ = try store.insert(Candidate(path: path, kind: name.hasSuffix("txt") ? .doc : .image, size: 4, mtime: 10, inode: UInt64(i+1), device: 1))
        }
        let search = try Searcher(store: store, loadVectors: false)
        let first = try search.files(roots: [root.path], skipped: [], limit: 2, kinds: [.doc])
        #expect(first.map { ($0.path as NSString).lastPathComponent } == ["b.txt", "d.txt"])
        let last = try #require(first.last)
        let second = try search.files(roots: [root.path], skipped: [], limit: 2, kinds: [.doc], after: (last.modified, last.path))
        #expect(second.map { ($0.path as NSString).lastPathComponent } == ["e.txt"])
        #expect(try search.files(roots: [root.path], skipped: [], limit: 0).isEmpty)
        #expect(!search.vectorsLoaded)
    }
}
