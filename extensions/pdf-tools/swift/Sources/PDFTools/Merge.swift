import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func merge(filePaths: [String], outputFilename: String) async throws {
  let pdfDocuments = filePaths.compactMap { PDFDocument(url: URL(fileURLWithPath: $0)) }

  let outputDirectory = URL(fileURLWithPath: filePaths[0]).deletingLastPathComponent()
  let outputURL = outputDirectory.appendingPathComponent("\(outputFilename).pdf")

  let mergedDocument = PDFDocument()
  var pageOffset = 0

  let mergedOutlineRoot = PDFOutline()

  for pdfDocument in pdfDocuments {
    for pageIndex in 0 ..< pdfDocument.pageCount {
      if let page = pdfDocument.page(at: pageIndex) {
        mergedDocument.insert(page, at: mergedDocument.pageCount)
      }
    }

    if let outline = pdfDocument.outlineRoot {
      copyOutlines(
        from: outline,
        to: mergedOutlineRoot,
        pageOffset: pageOffset,
        originalDocument: pdfDocument,
        newDocument: mergedDocument
      )
    }

    pageOffset += pdfDocument.pageCount
  }

  mergedDocument.outlineRoot = mergedOutlineRoot

  guard mergedDocument.write(to: outputURL) else {
    throw "Failed to to save merged PDF file"
  }
}
