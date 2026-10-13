import Foundation
import Testing
@testable import DigUpKit

@Suite struct ReviewTests {
    // Oversized audio must stop before writing WAVs; no silent truncation or unbounded scratch growth.
    @Test func audioScratchIsBounded() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let fixture = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("LlamaRuntimeTests/Reference/speech.wav")
        await #expect(throws: (any Error).self) {
            _ = try await AudioExtractor.windows(of: fixture, window: 2, hop: 2, maximumDuration: 1, to: folder)
        }
        #expect(try FileManager.default.contentsOfDirectory(atPath: folder.path).isEmpty)
        await #expect(throws: (any Error).self) {
            _ = try await AudioExtractor.windows(of: fixture, window: 2, hop: 2, maximumBytes: 1, to: folder)
        }
        #expect(try FileManager.default.contentsOfDirectory(atPath: folder.path).isEmpty)
    }

    // A decoder/encoder failure must not mark an otherwise readable recording searchable.
    @Test func failedAudioIsNotDone() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let root = base.appendingPathComponent("audio")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        let fixture = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("LlamaRuntimeTests/Reference/speech.wav")
        try FileManager.default.copyItem(at: fixture, to: root.appendingPathComponent("recording.wav"))
        let store = try IndexStore(directory: base.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { FailedMediaEmbedder() })
        _ = try indexer.sync([root])
        #expect(try indexer.run()["failed"] == 1)
        #expect(try store.counts().vectors == 0)
        #expect(try store.files(under: [FolderSelection.realPath(root.path)]).first?.state == "failed")
        var detail: String?
        try store.db.query("SELECT detail FROM files") { detail = $0.text(0) }
        #expect(detail?.contains("fixture encoder failure") == true)
    }

    @Test(.enabled(if: FileManager.default.isExecutableFile(atPath: "/opt/homebrew/bin/ffmpeg")))
    func failedVideoIsNotDone() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let root = base.appendingPathComponent("video")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/ffmpeg")
        process.arguments = ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=green:s=64x64:d=1", "-threads", "1", root.appendingPathComponent("recording.mp4").path]
        try process.run(); process.waitUntilExit()
        #expect(process.terminationStatus == 0)
        let store = try IndexStore(directory: base.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { FailedMediaEmbedder() })
        _ = try indexer.sync([root])
        #expect(try indexer.run()["failed"] == 1)
        #expect(try store.counts().vectors == 0)
    }

    // A kind filter controls returned files, not the comparison population for semantic relevance.
    @Test func kindKeepsSemanticMatches() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: base) }
        let store = try IndexStore(directory: base)
        var query = [Float](repeating: 0, count: Vectors.dimension)
        query[0] = 1
        let wanted = "/docs/lease.txt"
        for number in 0..<21 {
            let path = number == 0 ? wanted : "/docs/picture\(number).png"
            let id = try store.insert(Candidate(path: path, kind: number == 0 ? .doc : .image,
                                                size: 10, mtime: 1, inode: UInt64(number), device: 1))
            var vector = [Float](repeating: 0, count: Vectors.dimension)
            vector[number == 0 ? 0 : 1] = 1
            try store.addSegment(file: id, kind: .chunk, modality: .text, text: "unrelated wording", vector: vector)
        }
        let searcher = try Searcher(store: store)
        let baseline = try searcher.search("domestic animals", queryVector: query)
        #expect(baseline.first?.path == wanted)
        let filtered = try searcher.search("domestic animals", queryVector: query, kinds: [.doc])
        #expect(filtered.map(\.path) == [wanted])
        #expect(filtered.first?.z == baseline.first?.z)
        #expect(try searcher.search("domestic animals", queryVector: query, kinds: [.image]).isEmpty)
    }

    // More excluded keyword rows than the native FTS limit must never hide an allowed match.
    @Test func scopePrecedesRanking() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: base) }
        let store = try IndexStore(directory: base)
        for number in 0..<1010 {
            let id = try store.insert(Candidate(path: "/docs/removed/\(number).txt", kind: .doc, size: 10, mtime: 1, inode: UInt64(number), device: 1))
            try store.addSegment(file: id, kind: .chunk, modality: .text, text: "needle")
        }
        let wanted = "/docs/media/courses/lesson.md"
        let id = try store.insert(Candidate(path: wanted, kind: .doc, size: 10, mtime: 1, inode: 2000, device: 1))
        try store.addSegment(file: id, kind: .chunk, modality: .text, text: "needle")
        let searcher = try Searcher(store: store)
        let selection = FolderSelection(chosen: ["/docs/media/courses"], skipped: ["/docs/media"])
        #expect(try searcher.search("needle", queryVector: nil, limit: 1, selection: selection).map(\.path) == [wanted])
        #expect(try searcher.search("needle", queryVector: nil, selection: selection, excludedExtensions: ["md"]).isEmpty)
    }

    // Unavailable pending and partial rows retain their content but must not enter either extraction queue.
    @Test func unavailableWorkWaits() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let root = base.appendingPathComponent("docs")
        let limited = root.appendingPathComponent("limited")
        try FileManager.default.createDirectory(at: limited, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        try Data("pending text".utf8).write(to: limited.appendingPathComponent("pending.txt"))
        try Data("saved text".utf8).write(to: limited.appendingPathComponent("partial.txt"))
        let store = try IndexStore(directory: base.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { throw WorkerError.notFound("must not extract") })
        _ = try indexer.sync([root])
        let partial = try #require(store.files(under: [FolderSelection.realPath(root.path)]).first { $0.path.hasSuffix("partial.txt") })
        try store.addSegment(file: partial.id, kind: .chunk, modality: .text, text: "saved text")
        try store.finish(partial.id, state: "partial", info: ["read_to": "1", "read_end": "2"])
        try FileManager.default.setAttributes([.posixPermissions: 0], ofItemAtPath: limited.path)
        defer { try? FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: limited.path) }
        _ = try indexer.sync([root])
        #expect(try store.pending(limit: nil).isEmpty)
        #expect(try store.unfinished().isEmpty)
        #expect(try store.pendingCount() == 0)
        #expect(try store.unfinishedCount().files == 0)
        #expect(try indexer.run().isEmpty)
        #expect(try indexer.finishLongFiles().isEmpty)
        #expect(try Searcher(store: store).search("saved text", queryVector: nil).first?.path == partial.path)
        try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: limited.path)
        _ = try indexer.sync([root])
        #expect(try store.pending(limit: nil).count == 1)
        #expect(try store.unfinished().map(\.id) == [partial.id])
    }

    // A single cloud-placeholder path excludes only that file, before pending limits and without changing state.
    @Test func placeholderWorkIsScoped() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: base) }
        let store = try IndexStore(directory: base)
        let cloud = "/docs/cloud's.txt"
        let local = "/docs/cloud's.txt.local.txt"
        let cloudID = try store.insert(Candidate(path: cloud, kind: .doc, size: 10, mtime: 2, inode: 1, device: 1))
        let localID = try store.insert(Candidate(path: local, kind: .doc, size: 10, mtime: 1, inode: 2, device: 1))
        try store.deferUnavailable([cloud])
        #expect(try store.pending(limit: 1).map(\.id) == [localID])
        #expect(try store.pending(limit: nil, only: [cloudID]).isEmpty)
        #expect(try store.pendingCount() == 1)
        try store.finish(cloudID, state: "partial", info: ["read_to": "1", "read_end": "2"])
        #expect(try store.unfinished().isEmpty)
        #expect(try store.unfinishedCount().files == 0)
        try store.deferUnavailable([])
        #expect(try store.unfinished().map(\.id) == [cloudID])
    }

    // Loss of directory access is not deletion; accessible sibling deletions must still reconcile.
    @Test func unreadableRowsSurvive() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let root = base.appendingPathComponent("docs")
        let limited = root.appendingPathComponent("limited")
        try FileManager.default.createDirectory(at: limited, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        try Data("saved content".utf8).write(to: limited.appendingPathComponent("saved.txt"))
        let removed = root.appendingPathComponent("gone.txt")
        try Data("deleted content".utf8).write(to: removed)
        let store = try IndexStore(directory: base.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { throw WorkerError.notFound("sync only") })
        #expect(try indexer.sync([root]).added == 2)
        let saved = try #require(store.files(under: [FolderSelection.realPath(limited.path)]).first)
        try store.addSegment(file: saved.id, kind: .chunk, modality: .text, text: "saved content",
                             vector: [Float](repeating: 0, count: Vectors.dimension))
        try store.finish(saved.id, state: "done")
        try FileManager.default.removeItem(at: removed)
        try FileManager.default.setAttributes([.posixPermissions: 0], ofItemAtPath: limited.path)
        defer { try? FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: limited.path) }
        #expect(try indexer.sync([root]).removed == 1)
        #expect(try store.files(under: [FolderSelection.realPath(root.path)]).map(\.path).contains { $0.hasSuffix("saved.txt") })
        #expect(try store.counts().vectors == 1)
        #expect(try Searcher(store: store).search("saved content", queryVector: nil).first?.path == saved.path)
    }
}

// Model-free fixture failures exercise the real AVFoundation extraction and persisted indexing state.
private final class FailedMediaEmbedder: Embedder {
    let info = WorkerInfo(model: "failed-media", revision: "test", runtime: "test", dtype: "f32", dim: Vectors.dimension,
                          textOnly: false, loadSeconds: nil)
    func embedTexts(_ texts: [String]) throws -> [[Float]] { texts.map { _ in [Float](repeating: 0, count: Vectors.dimension) } }
    func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] { paths.map { _ in Embedding(vector: nil, error: "fixture encoder failure") } }
    func embedAudio(_ paths: [String]) throws -> [Embedding] { paths.map { _ in Embedding(vector: nil, error: "fixture encoder failure") } }
    func close() {}
}
