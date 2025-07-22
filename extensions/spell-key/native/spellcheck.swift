import Foundation
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else {
    print("Usage: spellcheck <word>")
    exit(1)
}

let word = args[1]

let checker = NSSpellChecker.shared
if let guesses = checker.guesses(forWordRange: NSRange(location: 0, length: word.utf16.count),
                                 in: word,
                                 language: "en_US",
                                 inSpellDocumentWithTag: 0) {
    print(guesses.joined(separator: ", "))
} else {
    print("") // no suggestions
}
