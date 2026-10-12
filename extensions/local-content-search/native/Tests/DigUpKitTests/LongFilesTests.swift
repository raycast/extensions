import AppKit
import Foundation
import Testing
@testable import DigUpKit

/// Long PDFs and documents: the first step in the first pass, the rest in `finishLongFiles`, and what goes with it.
@Suite final class LongFilesTests {
    /// In Caches, not the temporary folder: syncing a folder twice needs a path that the crawl reports as it's given,
    /// and the walk reports /private/var/… for /var/… (which no chosen folder in the app is under).
    let folder: URL = {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let url = caches.appendingPathComponent("DigUpTests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }()

    deinit {
        try? FileManager.default.removeItem(at: folder)
    }

    var files: URL { folder.appendingPathComponent("files") }

    func indexer(_ store: IndexStore, _ embedder: FakeEmbedder, options: IndexOptions = IndexOptions()) throws -> Indexer {
        try Indexer(store: store, options: options, makeEmbedder: { embedder })
    }

    func store() throws -> IndexStore { try IndexStore(directory: folder.appendingPathComponent("index")) }

    /// Pages (from 1) of a file's segments of `kinds`, in order.
    func places(_ store: IndexStore, _ path: String, kinds: [String] = ["page", "page_image", "chunk"]) throws -> [Int] {
        var out: [Int] = []
        try store.db.query("""
            SELECT s.loc FROM segments s JOIN files f ON f.id = s.file
            WHERE f.path = ? AND s.kind IN (\(kinds.map { "'\($0)'" }.joined(separator: ","))) ORDER BY s.loc
            """, [.text(path)]) { out.append(Int($0.double(0))) }
        return out
    }

    func state(_ store: IndexStore, _ path: String) throws -> (state: String, info: [String: String]) {
        var result = ("", [String: String]())
        try store.db.query("SELECT id, state FROM files WHERE path = ?", [.text(path)]) { row in
            result = (row.text(1) ?? "", (try? store.info(of: row.int(0))) ?? [:])
        }
        return result
    }

    /// Where keyword search finds `word`: the page or chunk numbers.
    func found(_ store: IndexStore, _ word: String) throws -> [Int] {
        var out: [Int] = []
        try store.db.query("SELECT s.loc FROM fts JOIN segments s ON s.id = fts.rowid WHERE fts MATCH ? ORDER BY s.loc",
                           [.text("\"\(word)\"")]) { out.append(Int($0.double(0))) }
        return out
    }

    @Test func longPDFIsReadInSteps() throws {
        let pdf = try makePDF("Field guide.pdf", pages: 120, special: [100: "quokka"])
        let store = try store()
        let embedder = FakeEmbedder()
        let indexer = try indexer(store, embedder)
        _ = try indexer.sync([files])
        #expect(try indexer.run()["partial"] == 1)
        #expect(try places(store, pdf.path) == Array(1...30))
        #expect(try state(store, pdf.path).state == "partial")
        #expect(try state(store, pdf.path).info["read_to"] == "30")
        #expect(try store.unfinishedCount() == (1, 90))
        #expect(try found(store, "quokka").isEmpty)

        var steps: [Indexer.Step] = []
        #expect(try indexer.finishLongFiles(onStep: { steps.append($0) }) == ["done": 1])
        #expect(steps.map(\.done) == [30, 60, 90])
        #expect(steps.map(\.total) == [90, 90, 90])
        #expect(steps.map(\.state) == ["partial", "partial", "done"])
        #expect(steps.map(\.files) == [1, 1, 0])
        #expect(try places(store, pdf.path) == Array(1...120))
        #expect(try found(store, "quokka") == [100])
        let (done, info) = try state(store, pdf.path)
        #expect(done == "done")
        #expect(info["read_to"] == nil && info["read_end"] == nil && info["pages"] == "120")
        #expect(try store.unfinishedCount() == (0, 0))
        #expect(try indexer.finishLongFiles().isEmpty)   // nothing left
        #expect(embedder.texts == 120)                    // every page embedded once
    }

    @Test func stoppingBetweenStepsLosesNothing() throws {
        let pdf = try makePDF("Book.pdf", pages: 100)
        let store = try store()
        let indexer = try indexer(store, FakeEmbedder())
        _ = try indexer.sync([files])
        try indexer.run()
        var steps = 0
        try indexer.finishLongFiles(shouldStop: { steps >= 1 }, onStep: { _ in steps += 1 })
        #expect(try state(store, pdf.path).info["read_to"] == "60")
        #expect(try store.unfinishedCount() == (1, 40))
        try indexer.finishLongFiles()
        #expect(try places(store, pdf.path) == Array(1...100))
        #expect(try state(store, pdf.path).state == "done")
    }

    @Test func aChangedFileStartsOver() throws {
        let pdf = try makePDF("Book.pdf", pages: 80)
        let store = try store()
        let indexer = try indexer(store, FakeEmbedder())
        _ = try indexer.sync([files])
        try indexer.run()
        try makePDF("Book.pdf", pages: 90)   // a new edition, same name
        #expect(try indexer.sync([files]).changed == 1)
        #expect(try state(store, pdf.path).state == "pending")
        #expect(try places(store, pdf.path).isEmpty)
        try indexer.run()
        try indexer.finishLongFiles()
        #expect(try places(store, pdf.path) == Array(1...90))
    }

    @Test func longDocumentGoesOnWhereItStopped() throws {
        let text = prose(characters: 150_000, special: (at: 120_000, word: "axolotl"))
        let url = files.appendingPathComponent("Notes.txt")
        try FileManager.default.createDirectory(at: files, withIntermediateDirectories: true)
        try text.write(to: url, atomically: true, encoding: .utf8)
        let chunks = DocExtractor.chunks(text, limit: 10_000)
        #expect(chunks.count > 80)
        let store = try store()
        let indexer = try indexer(store, FakeEmbedder())
        _ = try indexer.sync([files])
        try indexer.run()
        #expect(try places(store, url.path) == Array(1...40))
        #expect(try state(store, url.path).info["read_end"] == "\(chunks.count)")
        #expect(try found(store, "axolotl").isEmpty)
        try indexer.finishLongFiles()
        #expect(try places(store, url.path) == Array(1...chunks.count))
        // The same chunks as one pass would cut, none twice: what the later steps added fits on.
        var stored: [String] = []
        try store.db.query("""
            SELECT coalesce(fts.original, fts.body) FROM fts JOIN segments s ON s.id = fts.rowid
            WHERE s.kind = 'chunk' ORDER BY s.loc
            """) { stored.append($0.text(0) ?? "") }
        #expect(stored == chunks)
        let places = try found(store, "axolotl")   // in one chunk, or two where they overlap
        #expect(!places.isEmpty && places.allSatisfy { $0 > 40 })
        #expect(try state(store, url.path).state == "done")
    }

    @Test func digitsGetKeywordSearchOnly() throws {
        var dump = ""
        for row in 0..<4_000 { dump += "\(row) \(row * 7919 % 100_003) \(row * 31 % 977)\n" }
        dump += "4815162342\n"
        let url = files.appendingPathComponent("sensor log.txt")
        try FileManager.default.createDirectory(at: files, withIntermediateDirectories: true)
        try dump.write(to: url, atomically: true, encoding: .utf8)
        #expect(!SearchText.hasWords(dump))
        #expect(SearchText.hasWords("Revenue 1,234,567 · Net income 234,567 · Margin 19% in the third quarter"))
        #expect(SearchText.hasWords("কলকাতায় বৃষ্টি হচ্ছে"))
        let store = try store()
        let embedder = FakeEmbedder()
        let indexer = try indexer(store, embedder)
        _ = try indexer.sync([files])
        try indexer.run()
        try indexer.finishLongFiles()
        #expect(embedder.texts == 0)
        var vectors = -1
        try store.db.query("SELECT COUNT(vec) FROM segments") { vectors = Int($0.int(0)) }
        #expect(vectors == 0)
        #expect(try found(store, "4815162342").count == 1)
    }

    @Test func machineMadeGiantsStopAtTheCap() throws {
        let pdf = try makePDF("Export.pdf", pages: 120)
        var options = IndexOptions()
        options.maxPages = 45
        let store = try store()
        let indexer = try indexer(store, FakeEmbedder(), options: options)
        _ = try indexer.sync([files])
        try indexer.run()
        #expect(try store.unfinishedCount() == (1, 15))
        try indexer.finishLongFiles()
        #expect(try places(store, pdf.path) == Array(1...45))
        #expect(try state(store, pdf.path).state == "done")
        var detail: String?
        try store.db.query("SELECT detail FROM files") { detail = $0.text(0) }
        #expect(detail == "the first 45 of 120 pages")
    }

    @Test func oldIndexesFinishWhatTheyCut() throws {
        // As schema 4 left them: a long PDF read to page 30, a document cut at its 40th chunk, and a chunk of digits
        // with a vector.
        var store: IndexStore? = try self.store()
        try store!.insert(Candidate(path: "/books/atlas.pdf", kind: .pdf, size: 10, mtime: 1, inode: 1, device: 1))
        try store!.insert(Candidate(path: "/notes/long.txt", kind: .doc, size: 10, mtime: 1, inode: 2, device: 1))
        let short = try store!.insert(Candidate(path: "/notes/short.txt", kind: .doc, size: 10, mtime: 1, inode: 3,
                                                device: 1))
        let dump = try store!.insert(Candidate(path: "/data/dump.txt", kind: .doc, size: 10, mtime: 1, inode: 4,
                                               device: 1))
        try store!.addSegment(file: short, kind: .chunk, modality: .text, loc: 1, text: "Notes from the harbour meeting",
                              vector: FakeEmbedder.vector(for: "words"))
        try store!.addSegment(file: dump, kind: .chunk, modality: .text, loc: 1, text: "1760000000 4 9153\n1760000060 5 17",
                              vector: FakeEmbedder.vector(for: "digits"))
        try store!.db.execute("""
            UPDATE files SET state = 'partial', info = '{"pages":"463","scanned_pages":"4"}' WHERE path = '/books/atlas.pdf';
            UPDATE files SET state = 'done', info = '{"chars":"100000","chunks":"40"}' WHERE path = '/notes/long.txt';
            UPDATE files SET state = 'done', info = '{"chars":"3000","chunks":"2"}' WHERE path = '/notes/short.txt';
            UPDATE files SET state = 'done', info = '{"chars":"30","chunks":"1"}' WHERE path = '/data/dump.txt';
            PRAGMA user_version = 4;
            """)
        store = nil
        let migrated = try self.store()
        #expect(try state(migrated, "/books/atlas.pdf").state == "partial")
        #expect(try state(migrated, "/books/atlas.pdf").info == ["pages": "463", "scanned_pages": "4", "read_to": "30",
                                                                 "read_end": "463"])
        #expect(try state(migrated, "/notes/long.txt").state == "partial")
        #expect(try state(migrated, "/notes/long.txt").info["read_to"] == "40")
        #expect(try state(migrated, "/notes/long.txt").info["read_end"] == "63")   // 100,000 characters / 1,600
        #expect(try state(migrated, "/notes/short.txt").state == "done")
        #expect(try migrated.unfinishedCount() == (2, 433 + 23))
        var vectors: [String] = []
        try migrated.db.query("SELECT f.path FROM segments s JOIN files f ON f.id = s.file WHERE s.vec IS NOT NULL") {
            vectors.append($0.text(0) ?? "")
        }
        #expect(vectors == ["/notes/short.txt"])   // the digits' vector went, the words' stayed
        #expect(try found(migrated, "9153") == [1])   // still found by keyword search
    }

