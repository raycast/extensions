import NaturalLanguage

let auxiliaryVerbs: Set<String> = [
    "am", "is", "are", "was", "were", "being", "been", "be",
    "have", "has", "had", "having",
    "do", "does", "did",
    "will", "would", 
    "shall", "should", 
    "can", "could", 
    "may", "might", 
    "must",
    "ought", 
    "dare", 
    "need"
]
let posTags: Set<NLTag> = [.noun, .verb, .adjective, .adverb, .number, .otherWord]

/// Expands the search query to include base words for more keyword matches.
/// Similar words include stemming
/// - Parameters:
///   - query: Search query
///   - embedding: Embedding model
/// - Returns: Expanded list of words to search
func expandQuery(query: String) -> [String] {
    var expandedQuery = Set<String>()
    let options: NLTagger.Options = [.omitPunctuation, .omitWhitespace, .joinNames]
    let tagger = NLTagger(tagSchemes: [.lexicalClass, .lemma])
    tagger.string = query
    tagger.enumerateTags(in: query.startIndex..<query.endIndex, unit: .word, scheme: .lexicalClass, options: options) { tag, tokenRange in
        if let tag = tag {
            if !posTags.contains(tag) {
                return true
            }
            let word = String(query[tokenRange])
            if auxiliaryVerbs.contains(word) {
                return true
            }
            expandedQuery.insert(word)
            if let lemma = tagger.tag(at: tokenRange.lowerBound, unit: .word, scheme: .lemma).0?.rawValue {
                expandedQuery.insert(lemma)
            }
        }
        return true
    }
    return Array(expandedQuery)
}
