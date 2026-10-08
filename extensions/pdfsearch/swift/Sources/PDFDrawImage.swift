import PDFKit
import RaycastSwiftMacros

/// Creates a rendered image of a pdf page with optional highlighted text
/// - Parameters:
///   - pdfDocument: PDF document the page is contained in
///   - pageIndex: Index of the page to render
///   - range: Optional range of selection in the page to highlight
func createHighlightedImage(from pdfDocument: PDFDocument, pageIndex: Int, range: NSRange?) throws -> URL {
   guard let page = pdfDocument.page(at: pageIndex) else {
       fatalError("Could not get page!")
   }

   let pageRect = page.bounds(for: .mediaBox)
   let image = NSImage(size: pageRect.size)
   
   image.lockFocus()
   guard let context = NSGraphicsContext.current?.cgContext else {
       image.unlockFocus()
       fatalError("Could not get graphics context!")
   }
   
   // Set a white background for the image
   context.setFillColor(NSColor.white.cgColor)
   context.fill(pageRect)

   // Render the PDF page
   context.saveGState()
   page.draw(with: .mediaBox, to: context)
   context.restoreGState()
   
   // Draw highlights if range is provided
   if let highlightRange = range, let pageContent = page.string {
       let safeRange = NSRange(location: min(highlightRange.location, pageContent.count),
                               length: min(highlightRange.length, pageContent.count - highlightRange.location))
       
       if let selection = page.selection(for: safeRange) {
           let selectionBounds = selection.bounds(for: page)
           context.setFillColor(NSColor.yellow.withAlphaComponent(0.5).cgColor)
           context.fill(selectionBounds)
       }
   }

   image.unlockFocus()

   // Save to temporary file
   guard let tiffData = image.tiffRepresentation,
         let bitmapImage = NSBitmapImageRep(data: tiffData),
         let data = bitmapImage.representation(using: .png, properties: [:]) else {
       fatalError("Could not get image data!")
   }

   let tempURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString).appendingPathExtension("png")
   do {
       try data.write(to: tempURL)
       return tempURL
   } catch {
       fatalError("Error saving image: \(error)")
   }
}

@raycast func drawImage(filepath: String, pageIndex: Int, lower: Int?, upper: Int?) throws -> String {
    guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filepath)) else {
       fatalError("Failed to load PDF Document \(filepath)")
    }

    var range: NSRange?
    if let lower = lower, let upper = upper, lower < upper {
        range = NSRange(location: lower, length: upper - lower)
    }

    let imagePath = try createHighlightedImage(from: pdfDocument, pageIndex: pageIndex, range: range)
    return imagePath.path
}
