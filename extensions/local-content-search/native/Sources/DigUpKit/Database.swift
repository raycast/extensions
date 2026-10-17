import Foundation
import SQLite3

/// A thin wrapper over the system SQLite (3.51 on macOS 26, FTS5 built in). One connection, used from one thread.
public final class Database {
    public struct Failure: Error, CustomStringConvertible {
        public let message: String
        public var description: String { message }
    }

    let handle: OpaquePointer

    public init(path: String) throws {
        var db: OpaquePointer?
        guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, nil) == SQLITE_OK, let db else {
            let message = db.map { String(cString: sqlite3_errmsg($0)) } ?? "cannot open \(path)"
            sqlite3_close(db)
            throw Failure(message: message)
        }
        handle = db
        sqlite3_busy_timeout(db, 5000)
        try execute("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;")
    }

    deinit { sqlite3_close_v2(handle) }

    public func execute(_ sql: String) throws {
        var error: UnsafeMutablePointer<CChar>?
        guard sqlite3_exec(handle, sql, nil, nil, &error) == SQLITE_OK else {
            let message = error.map { String(cString: $0) } ?? errorMessage
            sqlite3_free(error)
            throw Failure(message: "\(message) (in: \(sql.prefix(120)))")
        }
    }

    /// Runs `sql` with `values` bound and calls `row` for each result row.
    public func query(_ sql: String, _ values: [SQLValue] = [], row: (Statement) throws -> Void = { _ in }) throws {
        let statement = try Statement(self, sql)
        try statement.bind(values)
        while try statement.step() { try row(statement) }
    }

    public func run(_ sql: String, _ values: [SQLValue] = []) throws { try query(sql, values) }

    @discardableResult
    public func transaction<T>(_ body: () throws -> T) throws -> T {
        try execute("BEGIN IMMEDIATE")
        do {
            let result = try body()
            try execute("COMMIT")
            return result
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    public var lastInsertID: Int64 { sqlite3_last_insert_rowid(handle) }
    var errorMessage: String { String(cString: sqlite3_errmsg(handle)) }
}

public enum SQLValue {
    case int(Int64), double(Double), text(String), blob(Data), null

    static func optional(_ text: String?) -> SQLValue { text.map { .text($0) } ?? .null }
    static func optional(_ number: Double?) -> SQLValue { number.map { .double($0) } ?? .null }
}

public final class Statement {
    private let statement: OpaquePointer
    private let db: Database

    init(_ db: Database, _ sql: String) throws {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db.handle, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw Database.Failure(message: "\(db.errorMessage) (in: \(sql.prefix(160)))")
        }
        self.statement = statement
        self.db = db
    }

    deinit { sqlite3_finalize(statement) }

    func bind(_ values: [SQLValue]) throws {
        for (offset, value) in values.enumerated() {
            let index = Int32(offset + 1)
            let status: Int32
            switch value {
            case .int(let number): status = sqlite3_bind_int64(statement, index, number)
            case .double(let number): status = sqlite3_bind_double(statement, index, number)
            case .text(let text): status = sqlite3_bind_text(statement, index, text, -1, transient)
            case .blob(let data):
                status = data.withUnsafeBytes { sqlite3_bind_blob(statement, index, $0.baseAddress, Int32($0.count), transient) }
            case .null: status = sqlite3_bind_null(statement, index)
            }
            guard status == SQLITE_OK else { throw Database.Failure(message: db.errorMessage) }
        }
    }

    func step() throws -> Bool {
        switch sqlite3_step(statement) {
        case SQLITE_ROW: return true
        case SQLITE_DONE: return false
        default: throw Database.Failure(message: db.errorMessage)
        }
    }

    public func int(_ column: Int32) -> Int64 { sqlite3_column_int64(statement, column) }
    public func double(_ column: Int32) -> Double { sqlite3_column_double(statement, column) }
    public func isNull(_ column: Int32) -> Bool { sqlite3_column_type(statement, column) == SQLITE_NULL }

    public func text(_ column: Int32) -> String? {
        sqlite3_column_text(statement, column).map { String(cString: $0) }
    }

    public func blob(_ column: Int32) -> Data? {
        guard let bytes = sqlite3_column_blob(statement, column) else { return nil }
        return Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, column)))
    }
}

/// SQLITE_TRANSIENT: SQLite copies bound text/blobs, so Swift's temporary buffers are safe to pass.
private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
