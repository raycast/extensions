import Foundation
import SQLite3

class EmbeddingDatabase {
    private var db: OpaquePointer?

    init(withPath databasePath: String) {
        self.openDatabase(withPath: databasePath)
    }

    deinit {
        self.closeDatabase()
    }

    func batchInsert(embeddings: [[Double]], documents: [Document]) {
        let batchSize = 100 // Adjust as needed
        for batchStart in stride(from: 0, to: documents.count, by: batchSize) {
            let batchEnd = min(batchStart + batchSize, documents.count)
            let documentBatch = Array(documents[batchStart..<batchEnd])
            let embeddingBatch = Array(embeddings[batchStart..<batchEnd])

            self.performBatchInsert(embeddings: embeddingBatch, documents: documentBatch)
        }
    }

    func getDocuments(withIds ids: [Int32]) -> [Document] {
        var documents: [Document] = []

        // Start the SQL query with a variable number of placeholders based on the ids count
        let placeholders = ids.map { _ in "?" }.joined(separator: ",")
        let queryString = "SELECT Id, Content, Page, File FROM Documents WHERE Id IN (\(placeholders));"

        var queryStatement: OpaquePointer? = nil
        if sqlite3_prepare_v2(self.db, queryString, -1, &queryStatement, nil) == SQLITE_OK {
            // Bind each ID to the placeholders in the SQL query
            for (index, id) in ids.enumerated() {
                sqlite3_bind_int(queryStatement, Int32(index + 1), id)
            }

            while sqlite3_step(queryStatement) == SQLITE_ROW {
                let id = sqlite3_column_int(queryStatement, 0)
                guard let contentPointer = sqlite3_column_text(queryStatement, 1),
                        let filePointer = sqlite3_column_text(queryStatement, 3) else {
                    continue
                }
                let content = String(cString: contentPointer)
                let page = sqlite3_column_int(queryStatement, 2)
                let file = String(cString: filePointer)

                let document = Document(content: content, page: page, file: file, id: id, score: nil)
                documents.append(document)
            }
        } else {
            #if DEBUG
            let errmsg = String(cString: sqlite3_errmsg(self.db))
            print("SELECT statement could not be prepared: \(errmsg)")
            #endif
        }

        sqlite3_finalize(queryStatement)
        return documents
    }

    func getAllEmbeddings() -> [Int32: [Double]] {
        var embeddings = [Int32: [Double]]()
        let queryString = "SELECT Id, Embedding FROM Documents;"

        var queryStatement: OpaquePointer? = nil
        if sqlite3_prepare_v2(self.db, queryString, -1, &queryStatement, nil) == SQLITE_OK {
            while sqlite3_step(queryStatement) == SQLITE_ROW {
                let id = sqlite3_column_int(queryStatement, 0)
                if let embeddingString = sqlite3_column_text(queryStatement, 1) {
                    let embeddingArray = String(cString: embeddingString).split(separator: ",").compactMap { Double($0) }
                    embeddings[id] = embeddingArray

                    #if DEBUG
                    if String(cString: embeddingString).isEmpty {
                        print("Embedding String \(id): \(String(cString: embeddingString))")
                    }
                    if embeddingArray.contains(where: { $0.isNaN }) {
                        print("NaN values found in \(embeddingArray)")
                    }
                    #endif
                }
            }
        } else {
            #if DEBUG
            let errmsg = String(cString: sqlite3_errmsg(self.db))
            print("SELECT statement could not be prepared: \(errmsg)")
            #endif
        }
        sqlite3_finalize(queryStatement)
        return embeddings
    }

    func clearDocumentsTable() {
        let dropTableString = "DROP TABLE IF EXISTS Documents;"
        var dropTableStatement: OpaquePointer? = nil
        if sqlite3_prepare_v2(self.db, dropTableString, -1, &dropTableStatement, nil) == SQLITE_OK {
            if sqlite3_step(dropTableStatement) == SQLITE_DONE {
                #if DEBUG
                print("Documents table dropped.")
                #endif
            } else {
                #if DEBUG
                print("Could not drop Documents table.")
                #endif
            }
        } else {
            #if DEBUG
            print("DROP TABLE statement could not be prepared.")
            #endif
        }
        sqlite3_finalize(dropTableStatement)

        // Recreate the table
        self.createTable()
    }

    private func openDatabase(withPath databasePath: String) {
        let fileURL = URL(fileURLWithPath: databasePath)

        if sqlite3_open(fileURL.path, &self.db) != SQLITE_OK {
            #if DEBUG
            print("Error opening database: \(String(cString: sqlite3_errmsg(self.db)))")
            #endif
        } else {
            self.createTable()
        }
    }

