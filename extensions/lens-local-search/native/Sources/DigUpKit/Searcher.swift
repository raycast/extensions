import Foundation

public struct SearchPassage: Sendable {
    public let segment: SegmentKind
    public let segmentID: Int64
    public let loc: Double?
    public let excerpt: String?
}

public struct SearchHit: Sendable {
    public let path: String
    public let kind: FileKind
    public let score: Double          // fused rank score, for ordering only
    public let z: Double?             // how far the best segment stands out for this query (`Searcher.meaning`)
    public let cosine: Double?
    public let keywordRank: Int?      // 1-based rank among keyword matches
    public let segment: SegmentKind
    /// The segment the hit points at (its text is `Searcher.text(ofSegment:)`).
    public let segmentID: Int64
    public let loc: Double?           // PDF page, or seconds into audio/video
    public let locEnd: Double?
    public let excerpt: String?
    /// The file's modification date (seconds since 1970), and what indexing learned about it: "width", "height",
    /// "taken", "pages", "duration"… (see `Indexer`).
    public let modified: Double
    public let size: Int64
    public let info: [String: String]
    /// Code: the line to open at, in the stretch (`loc`…`locEnd`): where the name looked up is defined, or the first
    /// line with the query's words. Nil: the stretch's first line.
    public var focus: Double? = nil
    public var passages: [SearchPassage] = []
}

/// Hybrid search: meaning (EmbeddingGemma's vectors) + words (FTS5).
///
/// Meaning is the model's cosine similarity, put on one scale per query (`meaning`): every vector is scored anyway, so
/// the distribution comes for free, and only segments that stand out (`zGate`) count as meaning matches. That also
/// gives an honest "nothing found". Words rescue what a vector can't hold exactly: codes, IDs and names.
/// Declarative local metadata predicates. Unknown dimensions stay unknown even under negation.
public struct FilePredicate: Codable, Sendable {
    public let op: String
    public let value: String?
    public let args: [FilePredicate]?
    public init(op: String, value: String? = nil, args: [FilePredicate]? = nil) { self.op = op; self.value = value; self.args = args }
    public func valid(depth: Int = 0) -> Bool {
        guard depth < 16 else { return false }
        if ["and", "or", "not"].contains(op) {
            return value == nil && args?.count == (op == "not" ? 1 : 2) && args!.allSatisfy { $0.valid(depth: depth + 1) }
        }
        guard args == nil, let value, !value.isEmpty, value.count <= 512, !value.contains("\0") else { return false }
        if op == "kind_is" { return ["image", "screenshot", "documents", "audio", "video", "code"].contains(value) }
        if op == "ext_is" { return value.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber) } && value.count <= 10 }
        if ["name_prefix", "name_suffix", "name_contains", "name_lacks", "name_is"].contains(op) { return true }
        return ["size_lt", "size_gt", "width_lt", "width_gt", "height_lt", "height_gt", "modified_before", "modified_after"].contains(op)
            && Double(value).map { $0.isFinite && $0 >= 0 } == true
    }
    public func matches(path: String, kind: FileKind, size: Int64, modified: Double, info: [String: String]) -> Bool? {
        if let args {
            let results = args.map { $0.matches(path: path, kind: kind, size: size, modified: modified, info: info) }
            if op == "not" { return results[0].map { !$0 } }
            if op == "and" { return results.contains(false) ? false : results.contains(nil) ? nil : true }
            return results.contains(true) ? true : results.contains(nil) ? nil : false
        }
        guard let value else { return nil }
        let name = (path as NSString).lastPathComponent
        switch op {
        case "name_prefix": return name.range(of: value, options: [.caseInsensitive, .anchored]) != nil
        case "name_suffix": return (name as NSString).deletingPathExtension.range(of: value, options: [.caseInsensitive, .anchored, .backwards]) != nil
        case "name_contains": return name.range(of: value, options: .caseInsensitive) != nil
        case "name_lacks": return name.range(of: value, options: .caseInsensitive) == nil
        case "name_is": return name.caseInsensitiveCompare(value) == .orderedSame || (name as NSString).deletingPathExtension.caseInsensitiveCompare(value) == .orderedSame
        case "ext_is": return (name as NSString).pathExtension.caseInsensitiveCompare(value) == .orderedSame
        case "kind_is": return value == "documents" ? [.pdf, .doc].contains(kind) : value == "image" ? [.image, .screenshot].contains(kind) : kind.rawValue == value
        default:
            let actual: Double? = op.hasPrefix("size_") ? Double(size) : op.hasPrefix("modified_") ? modified
                : op.hasPrefix("width_") ? info["width"].flatMap(Double.init) : info["height"].flatMap(Double.init)
            guard let actual, actual.isFinite, let target = Double(value) else { return nil }
            return op.hasSuffix("lt") || op.hasSuffix("before") ? actual < target : actual > target
        }
    }
}

