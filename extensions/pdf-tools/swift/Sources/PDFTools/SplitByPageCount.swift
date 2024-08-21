import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func splitByPageCount(
    filePath: String,
    pageCount: Int,
    suffix: String?
) async throws {
    let actualSuffix = suffix ?? "part"
    let pdfURL = URL(fileURLWithPath: filePath)
    let pdfDocument = PDFDocument(url: pdfURL)!

    let outputDirectory = pdfURL.deletingLastPathComponent()
    let outline = pdfDocument.outlineRoot

    var currentPart = 1
    var start = 0
    var stop = pageCount

    while start < pdfDocument.pageCount {
        let outputURL = outputDirectory
            .appendingPathComponent(
                "\(pdfURL.deletingPathExtension().lastPathComponent) [\(actualSuffix) \(currentPart)].pdf"
            )

        try savePDFDocument(
            pdfDocument,
            to: outputURL,
            startPage: start,
            endPage: min(stop, pdfDocument.pageCount) - 1,
            outline: outline
        )

        start = stop
        stop += pageCount
        currentPart += 1
    }
}
