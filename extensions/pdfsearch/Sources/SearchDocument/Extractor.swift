import PDFKit
import NaturalLanguage

/// Extracts the entire paragraph the selection is contained in.
/// - Parameters:
///   - selection: Selection in the page
///   - document: The document the selection is contained in
/// - Returns: paragraph text and its corresponding range
func extractParagraphContaining(selection: PDFSelection, in document: PDFDocument) -> (String, NSRange)? {
    guard let page = selection.pages.first, let pageContent = page.string else {
        return nil
    }
    let selectionRange = selection.range(at: 0, on: page)
    let tokenizer = NLTokenizer(unit: .paragraph)
    tokenizer.string = pageContent
    var paragraphRange = NSRange(location: NSNotFound, length: 0)
    var paragraphText: String = ""
    tokenizer.enumerateTokens(in: pageContent.startIndex..<pageContent.endIndex) { tokenRange, _ in
        let currentNSRange = NSRange(tokenRange, in: pageContent)
        if currentNSRange.intersection(selectionRange) != nil {
            paragraphText = String(pageContent[tokenRange])
            paragraphRange = currentNSRange
            return false // Stop enumeration if current range intersects with target word
        }
        return true
    }
    return (paragraphText, paragraphRange)
}