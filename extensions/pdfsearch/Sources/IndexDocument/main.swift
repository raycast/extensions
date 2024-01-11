import Foundation
import PDFKit
import NaturalLanguage
import CoreML
import VectorStore

if CommandLine.argc < 3 {
    print("Usage: IndexDocument <database_path> <file_path1> <file_path2> ...")
    exit(1)
}

let databasePath = CommandLine.arguments[1]
let filePaths = CommandLine.arguments.dropFirst(2) // Drop the executable name and collection name
if let documentIndex = try? DocumentIndex(withDatabase: databasePath) {
    documentIndex.clearIndex() // ensure documents within this collection are cleared before reindexing
    for filePath in filePaths {
        do {
            #if DEBUG
            print("Indexing: \(filePath)")
            let s = DispatchTime.now()
            #endif

            try documentIndex.indexDocument(atPath: filePath)

            #if DEBUG
            print("Indexing Done for \(filePath): \(Double(DispatchTime.now().uptimeNanoseconds - s.uptimeNanoseconds) / 1_000_000_000) seconds")
            #endif
        } catch {
            #if DEBUG
            print("Couldn't index file \(filePath) due to: \(error.localizedDescription)")
            #endif
        }
    }
    exit(0)
}

exit(1)