    @Test func estimatesCountTheRest() throws {
        let book = try makePDF("Book.pdf", pages: 120)
        let short = try makePDF("Leaflet.pdf", pages: 3)
        let candidates = [book, short].map {
            Candidate(path: $0.path, kind: .pdf, size: 10, mtime: 1, inode: 1, device: 1)
        }
        let costs = Costs()
        let estimate = Estimator.estimate(candidates, options: IndexOptions(), costs: costs)
        #expect(estimate.pdfPages == 33)
        #expect(estimate.pdfPagesTotal == 123)
        #expect(estimate.longFiles == 1)
        #expect(abs(estimate.seconds - 33 * costs.pdfPage) < 1e-9)
        #expect(abs(estimate.laterSeconds - 90 * costs.pdfPage) < 1e-9)
    }

    @Test func float16VectorsScoreAcrossBlocks() throws {
        // More vectors than one block (`VectorStorage.blockRows`): every one must be scored, the last ones too.
        let store = try store()
        let rows = VectorStorage.blockRows * 2 + 300
        var target: [Float] = []
        try store.db.transaction {
            for index in 0..<rows {
                let id = try store.insert(Candidate(path: "/v/\(index).png", kind: .image, size: 1, mtime: 1,
                                                    inode: UInt64(index + 1), device: 1))
                let vector = FakeEmbedder.vector(for: "\(index)")
                if index == rows - 5 { target = vector }
                try store.addSegment(file: id, kind: .image, modality: .image, vector: vector)
            }
        }
        let searcher = try Searcher(store: store)
        #expect(searcher.vectorCount == rows)
        let hits = try searcher.search("", queryVector: target, limit: 3)
        #expect(hits.first?.path == "/v/\(rows - 5).png")
        #expect(abs((hits.first?.cosine ?? 0) - 1) < 0.002)   // float16 rounding only
    }

