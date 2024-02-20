import PDFKit

/// Creates an rendered image of a pdf page with highlighted text
/// - Parameters:
///   - pdfDocument: PDF document page is contained in
///   - pageIndex: Index of page to render
///   - highlightRanges: Range of selection in the page to highlight
func createHighlightedImage(from pdfDocument: PDFDocument, pageIndex: Int, range: NSRange) throws -> URL {
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
    // context.translateBy(x: 0.0, y: 0.0)
    // context.scaleBy(x: 1.0, y: 1.0)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    
    // Draw highlights
    context.setFillColor(NSColor.yellow.withAlphaComponent(0.5).cgColor)

    // Convert range to CGRect and draw
    guard let pageContent = page.string else {
        fatalError("No page content detected!")
    }

    // Create an NSRange that is safe and within the bounds of the page content
    let safeRange = NSRange(location: min(range.location, pageContent.count),
                            length: min(range.length, pageContent.count - range.location))

    // Create a PDFSelection from the range
    guard let selection = page.selection(for: NSRange(location: safeRange.location, length: safeRange.length)) else {
        fatalError("Error creating selection!")
    }

    // Get the bounds of the selection
    let selectionBounds = selection.bounds(for: page)
    context.fill(selectionBounds)


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

if CommandLine.argc < 5 {
    print("Usage: DrawImage <file-path> <page-number> <lower-bound> <upper-bound>")
    exit(1)
}

let filePath = CommandLine.arguments[1]
guard let pageIndex = Int(CommandLine.arguments[2]),
   let lowerBound = Int(CommandLine.arguments[3]),
   let upperBound = Int(CommandLine.arguments[4]) else {
    fatalError("Invalid arguments received!")
}

let range = NSRange(location: lowerBound, length: upperBound - lowerBound)

guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filePath)) else {
    fatalError("Failed to load PDF Document \(filePath)")
}

do {
    let imagePath = try createHighlightedImage(from: pdfDocument, pageIndex: pageIndex, range: range)
    print(imagePath.absoluteString)
    exit(0)
} catch {
    fatalError(error.localizedDescription)
}