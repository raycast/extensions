import Foundation
import os
import PDFKit
import RaycastSwiftMacros

public let logger = Logger(subsystem: "com.xilopaint.raycast.pdftools", category: "PDF Tools")

@raycast
func isPDFDocumentLocked(filePath: String) async throws -> Bool {
  let pdfURL = URL(fileURLWithPath: filePath)
  guard let pdfDocument = PDFDocument(url: pdfURL) else {
    throw "Failed to load PDF document"
  }
  return pdfDocument.isLocked
}

func copyOutlines(
  from sourceOutline: PDFOutline,
  to targetOutline: PDFOutline,
  pageOffset: Int,
  originalDocument: PDFDocument,
  newDocument: PDFDocument,
  startPage: Int = 0,
  endPage: Int = Int.max
) {
  for childIndex in 0 ..< sourceOutline.numberOfChildren {
    guard let child = sourceOutline.child(at: childIndex) else { continue }
    guard let destination = child.destination, let page = destination.page else { continue }

    let pageNumber = originalDocument.index(for: page)

    if pageNumber >= startPage, pageNumber <= endPage {
      let newChild = PDFOutline()
      newChild.label = child.label

      if let newPage = newDocument.page(at: pageNumber + pageOffset) {
        newChild.destination = PDFDestination(page: newPage, at: destination.point)
      }

      targetOutline.insertChild(newChild, at: targetOutline.numberOfChildren)

      copyOutlines(
        from: child,
        to: newChild,
        pageOffset: pageOffset,
        originalDocument: originalDocument,
        newDocument: newDocument,
        startPage: startPage,
        endPage: endPage
      )
    }
  }
}

func calculatePageSizesConcurrently(for pdfDocument: PDFDocument) -> [Int64] {
  let dispatchGroup = DispatchGroup()
  let queue = DispatchQueue(
    label: "com.xilopaint.raycast.pdftools.pagesizes",
    attributes: .concurrent
  )
  let lock = NSLock()

  var pageSizes = [Int64](repeating: 0, count: pdfDocument.pageCount)

  for pageIndex in 0 ..< pdfDocument.pageCount {
    dispatchGroup.enter()
    queue.async {
      guard let page = pdfDocument.page(at: pageIndex) else {
        dispatchGroup.leave()
        return
      }
      let tempDocument = PDFDocument()
      tempDocument.insert(page, at: 0)

      if let data = tempDocument.dataRepresentation() {
        let pageSize = Int64(data.count)
        lock.lock()
        pageSizes[pageIndex] = pageSize
        lock.unlock()
      }

      dispatchGroup.leave()
    }
  }

  dispatchGroup.wait()
  return pageSizes
}

func savePDFDocument(
  _ document: PDFDocument,
  to outputURL: URL,
  startPage: Int,
  endPage: Int,
  outline: PDFOutline?
) throws {
  let partDocument = PDFDocument()
  for pageIndex in startPage ... endPage {
    if let page = document.page(at: pageIndex) {
      partDocument.insert(page, at: partDocument.pageCount)
    }
  }

  if let outline = outline {
    let newOutline = PDFOutline()
    copyOutlines(
      from: outline,
      to: newOutline,
      pageOffset: -startPage,
      originalDocument: document,
      newDocument: partDocument,
      startPage: startPage,
      endPage: endPage
    )
    partDocument.outlineRoot = newOutline
  }

  guard partDocument.write(to: outputURL) else {
    throw "Failed to save PDF document: \(outputURL.lastPathComponent)"
  }
}

extension String: Error {}