public enum FilenameMatch: String { case contains, prefix, suffix }
private enum FilePageEnd: Error { case reachedLimit }

public final class Searcher {
    public static func fileMetadata(paths: [String], roots: [String], skipped: [String]) -> [(path: String, size: Int64, modified: Double)] {
        paths.compactMap { path in
            guard FolderSelection.isSearched(path, folders: roots, skipped: skipped),
                  let info = FileSystem.info(of: path), info.isRegular, !info.dataless else { return nil }
            return (path: path, size: info.size, modified: info.mtime)
        }
    }

    /// File metadata search is independent of content embeddings and checks constraints before the result limit.
    public func files(roots: [String], skipped: [String], extensions: Set<String> = [], excludingExtensions: Set<String> = [],
                      containing name: String? = nil, matching: FilenameMatch = .contains, filter: FilePredicate? = nil, limit: Int = 200,
                      kinds: Set<FileKind> = [], after: (modified: Double, path: String)? = nil) throws -> [SearchHit] {
        var hits: [SearchHit] = []
        guard limit > 0 else { return hits }
        let comparison: String.CompareOptions = matching == .prefix ? [.caseInsensitive, .anchored]
            : matching == .suffix ? [.caseInsensitive, .anchored, .backwards] : [.caseInsensitive]
        let cursor = after == nil ? "" : "WHERE (f.mtime < ? OR (f.mtime = ? AND f.path > ?))"
        let values: [SQLValue] = after.map { [.double($0.modified), .double($0.modified), .text($0.path)] } ?? []
        do { try store.db.query("""
            SELECT f.path, f.kind, f.mtime, f.size, f.info,
              (SELECT id FROM segments WHERE file=f.id AND kind='name' LIMIT 1)
            FROM files f \(cursor) ORDER BY f.mtime DESC, f.path
            """, values) { row in
            guard hits.count < limit else { throw FilePageEnd.reachedLimit }
            guard let path = row.text(0), let kind = FileKind(rawValue: row.text(1) ?? ""), kinds.isEmpty || kinds.contains(kind) else { return }
            let info = row.text(4).flatMap { $0.data(using: .utf8) }
                .flatMap { try? JSONDecoder().decode([String: String].self, from: $0) } ?? [:]
            guard FolderSelection.isSearched(path, folders: roots, skipped: skipped),
                  extensions.isEmpty || extensions.contains((path as NSString).pathExtension.lowercased()),
                  !excludingExtensions.contains((path as NSString).pathExtension.lowercased()),
                  name == nil || (matching == .suffix ? ((path as NSString).lastPathComponent as NSString).deletingPathExtension : (path as NSString).lastPathComponent).range(of: name!, options: comparison) != nil,
                  filter.map({ $0.matches(path: path, kind: kind, size: row.int(3), modified: row.double(2), info: info) == true }) ?? true,
                  let current = FileSystem.info(of: path), current.isRegular, !current.dataless else { return }
            hits.append(SearchHit(path: path, kind: kind, score: 1, z: nil, cosine: nil, keywordRank: nil,
                                  segment: .name, segmentID: row.int(5), loc: nil, locEnd: nil, excerpt: nil,
                                  modified: row.double(2), size: row.int(3), info: info))
        } } catch FilePageEnd.reachedLimit { }
        return hits
    }
    let store: IndexStore
    private var matrix: VectorStorage?   // rows × 768 float16, row-major
    private var rowFile: [Int64] = []
    private var rowSegment: [Int64] = []
    private var rowModality: [Modality] = []
    /// False for the vectors the later pass adds (`Indexer.finishLongFiles`): scored, but they don't set the scale.
    private var rowSetsScale: [Bool] = []
    private var fileKind: [Int64: FileKind] = [:]
    public private(set) var vectorSource: String?
    /// False after `releaseVectors()` (or `loadVectors: false`): keyword search still works, and the next search with
    /// a query vector loads them again.
    public private(set) var vectorsLoaded = false

    public var vectorCount: Int { rowFile.count }

    /// This is the code index's searcher (`IndexStore.codeFile`): names are looked up as names (`CodeLookup`).
    public var isCode: Bool { store.file.lastPathComponent == IndexStore.codeFile }

