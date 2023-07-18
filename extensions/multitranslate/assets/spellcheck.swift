import Cocoa

let spellChecker = NSSpellChecker.shared
spellChecker.automaticallyIdentifiesLanguages = true

// Debug: `swift ./spellcheck.swift "how are yu?"`
guard CommandLine.argc == 2, let stringToCheck = CommandLine.arguments.last else {
    debugPrint("error: \(CommandLine.arguments)")
    exit(0)
}

print(checkSpelling(stringToCheck), terminator: "")

func checkSpelling(_ text: String) -> String {
    var misspellings = spellChecker.check(text, range: NSRange(location: 0, length: text.utf16.count), types: NSTextCheckingResult.CheckingType.spelling.rawValue, options: nil, inSpellDocumentWithTag: 0, orthography: nil, wordCount: nil)
    if misspellings.isEmpty {
        return text
    }
    misspellings.reverse()
    var correctedText = NSString(string: text)
    for misspelling in misspellings {
        let guesses = spellChecker.guesses(forWordRange: misspelling.range, in: text, language: spellChecker.language(), inSpellDocumentWithTag: 0)
        if let suggest = guesses?.first {
            correctedText = NSString(string: correctedText.replacingCharacters(in: misspelling.range, with: suggest))
        }
    }
    return String(correctedText)
}
