import Foundation
import Testing
@testable import DigUpKit

@Suite struct IncrementalTests {
    @Test func independentKeywordCandidatesSurviveUntilRerankingButNeverBypassFilters() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensRecall-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root)
        let id = try store.insert(Candidate(path: "/files/note.md", kind: .doc, size: 10, mtime: 1, inode: 1, device: 1))
        try store.addSegment(file: id, kind: .chunk, modality: .text, text: "invoice")
        let search = try Searcher(store: store, loadVectors: false)
        #expect(try search.search("invoice receipt customer", queryVector: nil).isEmpty)
        #expect(try search.search("invoice receipt customer", queryVector: nil, candidatePool: true).count == 1)
        #expect(try search.search("invoice receipt customer", queryVector: nil, filter: FilePredicate(op: "ext_is", value: "pdf"), candidatePool: true).isEmpty)
    }
    @Test func journalPreservesUnchangedFilesAndDetectsCreatesEditsAndDeletes() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensJournal-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let docs = root.appendingPathComponent("docs"), index = root.appendingPathComponent("index")
        try FileManager.default.createDirectory(at: docs.appendingPathComponent("nested"), withIntermediateDirectories: true)
        let a = docs.appendingPathComponent("a.md"), b = docs.appendingPathComponent("nested/b.md")
        try "First actual document".write(to: a, atomically: true, encoding: .utf8)
        try "Second actual document".write(to: b, atomically: true, encoding: .utf8)
        let store = try IndexStore(directory: index)
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { FakeEmbedder() })
        #expect(try indexer.syncChanges([docs]).added == 2)
        let cursor = try store.meta("journal_cursor")
        #expect(cursor != nil)
        try "First actual document changed".write(to: a, atomically: true, encoding: .utf8)
        let c = docs.appendingPathComponent("nested/c.md")
        try "Third actual document".write(to: c, atomically: true, encoding: .utf8)
        try FileManager.default.removeItem(at: b)
        // FSEvents delivery is asynchronous; replay subsequent scheduled passes until the event reaches the journal.
        let expected = Set([a.path, c.path].map(FolderSelection.realPath))
        var records: [FileRecord] = []
        for _ in 0..<20 {
            _ = try indexer.syncChanges([docs]); records = try store.files(under: [docs.path])
            if Set(records.map(\.path)) == expected && records.first(where: { $0.path == FolderSelection.realPath(a.path) })?.size == Int64("First actual document changed".utf8.count) { break }
            Thread.sleep(forTimeInterval: 0.1)
        }
        #expect(Set(records.map(\.path)) == expected)
        #expect(records.first(where: { $0.path == FolderSelection.realPath(a.path) })?.size == Int64("First actual document changed".utf8.count))
        let noChanges = try indexer.syncChanges([docs])
        #expect(noChanges.added == 0 && noChanges.changed == 0 && noChanges.removed == 0)
    }

    @Test func corruptDerivedCacheCannotBlockRealIndexing() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensCacheRecovery-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let docs = root.appendingPathComponent("docs"), index = root.appendingPathComponent("index")
        try FileManager.default.createDirectory(at: docs, withIntermediateDirectories: true)
        try "A meaningful personal document that must stay searchable even if its derived cache is corrupt.".write(to: docs.appendingPathComponent("note.md"), atomically: true, encoding: .utf8)
        let store = try IndexStore(directory: index)
        try Data("not a SQLite database".utf8).write(to: index.appendingPathComponent("content.sqlite"))
        let model = FakeEmbedder()
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { model })
        indexer.embedderSource = model.info.vectorSource
        _ = try indexer.sync([docs]); _ = try indexer.run()
        #expect(try store.files(under: [docs.path]).allSatisfy { $0.state == "done" })
        #expect(model.texts > 0)
    }

    @Test func identicalContentReusesProcessingButEditsAndModelChangesDoNot() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensContent-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let docs = root.appendingPathComponent("docs")
        for dir in ["one", "two"] { try FileManager.default.createDirectory(at: docs.appendingPathComponent(dir), withIntermediateDirectories: true) }
        let a = docs.appendingPathComponent("one/note.md"), b = docs.appendingPathComponent("two/note.md")
        let text = "A meaningful document about private semantic search and engineering decisions."
        try text.write(to: a, atomically: true, encoding: .utf8)
        let model = FakeEmbedder(), store = try IndexStore(directory: root.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { model })
        indexer.embedderSource = model.info.vectorSource
        _ = try indexer.sync([docs]); _ = try indexer.run()
        let embedded = model.texts
        #expect(embedded > 0)
        try FileManager.default.copyItem(at: a, to: b)
        _ = try indexer.sync([docs]); _ = try indexer.run()
        #expect(model.texts == embedded)
        try "A changed document about an entirely different subject and revisions.".write(to: b, atomically: true, encoding: .utf8)
        _ = try indexer.sync([docs]); _ = try indexer.run()
        #expect(model.texts > embedded)
        #expect(try store.files(under: [docs.path]).allSatisfy { $0.state == "done" })
        let file = try #require(store.files(under: [docs.path]).first)
        #expect(try ContentCache.key(file, fingerprint: "new-model") != ContentCache.key(file, fingerprint: "old-model"))
    }
}