    private func closeDatabase() {
        if self.db != nil {
            sqlite3_close(self.db)
        }
    }

    private func createTable() {
        let createTableString = """
        CREATE TABLE IF NOT EXISTS Documents(
        Id INTEGER PRIMARY KEY,
        Content TEXT,
        Page INTEGER,
        File TEXT,
        Embedding TEXT);
        """
        var createTableStatement: OpaquePointer? = nil
        if sqlite3_prepare_v2(db, createTableString, -1, &createTableStatement, nil) == SQLITE_OK {
            if sqlite3_step(createTableStatement) != SQLITE_DONE {
                #if DEBUG
                print("Error creating table: \(String(cString: sqlite3_errmsg(db)))")
                #endif
            }
        } else {
            #if DEBUG
            print("CREATE TABLE statement could not be prepared: \(String(cString: sqlite3_errmsg(db)))")
            #endif
        }
        sqlite3_finalize(createTableStatement)
    }

    private func performBatchInsert(embeddings: [[Double]], documents: [Document]) {
        guard !documents.isEmpty, documents.count == embeddings.count else {
            #if DEBUG
            print("Documents array and embeddings array must be non-empty and of the same length.")
            #endif

            return
        }

        let valuePlaceholders = documents.map { _ in "(?, ?, ?, ?)" }.joined(separator: ", ")
        let insertStatementString = "INSERT INTO Documents (Content, Page, File, Embedding) VALUES \(valuePlaceholders);"

        let maxRetries = 3
        var retries = 0
        while retries < maxRetries {
            var insertStatement: OpaquePointer? = nil
            sqlite3_exec(db, "BEGIN TRANSACTION", nil, nil, nil)

            if sqlite3_prepare_v2(db, insertStatementString, -1, &insertStatement, nil) == SQLITE_OK {
                var bindIndex = 1  // Start binding index at 1

                for (index, document) in documents.enumerated() {
                    let embeddingString = embeddings[index].map { String($0) }.joined(separator: ",")

                    let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
                    let contentString = document.content.trimmingCharacters(in: .whitespacesAndNewlines).utf8CString
                    contentString.withUnsafeBufferPointer{ bufferPtr in
                        if let baseAddress = bufferPtr.baseAddress {
                            let bindResult = sqlite3_bind_text(insertStatement, Int32(bindIndex), baseAddress, -1, SQLITE_TRANSIENT)

                            #if DEBUG
                            if bindResult != SQLITE_OK {
                                print("Binding failed for index \(bindIndex): \(String(cString: sqlite3_errmsg(db)))")
                            }
                            #endif
                        }
                    }

                    sqlite3_bind_int(insertStatement, Int32(bindIndex + 1), document.page)

                    let fileUTF8CString = document.file.utf8CString
                    fileUTF8CString.withUnsafeBufferPointer { bufferPtr in
                        if let baseAddress = bufferPtr.baseAddress {
                            sqlite3_bind_text(insertStatement, Int32(bindIndex + 2), baseAddress, -1, SQLITE_TRANSIENT)
                        }
                    }

                    let embeddingUTF8CString = embeddingString.utf8CString
                    embeddingUTF8CString.withUnsafeBufferPointer { bufferPtr in
                        if let baseAddress = bufferPtr.baseAddress {
                            sqlite3_bind_text(insertStatement, Int32(bindIndex + 3), baseAddress, -1, SQLITE_TRANSIENT)
                        }
                    }

                    bindIndex += 4
                }

                if sqlite3_step(insertStatement) == SQLITE_DONE {
                    sqlite3_exec(db, "COMMIT", nil, nil, nil)
                    sqlite3_finalize(insertStatement)
                    return  // Success, exit the function
                } else {
                    print("Error inserting rows, retrying: \(String(cString: sqlite3_errmsg(db)))")
                    sqlite3_exec(db, "ROLLBACK", nil, nil, nil)
                    retries += 1
                }
            } else {
                print("Batch INSERT statement could not be prepared: \(String(cString: sqlite3_errmsg(db)))")
                sqlite3_exec(db, "ROLLBACK", nil, nil, nil)
            }

            sqlite3_finalize(insertStatement)

            if retries >= maxRetries {
                print("Failed to insert after \(maxRetries) retries.")
                return  // Failed after max retries, exit the function
            }
        }
    }
}