    /// With `loadVectors: false` only keyword search is ready; vectors load on the first meaning search. The app
    /// uses that to stay small while idle: 20k vectors are ~30 MB.
    public init(store: IndexStore, loadVectors: Bool = true) throws {
        self.store = store
        if loadVectors { try reload() } else { try reloadFiles() }
    }

    /// Reads the files and all vectors again (after indexing added some).
    public func reload() throws {
        releaseVectors()
        try reloadFiles()
        var rows = 0
        try store.db.query("SELECT COUNT(*) FROM segments WHERE vec IS NOT NULL") { rows = Int($0.int(0)) }
        guard let matrix = VectorStorage(rows: rows) else {
            vectorsLoaded = true   // nothing to load
            return
        }
        let rowBytes = Vectors.dimension * MemoryLayout<Float16>.stride
        let steps = IndexOptions()
        try store.db.query("""
            SELECT s.id, s.file, s.modality, s.vec, s.kind, s.loc, f.kind, CAST(json_extract(f.info, '$.pages') AS INTEGER)
            FROM segments s JOIN files f ON f.id = s.file WHERE s.vec IS NOT NULL ORDER BY s.id
            """) { row in
            guard let blob = row.blob(3), blob.count == rowBytes, rowFile.count < rows else { return }
            blob.copyBytes(to: UnsafeMutableRawBufferPointer(start: matrix.halves + rowFile.count * Vectors.dimension,
                                                             count: rowBytes))
            rowSegment.append(row.int(0))
            rowFile.append(row.int(1))
            rowModality.append(Modality(rawValue: row.text(2) ?? "") ?? .none)
            // Past the first step of a long PDF (its pages) or document (its chunks).
            let (kind, place) = (row.text(4), row.isNull(5) ? 0 : Int(row.double(5)))
            let later = row.text(6) == "pdf"
                ? kind != SegmentKind.chunk.rawValue && Int(row.int(7)) > steps.bigPDFPages && place > steps.pdfStep
                : kind == SegmentKind.chunk.rawValue && place > steps.docStep
            rowSetsScale.append(!later)
        }
        self.matrix = matrix
        vectorsLoaded = true
    }

    /// Frees the vectors' memory; keyword search keeps working.
    public func releaseVectors() {
        matrix = nil
        rowFile = []
        rowSegment = []
        rowModality = []
        rowSetsScale = []
        vectorsLoaded = false
    }

    private func reloadFiles() throws {
        fileKind.removeAll(keepingCapacity: true)
        try store.db.query("SELECT id, kind FROM files") { row in
            fileKind[row.int(0)] = FileKind(rawValue: row.text(1) ?? "")
        }
        vectorSource = try store.meta("vector_source")
    }

    /// How much finding the query's words counts against meaning (`search`). Code's words count for less: they're
    /// everywhere in code ("app", "running", "location"), and a stretch that shares a few of them beat the one that
    /// does what the query says (2026-10-09, the real-code eval of 27 queries over DigUp, Sparkle and llama.cpp: 18 → 20
    /// found first, the top 5 unchanged; the synthetic code eval 40 → 41 of 41; 1.5 changed nothing, 0.5 lost the top 5).
    public static let wordWeight = 2.0
    public static let codeWordWeight = 1.0

