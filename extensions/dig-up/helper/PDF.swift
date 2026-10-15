// PDFs and rich text documents. DigUp: Extractors+Apple.swift (PDFExtractor.pages, DocExtractor.richText) and
// SearchText.swift (PageTextProblem).
import AppKit
import Foundation
import PDFKit

/// What's wrong with the text PDFKit read from a page, when the page's text layer can't be used as it is.
enum PageTextProblem: Equatable {
    /// Bengali or Hindi read in glyph order: vowel signs ahead of their consonants, conjuncts lost. The page is used
    /// as a picture instead (Apple's OCR doesn't read Bengali).
    case glyphOrder
    /// Arabic letters lost where the font drew a lam ligature: the article's lam goes with the ligature, leaving a bare
    /// alef before a "?" or "." ("الأردن" reads "ا?ردن"). The page is read again by OCR. A bare alef, not أ: "أ.د."
    /// (Prof. Dr.) and "ذ.م.م" (LLC) are real abbreviations.
    case lostLetters

    static func check(_ text: String) -> PageTextProblem? {
        let text = text.precomposedStringWithCanonicalMapping
        var vowelSigns = 0, misplaced = 0, lostLetters = 0
        var previous: Unicode.Scalar = " ", beforePrevious: Unicode.Scalar = " "
        for scalar in text.unicodeScalars {
            if isIndicVowelSign(scalar.value) {
                vowelSigns += 1
                if !isIndicConsonantOrNukta(previous.value) { misplaced += 1 }
            }
            if beforePrevious == "\u{0627}", "?.\u{FFFD}".unicodeScalars.contains(previous),
               Script.arabic.contains(scalar.value), scalar.properties.isAlphabetic {
                lostLetters += 1
            }
            beforePrevious = previous
            previous = scalar
        }
        if vowelSigns >= 10, misplaced * 20 >= vowelSigns { return .glyphOrder }
        if lostLetters >= 2 { return .lostLetters }
        return nil
    }

    /// Dependent vowel signs of Bengali and Devanagari: in a real word, each follows a consonant (or its nukta).
    private static func isIndicVowelSign(_ value: UInt32) -> Bool {
        switch value {
        case 0x09BE...0x09C4, 0x09C7, 0x09C8, 0x09CB, 0x09CC, 0x09D7, 0x09E2, 0x09E3: true
        case 0x093A, 0x093B, 0x093E...0x094C, 0x094E, 0x094F, 0x0955...0x0957, 0x0962, 0x0963: true
        default: false
        }
    }

    private static func isIndicConsonantOrNukta(_ value: UInt32) -> Bool {
        switch value {
        case 0x0995...0x09B9, 0x09BC, 0x09CE, 0x09DC, 0x09DD, 0x09DF, 0x09F0, 0x09F1: true
        case 0x0915...0x0939, 0x093C, 0x0958...0x095F, 0x0979...0x097F: true
        default: false
        }
    }
}

enum PDFOps {
    /// Reads the pages `from..<to`. Pages with real text become text; scans and slides are rendered, sized for the
    /// encoder and read by OCR for keywords. Text layers PDFKit reads garbled are replaced: by OCR where letters were
    /// lost (Arabic ligatures), by the rendered page where the words came out in glyph order (Bengali), which keeps
    /// the garbled text for a meaning vector beside the picture.
    static func read(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        guard let document = PDFDocument(url: url) else { throw ExtractError.unreadable("can't open PDF") }
        let count = document.pageCount
        if document.isLocked { return ["pages": .int(count), "locked": true, "items": []] }
        let options = Options(minText: try a.int("minText", 200), renderPixels: try a.positiveInt("renderPixels", 1400),
                              budget: try a.positiveInt("budget", 280, max: maxBudget), folder: try Pictures.makeFolder(try a.string("outDir")))
        let first = max(0, try a.int("from", 0)), end = min(count, try a.int("to", count))
        var items: [JSON] = []
        if first < end {
            for index in first..<end {
                try autoreleasepool { if let item = try page(document, index, options) { items.append(item) } }
            }
        }
        var reply: [String: JSON] = ["pages": .int(count), "items": .array(items)]
        if let title = document.documentAttributes?[PDFDocumentAttribute.titleAttribute] as? String {
            reply["title"] = .string(title)
        }
        return .object(reply)
    }

