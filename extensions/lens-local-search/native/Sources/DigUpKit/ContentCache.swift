import Foundation

/// Reusable extraction and embeddings, independent of the file locations in either index.
final class ContentCache {
    private let db: Database
    init(directory: URL) throws {
        db = try Database(path: directory.appendingPathComponent("content.sqlite").path)
        try db.execute("""
            CREATE TABLE IF NOT EXISTS objects(key TEXT PRIMARY KEY, info TEXT NOT NULL, detail TEXT, used REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS pieces(object TEXT NOT NULL REFERENCES objects(key) ON DELETE CASCADE,
                kind TEXT NOT NULL, modality TEXT NOT NULL, loc REAL, loc_end REAL, excerpt TEXT, vec BLOB, body TEXT, original TEXT);
            CREATE INDEX IF NOT EXISTS pieces_object ON pieces(object);
            """)
        // Recomputable local cache: bound retained versions rather than grow with every edit forever.
        try db.run("DELETE FROM objects WHERE key NOT IN (SELECT key FROM objects ORDER BY used DESC LIMIT 1000)")
    }

    static func key(_ file: FileRecord, fingerprint: String) throws -> String? {
        // Hash only a file already selected for content work; never hydrate a cloud placeholder.
        guard file.size <= 64 << 20, let info = FileSystem.info(of: file.path), info.isRegular, !info.dataless,
              info.size == file.size, abs(info.mtime - file.mtime) < 0.001 else { return nil }
        let title = file.kind == .code ? CodeExtractor.place(of: file.path).title : URL(fileURLWithPath: file.path).deletingPathExtension().lastPathComponent
        let hash = try ModelFiles.sha256(of: URL(fileURLWithPath: file.path))
        guard let after = FileSystem.info(of: file.path), after.size == info.size, after.mtime == info.mtime,
              after.inode == info.inode else { return nil }
        return "\(fingerprint)\n\(file.kind.rawValue)\n\(title)\n\(hash)"
    }

    func restore(_ key: String, file: FileRecord, into store: IndexStore) throws -> Bool {
        var info: String?, detail: String?
        try db.query("SELECT info, detail FROM objects WHERE key = ?", [.text(key)]) { info = $0.text(0); detail = $0.text(1) }
        guard let info, let bytes = info.data(using: .utf8), var fields = try? JSONDecoder().decode([String: String].self, from: bytes) else { return false }
        if file.kind == .code { fields["repo"] = CodeExtractor.place(of: file.path).repo }
        try store.db.transaction {
            try store.clearContent(file.id)
            try db.query("SELECT kind,modality,loc,loc_end,excerpt,vec,body,original FROM pieces WHERE object = ?", [.text(key)]) { row in
                try store.db.run("INSERT INTO segments(file,kind,modality,loc,loc_end,excerpt,vec) VALUES(?,?,?,?,?,?,?)",
                    [.int(file.id), .text(row.text(0)!), .text(row.text(1)!), row.isNull(2) ? .null : .double(row.double(2)),
                     row.isNull(3) ? .null : .double(row.double(3)), row.text(4).map(SQLValue.text) ?? .null, row.blob(5).map(SQLValue.blob) ?? .null])
                if let body = row.text(6) {
                    try store.db.run("INSERT INTO fts(rowid,name,body,original) VALUES(?,'',?,?)", [.int(store.db.lastInsertID), .text(body), row.text(7).map(SQLValue.text) ?? .null])
                }
            }
            try store.finish(file.id, state: "done", detail: detail, info: fields)
        }
        try? db.run("UPDATE objects SET used = ? WHERE key = ?", [.double(Date().timeIntervalSince1970), .text(key)])
        return true
    }

    func save(_ key: String, file: FileRecord, from store: IndexStore) throws {
        var state = "", info = "{}", detail: String?
        try store.db.query("SELECT state,info,detail FROM files WHERE id = ?", [.int(file.id)]) { state = $0.text(0) ?? ""; info = $0.text(1) ?? "{}"; detail = $0.text(2) }
        guard state == "done" else { return }  // Partial/failed results must never become reusable completed objects.
        var bytes: Int64 = 0
        try store.db.query("SELECT COALESCE(SUM(COALESCE(length(s.vec),0)+COALESCE(length(s.excerpt),0)+COALESCE(length(f.body),0)+COALESCE(length(f.original),0)+64),0) FROM segments s LEFT JOIN fts f ON f.rowid=s.id WHERE s.file=? AND s.kind!='name'", [.int(file.id)]) { bytes = $0.int(0) }
        guard bytes <= 262_144 else { return }
        try db.transaction {
            try db.run("INSERT OR REPLACE INTO objects(key,info,detail,used) VALUES(?,?,?,?)", [.text(key), .text(info), detail.map(SQLValue.text) ?? .null, .double(Date().timeIntervalSince1970)])
            try store.db.query("""
                SELECT s.kind,s.modality,s.loc,s.loc_end,s.excerpt,s.vec,f.body,f.original
                FROM segments s LEFT JOIN fts f ON f.rowid = s.id WHERE s.file = ? AND s.kind != 'name'
                """, [.int(file.id)]) { row in
                try db.run("INSERT INTO pieces(object,kind,modality,loc,loc_end,excerpt,vec,body,original) VALUES(?,?,?,?,?,?,?,?,?)",
                    [.text(key), .text(row.text(0)!), .text(row.text(1)!), row.isNull(2) ? .null : .double(row.double(2)),
                     row.isNull(3) ? .null : .double(row.double(3)), row.text(4).map(SQLValue.text) ?? .null,
                     row.blob(5).map(SQLValue.blob) ?? .null, row.text(6).map(SQLValue.text) ?? .null, row.text(7).map(SQLValue.text) ?? .null])
            }
        }
    }
}
