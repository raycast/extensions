import NaturalLanguage

guard CommandLine.arguments.count > 1 else {
    fputs("Please provide the text to process.", stderr)
    exit(1)
}
// Get the text argument
let text = CommandLine.arguments[1]

// Create an instance of NLLanguageRecognizer
let languageRecognizer = NLLanguageRecognizer()

// Train the language recognizer with the text
languageRecognizer.processString(text)

// Get the dominant language
if let dominantLanguage = languageRecognizer.dominantLanguage {
    fputs(dominantLanguage.rawValue, stdout) // Print the ISO 639-1 code
} else {
    fputs("Unable to determine the dominant language.", stderr)
    exit(1)
}
