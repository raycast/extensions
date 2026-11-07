import Foundation

enum ExtractError: Error, CustomStringConvertible {
    case unreadable(String)
    case tooSmall(Int, Int)
    case locked
    case empty(String)
    /// Not for the index after all, once read (code that a program made, or that holds a private key).
    case leftOut(String)

    var description: String {
        switch self {
        case .unreadable(let why): "unreadable: \(why)"
        case .tooSmall(let width, let height): "small image \(width)×\(height)"
        case .locked: "password-protected"
        case .empty(let why): why
        case .leftOut(let why): why
        }
    }
}

/// Pictures for the model: a downscaled copy of each image (`prepare`) and the camera's date. ImageIO on macOS (HEIC,
/// RAW, WebP and friends); stb_image elsewhere (Platform/).
enum ImageExtractor {
    struct Prepared: Sendable {
        let path: String
        let width: Int
        let height: Int
        let taken: String?   // EXIF DateTimeOriginal, as written by the camera
    }
}

/// Text recognition in screenshots, for keyword search only: Apple Vision on macOS, nothing elsewhere yet.
enum OCR {}

/// PDF pages as text, or as pictures when they have little text (scans, slides): PDFKit on macOS, PDFium elsewhere.
enum PDFExtractor {
    struct Page: Sendable {
        let number: Int        // 1-based
        let text: String       // may be empty for scans
        let imagePath: String? // set when the page had too little text and was rendered for the vision encoder
        var ocr = false        // the text came from OCR: the text layer was garbled (`PageTextProblem.lostLetters`)
        /// Text read in glyph order (`PageTextProblem.glyphOrder`): too garbled to show or match words against, but
        /// enough of its words survive for a meaning vector beside the page's picture.
        var garbled: String?
    }
}

enum DocExtractor {
    /// Plain text from txt/md directly, HTML by stripping tags, and rtf/docx/doc/odt through `richText` (the Cocoa
    /// text system on macOS, the files' own XML elsewhere).
    static func text(of url: URL) throws -> String {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "docx", "doc", "odt", "rtf": return try richText(of: url, type: ext)
        case "html", "htm": return plainText(fromHTML: try readText(url))
        default: return try readText(url)
        }
    }

    static func readText(_ url: URL) throws -> String {
        var encoding = String.Encoding.utf8
        if let text = try? String(contentsOf: url, usedEncoding: &encoding) { return text }
        return try String(contentsOf: url, encoding: .isoLatin1)
    }

    /// Good enough for search: drops scripts, styles and comments, turns block ends into line breaks, strips the
    /// remaining tags, and decodes common entities.
    static func plainText(fromHTML html: String) -> String {
        var text = html
        for pattern in [#"(?is)<script\b.*?</script\s*>"#, #"(?is)<style\b.*?</style\s*>"#, #"(?s)<!--.*?-->"#,
                        #"(?is)<head\b.*?</head\s*>"#] {
            text = text.replacingOccurrences(of: pattern, with: " ", options: .regularExpression)
        }
        text = text.replacingOccurrences(of: #"(?i)<(br|/p|/div|/li|/h[1-6]|/tr|/section|/article)\b[^>]*>"#,
                                         with: "\n", options: .regularExpression)
        text = text.replacingOccurrences(of: #"<[^>]+>"#, with: " ", options: .regularExpression)
        let entities = ["&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'",
                        "&apos;": "'", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…"]
        for (entity, character) in entities { text = text.replacingOccurrences(of: entity, with: character) }
        text = decodeNumericEntities(text)
        return text.replacingOccurrences(of: #"[ \t]+"#, with: " ", options: .regularExpression)
            .replacingOccurrences(of: #"\s*\n\s*"#, with: "\n", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func decodeNumericEntities(_ text: String) -> String {
        guard text.contains("&#") else { return text }
        let pattern = try! NSRegularExpression(pattern: "&#(x[0-9a-fA-F]+|[0-9]+);")
        var result = ""
        var last = text.startIndex
        for match in pattern.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let range = Range(match.range, in: text), let codeRange = Range(match.range(at: 1), in: text)
            else { continue }
            let code = text[codeRange]
            let value = code.hasPrefix("x") ? UInt32(code.dropFirst(), radix: 16) : UInt32(code)
            result += text[last..<range.lowerBound]
            result += value.flatMap(Unicode.Scalar.init).map { String(Character($0)) } ?? " "
            last = range.upperBound
        }
        return result + text[last...]
    }

    /// Splits text into ~`size`-character pieces (~450 tokens) that overlap a little, breaking at whitespace.
    static func chunks(_ text: String, size: Int = 1800, overlap: Int = 200, limit: Int) -> [String] {
        let clean = text
            // A plain string, so Swift puts the real tab and no-break space in the class: ICU doesn't read \u{…}, and
            // an invalid pattern leaves the text as it is on macOS but empties it on Linux (found by the port).
            .replacingOccurrences(of: "[ \t\u{00A0}]+", with: " ", options: .regularExpression)
            .replacingOccurrences(of: #"\n\s*\n\s*\n+"#, with: "\n\n", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        var chunks: [String] = []
        var start = clean.startIndex
        while start < clean.endIndex, chunks.count < limit {
            var end = clean.index(start, offsetBy: size, limitedBy: clean.endIndex) ?? clean.endIndex
            if end < clean.endIndex, let space = clean[start..<end].lastIndex(where: \.isWhitespace),
               clean.distance(from: start, to: space) > size / 2 {
                end = space
            }
            let chunk = clean[start..<end].trimmingCharacters(in: .whitespacesAndNewlines)
            if !chunk.isEmpty { chunks.append(chunk) }
            guard end < clean.endIndex else { break }
            var next = clean.index(end, offsetBy: -overlap, limitedBy: start) ?? end
            if next <= start { next = end }
            // Start the next chunk on a word boundary.
            while next < end, !clean[next].isWhitespace { next = clean.index(after: next) }
            start = next < end ? next : end
        }
        return chunks
    }
}

/// One line, at most `limit` characters: for result lists.
func excerpt(_ text: String, limit: Int = 240) -> String {
    // Only the start is shown, so only the start is cleaned up (a page or a chunk can be thousands of characters).
    let start = text.prefix(limit * 8)
    let line = String(start).replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespaces)
    return line.count > limit || start.endIndex < text.endIndex ? String(line.prefix(limit)) + "…" : line
}
