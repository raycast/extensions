import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func protect(filePath: String, password: String) async throws {
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!

  guard pdfDocument.write(
    to: pdfURL,
    withOptions: [.ownerPasswordOption: password, .userPasswordOption: password]
  ) else {
    throw "Failed to save password-protected PDF file"
  }
}
