import AppKit
import Translation

struct Request: Decodable {
    let operation: String
    let text: String?
    let source: String?
    let target: String?
    let paired: Bool?
    let rtf: String?
}

@main struct Translate {
    static func emit(_ value: [String: Any]) {
        let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        FileHandle.standardOutput.write(data + Data([10]))
    }
    static func main() async {
        do {
            let input = FileHandle.standardInput.readDataToEndOfFile()
            guard input.count <= 3_000_000 else { throw Failure(code: "inputTooLong", message: "Use at most 20,000 characters.") }
            let request = try JSONDecoder().decode(Request.self, from: input)
            if request.operation == "clipboard" {
                let text = NSPasteboard.general.string(forType: .string) ?? ""
                var reply: [String: Any] = ["ok": true, "text": text]
                if let rtf = NSPasteboard.general.data(forType: .rtf), rtf.count <= 1_000_000,
                   let attributed = try? NSAttributedString(data: rtf, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil), attributed.string == text {
                    reply["rtf"] = rtf.base64EncodedString()
                }
                emit(reply)
            } else if request.operation == "languages" {
                let languages = await LanguageAvailability(preferredStrategy: .highFidelity).supportedLanguages
                let locale = Locale(identifier: "en")
                emit(["ok": true, "languages": languages.map { ["id": $0.minimalIdentifier, "name": locale.localizedString(forIdentifier: $0.minimalIdentifier) ?? $0.minimalIdentifier] }.sorted { $0["name"]! < $1["name"]! }])
            } else if request.operation == "translate" {
                let content: NSAttributedString
                if let encoded = request.rtf, let data = Data(base64Encoded: encoded), let rich = try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil), rich.string == request.text {
                    content = rich
                } else { content = NSAttributedString(string: request.text ?? "") }
                let result = try await TranslationEngine.translate(content, source: request.source ?? "auto", target: request.target ?? "", paired: request.paired ?? false)
                var reply: [String: Any] = ["ok": true, "text": result.content.string, "sourceLanguage": result.sourceLanguage, "targetLanguage": result.targetLanguage]
                let range = NSRange(location: 0, length: result.content.length)
                if let html = try? result.content.data(from: range, documentAttributes: [.documentType: NSAttributedString.DocumentType.html]), let string = String(data: html, encoding: .utf8) { reply["html"] = string }
                if let rtf = try? result.content.data(from: range, documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]) { reply["rtf"] = rtf.base64EncodedString() }
                emit(reply)
            } else {
                throw Failure(code: "invalidRequest", message: "Unknown operation.")
            }
        } catch let error as Failure {
            emit(["ok": false, "code": error.code, "message": error.message])
        } catch is DecodingError {
            emit(["ok": false, "code": "invalidRequest", "message": "Invalid translation request."])
        } catch {
            emit(["ok": false, "code": "translationFailed", "message": error.localizedDescription])
        }
    }
}
