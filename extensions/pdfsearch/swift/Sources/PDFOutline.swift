import PDFKit
import Foundation
import RaycastSwiftMacros

struct Outline: Encodable {
   var title: String
   var page: Int
}

enum OutlineError: Error {
    case missingFile(String)
    case noOutline(String)
}

func extractOutline(_ outline: PDFOutline?, _ pdfDocument: PDFDocument, _ outlines: inout [Outline], level: Int = 0) {
   guard let outline = outline else { return }

   if let title = outline.label, let destination = outline.destination, let page = destination.page {
       let pageIndex = pdfDocument.index(for: page) // Adjust for human-readable page numbering
       outlines.append(Outline(title: title, page: pageIndex))
   }

   for index in 0..<outline.numberOfChildren {
       extractOutline(outline.child(at: index), pdfDocument, &outlines, level: level + 1)
   }
}

@raycast func getPDFOutline(filepath: String) throws -> [Outline] {
    guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filepath)) else {
        throw OutlineError.missingFile("Failed to load PDF Document \(filepath)")
    }

    var outlines = [Outline]()
    guard let outlineRoot = pdfDocument.outlineRoot else {
        throw OutlineError.noOutline("No outline exists for \(filepath)")
    }

    extractOutline(outlineRoot, pdfDocument, &outlines)
    return outlines
}
