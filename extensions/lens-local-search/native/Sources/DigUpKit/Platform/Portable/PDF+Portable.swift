// PDFs without PDFKit (Linux, Windows): PDFium, Chromium's PDF library, prebuilt (Vendor/pdfium, scripts/fetch-vendor.sh).
// No OCR here, so a text layer that lost letters stays as it is.
#if !canImport(PDFKit)
import CPDFium
import Foundation

/// PDFium is one process-wide library and not thread-safe: every use goes through `withDocument`, under `lock`.
enum PDFium {
    static let lock = NSLock()
    private static let ready: Void = { FPDF_InitLibrary() }()

    /// Runs `body` with the document open. `locked` when it needs a password, `unreadable` when it won't open. PDFium
    /// reads through `FileReader` (any file name opens; a big file is never read whole).
    static func withDocument<T>(_ url: URL, _ body: (FPDF_DOCUMENT) throws -> T) throws -> T {
        _ = ready
        let reader = try FileReader(url)
        // PDFium counts in C's unsigned long: 4 GB at most on Windows.
        guard reader.size <= UInt64(CUnsignedLong.max) else { throw ExtractError.unreadable("too big") }
        var access = FPDF_FILEACCESS()
        access.m_FileLen = CUnsignedLong(reader.size)
        access.m_Param = reader.opaque
        access.m_GetBlock = { param, position, buffer, size in
            guard let buffer else { return 0 }
            return FileReader.from(param).read(at: UInt64(position), into: buffer, count: Int(size)) == Int(size) ? 1 : 0
        }
        return try withExtendedLifetime(reader) {   // PDFium reads through it until the document is closed
            try lock.withLock {
                guard let document = FPDF_LoadCustomDocument(&access, nil) else {
                    throw FPDF_GetLastError() == UInt(FPDF_ERR_PASSWORD) ? ExtractError.locked
                        : ExtractError.unreadable("can't open PDF")
                }
                defer { FPDF_CloseDocument(document) }
                return try body(document)
            }
        }
    }

    /// The page's text in reading order, lines ending in "\n".
    static func text(of page: FPDF_PAGE) -> String {
        guard let textPage = FPDFText_LoadPage(page) else { return "" }
        defer { FPDFText_ClosePage(textPage) }
        let count = FPDFText_CountChars(textPage)
        guard count > 0 else { return "" }
        var buffer = [UInt16](repeating: 0, count: Int(count) + 1)
        let written = FPDFText_GetText(textPage, 0, count, &buffer)
        guard written > 1 else { return "" }
        return String(decoding: buffer[0..<Int(written - 1)], as: UTF16.self)
            .replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
    }

    /// The page as a picture, fitted into a square of `pixels` (as PDFKit's thumbnail is on macOS), annotations drawn.
    static func render(_ page: FPDF_PAGE, pixels: Int) -> RGBImage? {
        let width = Double(FPDF_GetPageWidthF(page)), height = Double(FPDF_GetPageHeightF(page))
        guard width > 0, height > 0 else { return nil }
        let scale = Double(pixels) / max(width, height)
        let w = max(1, Int((width * scale).rounded())), h = max(1, Int((height * scale).rounded()))
        guard let bitmap = FPDFBitmap_Create(Int32(w), Int32(h), 0) else { return nil }
        defer { FPDFBitmap_Destroy(bitmap) }
        _ = FPDFBitmap_FillRect(bitmap, 0, 0, Int32(w), Int32(h), 0xFFFF_FFFF)
        FPDF_RenderPageBitmap(bitmap, page, 0, 0, Int32(w), Int32(h), 0, FPDF_ANNOT)
        guard let buffer = FPDFBitmap_GetBuffer(bitmap) else { return nil }
        let stride = Int(FPDFBitmap_GetStride(bitmap))
        let bytes = buffer.assumingMemoryBound(to: UInt8.self)   // BGRx
        var rgb = [UInt8](repeating: 0, count: w * h * 3)
        for y in 0..<h {
            for x in 0..<w {
                let s = y * stride + x * 4, d = (y * w + x) * 3
                rgb[d] = bytes[s + 2]
                rgb[d + 1] = bytes[s + 1]
                rgb[d + 2] = bytes[s]
            }
        }
        return RGBImage(width: w, height: h, pixels: rgb)
    }

    /// A metadata string ("Title", "Author"…), or nil when there's none.
    static func meta(_ document: FPDF_DOCUMENT, _ tag: String) -> String? {
        let size = FPDF_GetMetaText(document, tag, nil, 0)
        guard size > 2 else { return nil }
        var buffer = [UInt16](repeating: 0, count: Int(size) / 2)
        _ = FPDF_GetMetaText(document, tag, &buffer, size)
        let text = String(decoding: buffer.prefix { $0 != 0 }, as: UTF16.self)
        return text.isEmpty ? nil : text
    }
}

extension PDFExtractor {
    /// Reads the pages in `range(pageCount)` (0-based). Pages with real text become text; scans, slides and pages whose
    /// text layer came out in glyph order are rendered.
    static func pages(of url: URL, range: (Int) -> Range<Int>, minText: Int, renderPixels: Int, to folder: URL)
        throws -> (pages: [Page], total: Int, title: String?) {
        try PDFium.withDocument(url) { document in
            let total = Int(FPDF_GetPageCount(document))
            var pages: [Page] = []
            for index in range(total).clamped(to: 0..<total) {
                guard let page = FPDF_LoadPage(document, Int32(index)) else { continue }
                defer { FPDF_ClosePage(page) }
                var text = PDFium.text(of: page).trimmingCharacters(in: .whitespacesAndNewlines)
                var garbled: String?
                switch PageTextProblem.check(text) {
                case .lostLetters, nil:
                    if text.count >= minText {
                        pages.append(Page(number: index + 1, text: text, imagePath: nil))
                        continue
                    }
                case .glyphOrder:
                    (text, garbled) = ("", text)
                }
                guard let image = PDFium.render(page, pixels: renderPixels) else { continue }
                let out = folder.appendingPathComponent(UUID().uuidString + ".png")
                try image.write(to: out, png: true)
                pages.append(Page(number: index + 1, text: text, imagePath: out.path, garbled: garbled))
            }
            return (pages, total, PDFium.meta(document, "Title"))
        }
    }
}

extension PDFExtractor {
    /// Page `number` (from 1) as a JPEG for a preview, fitted into a square of `pixels`.
    static func renderPage(_ number: Int, of url: URL, pixels: Int, to out: URL) throws {
        try PDFium.withDocument(url) { document in
            guard let page = FPDF_LoadPage(document, Int32(number - 1)) else {
                throw ExtractError.unreadable("no page \(number)")
            }
            defer { FPDF_ClosePage(page) }
            guard let image = PDFium.render(page, pixels: pixels) else {
                throw ExtractError.unreadable("can't render page \(number)")
            }
            try image.write(to: out, png: false)
        }
    }
}

extension Estimator {
    static func pages(of path: String) -> Int {
        (try? PDFium.withDocument(URL(fileURLWithPath: path)) { Int(FPDF_GetPageCount($0)) }) ?? 1
    }
}
#endif
