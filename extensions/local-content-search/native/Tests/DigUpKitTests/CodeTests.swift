import Foundation
import Testing
@testable import DigUpKit

/// The code index: what's read in code folders, how code is cut into stretches of lines, and where it ends up.
@Suite final class CodeTests {
    /// In Caches, not the temporary folder (see `LongFilesTests.folder`).
    let folder: URL = {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let url = caches.appendingPathComponent("DigUpTests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }()

    deinit {
        try? FileManager.default.removeItem(at: folder)
    }

    var codeOptions: IndexOptions {
        var options = IndexOptions()
        options.code = true
        return options
    }

    @discardableResult
    func write(_ path: String, _ text: String) throws -> URL {
        let url = folder.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try text.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// A function of `body` lines, each `width` characters wide.
    func function(_ name: String, body: Int, width: Int = 40) -> String {
        "func \(name)() {\n" + (1...body).map { "    let v\($0) = \"" + String(repeating: "x", count: width) + "\"" }
            .joined(separator: "\n") + "\n}\n"
    }

    // MARK: Stretches of lines

    @Test func shortFileIsOneStretch() {
        let pieces = CodeExtractor.lines("import Foundation\n\nfunc a() {}\n", size: 1800)
        #expect(pieces == [CodeExtractor.Piece(text: "import Foundation\n\nfunc a() {}", first: 1, last: 3)])
    }

    @Test func stretchesEndWhereTheCodeDoes() {
        // Three functions of ~25 lines (~1,000 characters each): a 1,800-character stretch can't hold two, and must
        // end at the blank line between them rather than in the middle of the second.
        let text = [function("first", body: 22), function("second", body: 22), function("third", body: 22)]
            .joined(separator: "\n")
        let pieces = CodeExtractor.lines(text, size: 1800)
        #expect(pieces.count == 3)
        #expect(pieces.map { $0.text.components(separatedBy: "\n")[0] } == ["func first() {", "func second() {",
                                                                             "func third() {"])
        for piece in pieces { #expect(piece.text.hasSuffix("}")) }
        // Line numbers are the file's, from 1, and stretches don't overlap when they end at a break.
        #expect(pieces[0].first == 1 && pieces[0].last == 24)
        #expect(pieces[1].first == 26 && pieces[1].last == 49)
        let lines = text.components(separatedBy: "\n")
        for piece in pieces {
            #expect(lines[(piece.first - 1)..<piece.last].joined(separator: "\n") == piece.text)
            #expect(piece.text.count <= 1800)
        }
    }

    @Test func aBlockTooLongForOneStretchOverlapsByTwoLines() {
        let pieces = CodeExtractor.lines(function("huge", body: 100), size: 1800)
        #expect(pieces.count > 2)
        for (piece, next) in zip(pieces, pieces.dropFirst()) {
            #expect(next.first == piece.last - 1)   // the last two lines again
        }
        #expect(pieces.last?.last == 102)
    }

    @Test func aVeryLongLineIsCutForTheModel() {
        let pieces = CodeExtractor.lines("let a = 1\n" + String(repeating: "y", count: 9000) + "\nlet b = 2\n", size: 1800)
        #expect(pieces.map(\.first) == [1, 2, 3])
        #expect(pieces[1].text.count == CodeExtractor.longestPiece)
    }

    @Test func windowsLineEndingsAndBlankEdges() {
        let pieces = CodeExtractor.lines("\r\n\r\nfunc a() {\r\n}\r\n\r\n", size: 1800)
        #expect(pieces == [CodeExtractor.Piece(text: "func a() {\n}", first: 3, last: 4)])
    }

    // MARK: Notebooks

    func notebook(_ cells: [(String, String)], outputs: Bool = true) throws -> Data {
        let list: [[String: Any]] = cells.map { kind, source in
            var cell: [String: Any] = ["cell_type": kind, "metadata": [:],
                                       "source": source.split(separator: "\n", omittingEmptySubsequences: false)
                                           .map { String($0) + "\n" }]
            if kind == "code", outputs {
                cell["outputs"] = [["output_type": "display_data",
                                    "data": ["image/png": String(repeating: "A", count: 5000),
                                             "text/plain": ["<Figure>"]]]]
            }
            return cell
        }
        return try JSONSerialization.data(withJSONObject: ["cells": list, "nbformat": 4, "nbformat_minor": 5])
    }

    @Test func notebookCellsWithoutTheirOutputs() throws {
        let data = try notebook([("markdown", "# Class balance"), ("code", "counts = df.label.value_counts()"),
                                 ("code", ""), ("raw", "notes")])
        let cells = try CodeExtractor.notebookCells(data)
        #expect(cells.count == 4)
        #expect(!cells.joined().contains("AAAA"))   // the picture an output holds is never read
        let pieces = CodeExtractor.cells(cells, size: 1800)
        #expect(pieces.count == 1)
        #expect(pieces[0].first == 1 && pieces[0].last == 4)   // the empty cell 3 is passed over, inside the range
        #expect(pieces[0].text.hasPrefix("# Class balance\n\ncounts"))
    }

    @Test func notebookStretchesHoldWholeCells() {
        let cell = String(repeating: "x = 1\n", count: 100)   // 600 characters
        let pieces = CodeExtractor.cells([cell, cell, cell, String(repeating: "y = 2\n", count: 500)], size: 1800)
        #expect(pieces.map(\.first) == [1, 3, 4, 4])
        #expect(pieces.map(\.last) == [2, 3, 4, 4])
    }

    // MARK: What's read

    @Test func codeFolderTypes() throws {
        func kind(_ name: String, _ text: String = "x") throws -> Classification {
            Rules.classifyCode(try write(name, text), options: codeOptions)
        }
        #expect(try kind("retry.py") == .index(.code))
        #expect(try kind("App.swift") == .index(.code))
        #expect(try kind("README.md") == .index(.code))
        #expect(try kind("settings.yaml") == .index(.code))
        #expect(try kind("explore.ipynb") == .index(.code))
        #expect(try kind("Makefile") == .index(.code))
        #expect(try kind("Dockerfile.dev") == .index(.code))
        #expect(try kind("app.ts") == .index(.code))
        #expect(try kind("package.json") == .skip("data file"))
        #expect(try kind("rows.csv") == .skip("data file"))
        #expect(try kind("yarn.lock") == .skip("data file"))
        #expect(try kind("bundle.min.js") == .skip("minified"))
        #expect(try kind("LICENSE.md") == .skip("license"))
        #expect(try kind("prod.pem") == .skip("key or password file"))
        #expect(try kind("id_ed25519") == .skip("key or password file"))
        #expect(try kind("credentials.yaml") == .skip("key or password file"))
        #expect(try kind("photo.jpg") == .ignore)
        // A real MPEG transport stream named .ts is a video, not code.
        var bytes = [UInt8](repeating: 0xFF, count: 188 * 4)
        for packet in 0..<4 { bytes[packet * 188] = 0x47 }
        let clip = folder.appendingPathComponent("clip.ts")
        try Data(bytes).write(to: clip)
        #expect(Rules.classifyCode(clip, options: codeOptions) == .ignore)
    }

    @Test func leftOutOnceRead() throws {
        #expect(throws: (any Error).self) { try CodeExtractor.check("// Code generated by protoc. DO NOT EDIT.\nx", source: true) }
        #expect(throws: (any Error).self) {
            try CodeExtractor.check("KEY = \"\"\"\n-----BEGIN RSA PRIVATE KEY-----\nabc\n\"\"\"", source: true)
        }
        let minified = "!function(){" + String(repeating: "var a=1;", count: 1000) + "}();"
        #expect(throws: (any Error).self) { try CodeExtractor.check(minified, source: true) }
        // A repo's notes may say "do not edit" anywhere, and run paragraphs on one line.
        try CodeExtractor.check("# Notes\n\nDO NOT EDIT the generated files by hand.\n", source: false)
        try CodeExtractor.check(String(repeating: "word ", count: 2000), source: false)
        try CodeExtractor.check("func a() {}\n", source: true)
    }

    @Test func placeInItsRepo() throws {
        let repo = folder.appendingPathComponent("billing")
        try FileManager.default.createDirectory(at: repo.appendingPathComponent(".git"), withIntermediateDirectories: true)
        let file = try write("billing/payments/retry.py", "pass\n")
        let (found, title) = CodeExtractor.place(of: file.path)
        #expect(found == repo.path)
        #expect(title == "billing/payments/retry.py")
        let loose = try write("scripts/backup.sh", "echo\n")
        #expect(CodeExtractor.place(of: loose.path) == (nil, "scripts/backup.sh"))
    }

    @Test func codeQueries() {
        #expect(CodeQuery.text(of: "code: retry with backoff") == "retry with backoff")
        #expect(CodeQuery.text(of: "  Code:useDebounce") == "useDebounce")
        #expect(CodeQuery.text(of: "code:") == "")
        #expect(CodeQuery.text(of: "code review notes") == nil)
        #expect(CodeQuery.text(of: "the code: 1234") == nil)
    }

    // MARK: Crawling code folders

    func git(_ arguments: String...) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: GitFiles.git!)
        process.arguments = ["-C", folder.path] + arguments
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try process.run()
        process.waitUntilExit()
    }

    func crawlNames(_ options: IndexOptions) -> [String] {
        Crawler.crawl([folder], options: options).candidates
            .map { String($0.path.dropFirst(folder.path.count + 1)) }.sorted()
    }

    @Test(.enabled(if: GitFiles.git != nil)) func codeCrawlKeepsWhatGitKeeps() throws {
        try write("app/main.py", "print(1)\n")
        try write("app/README.md", "# App\n")
        try write("app/.gitignore", "build/\n*.log\nscratch.py\n")
        try write("app/scratch.py", "x = 1\n")                  // ignored by git
        try write("app/notes/todo.md", "- ship\n")              // new, not ignored: kept
        try write("app/build/out.py", "x = 2\n")               // ignored (and a built folder)
        try write("app/vendor/lib/core.py", "x = 3\n")         // vendored: tracked, still left out
        try write("app/node_modules/pad/index.js", "x\n")     // a dependency
        try write("app/data.json", "{}\n")                    // data
        try write("app/big.py", String(repeating: "x = 1\n", count: 200_000))   // 1.2 MB: made by a program
        try write("app/sub/.git", "gitdir: ../.git/modules/sub\n")   // a submodule
        try write("app/sub/lib.py", "x = 4\n")
        try write("loose/backup.sh", "rsync\n")                // not in a repo: everything code counts
        try git("init", "-q", "app")
        #expect(crawlNames(codeOptions) == ["app/README.md", "app/main.py", "app/notes/todo.md", "loose/backup.sh"])
        let report = Crawler.crawl([folder], options: codeOptions)
        #expect(report.skipped["ignored by git"] == 1)
        #expect(report.skippedFolders["vendored or built code"] == 2)
        #expect(report.skippedFolders["submodule or worktree"] == 1)
        // A repo's subfolder chosen on its own still follows the repo's .gitignore.
        let sub = Crawler.crawl([folder.appendingPathComponent("app")], options: codeOptions).candidates
        #expect(!sub.contains { $0.path.hasSuffix("scratch.py") })
        // The main index never takes code from a code project (only its screenshots).
        #expect(crawlNames(IndexOptions()).isEmpty)
    }

    // MARK: The code index

    @Test func codeIndexIsAFileOfItsOwn() throws {
        try write("billing/.git/HEAD", "ref: refs/heads/main\n")
        try write("billing/retry.py", [function("retryWithBackoff", body: 22), function("circuit", body: 22),
                                      function("other", body: 22)].joined(separator: "\n"))
        try write("billing/gen_pb2.py", "# Generated by the protocol buffer compiler.  DO NOT EDIT!\nx = 1\n")
        let index = folder.appendingPathComponent("index")
        let store = try IndexStore(directory: index, file: IndexStore.codeFile)
        #expect(store.file.lastPathComponent == "code.sqlite")
        let embedder = FakeEmbedder()
        let indexer = try Indexer(store: store, options: codeOptions, makeEmbedder: { embedder })
        _ = try indexer.sync([folder.appendingPathComponent("billing")])
        #expect(try indexer.run() == ["done": 1, "skipped": 1])
        var rows: [(kind: String, loc: Int, end: Int)] = []
        try store.db.query("SELECT kind, loc, loc_end FROM segments WHERE kind != 'name' ORDER BY loc") {
            rows.append(($0.text(0) ?? "", Int($0.double(1)), Int($0.double(2))))
        }
        #expect(rows.map(\.kind) == ["lines", "lines", "lines"])
        #expect(rows.map(\.loc) == [1, 26, 51])
        #expect(embedder.texts == 3)
        // The title the model reads is the file's path in its repo.
        let id = try store.files(under: [folder.path]).first { $0.path.hasSuffix("retry.py") }!.id
        #expect(try store.info(of: id)["repo"] == folder.appendingPathComponent("billing").path)
        #expect(try store.info(of: id)["lines"] == "74")
        // Keyword search finds the function's name in its stretch; the main index (index.sqlite) has nothing.
        let hits = try Searcher(store: store).search("retryWithBackoff", queryVector: nil)
        #expect(hits.first?.segment == .lines && hits.first?.loc == 1 && hits.first?.locEnd == 24)
        let main = try IndexStore(directory: index)
        #expect(try main.files(under: [folder.path]).isEmpty)
        #expect(FileManager.default.fileExists(atPath: index.appendingPathComponent("code.sqlite").path))
    }

    // MARK: Names

    @Test func namesFromCode() {
        #expect(CodeLookup.identifier("quantize_row_q8_0_ref") == ["quantize", "row", "q8", "0", "ref"])
        #expect(CodeLookup.identifier("refreshAccessToken") == ["refreshaccesstoken"])
        #expect(CodeLookup.identifier("DuplicateFinder") == ["duplicatefinder"])
        #expect(CodeLookup.identifier("os.path.join") == ["os", "path", "join"])
        #expect(CodeLookup.identifier("llama_sampler_top_k_impl()") == ["llama", "sampler", "top", "k", "impl"])
        // Words anyone would say are searched as words, and by meaning.
        #expect(CodeLookup.identifier("retry") == nil)
        #expect(CodeLookup.identifier("Renamer") == nil)
        #expect(CodeLookup.identifier("retry with backoff") == nil)
        #expect(CodeLookup.identifier("hamming distance") == nil)
    }

    @Test func definitionsOverUses() {
        func defined(_ name: String, _ text: String) -> Int? { CodeLookup.definition(of: name, in: text, first: 10)?.line }
        #expect(defined("retry_with_backoff", "x = retry_with_backoff(f)\n\ndef retry_with_backoff(attempts=5):") == 12)
        #expect(defined("isMPEGTransportStream", "    static func isMPEGTransportStream(_ url: URL) -> Bool {") == 10)
        #expect(defined("refreshAccessToken", "  token = await refreshAccessToken();\nexport async function refreshAccessToken() {")
                == 11)
        #expect(defined("gguf_init_from_reader", """
            struct gguf_context * result = gguf_init_from_reader(gr, params);
            static struct gguf_context * gguf_init_from_reader(const struct gguf_reader & gr, struct gguf_init_params p) {
            """) == 11)
        #expect(defined("llama_sampler_top_k_impl", "    llama_sampler_top_k_impl(cur_p, ctx->k);\n    return;") == nil)
        #expect(defined("SUStandardVersionComparator", "@implementation SUStandardVersionComparator") == 10)
        #expect(defined("Name", "func (s *Server) Name() string {") == 10)
        // A declaration counts less than a definition, more than a use.
        let header = "GGML_API void quantize_row_q8_0_ref(const float * x, block_q8_0 * y, int64_t k);"
        #expect(CodeLookup.definition(of: "quantize_row_q8_0_ref", in: header, first: 1)?.strength == 1)
    }

    @Test func theLineToOpenAt() {
        let text = "import time\n\n\ndef retry_with_backoff(attempts=5):\n    pass\n"
        #expect(CodeLookup.firstLine(with: ["retry"], in: text, first: 40) == 43)
        #expect(CodeLookup.firstLine(with: ["backoff"], in: "let a = 1\nfunc retryWithBackoff() {}", first: 1) == 2)
        #expect(CodeLookup.firstLine(with: ["zebra"], in: text, first: 1) == nil)
        // A definition with the words beats a docstring or a comment that has them first.
        let module = "\"\"\"Retrying calls to flaky services.\"\"\"\n\nimport random\n\ndef retry_with_backoff(f):\n    pass\n"
        #expect(CodeLookup.firstLine(with: ["retry", "backoff"], in: module, first: 1) == 5)
        #expect(CodeLookup.firstLine(with: ["calls"], in: module + "x = calls()\n", first: 1) == 7)
    }

    @Test func aStretchInOneLine() {
        #expect(CodeExtractor.summary("import os\n\n# Retry things\ndef retry_with_backoff(attempts=5):\n    pass")
                == "def retry_with_backoff(attempts=5):")
        #expect(CodeExtractor.summary("// header\nlet total = items.reduce(0, +)\n") == "let total = items.reduce(0, +)")
    }

    @Test func aNameLookedUpPointsAtItsDefinition() throws {
        // The name is called twice near the top, and defined further down in a stretch of its own.
        let calls = "func run() {\n" + (1...30).map { "    refreshAccessToken()  // call \($0) of many" }
            .joined(separator: "\n") + "\n}\n"
        let definition = "\nfunc refreshAccessToken() -> String {\n    return \"token\"\n}\n"
        try write("app/.git/HEAD", "ref: refs/heads/main\n")
        try write("app/Auth.swift", calls + definition)
        let store = try IndexStore(directory: folder.appendingPathComponent("index"), file: IndexStore.codeFile)
        let indexer = try Indexer(store: store, options: codeOptions, makeEmbedder: { FakeEmbedder() })
        _ = try indexer.sync([folder.appendingPathComponent("app")])
        try indexer.run()
        let hit = try #require(try Searcher(store: store).search("refreshAccessToken", queryVector: nil).first)
        #expect(hit.segment == .lines)
        #expect(hit.focus == 34)   // the line that defines it, in the stretch that holds it
        #expect(hit.loc! <= 34 && hit.locEnd! >= 34)
    }

    @Test func codeEstimatesTimeAndRoom() {
        func file(_ name: String, _ size: Int64) -> Candidate {
            Candidate(path: "/x/" + name, kind: .code, size: size, mtime: 0, inode: 0, device: 0)
        }
        let estimate = Estimator.estimate([file("a.py", 14_000), file("b.swift", 100), file("c.ipynb", 112_000)],
                                          options: codeOptions)
        // 14,000 characters are 10 stretches, a tiny file 1, a notebook's cells about an eighth of its file.
        #expect(estimate.codeStretches == 10 + 1 + 10)
        #expect(estimate.files[.code] == 3)
        #expect(abs(estimate.seconds - 21 * Costs().codeStretch) < 1e-9)
        #expect(estimate.bytes > 21 * 1600 && estimate.bytes < 200_000)
    }
}
