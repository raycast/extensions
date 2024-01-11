import Foundation
import PDFKit
import NaturalLanguage
import CoreML
import VectorStore

if CommandLine.argc < 3 {
    print("Usage: SearchIndex <database_path> <search_query> [top_k]")
    exit(1)
}

let databasePath = CommandLine.arguments[1]
let searchQuery = CommandLine.arguments[2]
let k: Int? = CommandLine.argc > 3 ? Int(CommandLine.arguments[3]) : nil
if let documentIndexer = try? DocumentIndex(withDatabase: databasePath) {
    #if DEBUG
    let s = DispatchTime.now()
    #endif

    let topDocuments = try? documentIndexer.retrieveTopKDocuments(query: searchQuery, topK: k ?? 25)

    #if DEBUG
    print("Search Done: \(Double(DispatchTime.now().uptimeNanoseconds - s.uptimeNanoseconds) / 1_000_000_000)")
    #endif

    do {
        let jsonData = try JSONEncoder().encode(topDocuments)
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
        }
        exit(0)
    } catch {
        fatalError("Error serializing JSON: \(error)")
    }
}

exit(1)
