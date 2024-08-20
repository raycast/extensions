import AppKit
import Foundation
import os
import PDFKit
import RaycastSwiftMacros

let logger = Logger(subsystem: "com.xilopaint.raycast.pdftools", category: "PDF Tools")

@raycast
func splitByFileSize(
  filePath: String,
  maxSizeMB: Double,
  suffix: String?
) async throws {
  logger.debug("Initiating operation...")

  let startTime = Date()

  let actualSuffix = suffix ?? "part"
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!

  let maxSizeBytes = Int64(maxSizeMB * 1_000_000)
  let outputDirectory = pdfURL.deletingLastPathComponent()
  let outline = pdfDocument.outlineRoot

  var pageSizes = calculatePageSizesConcurrently(for: pdfDocument)

  var start = 0
  var stop = 1

  var currentPart = 1

  while stop <= pdfDocument.pageCount {
    let chunkSize = pageSizes[start ..< stop].reduce(0, +)
    let outputURL = outputDirectory
      .appendingPathComponent(
        "\(pdfURL.deletingPathExtension().lastPathComponent) [\(actualSuffix) \(currentPart)].pdf"
      )

    if chunkSize < maxSizeBytes {
      if stop != pdfDocument.pageCount {
        stop += 1
      } else {
        try savePDFDocument(
          pdfDocument,
          to: outputURL,
          startPage: start,
          endPage: stop - 1,
          outline: outline
        )
        break
      }
    } else {
      if stop - start == 1 {
        try savePDFDocument(
          pdfDocument,
          to: outputURL,
          startPage: start,
          endPage: stop - 1,
          outline: outline
        )

        start = stop
        stop += 1
        currentPart += 1
      } else {
        stop -= 1

        try savePDFDocument(
          pdfDocument,
          to: outputURL,
          startPage: start,
          endPage: stop - 1,
          outline: outline
        )
        let actualChunkSize = try Int64(
          FileManager.default
            .attributesOfItem(atPath: outputURL.path)[.size] as? Int64 ?? 0
        )

        let nextPageSize = pageSizes[stop]

        if actualChunkSize + nextPageSize < maxSizeBytes {
          try FileManager.default.removeItem(at: outputURL)
          let averagePageSize = Double(actualChunkSize) / Double(stop - start)
          for pageIndex in start ..< stop {
            pageSizes[pageIndex] = Int64(averagePageSize)
          }
          stop += 1
        } else {
          start = stop
          stop += 1
          currentPart += 1
        }
      }
    }
  }

  logger.debug("Total execution time: \(Date().timeIntervalSince(startTime)) seconds")
}

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

@raycast
func unlock(filePath: String, password: String) async throws {
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!

  if pdfDocument.unlock(withPassword: password) {
    pdfDocument.write(to: pdfURL, withOptions: [.ownerPasswordOption: "", .userPasswordOption: ""])
  } else {
    throw "Failed to unlock PDF file"
  }
}

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