    private struct Options {
        let minText: Int
        let renderPixels: Int
        let budget: Int
        let folder: URL
    }

    private static func page(_ document: PDFDocument, _ index: Int, _ options: Options) throws -> JSON? {
        guard let page = document.page(at: index) else { return nil }
        let number = index + 1
        func item(_ text: String, ocr: Bool = false, image: String? = nil, garbled: String? = nil) -> JSON {
            var item: [String: JSON] = ["number": .int(number), "text": .string(text)]
            if ocr { item["ocr"] = true }
            if let image { item["image"] = .string(image) }
            if let garbled { item["garbled"] = .string(garbled) }
            return .object(item)
        }
        var text = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        var garbled: String?
        switch PageTextProblem.check(text) {
        case .lostLetters:
            // OCR's reading replaces the text layer only when it's real Arabic; otherwise the layer stays as it is.
            if OCR.readsArabic, let image = render(page, pixels: 2000) {
                let read = OCR.text(in: image).trimmingCharacters(in: .whitespacesAndNewlines)
                if read.count >= options.minText, PageTextProblem.check(read) == nil,
                   read.unicodeScalars.contains(where: { Script.arabic.contains($0.value) }) {
                    return item(read, ocr: true)
                }
            }
            if text.count >= options.minText { return item(text) }
        case .glyphOrder:
            (text, garbled) = ("", text)
        case nil:
            if text.count >= options.minText { return item(text) }
        }
        guard let image = render(page, pixels: options.renderPixels) else { return nil }
        let out = options.folder.appendingPathComponent(UUID().uuidString + ".png")
        _ = try Pictures.sizeAndWrite(image, budget: options.budget, to: out)
        // A scan, or a page that's mostly a picture: its words come from OCR, for keyword search only (an invoice
        // number on a scan, as on a screenshot). Not for a text layer in glyph order, which OCR can't read either.
        var ocr = false
        if garbled == nil {
            let read = OCR.text(in: image).trimmingCharacters(in: .whitespacesAndNewlines)
            if read.count > text.count { (text, ocr) = (read, true) }
        }
        return item(text, ocr: ocr, image: out.path, garbled: garbled)
    }

    /// `pageProblemTest`: DigUp's own tests of PageTextProblem.check (SearchTextTests.swift) run through the helper.
    static func pageProblemTest(_ a: Args) throws -> JSON {
        switch PageTextProblem.check(try a.string("text")) {
        case .glyphOrder: ["problem": "glyphOrder"]
        case .lostLetters: ["problem": "lostLetters"]
        case nil: ["problem": nil]
        }
    }

    /// The page as a picture, fitted into a square of `pixels`.
    static func render(_ page: PDFPage, pixels: Int) -> CGImage? {
        let side = CGFloat(pixels)
        return page.thumbnail(of: NSSize(width: side, height: side), for: .mediaBox)
            .cgImage(forProposedRect: nil, context: nil, hints: nil)
    }
}

enum RichText {
    /// rtf/docx/doc/odt through the Cocoa text system. (Cocoa's HTML import runs WebKit and must be on the main
    /// thread; HTML is stripped by hand in the engine.)
    static func read(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let type: NSAttributedString.DocumentType
        switch try a.string("type") {
        case "docx": type = .officeOpenXML
        case "doc": type = .docFormat
        case "odt": type = .openDocument
        case "rtf": type = .rtf
        default: throw HelperFailure("type must be docx, doc, odt or rtf")
        }
        do {
            return ["text": .string(try NSAttributedString(url: url, options: [.documentType: type],
                                                           documentAttributes: nil).string)]
        } catch {
            throw ExtractError.unreadable(describe(error))
        }
    }
}
