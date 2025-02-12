import AppKit
import Foundation
import PDFKit
import RaycastSwiftMacros

@raycast
func watermark(filePath: String, text: String, transparency: Double, rotation: Int, fontSize: Int? = nil) async throws {
  let pdfURL = URL(fileURLWithPath: filePath)
  let pdfDocument = PDFDocument(url: pdfURL)!
  let watermarkedDocument = PDFDocument()

  let finalFontSize = fontSize ?? 72

  for pageIndex in 0 ..< pdfDocument.pageCount {
    guard let page = pdfDocument.page(at: pageIndex) else { continue }

    let pageBounds = page.bounds(for: .mediaBox)

    // Create an image representation of the page
    let image = NSImage(size: pageBounds.size)
    image.lockFocus()

    if let context = NSGraphicsContext.current?.cgContext {
      // Draw the original page content
      page.draw(with: .mediaBox, to: context)

      // Set up the watermark text attributes
      let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: CGFloat(finalFontSize)),
        .foregroundColor: NSColor.black.withAlphaComponent(transparency)
      ]

      let attributedString = NSAttributedString(string: text, attributes: attributes)
      let textSize = attributedString.size()

      // Calculate the position to center the watermark
      let watermarkX = (pageBounds.width - textSize.width) / 2
      let watermarkY = (pageBounds.height - textSize.height) / 2

      // Rotate and draw the watermark
      context.saveGState()
      context.translateBy(x: watermarkX + textSize.width / 2, y: watermarkY + textSize.height / 2)
      context.rotate(by: CGFloat(rotation) * .pi / 180)
      context.translateBy(x: -textSize.width / 2, y: -textSize.height / 2)

      attributedString.draw(at: NSPoint.zero)

      context.restoreGState()
    }

    image.unlockFocus()

    // Create a new PDFPage from the image
    if let watermarkedPage = PDFPage(image: image) {
      watermarkedDocument.insert(watermarkedPage, at: watermarkedDocument.pageCount)
    }
  }

  let originalFileName = pdfURL.deletingPathExtension().lastPathComponent
  let newFileName = "\(originalFileName) [watermarked].pdf"
  let newFileURL = pdfURL.deletingLastPathComponent().appendingPathComponent(newFileName)

  // Save the watermarked PDF file
  guard watermarkedDocument.write(to: newFileURL) else {
    throw "Failed to save watermarked PDF file"
  }
}
