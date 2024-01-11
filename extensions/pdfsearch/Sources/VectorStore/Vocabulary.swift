import Foundation

struct Vocabulary {
    static let unkownTokenID = lookupDictionary["[UNK]"]!         // 100
    static let paddingTokenID = lookupDictionary["[PAD]"]!        // 0
    static let separatorTokenID = lookupDictionary["[SEP]"]!      // 102
    static let classifyStartTokenID = lookupDictionary["[CLS]"]!  // 101

    /// Searches for a token ID for the given word or wordpiece string.
    ///
    /// - parameters:
    ///     - string: A word or wordpiece string.
    /// - returns: A token ID.
    static func tokenID(of string: String) -> Int32 {
        let token = Substring(string)
        return tokenID(of: token)
    }

    /// Searches for a token ID for the given word or wordpiece token.
    ///
    /// - parameters:
    ///     - string: A word or wordpiece token (Substring).
    /// - returns: A token ID.
    static func tokenID(of token: Substring) -> Int32 {
        let unkownTokenID = Vocabulary.unkownTokenID
        return Vocabulary.lookupDictionary[token] ?? unkownTokenID
    }

    private init() { }
    private static let lookupDictionary: [Substring: Int32] = loadVocabulary()
    
    /// Imports the model's vocabulary into a [word/wordpiece token: token ID] Dictionary.
    ///
    /// - returns: A dictionary.
    /// - Tag: LoadVocabulary
    private static func loadVocabulary() -> [Substring: Int32] {
        let fileName = "vocab"
        let expectedVocabularySize = 30_528
        
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "txt") else {
            fatalError("Vocabulary file is missing")
        }
        
        guard let rawVocabulary = try? String(contentsOf: url) else {
            fatalError("Vocabulary file has no contents.")
        }
        
        let words = rawVocabulary.split(separator: "\n")
        
        guard words.count == expectedVocabularySize else {
            fatalError("Vocabulary file is not the correct size.")
        }

        guard words.first! == "[PAD]" && words.last! == "michaelguenther" else {
            fatalError("Vocabulary file contents appear to be incorrect.")
        }

        let values = 0..<Int32(words.count)
        
        let vocabulary = Dictionary(uniqueKeysWithValues: zip(words, values))
        return vocabulary
    }
}
