import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func unlock(filePath: String, password: String) async throws {
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!

  if pdfDocument.unlock(withPassword: password) {
    pdfDocument.write(
      to: pdfURL,
      withOptions: [.ownerPasswordOption: "", .userPasswordOption: ""]
    )
  } else {
    throw "Failed to unlock PDF file"
  }
}
