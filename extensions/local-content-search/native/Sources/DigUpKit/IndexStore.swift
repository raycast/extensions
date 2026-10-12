import Foundation

/// A file as the index knows it.
public struct FileRecord: Sendable {
    public let id: Int64
    public let path: String
    public let kind: FileKind
    public let size: Int64
    public let mtime: Double
    public let inode: UInt64
    public let device: UInt64
    public let state: String
}

/// The on-disk index: one SQLite file with files, their segments (with fp16 vectors), and an FTS5 table.
///
/// Vectors live in the same database as everything else, so a crash can never leave them out of step with the
/// rows that describe them. At this scale (~20k vectors, ~30 MB) brute-force search over an in-memory copy is a
/// few milliseconds; no vector database needed.
public final class IndexStore {
    public let directory: URL
    public let db: Database
    static let schemaVersion: Int64 = 5

    /// Keyword search's tokenizer. Marks (M*) count as letters, so Bengali vowel signs and Arabic harakat stay inside
    /// their words: by default SQLite splits on them ("কলকাতায়" became "কলক", "ত", "য").
    static let tokenizer = "porter unicode61 remove_diacritics 2 categories 'L* N* Co M*'"
    /// Keyword search's table: words are matched in `body`, normalized (`SearchText`); `original` keeps the text as it's
    /// written when normalizing changed it (Arabic with hamza or harakat, Bengali with joiners), for showing it.
    static let ftsColumns = "name, body, original UNINDEXED, tokenize = \"\(tokenizer)\""

    /// When set, `pending`, `pendingCount` and `counts` see only files under these folders: the app's helper sets the
    /// folders that are connected right now, so files on an unplugged drive neither fail nor count as waiting.
    public var scope: [String]? {
        didSet {
            guard let scope else { (scopeSQL, scopeValues) = ("", []); return }
            scopeSQL = scope.isEmpty ? " AND 0"
                : " AND (" + scope.map { _ in "(path >= ? AND path < ?)" }.joined(separator: " OR ") + ")"
            scopeValues = scope.flatMap { root -> [SQLValue] in
                let prefix = root.hasSuffix("/") ? root : root + "/"
                return [.text(prefix), .text(prefix + "\u{10FFFF}")]
            }
        }
    }
    private var scopeSQL = ""
    private var scopeValues: [SQLValue] = []

    /// The main index's file in the index folder.
    public static let mainFile = "index.sqlite"
    /// The code index (`IndexOptions.code`) is a file of its own beside it: code search never moves the rest (its
    /// meaning scale, its keyword results, the vectors search keeps in memory), and turning it off deletes one file.
    public static let codeFile = "code.sqlite"

    public let file: URL

