import AppKit
import Translation
import RaycastSwiftMacros

struct Request: Decodable {
    let operation: String
    let text: String?
    let source: String?
    let target: String?
    let paired: Bool?
    let rtf: String?
    let translation: String?
    let sourceLabel: String?
    let targetLabel: String?
    let dark: Bool?
}

func encodedResponse(_ value: [String: Any]) -> String {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    return String(decoding: data, as: UTF8.self)
}

@raycast func helperPath() -> String { CommandLine.arguments[0] }

// Read text from stdin so it never appears in process arguments.
@raycast func handleRequest() async -> String {
        do {
            let input = FileHandle.standardInput.readDataToEndOfFile()
            guard input.count <= 3_000_000 else { throw Failure(code: "inputTooLong", message: "Use at most 20,000 characters.") }
            let request = try JSONDecoder().decode(Request.self, from: input)
            #if !arch(arm64)
            throw Failure(code: "unsupportedHardware", message: "Apple Translate requires an Apple Silicon Mac (M1 or later).")
            #endif
            if request.operation == "preview" {
                guard (request.text ?? "").utf16.count <= 20_000 else {
                    throw Failure(code: "inputTooLong", message: "Use at most 20,000 characters per translation.")
                }
                let document = translationDocument(source: request.text ?? "", translation: request.translation ?? "", sourceLabel: request.sourceLabel ?? "SOURCE", targetLabel: request.targetLabel ?? "TRANSLATION", dark: request.dark ?? false)
                return encodedResponse(["ok": true, "document": document])
            } else if request.operation == "clipboard" {
                let text = NSPasteboard.general.string(forType: .string) ?? ""
                var reply: [String: Any] = ["ok": true, "text": text]
                if let rtf = NSPasteboard.general.data(forType: .rtf), rtf.count <= 1_000_000,
                   let attributed = try? NSAttributedString(data: rtf, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil), attributed.string == text {
                    reply["rtf"] = rtf.base64EncodedString()
                }
                return encodedResponse(reply)
            } else if request.operation == "languages" {
                let languages = await LanguageAvailability(preferredStrategy: .highFidelity).supportedLanguages
                let locale = Locale(identifier: "en")
                return encodedResponse(["ok": true, "languages": languages.map { ["id": $0.minimalIdentifier, "name": locale.localizedString(forIdentifier: $0.minimalIdentifier) ?? $0.minimalIdentifier] }.sorted { $0["name"]! < $1["name"]! }])
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
                return encodedResponse(reply)
            } else {
                throw Failure(code: "invalidRequest", message: "Unknown operation.")
            }
        } catch let error as Failure {
            return encodedResponse(["ok": false, "code": error.code, "message": error.message])
        } catch is DecodingError {
            return encodedResponse(["ok": false, "code": "invalidRequest", "message": "Invalid translation request."])
        } catch {
            return encodedResponse(["ok": false, "code": "translationFailed", "message": error.localizedDescription])
        }
    }
