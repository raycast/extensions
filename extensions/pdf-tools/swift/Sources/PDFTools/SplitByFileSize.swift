import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func splitByFileSize(
  filePath: String,
  maxSizeMB: Double,
  suffix: String?
) async throws {
  logger.info("Initiating operation…")

  let startTime = Date()

  let actualSuffix = suffix ?? "part"
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!

  let maxSizeBytes = Int64(maxSizeMB * 1_000_000)
  let outline = pdfDocument.outlineRoot

  var pageSizes = calculatePageSizesConcurrently(for: pdfDocument)

  var start = 0
  var stop = 1

  var currentPart = 1

  while stop <= pdfDocument.pageCount {
    let chunkSize = pageSizes[start ..< stop].reduce(0, +)
    let outputURL = pdfURL.deletingLastPathComponent().appendingPathComponent(
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

  logger.info("Total execution time: \(Date().timeIntervalSince(startTime)) seconds")
}
