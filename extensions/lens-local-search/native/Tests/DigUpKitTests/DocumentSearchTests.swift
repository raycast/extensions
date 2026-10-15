import Foundation
import Testing
@testable import DigUpKit

@Suite struct DocumentSearchTests {
    @Test func preservesIndependentContentPassagesAndNeverUsesFolderNamesAsContent() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensPassages-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root)
        let file = try store.insert(Candidate(path: "/files/reactor.pdf", kind: .pdf, size: 1, mtime: 1, inode: 1, device: 1))
        let vector = FakeEmbedder.vector(for: "semantic")
        try store.addSegment(file: file, kind: .page, modality: .text, loc: 2, excerpt: "Cooling systems", text: "Cooling systems", vector: vector)
        try store.addSegment(file: file, kind: .page, modality: .text, loc: 9, excerpt: "zirconium safety procedure", text: "zirconium safety procedure", vector: FakeEmbedder.vector(for: "other"))
        let hit = try #require(try Searcher(store: store).search("zirconium", queryVector: vector, zGate: 0, candidatePool: true).first)
        #expect(Set(hit.passages.compactMap(\.loc)) == [2, 9])
        #expect(hit.passages.allSatisfy { $0.segment != .name })
        #expect(try Searcher(store: store).context(ofSegment: hit.segmentID) == "Cooling systems")
        #expect(hit.passages.first { $0.loc == 9 }?.excerpt?.contains("«zirconium»") == true)
    }

    @Test func documentTypeAppliesBeforeTheKeywordCandidateBudget() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensDocScope-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root)
        try store.db.transaction {
            for i in 0..<1005 {
                let file = try store.insert(Candidate(path: "/images/exam-\(i).png", kind: .image, size: 1, mtime: 1, inode: UInt64(i+1), device: 1))
                try store.addSegment(file: file, kind: .ocr, modality: .none, text: "examination")
            }
            let file = try store.insert(Candidate(path: "/notes/anonymous.pdf", kind: .pdf, size: 1, mtime: 1, inode: 2000, device: 1))
            try store.addSegment(file: file, kind: .page, modality: .none, loc: 7,
                                 text: String(repeating: "Other discussion. ", count: 100) + " examination")
        }
        let hits = try Searcher(store: store, loadVectors: false).search("examination", queryVector: nil, kinds: [.pdf])
        #expect(hits.count == 1 && hits.first?.loc == 7)
    }

    @Test func upgradesOCRAndDensePageTailsWithoutReopeningFilesOrDuplicatingWork() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("LensPDFText-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try IndexStore(directory: root)
        let file = try store.insert(Candidate(path: "/not-mounted/anonymous.pdf", kind: .pdf, size: 1, mtime: 1, inode: 1, device: 1))
        let scan = String(repeating: "The municipal water system is monitored every week. ", count: 12)
        let dense = String(repeating: "Ordinary discussion of unrelated planning. ", count: 130) + "The quokka protocol prevents contamination."
        try store.addSegment(file: file, kind: .pageImage, modality: .image, loc: 1, text: scan, vector: FakeEmbedder.vector(for: "image"))
        try store.addSegment(file: file, kind: .page, modality: .text, loc: 2, text: dense, vector: FakeEmbedder.vector(for: "prefix"))
        try store.finish(file, state: "partial", detail: "read to page 2 of 90", info: ["pages":"90", "read_to":"2", "read_end":"90"])
        let worker = FakeEmbedder(), indexer = try Indexer(store: store, options: IndexOptions(), makeEmbedder: { worker })
        #expect(try indexer.upgradePDFPassages(shouldStop: { true }) == 0)
        #expect(try indexer.upgradePDFPassages() == 1)
        #expect(worker.texts > 2)
        var scanVectors = 0, tailVectors = 0, originalImages = 0
        try store.db.query("SELECT s.loc,s.kind,s.vec,fts.body FROM segments s LEFT JOIN fts ON fts.rowid=s.id WHERE s.file=?", [.int(file)]) { row in
            if row.text(1) == "page_image" { originalImages += 1 }
            if row.text(1) == "page", !row.isNull(2) {
                if row.double(0) == 1 { scanVectors += 1 }
                if (row.text(3) ?? "").contains("quokka"), (row.text(3) ?? "").count < 2000 { tailVectors += 1 }
            }
        }
        #expect(scanVectors > 0 && tailVectors > 0 && originalImages == 1)
        #expect(try store.unfinishedCount() == (1, 88))
        #expect(try indexer.upgradePDFPassages() == 0)
        #expect(try store.pdfsNeedingPassages().isEmpty)
    }
}
