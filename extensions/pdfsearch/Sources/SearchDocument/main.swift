import PDFKit
import NaturalLanguage

struct Document: Codable {
    var content: String
    var page: Int
    var file: String
    var score: Double
    var lower: Int
    var upper: Int
    var id: Int
}

struct UniqueIdentifier: Hashable {
    let page: Int
    let lowerBound: Int
    let upperBound: Int
}

if CommandLine.argc < 2 {
    print("Usage: SearchIndex <search-query> <file-path> [<file-path>...]")
    exit(1)
}

var nextDocumentID = 1

let searchQuery = CommandLine.arguments[1]
let filePaths = CommandLine.arguments.dropFirst(2)
var rankedResults = [Document]()
let embedding = NLEmbedding.wordEmbedding(for: .english)

for filePath in filePaths {
    guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filePath)) else {
        fatalError("Could not load PDF.")
    }

    var searchResults = pdfDocument.findString(searchQuery, withOptions: .caseInsensitive)
    let expandedQueryWords = expandQuery(query: searchQuery, using: embedding)

    var uniqueIdentifiers = Set<UniqueIdentifier>()

    for word in expandedQueryWords {
        searchResults.append(contentsOf: pdfDocument.findString(word, withOptions: .caseInsensitive))
    }

    for selection in searchResults {
        let (paragraphText, paragraphRange) = extractParagraphContaining(selection: selection, in: pdfDocument)
        let similarityScore = calculateSimilarity(query: searchQuery, text: paragraphText)
        if let page = selection.pages.first {
            let pageIndex = pdfDocument.index(for: page)

            let identifier = UniqueIdentifier(page: pageIndex, lowerBound: paragraphRange.lowerBound, upperBound: paragraphRange.upperBound)

            if !uniqueIdentifiers.contains(identifier) {
                let document = Document(content: paragraphText, page: pageIndex, file: filePath, score: similarityScore, lower: paragraphRange.lowerBound, upper: paragraphRange.upperBound, id: nextDocumentID)
                nextDocumentID += 1
                rankedResults.append(document)
                uniqueIdentifiers.insert(identifier)
            }
        }
    }
}

let topResults = rankedResults.sorted { $0.score > $1.score }.prefix(25).map({$0})

do {
    let jsonData = try JSONEncoder().encode(topResults)
    if let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
    exit(0)
} catch {
    fatalError("Error serializing JSON: \(error)")
}