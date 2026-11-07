import AppKit

@main struct NativeTests {
    static func main() async throws {
        for text in [String(repeating: "漢字中文", count: 20), String(repeating: "👩‍💻", count: 40), String(repeating: "W", count: 120), String(repeating: "😀", count: 40)] {
            let wrapped = wrapPreview(text)
            precondition(wrapped.joined() == text, "Wrapping must preserve every grapheme")
            precondition(wrapped.allSatisfy { measuredWidth($0) <= previewTextWidth }, "Every rendered line must fit its column")
        }
        let columns = pairedColumns("Short.\n\nLast source.", "A much longer translated paragraph that wraps across several visual lines.\n\nLast translation.")
        precondition(columns.source.firstIndex(of: "Last source.") == columns.translation.firstIndex(of: "Last translation."))
        let long = (1...40).map { "Line \($0)" }.joined(separator: "\n")
        let document = translationDocument(source: long, translation: long, sourceLabel: "SOURCE", targetLabel: "TRANSLATION", dark: true)
        let svg = String(decoding: Data(base64Encoded: String(document.split(separator: ",", maxSplits: 1)[1]))!, as: UTF8.self)
        precondition(svg.contains("Line 40") && svg.components(separatedBy: "<rect ").count == 3)
        let hostile = translationDocument(source: "<script>&\"", translation: "result", sourceLabel: "SOURCE", targetLabel: "TRANSLATION", dark: true)
        let safe = String(decoding: Data(base64Encoded: String(hostile.split(separator: ",", maxSplits: 1)[1]))!, as: UTF8.self)
        precondition(!safe.contains("<script>") && safe.contains("&lt;script&gt;"))
        let layout = "  Hello 👋\r\n\r\n- First item\n\t2. Second item  \n# Heading\n\n"
        let pieces = segments(NSAttributedString(string: layout))
        let joined = pieces.map { $0.prefix.string + $0.body.string + $0.suffix.string }.joined()
        precondition(joined == layout, "Splitting must preserve every character")
        precondition(pieces[0].prefix.string == "  ")
        precondition(pieces[1].body.string == "")
        precondition(pieces[2].prefix.string == "- ")
        precondition(pieces[3].prefix.string == "\t2. ")
        precondition(pieces[3].suffix.string == "  \n")
        precondition(singleLine(NSAttributedString(string: "one\n\ntwo\r\nthree")).string == "one two three")
        let russian = try TranslationEngine.detect("Привет, как твои дела?", paired: true)
        precondition(russian == "ru")
        let english = try TranslationEngine.detect("Please restart the server.", paired: true)
        precondition(english == "en")
        let text = NSMutableAttributedString(string: "Hello world!\n\n  - Check the logs\n  - Open the website\n")
        text.addAttribute(.font, value: NSFont.boldSystemFont(ofSize: 18), range: NSRange(location: 0, length: 5))
        let linkRange = (text.string as NSString).range(of: "website")
        text.addAttribute(.link, value: URL(string: "https://example.com")!, range: linkRange)
        let result = try await TranslationEngine.translate(text, source: "auto", target: "en", paired: true)
        precondition(result.targetLanguage == "ru")
        let resultLines = result.content.string.components(separatedBy: "\n")
        precondition(resultLines.count == text.string.components(separatedBy: "\n").count)
        precondition(resultLines[1] == "" && resultLines[2].hasPrefix("  - ") && resultLines[3].hasPrefix("  - "))
        var boldFound = false, linkFound = false
        result.content.enumerateAttributes(in: NSRange(location: 0, length: result.content.length)) { attrs, _, _ in
            if let font = attrs[.font] as? NSFont, NSFontManager.shared.traits(of: font).contains(.boldFontMask) { boldFound = true }
            if let link = attrs[.link] as? URL, link.absoluteString == "https://example.com" { linkFound = true }
        }
        precondition(boldFound, "Bold styling must survive translation")
        precondition(linkFound, "Link destinations must survive translation")
        let reverse = try await TranslationEngine.translate(NSAttributedString(string: "Привет! Как твои дела?"), source: "auto", target: "ru", paired: true)
        precondition(reverse.sourceLanguage == "ru" && reverse.targetLanguage == "en")
        print("Engine checks passed: RU ↔ EN, layout, Unicode, bold text, links.")
    }
}