    public func search(_ text: String, queryVector: [Float]?, kinds: Set<FileKind>? = nil, limit: Int = 20,
                       zGate: Double = 2.0, wordWeight: Double? = nil, prefixLast: Bool = false,
                       focusVector: [Float]? = nil, filter: FilePredicate? = nil, inScope: ((String) -> Bool)? = nil,
                       candidatePool: Bool = false) throws -> [SearchHit] {
        let wordWeight = wordWeight ?? (isCode ? Self.codeWordWeight : Self.wordWeight)
        if queryVector != nil, !vectorsLoaded { try reload() }
        let fileKind = self.fileKind
        var eligible: Set<Int64>?
        if filter != nil || inScope != nil {
            eligible = []
            try store.db.query("SELECT id, path, kind, size, mtime, info FROM files") { row in
                guard let path = row.text(1), let kind = FileKind(rawValue: row.text(2) ?? ""), inScope?(path) ?? true else { return }
                let info = row.text(5).flatMap { $0.data(using: .utf8) }.flatMap { try? JSONDecoder().decode([String: String].self, from: $0) } ?? [:]
                if filter.map({ $0.matches(path: path, kind: kind, size: row.int(3), modified: row.double(4), info: info) == true }) ?? true { eligible!.insert(row.int(0)) }
            }
        }
        let allowed = { (file: Int64) -> Bool in (eligible?.contains(file) ?? true) && (kinds == nil || fileKind[file].map { kinds!.contains($0) } ?? false) }

        // Meaning: score every vector on this query's scale (`meaning`), keep each file's best segment.
        var best: [Int64: (z: Double, cosine: Double, row: Int)] = [:]
        if let query = queryVector, query.count == Vectors.dimension, !rowFile.isEmpty {
            let scores = score(query)
            let meaning = Self.meaning(scores, rowModality, setsScale: rowSetsScale)
            let subject = focusVector.flatMap { $0.count == Vectors.dimension ? Self.meaning(score($0), rowModality, setsScale: rowSetsScale) : nil }
            for row in 0..<scores.count where allowed(rowFile[row]) {
                // Joint visual/content evidence: attributes cannot substitute for the requested subject.
                let z = subject.map { sqrt(max(meaning[row], 0) * max($0[row], 0)) } ?? meaning[row]
                if z > (best[rowFile[row]]?.z ?? -.infinity) { best[rowFile[row]] = (z, Double(scores[row]), row) }
            }
        }

        // Words: FTS5 with Porter stemming over file names, folder names, OCR, page and document text. A name from code
        // ("quantize_row_q8_0_ref") is matched as one phrase, as it's written.
        let terms = Self.terms(text)
        let identifier = isCode ? CodeLookup.identifier(text) : nil
        var words: [(file: Int64, segment: Int64, snippet: String?)] = []
        var contentWords: [Int64: (segment: Int64, snippet: String?)] = [:]
        var coverage: [Int64: Double] = [:]   // share of the query's words found anywhere in the file
        var patterns = identifier.map { [CodeLookup.phrase($0)] } ?? Self.patterns(terms, prefixLast: prefixLast)
        // A word that's in no file as typed matches as the start of longer words, as the last word does while it's
        // being typed: "grok" finds "Grok4" and "Grokipedia" (stemming only covers endings, as in "grokking").
        // Otherwise a file the panel showed while you typed dropped out once you stopped. A word that is in the index
        // as typed stays whole, so "cat" doesn't bring in "category"; so does a word of two letters, the start of too
        // many words to stand for one.
        if identifier == nil {
            for index in terms.indices where terms[index].count >= 3 && !patterns[index].hasSuffix("*") {
                if try !isIndexed(patterns[index]) { patterns[index] += "*" }
            }
        }
        if !patterns.isEmpty {
            let kindSQL = kinds.map { " AND f.kind IN (" + $0.map { "'\($0.rawValue)'" }.joined(separator: ",") + ")" } ?? ""
            let scopeSQL = eligible.map { $0.isEmpty ? " AND 0" : " AND s.file IN (" + $0.map(String.init).joined(separator: ",") + ")" } ?? ""
            var seen = Set<Int64>()
            try store.db.query("""
                SELECT s.file, s.id, snippet(fts, 1, '«', '»', '…', 12), fts.original, s.kind FROM fts
                JOIN segments s ON s.id = fts.rowid JOIN files f ON f.id = s.file
                WHERE fts MATCH ?\(kindSQL)\(scopeSQL) ORDER BY bm25(fts, 3.0, 1.0) LIMIT 1000
                """, [.text(patterns.joined(separator: " OR "))]) { row in
                let file = row.int(0)
                guard allowed(file) else { return }
                // Text that normalizing changed is quoted as it's written (with its hamza, harakat, joiners).
                let snippet = row.text(3).flatMap { SearchText.snippet($0, terms: terms) } ?? row.text(2)
                if fileKind[file].map({ [FileKind.pdf, .doc].contains($0) }) == true, row.text(4) != SegmentKind.name.rawValue,
                   contentWords[file] == nil { contentWords[file] = (row.int(1), snippet) }
                if words.count < 100, seen.insert(file).inserted { words.append((file, row.int(1), snippet)) }
            }
            if !words.isEmpty {
                let files = words.map { String($0.file) }.joined(separator: ",")
                for pattern in patterns {
                    try store.db.query("""
                        SELECT DISTINCT s.file FROM fts JOIN segments s ON s.id = fts.rowid
                        WHERE fts MATCH ? AND s.file IN (\(files))
                        """, [.text(pattern)]) { coverage[$0.int(0), default: 0] += 1 / Double(patterns.count) }
                }
            }
        }

        // A file qualifies by standing out in meaning, or by containing at least half of the query's words.
        // Score: meaning z + a bonus that grows with word coverage, + 1 for the kind the query asks for.
        // One common word can't beat a strong meaning match; all the words of an exact lookup usually do.
        // (This beat reciprocal-rank fusion on both evals, 2026-10-07: R@1 0.88 vs 0.73 synthetic, 0.86 vs 0.82 real.)
        let lookup = Self.isLookup(terms) || identifier != nil
        let (meaningWeight, wordsWeight) = lookup ? (0.5, wordWeight * 2) : (1, wordWeight)
        let hinted = Self.kindHints(text)
        var candidates = Set(best.filter { $0.value.z >= zGate }.keys)
        for (file, share) in coverage where share >= 0.5 { candidates.insert(file) }
        if candidatePool {
            // Keep independent retrieval routes alive until the content-aware reranker sees them.
            candidates = Set(best.sorted { $0.value.z > $1.value.z }.prefix(80).map(\.key))
            candidates.formUnion(words.prefix(80).map(\.file))
        }
        var scored: [Int64: Double] = [:]
        for file in candidates {
            var score = meaningWeight * max(best[file]?.z ?? 0, 0) + wordsWeight * pow(coverage[file] ?? 0, 1.5)
            if let kind = fileKind[file], hinted.contains(kind) { score += 1 }
            scored[file] = score
        }

        let wordRank = Dictionary(words.enumerated().map { ($0.element.file, ($0.offset + 1, $0.element)) },
                                  uniquingKeysWith: { first, _ in first })
        var hits: [SearchHit] = []
        for (file, score) in scored.sorted(by: { $0.value > $1.value || ($0.value == $1.value && $0.key < $1.key) })
            .prefix(limit) {
            let rank = hits.count
            let semantic = best[file]
            let keyword = wordRank[file]
            // Point at the best meaning segment if it stands out; else at the segment the words matched.
            let useMeaning = semantic.map { $0.z >= zGate || keyword == nil } ?? false
            guard var segmentID = useMeaning ? semantic.map({ rowSegment[$0.row] }) : keyword?.1.segment else { continue }
            var focus: Double?
            if isCode {
                // Where a name is defined is looked for in the first 10 results only: a name used all over a big repo
                // (ggml_tensor) is in hundreds of stretches of every file that has it (2026-10-09, llama.cpp and two
                // more repos: 560 → 100 ms a search; the others take 10–50 ms).
                (segmentID, focus) = try codePlace(file: file, segment: segmentID,
                                                   identifier: rank < 10 ? identifier : nil, query: text, terms: terms,
                                                   wordsHere: keyword?.1.segment == segmentID || identifier != nil)
            }
            var path = "", kind = FileKind.doc, modified = 0.0, size: Int64 = 0, info: [String: String] = [:]
            try store.db.query("SELECT path, kind, mtime, size, info FROM files WHERE id = ?", [.int(file)]) {
                path = $0.text(0) ?? ""
                kind = FileKind(rawValue: $0.text(1) ?? "") ?? .doc
                modified = $0.double(2)
                size = $0.int(3)
                if let json = $0.text(4)?.data(using: .utf8) {
                    info = (try? JSONSerialization.jsonObject(with: json) as? [String: String]) ?? [:]
                }
            }
            var segment = SegmentKind.name, loc: Double?, locEnd: Double?, storedExcerpt: String?
            try store.db.query("SELECT kind, loc, loc_end, excerpt FROM segments WHERE id = ?", [.int(segmentID)]) {
                segment = SegmentKind(rawValue: $0.text(0) ?? "") ?? .name
                loc = $0.isNull(1) ? nil : $0.double(1)
                locEnd = $0.isNull(2) ? nil : $0.double(2)
                storedExcerpt = $0.text(3)
            }
            // Quote the matched words only when they come from the segment we point at, so a PDF hit on page 5
            // never shows page 2's words. A segment with no place and no text of its own (a screenshot's image
            // vector) can borrow them from its file's OCR text, which describes the same picture.
            var snippet = keyword.flatMap { $0.1.segment == segmentID ? $0.1.snippet : nil }
                .flatMap { $0.contains("«") ? excerpt($0, limit: 400) : nil }
            if snippet == nil, storedExcerpt == nil, loc == nil, let match = keyword?.1,
               let text = match.snippet, text.contains("«") {
                var matchedKind: String?
                try store.db.query("SELECT kind FROM segments WHERE id = ?", [.int(match.segment)]) {
                    matchedKind = $0.text(0)
                }
                if matchedKind != SegmentKind.name.rawValue { snippet = excerpt(text, limit: 400) }
            }
            var passages: [SearchPassage] = []
            if [.pdf, .doc].contains(kind) {
                // Keep independent page/passage evidence until the local content model can choose between it.
                let ids = [segmentID, contentWords[file]?.segment].compactMap { $0 }
                for id in ids where !passages.contains(where: { $0.segmentID == id }) {
                    try store.db.query("SELECT kind, loc, excerpt FROM segments WHERE id = ? AND kind != 'name'", [.int(id)]) { row in
                        guard let type = row.text(0).flatMap(SegmentKind.init(rawValue:)) else { return }
                        let marked = contentWords[file].flatMap { $0.segment == id ? $0.snippet : nil }
                        passages.append(SearchPassage(segment: type, segmentID: id, loc: row.isNull(1) ? nil : row.double(1),
                                                      excerpt: (marked ?? row.text(2)).map { excerpt($0, limit: 400) }))
                    }
                }
            }
            hits.append(SearchHit(path: path, kind: kind, score: score, z: semantic?.z, cosine: semantic?.cosine,
                                  keywordRank: keyword?.0, segment: segment, segmentID: segmentID, loc: loc,
                                  locEnd: locEnd,
                                  excerpt: snippet ?? storedExcerpt, modified: modified, size: size, info: info,
                                  focus: focus, passages: passages))
        }
        return hits
    }

