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
    print("Usage: SearchDocument <search-query> <file-path> [<file-path>...]")
    exit(1)
}

let k = 25 // number of results to show

var nextDocumentID = 1

let searchQuery = CommandLine.arguments[1]
let filePaths = CommandLine.arguments.dropFirst(2)
var rankedResults = [Document]()
guard let sentenceEmbedding = NLEmbedding.sentenceEmbedding(for: .english) else {
    fatalError("Embedding could not be loaded.")
}

for filePath in filePaths {
    guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filePath)) else {
        fatalError("Could not load PDF.")
    }

    var searchResults = pdfDocument.findString(searchQuery, withOptions: [.caseInsensitive, .diacriticInsensitive])

    // expand search query to include base word and similar words
    let expandedQueryWords = expandQuery(query: searchQuery)
    for word in expandedQueryWords {
        searchResults.append(contentsOf: pdfDocument.findString(word, withOptions: [.caseInsensitive, .diacriticInsensitive]))
    }

    // for finding duplicate search results after extracting paragraph containing search result
    var uniqueIdentifiers = Set<UniqueIdentifier>()

    // rerank search results based on relevance of surrounding context
    for selection in searchResults {
        if let (paragraphText, paragraphRange) = extractParagraphContaining(selection: selection, in: pdfDocument) {
            // Calculate length factor (example: logarithmic scaling of word count)
            let wordCount = paragraphText.components(separatedBy: .whitespacesAndNewlines).count
            let lengthFactor = log(Double(wordCount) + 1) // +1 to avoid log(0)
            
            // Combine cosine similarity with length factor
            let similarityWeight = 0.9
            let lengthWeight = 0.1
            let distance = sentenceEmbedding.distance(between: searchQuery, and: paragraphText, distanceType: NLDistanceType.cosine)
            let score = (similarityWeight * (1 - distance)) + (lengthWeight * lengthFactor)
            
            // add document to list of candidates if it is not a duplicate
            if let page = selection.pages.first {
                let pageIndex = pdfDocument.index(for: page)
                let identifier = UniqueIdentifier(page: pageIndex, lowerBound: paragraphRange.lowerBound, upperBound: paragraphRange.upperBound)
                if !uniqueIdentifiers.contains(identifier) {
                    let document = Document(content: paragraphText, page: pageIndex, file: filePath, score: score, lower: paragraphRange.lowerBound, upper: paragraphRange.upperBound, id: nextDocumentID)
                    nextDocumentID += 1
                    rankedResults.append(document)
                    uniqueIdentifiers.insert(identifier)
                }
            }
        }
    }
}

let topResults = rankedResults.sorted { $0.score > $1.score }.prefix(k).map({$0})

do {
    let jsonData = try JSONEncoder().encode(topResults)
    if let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
    exit(0)
} catch {
    fatalError("Error serializing JSON: \(error)")
}