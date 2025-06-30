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

  let outline = pdfDocument.outlineRoot

  for partNumber in 1... {
    let start = (partNumber - 1) * pageCount
    guard start < pdfDocument.pageCount else { break }
    let stop = min(start + pageCount, pdfDocument.pageCount)

    let outputURL = pdfURL.deletingLastPathComponent().appendingPathComponent(
      "\(pdfURL.deletingPathExtension().lastPathComponent) [\(actualSuffix) \(partNumber)].pdf"
    )

    try savePDFDocument(
      pdfDocument,
      to: outputURL,
      startPage: start,
      endPage: stop - 1,
      outline: outline
    )
  }
}