    public init(directory: URL, file name: String = IndexStore.mainFile) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        self.directory = directory
        file = directory.appendingPathComponent(name)
        db = try Database(path: file.path)
        try migrate()
    }

    /// Bytes on disk: the database and its write-ahead log.
    public static func size(of file: URL) -> Int64 {
        [file.path, file.path + "-wal"].reduce(0) { total, path in
            total + ((try? FileManager.default.attributesOfItem(atPath: path)[.size] as? Int64) ?? 0)
        }
    }

    /// Schema changes ship as one migration each, and the layout below was designed to need as few as possible
    /// (every forced migration is paid for by every user).
    private func migrate() throws {
        var version: Int64 = 0
        try db.query("PRAGMA user_version") { version = $0.int(0) }
        guard version <= Self.schemaVersion else {
            throw Database.Failure(message: "this index was made by a newer DigUp (schema \(version))")
        }
        guard version < Self.schemaVersion else { return }
        // The app and its helper can open the index at the same moment: one migrates while the other waits for it (up
        // to a minute, not the usual 5 s), then sees it done.
        try db.execute("PRAGMA busy_timeout = 60000")
        defer { try? db.execute("PRAGMA busy_timeout = 5000") }
        try db.transaction {
            try db.query("PRAGMA user_version") { version = $0.int(0) }
            if version == 0 { try create() }
            if version == 1 { try migrateKeywordSearch() }
            if (1...2).contains(version) { try migrateScreenshotText() }
            if (1...3).contains(version) { try migrateVectorNames() }
            if (1...4).contains(version) { try migrateLongFiles() }
        }
    }

    private func create() throws {
        try db.execute("""
            CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE files(
                id INTEGER PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                size INTEGER NOT NULL,
                mtime REAL NOT NULL,
                inode INTEGER NOT NULL,
                device INTEGER NOT NULL,
                state TEXT NOT NULL DEFAULT 'pending',   -- pending | done | partial | skipped | failed
                detail TEXT,                              -- why skipped/failed, or how far a long file has been read
                info TEXT,                                -- JSON: pixels, pages, duration, date taken; read_to/read_end
                indexed_at REAL
            );
            CREATE INDEX files_inode ON files(device, inode);
            CREATE INDEX files_state ON files(state, kind);
            CREATE TABLE segments(
                id INTEGER PRIMARY KEY,
                file INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
                kind TEXT NOT NULL,       -- SegmentKind
                modality TEXT NOT NULL,   -- Modality of the vector ('none' when there is no vector)
                loc REAL,                 -- PDF page number, or start second for audio/video
                loc_end REAL,
                excerpt TEXT,
                vec BLOB                  -- 768 × float16, L2-normalized
            );
            CREATE INDEX segments_file ON segments(file);
            CREATE VIRTUAL TABLE fts USING fts5(\(Self.ftsColumns));
            PRAGMA user_version = \(Self.schemaVersion);
            """)
    }

    /// Schema 1 → 2: keyword search with whole Bengali and Arabic words (`tokenizer`) over normalized text
    /// (`SearchText`). The words are rebuilt from what's stored, without reading any file. PDFs whose text layer came
    /// out garbled (`PageTextProblem`) are queued again, to be read as pictures or by OCR.
    private func migrateKeywordSearch() throws {
        try db.execute("CREATE VIRTUAL TABLE fts_new USING fts5(\(Self.ftsColumns))")
        // Row by row: an index can hold tens of megabytes of text, and the app may be the one migrating.
        try db.query("SELECT rowid, name, body FROM fts") { row in
            let body = row.text(2) ?? ""
            try db.run("INSERT INTO fts_new(rowid, name, body, original) VALUES(?, ?, ?, ?)",
                       [.int(row.int(0)), .text(SearchText.normalized(row.text(1) ?? ""))] + Self.keywordText(body))
        }
        var garbled = Set<Int64>()
        try db.query("""
            SELECT s.file, fts.body FROM fts JOIN segments s ON s.id = fts.rowid JOIN files f ON f.id = s.file
            WHERE f.kind = 'pdf' AND s.kind IN ('page', 'page_image')
            """) { row in
            if PageTextProblem.check(row.text(1) ?? "") != nil { garbled.insert(row.int(0)) }
        }
        try db.execute("DROP TABLE fts; ALTER TABLE fts_new RENAME TO fts; PRAGMA user_version = 2;")
        for file in garbled { try requeue(file) }
    }

    /// Schema 2 → 3: a screenshot's OCR text is for keyword search only, and its meaning comes from the picture. The
    /// text vectors made screenshots outrank better matches in the evals; they go, nothing is read again.
    private func migrateScreenshotText() throws {
        try db.execute("UPDATE segments SET vec = NULL, modality = 'none' WHERE kind = 'ocr'; PRAGMA user_version = 3;")
    }

    /// Schema 3 → 4: indexes name their vectors by a vector version, not by the llama.cpp build that made them, so a
    /// llama.cpp update that leaves the vectors alone keeps the index (`LlamaEmbedder.vectorVersion`). Every index so
    /// far comes from b11461, which made version 1. Nothing is embedded again.
    private func migrateVectorNames() throws {
        try db.execute("""
            UPDATE meta SET value = replace(value, ' llama.cpp-b11461-metal ', ' llama.cpp-vectors1 ')
            WHERE key IN ('fingerprint', 'vector_source');
            PRAGMA user_version = 4;
            """)
    }

    /// Schema 4 → 5: long files are finished after the first pass (`Indexer.finishLongFiles`), from where they stopped,
    /// which until now was always page 30 of a PDF over 50 pages (already `partial`) and chunk 40 of a document (`done`,
    /// with 40 chunks). Those documents become `partial`; how many chunks they have is guessed from their length until
    /// the later pass counts them. And text that's mostly digits loses its vectors (`SearchText.hasWords`), as it
    /// would if it were indexed now. Nothing is read or embedded here.
    private func migrateLongFiles() throws {
        var digits: [Int64] = []
        try db.query("""
            SELECT s.id, coalesce(fts.original, fts.body) FROM segments s JOIN fts ON fts.rowid = s.id
            WHERE s.kind IN ('page', 'chunk') AND s.vec IS NOT NULL
            """) { row in
            if !SearchText.hasWords(row.text(1) ?? "") { digits.append(row.int(0)) }
        }
        for id in digits { try db.run("UPDATE segments SET vec = NULL, modality = 'none' WHERE id = ?", [.int(id)]) }
        let limits = IndexOptions()
        try db.execute("""
            UPDATE files SET detail = 'read to page 30', info = json_set(info, '$.read_to', '30', '$.read_end',
                CAST(MIN(CAST(json_extract(info, '$.pages') AS INTEGER), \(limits.maxPages)) AS TEXT))
            WHERE kind = 'pdf' AND state = 'partial' AND info IS NOT NULL;
            UPDATE files SET state = 'partial', detail = 'read to chunk 40', info = json_set(info, '$.read_to', '40',
                '$.read_end', CAST(MIN(MAX(41, (CAST(json_extract(info, '$.chars') AS INTEGER) + 1599) / 1600),
                                       \(limits.maxChunks)) AS TEXT))
            WHERE kind = 'doc' AND state = 'done' AND json_extract(info, '$.chunks') = '40';
            PRAGMA user_version = 5;
            """)
    }
    // MARK: Meta

    public func meta(_ key: String) throws -> String? {
        var value: String?
        try db.query("SELECT value FROM meta WHERE key = ?", [.text(key)]) { value = $0.text(0) }
        return value
    }

    public func setMeta(_ key: String, _ value: String?) throws {
        if let value {
            try db.run("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                       [.text(key), .text(value)])
        } else {
            try db.run("DELETE FROM meta WHERE key = ?", [.text(key)])
        }
    }

    // MARK: Files

    static let fileColumns = "id, path, kind, size, mtime, inode, device, state"

    static func record(_ row: Statement) -> FileRecord {
        FileRecord(id: row.int(0), path: row.text(1) ?? "", kind: FileKind(rawValue: row.text(2) ?? "") ?? .doc,
                   size: row.int(3), mtime: row.double(4), inode: UInt64(bitPattern: row.int(5)),
                   device: UInt64(bitPattern: row.int(6)), state: row.text(7) ?? "pending")
    }

    /// Every file under one of `roots`.
    public func files(under roots: [String]) throws -> [FileRecord] {
        var out: [FileRecord] = []
        // A folder inside another one listed is already covered (each file once).
        for root in roots where !roots.contains(where: { FolderSelection.isInside(root, $0) }) {
            let prefix = root.hasSuffix("/") ? root : root + "/"
            // A range on the UNIQUE path index: everything that starts with `prefix`.
            try db.query("SELECT \(Self.fileColumns) FROM files WHERE path >= ? AND path < ?",
                         [.text(prefix), .text(prefix + "\u{10FFFF}")]) { out.append(Self.record($0)) }
        }
        return out
    }

    /// Adds a file (pending) and returns its id.
    @discardableResult
    public func insert(_ file: Candidate) throws -> Int64 {
        try db.run("INSERT INTO files(path, kind, size, mtime, inode, device) VALUES(?, ?, ?, ?, ?, ?)",
                   [.text(file.path), .text(file.kind.rawValue), .int(file.size), .double(file.mtime),
                    .int(Int64(bitPattern: file.inode)), .int(Int64(bitPattern: file.device))])
        let id = db.lastInsertID
        try addNameRow(file: id, path: file.path)
        return id
    }

    /// The file changed on disk: drop what was extracted from it and queue it again.
    public func requeue(_ id: Int64, as file: Candidate) throws {
        try deleteSegments(of: id, keepingName: true)
        try db.run("""
            UPDATE files SET kind = ?, size = ?, mtime = ?, inode = ?, device = ?, state = 'pending', detail = NULL,
                info = NULL, indexed_at = NULL WHERE id = ?
            """, [.text(file.kind.rawValue), .int(file.size), .double(file.mtime), .int(Int64(bitPattern: file.inode)),
                  .int(Int64(bitPattern: file.device)), .int(id)])
    }

    /// Extract and embed the file again, as it is (after a better way to read it arrived).
    func requeue(_ id: Int64) throws {
        try deleteSegments(of: id, keepingName: true)
        try db.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL WHERE id = ?",
                   [.int(id)])
    }

    /// Same inode, size and date at a new path: a move or rename. Only the path changes; nothing is re-embedded.
    /// (Screenshot tools move screenshots into project folders all the time.)
    public func move(_ id: Int64, to path: String) throws {
        try db.run("UPDATE files SET path = ? WHERE id = ?", [.text(path), .int(id)])
        try db.run("""
            UPDATE fts SET name = ?, body = ? WHERE rowid IN (SELECT id FROM segments WHERE file = ? AND kind = 'name')
            """, [.text(SearchText.normalized(Self.nameText(path))), .text(SearchText.normalized(Self.folderText(path))),
                  .int(id)])
    }

    public func delete(_ id: Int64) throws {
        try db.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ?)", [.int(id)])
        try db.run("DELETE FROM files WHERE id = ?", [.int(id)])
    }

    /// Removes every file that isn't under one of `roots` (folders taken out of the app). Returns how many went.
    @discardableResult
    public func prune(keepingUnder roots: [String]) throws -> Int {
        let prefixes = roots.map { $0.hasSuffix("/") ? $0 : $0 + "/" }
        var gone: [Int64] = []
        try db.query("SELECT id, path FROM files") { row in
            let path = row.text(1) ?? ""
            if !prefixes.contains(where: { path.hasPrefix($0) }) { gone.append(row.int(0)) }
        }
        guard !gone.isEmpty else { return 0 }
        try db.transaction {
            for id in gone { try delete(id) }
        }
        return gone.count
    }

    /// Queues every file again and forgets the fingerprint (after the model or settings changed).
    public func resetAll() throws {
        try db.transaction {
            try db.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE kind != 'name')")
            try db.run("DELETE FROM segments WHERE kind != 'name'")
            try db.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL")
            try setMeta("fingerprint", nil)
        }
    }

    /// Files waiting to be embedded, in indexing order; `only` narrows it to some files (just-added ones).
    public func pending(limit: Int?, only ids: Set<Int64>? = nil) throws -> [FileRecord] {
        var out: [FileRecord] = []
        if let ids, ids.isEmpty { return out }
        let filter = ids.map { " AND id IN (\($0.map(String.init).joined(separator: ",")))" } ?? ""
        try db.query("""
            SELECT \(Self.fileColumns) FROM files WHERE state = 'pending'\(filter)\(scopeSQL)
            ORDER BY \(FileKind.indexingOrderSQL), mtime DESC LIMIT ?
            """, scopeValues + [.int(Int64(limit ?? -1))]) { out.append(Self.record($0)) }
        return out
    }

    public func pendingCount() throws -> Int {
        var count = 0
        try db.query("SELECT COUNT(*) FROM files WHERE state = 'pending'\(scopeSQL)", scopeValues) {
            count = Int($0.int(0))
        }
        return count
    }

    /// Long files with pages or chunks still to read after their first step, in indexing order (`pending`'s).
    public func unfinished() throws -> [FileRecord] {
        var out: [FileRecord] = []
        try db.query("""
            SELECT \(Self.fileColumns) FROM files WHERE state = 'partial'\(scopeSQL)
            ORDER BY \(FileKind.indexingOrderSQL), mtime DESC
            """, scopeValues) { out.append(Self.record($0)) }
        return out
    }

    /// How many long files are unfinished, and how many of their pages and chunks are left to read.
    public func unfinishedCount() throws -> (files: Int, left: Int) {
        var count = (files: 0, left: 0)
        try db.query("""
            SELECT COUNT(*), SUM(MAX(0, CAST(json_extract(info, '$.read_end') AS INTEGER)
                                      - CAST(json_extract(info, '$.read_to') AS INTEGER)))
            FROM files WHERE state = 'partial'\(scopeSQL)
            """, scopeValues) { count = (Int($0.int(0)), Int($0.int(1))) }
        return count
    }

    /// What indexing learned about a file (`finish`'s `info`).
    public func info(of id: Int64) throws -> [String: String] {
        var info: [String: String] = [:]
        try db.query("SELECT info FROM files WHERE id = ?", [.int(id)]) { row in
            if let json = row.text(0)?.data(using: .utf8) {
                info = (try? JSONSerialization.jsonObject(with: json) as? [String: String]) ?? [:]
            }
        }
        return info
    }

    /// The last page or chunk stored for a file (where a long file's reading got to, when its info doesn't say).
    func lastPlace(of id: Int64) throws -> Int? {
        var last: Int?
        try db.query("SELECT MAX(loc) FROM segments WHERE file = ? AND kind IN ('page', 'page_image', 'chunk')",
                     [.int(id)]) { last = $0.isNull(0) ? nil : Int($0.double(0)) }
        return last
    }

    public func finish(_ id: Int64, state: String, detail: String? = nil, info: [String: String] = [:]) throws {
        let json = info.isEmpty ? nil : (try? JSONSerialization.data(withJSONObject: info, options: [.sortedKeys]))
            .flatMap { String(data: $0, encoding: .utf8) }
        try db.run("UPDATE files SET state = ?, detail = ?, info = ?, indexed_at = ? WHERE id = ?",
                   [.text(state), .optional(detail), .optional(json), .double(Date().timeIntervalSince1970), .int(id)])
    }

    // MARK: Segments

    /// Adds a segment; `text` goes into keyword search (normalized, see `SearchText`), `vector` into meaning search.
    public func addSegment(file: Int64, kind: SegmentKind, modality: Modality, loc: Double? = nil, locEnd: Double? = nil,
                           excerpt: String? = nil, text: String? = nil, vector: [Float]? = nil) throws {
        try db.run("INSERT INTO segments(file, kind, modality, loc, loc_end, excerpt, vec) VALUES(?, ?, ?, ?, ?, ?, ?)",
                   [.int(file), .text(kind.rawValue), .text(vector == nil ? Modality.none.rawValue : modality.rawValue),
                    .optional(loc), .optional(locEnd), .optional(excerpt),
                    vector.map { .blob(Vectors.half($0)) } ?? .null])
        if let text, !text.isEmpty {
            try db.run("INSERT INTO fts(rowid, name, body, original) VALUES(?, '', ?, ?)",
                       [.int(db.lastInsertID)] + Self.keywordText(text))
        }
    }

    /// `body` and `original` for keyword search: the normalized text, and the text as written if that differs.
    static func keywordText(_ text: String) -> [SQLValue] {
        let normalized = SearchText.normalized(text)
        return [.text(normalized), normalized == text ? .null : .text(text)]
    }

    private func addNameRow(file: Int64, path: String) throws {
        try db.run("INSERT INTO segments(file, kind, modality) VALUES(?, 'name', 'none')", [.int(file)])
        try db.run("INSERT INTO fts(rowid, name, body) VALUES(?, ?, ?)",
                   [.int(db.lastInsertID), .text(SearchText.normalized(Self.nameText(path))),
                    .text(SearchText.normalized(Self.folderText(path)))])
    }

    private func deleteSegments(of file: Int64, keepingName: Bool) throws {
        let filter = keepingName ? "AND kind != 'name'" : ""
        try db.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ? \(filter))", [.int(file)])
        try db.run("DELETE FROM segments WHERE file = ? \(filter)", [.int(file)])
    }

    /// "Screenshot 2026-10-01 at 9.41.07 PM.png" → searchable words.
    static func nameText(_ path: String) -> String {
        (path as NSString).lastPathComponent
    }

    /// The folders a file sits in, relative to the home folder ("Downloads Invoices"), as low-weight keywords.
    static func folderText(_ path: String) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        var folder = (path as NSString).deletingLastPathComponent
        if folder.hasPrefix(home) { folder = String(folder.dropFirst(home.count)) }
        return folder.split(separator: "/").joined(separator: " ")
    }

    // MARK: Stats

    public struct Counts: Sendable {
        public var byKindAndState: [String: [String: Int]] = [:]
        public var vectors = 0
        public var segments = 0
        /// Long files still being read (`unfinishedCount`), and their pages and chunks left.
        public var unfinished = 0
        public var left = 0
    }

    public func counts() throws -> Counts {
        var counts = Counts()
        try db.query("SELECT kind, state, COUNT(*) FROM files WHERE 1\(scopeSQL) GROUP BY kind, state", scopeValues) {
            counts.byKindAndState[$0.text(0) ?? "?", default: [:]][$0.text(1) ?? "?"] = Int($0.int(2))
        }
        (counts.unfinished, counts.left) = try unfinishedCount()
        let inScope = scope == nil ? "" : " AND file IN (SELECT id FROM files WHERE 1\(scopeSQL))"
        try db.query("SELECT COUNT(*), COUNT(vec) FROM segments WHERE kind != 'name'\(inScope)", scopeValues) {
            counts.segments = Int($0.int(0))
            counts.vectors = Int($0.int(1))
        }
        return counts
    }
}
