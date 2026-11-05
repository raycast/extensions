import AppKit
import CoreText

private let previewFont = NSFont(name: "Helvetica", size: 19)!
let previewTextWidth: CGFloat = 360

func measuredWidth(_ text: String) -> CGFloat {
    let attributed = NSAttributedString(string: text, attributes: [.font: previewFont])
    return CGFloat(CTLineGetTypographicBounds(CTLineCreateWithAttributedString(attributed), nil, nil, nil))
}

func visualParagraphs(_ text: String) -> [String] {
    text.replacingOccurrences(of: "\r\n", with: "\n")
        .replacingOccurrences(of: "[\r\u{2028}\u{2029}]", with: "\n", options: .regularExpression)
        .components(separatedBy: "\n")
}

func wrapPreview(_ text: String) -> [String] {
    var lines: [String] = []
    for paragraph in visualParagraphs(text.replacingOccurrences(of: "\t", with: "    ")) {
        let characters = Array(paragraph)
        if characters.isEmpty { lines.append(""); continue }
        var start = 0
        while start < characters.count {
            var end = start
            var wordBreak: Int?
            while end < characters.count {
                let candidate = String(characters[start...end])
                if end > start && measuredWidth(candidate) > previewTextWidth { break }
                if characters[end].isWhitespace { wordBreak = end + 1 }
                end += 1
            }
            if end < characters.count, let wordBreak, wordBreak > start { end = wordBreak }
            lines.append(String(characters[start..<end]))
            start = end
        }
    }
    return lines
}

struct PreviewColumns {
    let source: [String]
    let translation: [String]
    let height: Int
}

func pairedColumns(_ source: String, _ translation: String) -> PreviewColumns {
    let sourceParagraphs = visualParagraphs(source)
    let targetParagraphs = visualParagraphs(translation)
    var left: [String] = [], right: [String] = []
    for index in 0..<max(sourceParagraphs.count, targetParagraphs.count) {
        let sourceLines = wrapPreview(index < sourceParagraphs.count ? sourceParagraphs[index] : "")
        let targetLines = wrapPreview(index < targetParagraphs.count ? targetParagraphs[index] : "")
        let height = max(sourceLines.count, targetLines.count)
        left += sourceLines + Array(repeating: "", count: height - sourceLines.count)
        right += targetLines + Array(repeating: "", count: height - targetLines.count)
    }
    return PreviewColumns(source: left, translation: right, height: max(280, 88 + left.count * 26))
}

func escapeXML(_ text: String) -> String {
    let legal = String(text.unicodeScalars.filter { scalar in
        let value = scalar.value
        return value == 9 || value == 10 || value == 13 || (value >= 0x20 && value <= 0xD7FF) || (value >= 0xE000 && value <= 0xFFFD) || value >= 0x10000
    })
    return legal.replacingOccurrences(of: "&", with: "&amp;")
        .replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        .replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "'", with: "&apos;")
}

func translationDocument(source: String, translation: String, sourceLabel: String, targetLabel: String, dark: Bool) -> String {
    let columns = pairedColumns(source, translation)
    let background = dark ? "#252525" : "#f2f2f3"
    let foreground = dark ? "#eeeeee" : "#232323"
    let muted = dark ? "#9b9b9b" : "#666666"
    func column(_ lines: [String], _ label: String, _ x: Int) -> String {
        let text = lines.enumerated().map { index, line in
            let fit = measuredWidth(line) > previewTextWidth ? " textLength=\"360\" lengthAdjust=\"spacingAndGlyphs\"" : ""
            return "<text x=\"24\" y=\"\(67 + index * 26)\"\(fit)>\(escapeXML(line))</text>"
        }.joined()
        return """
        <g transform="translate(\(x) 0)"><rect width="420" height="\(columns.height)" rx="16" fill="\(background)"/>
        <text x="24" y="31" font-family="Helvetica,sans-serif" font-size="12" font-weight="600" letter-spacing="1.2" fill="\(muted)">\(escapeXML(label))</text>
        <g fill="\(foreground)" font-family="Helvetica,Arial,sans-serif" font-size="19" xml:space="preserve">\(text)</g></g>
        """
    }
    let svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"856\" height=\"\(columns.height)\" viewBox=\"0 0 856 \(columns.height)\">\(column(columns.source, sourceLabel, 0))\(column(columns.translation, targetLabel, 436))</svg>"
    return "data:image/svg+xml;base64," + Data(svg.utf8).base64EncodedString()
}