    // MARK: Files

    /// A text PDF with `pages` pages of a few sentences each; `special` puts a word on a page (from 1).
    @discardableResult
    func makePDF(_ name: String, pages: Int, special: [Int: String] = [:]) throws -> URL {
        try FileManager.default.createDirectory(at: files, withIntermediateDirectories: true)
        let url = files.appendingPathComponent(name)
        var box = CGRect(x: 0, y: 0, width: 612, height: 792)
        let context = try #require(CGContext(url as CFURL, mediaBox: &box, nil))
        for page in 1...pages {
            context.beginPDFPage(nil)
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
            let text = "Page \(page). " + prose(characters: 600, seed: page)
                + (special[page].map { " The \($0) lives here." } ?? "")
            (text as NSString).draw(in: CGRect(x: 60, y: 60, width: 492, height: 660),
                                    withAttributes: [.font: NSFont.systemFont(ofSize: 12)])
            NSGraphicsContext.restoreGraphicsState()
            context.endPDFPage()
        }
        context.closePDF()
        return url
    }

    /// Plain English-looking sentences, the same for the same seed; `special`'s word goes in once, past `at`.
    func prose(characters: Int, seed: Int = 1, special: (at: Int, word: String)? = nil) -> String {
        let words = ["river", "garden", "morning", "letter", "window", "harbour", "kitchen", "mountain", "station",
                     "market", "evening", "bridge", "orchard", "lantern", "meadow", "village", "library", "summer"]
        var pieces: [String] = [], count = 0, index = seed, placed = special == nil
        while count < characters {
            index = (index &* 1103515245 &+ 12345) & 0x7fffffff
            var piece = words[index % words.count] + (index % 7 == 0 ? "." : "")
            if !placed, let special, count >= special.at {
                piece = "the \(special.word) swims. " + piece
                placed = true
            }
            pieces.append(piece)
            count += piece.count + 1
        }
        return pieces.joined(separator: " ")
    }
}

