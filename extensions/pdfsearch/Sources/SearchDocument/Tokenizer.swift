import NaturalLanguage
import Accelerate

/// Expands the search query to smaller/similar words for more keyword matches.
/// Similar words include stemming
/// - Parameters:
///   - query: Search query
///   - embedding: Embedding model
/// - Returns: Expanded list of words to search
func expandQuery(query: String, using embedding: NLEmbedding?) -> [String] {
    guard let embedding = embedding else { return [query] }
    // let words = query.components(separatedBy: .whitespacesAndNewlines)
    var expandedQuery = Set<String>()

    let lemmaTokenizer = NLTagger(tagSchemes: [.lemma])
    let posTokenizer = NLTagger(tagSchemes: [.lexicalClass])
    lemmaTokenizer.string = query
    posTokenizer.string = query

    lemmaTokenizer.enumerateTags(in: query.startIndex..<query.endIndex, unit: .word, scheme: .lemma) { lemmaTag, tokenRange in
        let word = String(query[tokenRange])

        // Check if the word is an important word based on its part-of-speech tag
        if let posTag = posTokenizer.tag(at: tokenRange.lowerBound, unit: .word, scheme: .lexicalClass).0, isImportantWord(posTag, word) {
            // print(word, posTag)
            if let lemma = lemmaTag?.rawValue {
                // print("Lemma \(lemma)")
                expandedQuery.insert(lemma)
            }

            expandedQuery.insert(word) // Insert original word

            // Find similar words using embeddings
            embedding.enumerateNeighbors(for: word, maximumCount: 5, distanceType: NLDistanceType.cosine) { neighbour, dist in
                // print(neighbour, dist)
                expandedQuery.insert(neighbour)
                return true
            }
        }

        return true
    }

    return Array(expandedQuery)
}

let auxiliaryVerbs: Set<String> = ["is", "am", "are", "was", "were", "be", "being", "been", "have", "has", "had", "do", "does", "did"]

func isImportantWord(_ tag: NLTag, _ word: String) -> Bool {
    if auxiliaryVerbs.contains(word.lowercased()) {
        return false
    }
    switch tag {
    case .noun, .verb, .adjective, .adverb:
        return true
    default:
        return false
    }
}

func calculateSimilarity(query: String, text: String) -> Double {
    guard let embedding = NLEmbedding.wordEmbedding(for: .english) else { return 0.0 }

    let queryVector = vector(for: query, using: embedding)
    let textVector = vector(for: text, using: embedding)

    let cosineSim = cosineSimilarity(queryVector, textVector)

    // Calculate length factor (example: logarithmic scaling of word count)
    let wordCount = text.components(separatedBy: .whitespacesAndNewlines).count
    let lengthFactor = log(Double(wordCount) + 1) // +1 to avoid log(0)

    // Combine cosine similarity with length factor
    let similarityWeight = 0.9
    let lengthWeight = 0.1
    let finalScore = (similarityWeight * cosineSim) + (lengthWeight * lengthFactor)

    return finalScore
}

func preprocessText(_ text: String) -> String {
    let lowercased = text.lowercased()

    // Remove punctuation
    let punctuationCharacterSet = CharacterSet.punctuationCharacters
    let cleanedText = lowercased.components(separatedBy: punctuationCharacterSet).joined()
    // optionally remove stopwords

    // rejoin words
    let words = cleanedText.components(separatedBy: .whitespacesAndNewlines)
    return words.joined(separator: " ")
}

func vector(for text: String, using embedding: NLEmbedding?) -> [Double] {
    guard let embedding = embedding else { return [] }

    let preprocessedText = preprocessText(text)

    let words = preprocessedText.components(separatedBy: .whitespacesAndNewlines)
    var vectorSum = Array(repeating: 0.0, count: embedding.dimension)

    var wordCount = 0
    for word in words {
        if let wordVector = embedding.vector(for: word) {
            vectorSum = zip(vectorSum, wordVector).map(+)
            wordCount += 1
        }
    }

    if wordCount > 0 {
        return vectorSum.map { $0 / Double(wordCount) } // Average the vectors
    }

    return vectorSum
}

func cosineSimilarity(_ vectorA: [Double], _ vectorB: [Double]) -> Double {
    let dotProduct = zip(vectorA, vectorB).map(*).reduce(0, +)
    let magnitudeA = sqrt(vectorA.map { $0 * $0 }.reduce(0, +))
    let magnitudeB = sqrt(vectorB.map { $0 * $0 }.reduce(0, +))

    if magnitudeA == 0 || magnitudeB == 0 {
        return 0 // Avoid division by zero
    }

    return dotProduct / (magnitudeA * magnitudeB)
}
