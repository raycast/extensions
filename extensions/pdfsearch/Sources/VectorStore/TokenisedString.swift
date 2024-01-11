import NaturalLanguage

struct TokenisedString {
    private let _tokens: [Substring]
    private let _tokenIDs: [Int32]
    
    let original: String
    public var tokens: [Substring] { return _tokens }
    public var tokenIDs: [Int32] { return _tokenIDs }
    
    init(_ string: String) {
        original = string
        
        let result = TokenisedString.tokenize(string)
        _tokens = result.tokens
        _tokenIDs = result.tokenIDs
    }

    /// Fragments the given text into an array of tokens and their IDs.
    ///
    /// - parameters:
    ///     - string: A body of text.
    /// - returns: A tuple of an two arrays: one for tokens and another for their IDs.
    private static func tokenize(_ string: String) -> (tokens: [Substring], tokenIDs: [Int32]) {
        let tokens = wordTokens(from: string)
        return wordpieceTokens(from: tokens)
    }
    
    /// Splits the given raw text into an array of word tokens.
    ///
    /// - parameters:
    ///     - rawString: A body of text.
    /// - returns: An array of substrings.
    /// - Tag: WordTokensFromRawString
    private static func wordTokens(from rawString: String) -> [Substring] {
        // Store the tokenized substrings into an array.
        var wordTokens = [Substring]()

        // Use Natural Language's NLTagger to tokenize the input by word.
        let tagger = NLTagger(tagSchemes: [.tokenType])
        tagger.string = rawString

        // Find all tokens in the string and append to the array.
        tagger.enumerateTags(in: rawString.startIndex..<rawString.endIndex,
                             unit: .word,
                             scheme: .tokenType,
                             options: [.omitWhitespace]) { (_, range) -> Bool in
            wordTokens.append(rawString[range])
            return true
        }

        return wordTokens
    }
    
    /// Splits each word token into its component wordpiece tokens, if possible.
    ///
    /// - parameters:
    ///     - wordTokens: An array of word tokens.
    /// - returns: A tuple of an two arrays: one for word/wordpiece tokens and another for their IDs.
    /// - Tag: WordpieceTokens
    private static func wordpieceTokens(from wordTokens: [Substring]) -> (tokens: [Substring], tokenIDs: [Int32]) {
        var wordpieceTokens = [Substring]()
        var wordpieceTokenIDs = [Int32]()
        
        // Interate through each word and see if can be broken up into pieces.
        for token in wordTokens {
            // Skip tokens that are too long.
            guard token.count <= 100 else {
                wordpieceTokens.append(token)
                wordpieceTokenIDs.append(Vocabulary.unkownTokenID)
                continue
            }
            
            var subTokens = [Substring]()
            var subTokenIDs = [Int32]()

            // Start with the whole token.
            var subToken = token
            
            // Note when we've found the root word.
            var foundFirstSubtoken = false

            while !subToken.isEmpty {
                // Word suffixes begin with ## in the vocabulary, such as `##ing`.
                let prefix = foundFirstSubtoken ? "##" : ""
                
                // Convert the string to lowercase to match the vocabulary.
                let searchTerm = Substring(prefix + subToken).lowercased()
                
                let subTokenID = Vocabulary.tokenID(of: searchTerm)
                
                if subTokenID == Vocabulary.unkownTokenID {
                    // Remove the last character and try again.
                    let nextSubtoken = subToken.dropLast()

                    if nextSubtoken.isEmpty {
                        // This token and its components are not in the vocabulary.
                        subTokens = [token]
                        subTokenIDs = [Vocabulary.unkownTokenID]
                        
                        // Exit the while-loop, but continue the for-loop.
                        break
                    }
                    
                    // Prepare for the next iteration of the while-loop.
                    subToken = nextSubtoken
                } else {
                    // Note that this loop has found the first subtoken.
                    // Ok to set true for additional subtokens.
                    foundFirstSubtoken = true
                    
                    // Save this wordpiece and its ID.
                    subTokens.append(subToken)
                    subTokenIDs.append(subTokenID)
                    
                    // Repeat search with the token's remainder, if any.
                    subToken = token.suffix(from: subToken.endIndex)
                }
            }
            
            // Append all of this token's sub-tokens and their IDs.
            if (wordpieceTokens.count + subTokens.count + ModelInput.totalTokenOverhead < ModelInput.maxTokens) {
                wordpieceTokens += subTokens
                wordpieceTokenIDs += subTokenIDs
            }
        }
        
        guard wordpieceTokens.count == wordpieceTokenIDs.count else {
            fatalError("Tokens array and TokenIDs arrays must be the same size.")
        }
        
        return (wordpieceTokens, wordpieceTokenIDs)
    }
}