/// Vectors without a model: the same text always gets the same unit vector. Counts what it was asked to embed.
final class FakeEmbedder: Embedder {
    let info = WorkerInfo(model: "fake", revision: "0000000", runtime: "test", dtype: "f32", dim: Vectors.dimension,
                          textOnly: false, loadSeconds: nil)
    private(set) var texts = 0

    static func vector(for text: String) -> [Float] {
        var state = UInt64(5381)
        for byte in text.utf8 { state = state &* 33 &+ UInt64(byte) }
        var values = (0..<Vectors.dimension).map { _ -> Float in
            state ^= state << 13; state ^= state >> 7; state ^= state << 17
            return Float(Int64(bitPattern: state % 2001) - 1000) / 1000
        }
        let norm = values.reduce(0) { $0 + $1 * $1 }.squareRoot()
        values = values.map { $0 / norm }
        return values
    }

    func embedTexts(_ texts: [String]) throws -> [[Float]] {
        self.texts += texts.count
        return texts.map(Self.vector(for:))
    }

    func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] {
        paths.map { Embedding(vector: Self.vector(for: $0), error: nil) }
    }

    func embedAudio(_ paths: [String]) throws -> [Embedding] {
        paths.map { Embedding(vector: Self.vector(for: $0), error: nil) }
    }

    func close() {}
}
