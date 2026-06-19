import AppKit
import Foundation
import PDFKit
import RaycastSwiftMacros
import Vision

enum OCRError: Error, CustomStringConvertible {
    case noPaths
    case noClipboardImage
    case unsupportedFile(String)
    case pdfPageRenderFailed(String, Int)

    var description: String {
        switch self {
        case .noPaths:
            return "No file paths were provided."
        case .noClipboardImage:
            return "Clipboard does not contain an image or copied image/PDF file."
        case .unsupportedFile(let path):
            return "Unsupported or unreadable file: \(path)"
        case .pdfPageRenderFailed(let path, let page):
            return "Could not render PDF page \(page) in \(path)"
        }
    }
}

@raycast func ocrClipboard(_ languages: [String], _ level: String) throws -> String {
    let pasteboard = NSPasteboard.general

    if let urls = pasteboard.readObjects(forClasses: [NSURL.self]) as? [URL], !urls.isEmpty {
        return try ocrFiles(urls.map(\.path), languages, level)
    }

    if let image = imageFromPasteboard(pasteboard) {
        return try recognize(image, languages: languages, level: level)
    }

    throw OCRError.noClipboardImage
}

@raycast func ocrFiles(_ paths: [String], _ languages: [String], _ level: String) throws -> String {
    if paths.isEmpty {
        throw OCRError.noPaths
    }

    let showHeaders = paths.count > 1
    return try paths.map { path in
        let text = try recognizeFile(path, languages: languages, level: level)
        return showHeaders ? "\(URL(fileURLWithPath: path).lastPathComponent)\n\(text)" : text
    }.joined(separator: "\n\n")
}

func recognizeFile(_ path: String, languages: [String], level: String) throws -> String {
    let url = URL(fileURLWithPath: path)

    if url.pathExtension.lowercased() == "pdf", let document = PDFDocument(url: url) {
        return try (0..<document.pageCount).compactMap { index in
            guard let page = document.page(at: index) else {
                return nil
            }

            let text = try recognize(
                try imageFromPDFPage(page, path: path, index: index),
                languages: languages,
                level: level
            )
            return document.pageCount == 1 ? text : "Page \(index + 1)\n\(text)"
        }.joined(separator: "\n\n")
    }

    if let image = imageFromFile(url) {
        return try recognize(image, languages: languages, level: level)
    }

    throw OCRError.unsupportedFile(path)
}

func recognize(_ image: CGImage, languages: [String], level: String) throws -> String {
    var text = ""
    var requestError: Error?
    let request = VNRecognizeTextRequest { request, error in
        requestError = error
        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    }

    request.recognitionLevel = level == "fast" ? .fast : .accurate
    request.usesLanguageCorrection = true
    if !languages.isEmpty {
        request.recognitionLanguages = languages
    }

    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    if let requestError {
        throw requestError
    }
    return text
}

func imageFromFile(_ url: URL) -> CGImage? {
    guard let image = NSImage(contentsOf: url) else { return nil }
    return cgImage(from: image)
}

func imageFromPasteboard(_ pasteboard: NSPasteboard) -> CGImage? {
    guard let image = NSImage(pasteboard: pasteboard) else { return nil }
    return cgImage(from: image)
}

func cgImage(from image: NSImage) -> CGImage? {
    var rect = NSRect(origin: .zero, size: image.size)
    return image.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func imageFromPDFPage(_ page: PDFPage, path: String, index: Int) throws -> CGImage {
    let bounds = page.bounds(for: .mediaBox)
    let scale = 2.0
    let width = max(1, Int(bounds.width * scale))
    let height = max(1, Int(bounds.height * scale))
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw OCRError.pdfPageRenderFailed(path, index + 1)
    }

    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)

    guard let image = context.makeImage() else {
        throw OCRError.pdfPageRenderFailed(path, index + 1)
    }
    return image
}
