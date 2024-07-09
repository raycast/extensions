import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func isPDFDocumentLocked(filePath: String) async throws -> Bool {
    let pdfURL = URL(fileURLWithPath: filePath)
    guard let pdfDocument = PDFDocument(url: pdfURL) else {
        throw "Failed to load PDF document"
    }
    return pdfDocument.isLocked
}
