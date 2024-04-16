import Foundation
import PDFKit

struct Outline: Codable {
    var title: String
    var page: Int
}

if CommandLine.argc != 2 {
    print("Usage: GetOutline <file-path>")
    exit(1)
}

let filePath = CommandLine.arguments[1]
guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filePath)) else {
    fatalError("Failed to load PDF Document \(filePath)")
}

var outlines = [Outline]()

func extractOutline(_ outline: PDFOutline?, level: Int = 0) {
    guard let outline = outline else { return }

    if let title = outline.label, let destination = outline.destination, let page = destination.page {
        let pageIndex = pdfDocument.index(for: page) // Adjust for human-readable page numbering
        outlines.append(Outline(title: title, page: pageIndex))
    }

    for index in 0..<outline.numberOfChildren {
        extractOutline(outline.child(at: index), level: level + 1)
    }
}

if let outlineRoot = pdfDocument.outlineRoot {
    extractOutline(outlineRoot)
    let encoder = JSONEncoder()
    do {
        let jsonData = try encoder.encode(outlines)
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
            exit(EXIT_SUCCESS)
        }
    } catch {
        print("Error encoding JSON: \(error)")
    }
} else {
    print("No outline available for this PDF.")
}

exit(EXIT_FAILURE)
