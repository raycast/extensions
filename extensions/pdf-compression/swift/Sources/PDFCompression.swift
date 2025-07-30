import RaycastSwiftMacros
import Foundation
import PDFKit
import AppKit
import CoreGraphics

// Some code taken from https://github.com/nuance-dev/achico/blob/master/Achico/Processor/FileProcessor.swift
// which uses MIT License

// MARK: - Compression Result

struct PDFCompressionResult: Codable {
    let originalSize: Int64
    let compressedSize: Int64
    let compressedURL: String
    let savedPercentage: Int
}

// MARK: - Main Compression Function

@raycast
func compressPDF(inputPath: String) throws -> PDFCompressionResult {
    let inputURL = URL(fileURLWithPath: inputPath)
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: inputURL.path) else {
        throw NSError(domain: "PDFCompression", code: 1, userInfo: [NSLocalizedDescriptionKey: "Input file does not exist"])
    }

    let originalSize = (try? fileManager.attributesOfItem(atPath: inputURL.path)[.size] as? Int64) ?? 0

    // Output to a temp file
    let tempDir = fileManager.temporaryDirectory
    let outputURL = tempDir.appendingPathComponent(UUID().uuidString + ".pdf")

    // Compression logic
    guard let document = PDFDocument(url: inputURL) else {
        throw NSError(domain: "PDFCompression", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to open PDF"])
    }

    let newDocument = PDFDocument()
    let totalPages = document.pageCount

    for i in 0..<totalPages {
        autoreleasepool {
            if let page = document.page(at: i) {
                if let compressedPage = try? compressPDFPage(page) {
                    newDocument.insert(compressedPage, at: i)
                } else {
                    newDocument.insert(page, at: i)
                }
            }
        }
    }

    newDocument.write(to: outputURL)
    let compressedSize = (try? fileManager.attributesOfItem(atPath: outputURL.path)[.size] as? Int64) ?? 0
    let savedPercentage = originalSize > 0 ? Int(((Double(originalSize) - Double(compressedSize)) / Double(originalSize)) * 100) : 0

    return PDFCompressionResult(
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressedURL: outputURL.path,
        savedPercentage: max(0, savedPercentage)
    )
}

// MARK: - PDF Page Compression Helper

private func compressPDFPage(_ page: PDFPage) throws -> PDFPage? {
    let pageRect = page.bounds(for: .mediaBox)
    let image = NSImage(size: pageRect.size)
    image.lockFocus()
    if let context = NSGraphicsContext.current?.cgContext {
        // Fill background with white
        context.setFillColor(NSColor.white.cgColor)
        context.fill(pageRect)
        // Draw the PDF page
        page.draw(with: .mediaBox, to: context)
    }
    image.unlockFocus()

    guard let tiffData = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiffData),
          let compressedData = bitmap.representation(
            using: .jpeg,
            properties: [.compressionFactor: 0.5]
          ),
          let compressedImage = NSImage(data: compressedData) else {
        return nil
    }
    return PDFPage(image: compressedImage)
}
