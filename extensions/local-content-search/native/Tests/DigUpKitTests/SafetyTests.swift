import Foundation
import Testing
@testable import DigUpKit

// Apply secret exclusions to all content, not just the optional code index.
@Suite struct SafetyTests {
    @Test func documentsExcludeSecrets() {
        for name in ["secret.txt", "credentials.md", "id_rsa.txt", "certificate.pem"] {
            let file = URL(fileURLWithPath: "/tmp/\(name)")
            #expect(Rules.classify(file, type: .init(filenameExtension: file.pathExtension), options: IndexOptions()) == .skip("key or password file"))
        }
    }

    // Repeated scans must use the crawler's real paths, including macOS /var aliases.
    @Test func repeatedScansKeepRealPaths() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("LocalSearchAlias-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let content = URL(fileURLWithPath: FolderSelection.realPath(folder.path)).appendingPathComponent("docs")
        try FileManager.default.createDirectory(at: content, withIntermediateDirectories: true)
        try "Pets are allowed".write(to: content.appendingPathComponent("lease.txt"), atomically: true, encoding: .utf8)
        let store = try IndexStore(directory: folder.appendingPathComponent("index"))
        let indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: {
            throw WorkerError.notFound("sync does not need a model")
        })
        #expect(try indexer.sync([content]).added == 1)
        #expect(try indexer.sync([content]).unchanged == 1)
    }

    @Test func oversizedDocumentsAreSkipped() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("LocalSearchSafety-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let file = folder.appendingPathComponent("large.txt")
        FileManager.default.createFile(atPath: file.path, contents: nil)
        let handle = try FileHandle(forWritingTo: file)
        try handle.truncate(atOffset: 21 * 1024 * 1024)
        try handle.close()
        #expect(Crawler.crawl([folder], options: IndexOptions()).candidates.isEmpty)
    }
}