    /// Code: the stretch to point at, and the line in it to open at. A name looked up points at the stretch that
    /// defines it, when one does (not the ones that call it). Otherwise the line is the first with the query's words,
    /// when they matched in this stretch; a match by meaning alone opens at the stretch's first line.
    private func codePlace(file: Int64, segment: Int64, identifier: [String]?, query: String, terms: [String],
                           wordsHere: Bool) throws -> (Int64, Double?) {
        let name = query.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "()", with: "")
        if let identifier {
            var best: (segment: Int64, line: Int, strength: Int)?
            try store.db.query("""
                SELECT s.id, s.loc, coalesce(fts.original, fts.body) FROM fts JOIN segments s ON s.id = fts.rowid
                WHERE fts MATCH ? AND s.file = ? ORDER BY s.loc LIMIT 300
                """, [.text(CodeLookup.phrase(identifier)), .int(file)]) { row in
                guard best?.strength ?? 0 < 2, let text = row.text(2),
                      let found = CodeLookup.definition(of: name, in: text, first: Int(row.double(1))) else { return }
                if found.strength > (best?.strength ?? 0) { best = (row.int(0), found.line, found.strength) }
            }
            if let best { return (best.segment, Double(best.line)) }
        }
        guard wordsHere || identifier != nil, let text = try text(ofSegment: segment) else { return (segment, nil) }
        var first = 1
        try store.db.query("SELECT loc FROM segments WHERE id = ?", [.int(segment)]) { first = Int($0.double(0)) }
        let words = identifier == nil ? terms : [name.lowercased()]
        return (segment, CodeLookup.firstLine(with: words, in: text, first: first).map(Double.init))
    }

    /// Codes and IDs ("K7Q2LM", "TRX50") and long numbers ("4815162342": an order, a phone number) mean nothing to an
    /// embedding but everything to keyword search: a query made of them weighs words double and meaning half. Numbers
    /// count since 2026-10-09, when text of digits lost its vectors (`SearchText.hasWords`): a number in a data dump fell
    /// below unrelated meaning matches.
    static func isLookup(_ terms: [String]) -> Bool {
        !terms.isEmpty && terms.allSatisfy {
            $0.contains(where: \.isNumber) && ($0.contains(where: \.isLetter) || $0.count >= 4)
        }
    }

    /// How many of `hits` (best first) are strong: scoring at least `ratio` × the top hit. The rest pass the gates but
    /// trail far behind, and the app folds them under "weaker matches". On both evals (2026-10-07), 0.5 cut the list
    /// from 26.2 to 5.7 results per query and never folded an expected answer.
    public static func strongCount(_ hits: [SearchHit], ratio: Double = 0.5) -> Int {
        guard let top = hits.first?.score, top > 0 else { return hits.count }
        return hits.prefix { $0.score >= top * ratio }.count
    }

    /// Cosine similarity of `query` with every stored vector (all are L2-normalized): a matrix-vector product, done a
    /// block of rows at a time, each block turned into float32 first.
    private func score(_ query: [Float]) -> [Float] {
        let rows = rowFile.count
        var scores = [Float](repeating: 0, count: rows)
        guard let matrix, rows > 0 else { return scores }
        query.withUnsafeBufferPointer { query in
            scores.withUnsafeMutableBufferPointer { scores in
                var row = 0
                while row < rows {
                    let count = min(VectorStorage.blockRows, rows - row)
                    Vectors.floats(fromHalf: matrix.halves + row * Vectors.dimension, count: count * Vectors.dimension,
                                   to: matrix.block)
                    // (count × 768) · (768 × 1)
                    Vectors.scores(of: matrix.block, count: count, query: query.baseAddress!,
                                   into: scores.baseAddress! + row)
                    row += count
                }
            }
        }
        return scores
    }

    /// This query's meaning scores: each vector's cosine similarity minus the average of its modality (text, image and
    /// audio vectors can sit at slightly different levels for the same query), in standard deviations of all of them
    /// together. Within a modality that's the model's own order. Scaling each modality by its own deviation instead
    /// inflated the narrow ones and buried PDF pages under pictures (2026-10-08, on the three evals: 91 → 94 of 105
    /// queries with the right answer first).
    ///
    /// The scale (the averages and the deviation) comes from the vectors in `setsScale` (all by default): `search` leaves
    /// out the later pages of long files, which are scored on it but don't move it. A book's hundreds of pages pulled the
    /// text average down for every query, and documents rose over screenshots everywhere (2026-10-09, the testbed's long
    /// files finished: real eval 24 → 22 of 26 first; 24 with the scale kept).
    static func meaning(_ scores: [Float], _ modality: [Modality], setsScale: [Bool]? = nil) -> [Double] {
        let means = modalityMeans(scores, modality, setsScale: setsScale)
        let centered = zip(scores, modality).map { Double($0) - means[$1, default: 0] }
        var count = 0.0, sum = 0.0
        for row in centered.indices where setsScale?[row] ?? true {
            count += 1
            sum += centered[row]
        }
        let mean = sum / max(count, 1)
        var squares = 0.0
        for row in centered.indices where setsScale?[row] ?? true {
            squares += (centered[row] - mean) * (centered[row] - mean)
        }
        let deviation = max((squares / max(count, 1)).squareRoot(), 0.02)
        return centered.map { ($0 - mean) / deviation }
    }

    /// The average score of each modality for this query. Small groups (< 20 vectors) take the average of all.
    static func modalityMeans(_ scores: [Float], _ modality: [Modality], setsScale: [Bool]? = nil) -> [Modality: Double] {
        var sum: [Modality: Double] = [:], count: [Modality: Int] = [:]
        for row in scores.indices where setsScale?[row] ?? true {
            sum[modality[row], default: 0] += Double(scores[row])
            count[modality[row], default: 0] += 1
        }
        let all = sum.values.reduce(0, +) / Double(max(count.values.reduce(0, +), 1))
        var out: [Modality: Double] = [:]
        for modality in Modality.allCases {
            if let n = count[modality], n >= 20 {
                out[modality] = sum[modality]! / Double(n)
            } else {
                out[modality] = all
            }
        }
        return out
    }

    /// The text of a page, a document's passage or a screenshot's OCR, as it's written: the preview shows the part of a
    /// document that matched.
    public func context(ofSegment id: Int64) throws -> String? {
        var text: String?
        try store.db.query("""
            SELECT coalesce(fts.original, fts.body) FROM segments s JOIN files f ON f.id = s.file
            JOIN fts ON fts.rowid = s.id WHERE s.file = (SELECT file FROM segments WHERE id = ?)
            AND f.kind IN ('pdf', 'doc') AND s.kind != 'name'
            ORDER BY s.loc, s.id LIMIT 1
            """, [.int(id)]) { text = $0.text(0).map { String($0.prefix(700)) } }
        return text
    }

    /// Verify identity and read both passages in one SQLite snapshot; segment IDs may be reused after reindexing.
    public func passage(id: Int64, path: String, modified: Double, size: Int64, kind: String,
                        loc: Double?) throws -> (text: String?, context: String?)? {
        var result: (text: String?, context: String?)?
        try store.db.query("""
            SELECT coalesce(fts.original, fts.body),
              (SELECT coalesce(opening.original, opening.body) FROM segments first
               JOIN fts opening ON opening.rowid = first.id
               WHERE first.file = f.id AND f.kind IN ('pdf', 'doc') AND first.kind != 'name'
               ORDER BY first.loc, first.id LIMIT 1)
            FROM segments s JOIN files f ON f.id = s.file LEFT JOIN fts ON fts.rowid = s.id
            WHERE s.id = ? AND f.path = ? AND f.mtime = ? AND f.size = ? AND s.kind = ? AND s.loc IS ?
            """, [.int(id), .text(path), .double(modified), .int(size), .text(kind), .optional(loc)]) { row in
                result = (row.text(0), row.text(1).map { String($0.prefix(700)) })
            }
        return result
    }

    public func text(ofSegment id: Int64) throws -> String? {
        var text: String?
        try store.db.query("SELECT coalesce(original, body) FROM fts WHERE rowid = ?", [.int(id)]) { text = $0.text(0) }
        return text
    }

    static let stopwords: Set<String> = [
        "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or", "my", "me", "that", "this",
        "these", "those", "from", "about", "where", "what", "which", "who", "when", "is", "was", "are", "were", "be",
        "it", "its", "some", "any", "find", "show", "file", "files", "photo", "photos", "picture", "image", "images",
        "screenshot", "screenshots", "video", "videos", "pdf", "document", "documents", "recording",
        // Bengali and Arabic (normalized, as `terms` sees them)
        "এবং", "ও", "এই", "সেই", "একটি", "আমার", "থেকে", "জন্য", "সাথে", "মধ্যে", "কোথায়", "কোন", "কী", "কি", "যে",
        "ছবি", "স্ক্রিনশট", "ভিডিও", "ফাইল", "পিডিএফ",
        "في", "من", "على", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي", "اين", "ما",
        "صورة", "صور", "لقطة", "شاشة", "فيديو", "ملف", "مستند",
    ]

    /// The content words of a query, normalized as keyword search keeps its text (`SearchText`). Kind words
    /// ("screenshot", "video") and stopwords are dropped: they describe what to look for, not what's in it. Words of
    /// two letters or more count; a Bengali letter with its vowel sign ("মা") is two.
    public static func terms(_ text: String) -> [String] {
        var seen = Set<String>()
        return SearchText.normalized(text).lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.unicodeScalars.count >= 2 && !stopwords.contains($0) && seen.insert($0).inserted }
    }

    /// FTS5 patterns for the query's words: quoted, and as prefixes for the last word while it's being typed and for
    /// words of languages that attach endings (`SearchText.inflects`). `search` makes a word that's in no file a
    /// prefix too.
    static func patterns(_ terms: [String], prefixLast: Bool) -> [String] {
        terms.enumerated().map { index, term in
            let prefix = (prefixLast && index == terms.count - 1) || SearchText.inflects(term)
            return "\"\(term)\"" + (prefix ? "*" : "")
        }
    }

    /// Whether keyword search finds `pattern` in any file.
    private func isIndexed(_ pattern: String) throws -> Bool {
        var found = false
        try store.db.query("SELECT 1 FROM fts WHERE fts MATCH ? LIMIT 1", [.text(pattern)]) { _ in found = true }
        return found
    }

    /// The query's words as an FTS5 OR-query.
    public static func ftsQuery(_ text: String, prefixLast: Bool = false) -> String? {
        let words = terms(text)
        guard !words.isEmpty else { return nil }
        return patterns(words, prefixLast: prefixLast).joined(separator: " OR ")
    }

    static let kindWords: [String: FileKind] = [
        "screenshot": .screenshot, "screenshots": .screenshot, "photo": .image, "photos": .image, "picture": .image,
        "pictures": .image, "image": .image, "images": .image, "pdf": .pdf, "pdfs": .pdf, "paper": .pdf,
        "papers": .pdf, "document": .doc, "documents": .doc, "note": .doc, "notes": .doc, "video": .video,
        "videos": .video, "clip": .video, "movie": .video, "audio": .audio, "song": .audio, "podcast": .audio,
        "voice": .audio, "sound": .audio,
        "স্ক্রিনশট": .screenshot, "ছবি": .image, "পিডিএফ": .pdf, "নোট": .doc, "ভিডিও": .video, "অডিও": .audio,
        "গান": .audio, "রেকর্ডিং": .audio,
        "لقطة": .screenshot, "صورة": .image, "صور": .image, "مستند": .doc, "ملاحظات": .doc, "فيديو": .video,
        "مقطع": .video, "صوت": .audio, "تسجيل": .audio, "اغنية": .audio,
    ]

    /// Kinds the query asks for ("…in a video", "screenshot of…", "ভিডিওতে"): a soft boost, not a filter. Bengali
    /// attaches case endings, so a Bengali kind word also counts at the start of a longer word.
    static func kindHints(_ text: String) -> Set<FileKind> {
        Set(SearchText.normalized(text).lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted)
            .compactMap { word in
                kindWords[word] ?? kindWords.first { key, _ in
                    SearchText.inflects(key) && key.unicodeScalars.count >= 3 && word.hasPrefix(key)
                }?.value
            })
    }
}
