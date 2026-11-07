import AppKit
import NaturalLanguage
import Translation

struct Failure: Error, LocalizedError {
    let code: String
    let message: String
    var errorDescription: String? { message }
}

struct TranslationOutput {
    let content: NSAttributedString
    let sourceLanguage: String
    let targetLanguage: String
}

struct LineSegment {
    let prefix: NSAttributedString
    let body: NSAttributedString
    let suffix: NSAttributedString
}

// Keep the user's layout outside the translation model.
func segments(_ text: NSAttributedString) -> [LineSegment] {
    let string = text.string as NSString
    let prefixPattern = try! NSRegularExpression(pattern: "^[\\t ]*(?:(?:[-*+•]|[0-9]+[.)]|#{1,6}|>) +)?")
    var result: [LineSegment] = []
    var offset = 0
    while offset < string.length {
        var end = 0
        var contentEnd = 0
        string.getLineStart(nil, end: &end, contentsEnd: &contentEnd, for: NSRange(location: offset, length: 0))
        let line = string.substring(with: NSRange(location: offset, length: contentEnd - offset)) as NSString
        let prefixLength = prefixPattern.firstMatch(in: line as String, range: NSRange(location: 0, length: line.length))?.range.length ?? 0
        var bodyEnd = line.length
        while bodyEnd > prefixLength, let scalar = UnicodeScalar(line.character(at: bodyEnd - 1)), CharacterSet.whitespaces.contains(scalar) { bodyEnd -= 1 }
        result.append(LineSegment(
            prefix: text.attributedSubstring(from: NSRange(location: offset, length: prefixLength)),
            body: text.attributedSubstring(from: NSRange(location: offset + prefixLength, length: bodyEnd - prefixLength)),
            suffix: text.attributedSubstring(from: NSRange(location: offset + bodyEnd, length: end - offset - bodyEnd))
        ))
        offset = end
    }
    return result
}

func singleLine(_ text: NSAttributedString) -> NSAttributedString {
    let output = NSMutableAttributedString(attributedString: text)
    let pattern = try! NSRegularExpression(pattern: "[\\r\\n\\u2028\\u2029]+")
    for match in pattern.matches(in: output.string, range: NSRange(location: 0, length: output.length)).reversed() {
        output.replaceCharacters(in: match.range, with: " ")
    }
    return output
}

struct TranslationEngine {
    static func resolve(_ id: String, in languages: [Locale.Language]) -> Locale.Language? {
        let candidate = Locale.Language(identifier: id)
        return languages.first { $0.minimalIdentifier == candidate.minimalIdentifier }
            ?? languages.first { $0.languageCode == candidate.languageCode && $0.script == candidate.script }
    }

    static func detect(_ text: String, paired: Bool) throws -> String {
        let recognizer = NLLanguageRecognizer()
        if paired { recognizer.languageConstraints = [.russian, .english] }
        recognizer.processString(text)
        guard let language = recognizer.dominantLanguage else {
            throw Failure(code: "unknownLanguage", message: "Could not detect the language. Try a longer passage.")
        }
        return language.rawValue
    }

    static func translate(_ content: NSAttributedString, source sourceID: String, target targetID: String, paired: Bool) async throws -> TranslationOutput {
        guard !content.string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw Failure(code: "emptyText", message: "Enter text to translate.")
        }
        guard content.length <= 20_000 else {
            throw Failure(code: "inputTooLong", message: "Use at most 20,000 characters per translation.")
        }
        let availability = LanguageAvailability(preferredStrategy: .highFidelity)
        let languages = await availability.supportedLanguages
        let detected = paired || sourceID == "auto" ? try detect(content.string, paired: paired) : sourceID
        guard let source = resolve(detected, in: languages) else {
            throw Failure(code: "unsupportedSource", message: "This source language is not supported on this Mac.")
        }
        let targetID = paired ? (source.languageCode?.identifier == "ru" ? "en" : "ru") : targetID
        guard let target = resolve(targetID, in: languages) else {
            throw Failure(code: "unsupportedTarget", message: "Choose a supported target language.")
        }
        if source.languageCode == target.languageCode && source.script == target.script {
            return TranslationOutput(content: content, sourceLanguage: source.minimalIdentifier, targetLanguage: target.minimalIdentifier)
        }
        switch await availability.status(from: source, to: target) {
        case .installed: break
        case .supported:
            throw Failure(code: "modelsMissing", message: "Models are not installed. Enable Apple Intelligence, or download languages in System Settings → General → Language & Region → Translation Languages.")
        case .unsupported:
            throw Failure(code: "unsupportedPair", message: "This language pair is not supported on this Mac.")
        @unknown default:
            throw Failure(code: "unavailable", message: "Translation is currently unavailable.")
        }
        try Task.checkCancellation()
        let session = TranslationSession(installedSource: source, target: target, preferredStrategy: .highFidelity)
        guard !session.canRequestDownloads else {
            throw Failure(code: "offlineRequired", message: "An offline translation session is required.")
        }
        let lines = segments(content)
        let output = try await withTaskCancellationHandler {
            let output = NSMutableAttributedString(string: "")
            for line in lines {
                try Task.checkCancellation()
                output.append(line.prefix)
                if line.body.length > 0 {
                    // Batch translation drops rich attributes on macOS 27.2; a shared session preserves them.
                    let attributed = try AttributedString(line.body, including: \.appKit)
                    let response = try await session.translate(attributed)
                    guard let attributedResult = response.attributedTargetText else {
                        throw Failure(code: "formattingUnavailable", message: "Apple did not return the formatted translation. Try again.")
                    }
                    output.append(singleLine(NSAttributedString(attributedResult)))
                }
                output.append(line.suffix)
            }
            return output
        } onCancel: { session.cancel() }
        try Task.checkCancellation()
        return TranslationOutput(content: output, sourceLanguage: source.minimalIdentifier, targetLanguage: target.minimalIdentifier)
    }
}
