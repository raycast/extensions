import AppKit
import Foundation
import Vision

struct Result: Codable {
    let codes: [String]
    let source: String
}

enum QRFailure: LocalizedError {
    case noImage, unreadableImage, noQRCode, usage

    var errorDescription: String? {
        switch self {
        case .noImage: return "No image found in the clipboard. Copy a screenshot or image file first."
        case .unreadableImage: return "Unable to read this image. Try a PNG or JPEG file."
        case .noQRCode: return "No QR code found in the image. Try a clearer image."
        case .usage: return "Usage: qr-helper decode-clipboard | decode-file <path>"
        }
    }
}

func clipboardImage() throws -> (NSImage, String) {
    // Walk pasteboard items in order, choosing the first item with an image representation.
    for item in NSPasteboard.general.pasteboardItems ?? [] {
        if let value = item.string(forType: .fileURL),
           let url = URL(string: value), url.isFileURL,
           let image = NSImage(contentsOf: url) {
            return (image, "clipboard-file")
        }
        let types = [NSPasteboard.PasteboardType.png, .tiff] + item.types.filter {
            NSImage.imageTypes.contains($0.rawValue)
        }
        for type in types {
            if let data = item.data(forType: type), let image = NSImage(data: data) {
                return (image, "clipboard-image")
            }
        }
    }
    if let image = NSImage(pasteboard: .general) { return (image, "clipboard-image") }
    throw QRFailure.noImage
}

func decode(_ image: NSImage, source: String) throws -> Result {
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw QRFailure.unreadableImage
    }
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([request])
    let observations = (request.results ?? []).sorted {
        if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.05 {
            return $0.boundingBox.midY > $1.boundingBox.midY
        }
        return $0.boundingBox.minX < $1.boundingBox.minX
    }
    var codes: [String] = []
    for observation in observations {
        if let payload = observation.payloadStringValue, !codes.contains(payload) { codes.append(payload) }
    }
    if codes.isEmpty { throw QRFailure.noQRCode }
    return Result(codes: codes, source: source)
}

do {
    let arguments = Array(CommandLine.arguments.dropFirst())
    let image: NSImage
    let source: String
    switch arguments.first {
    case "decode-clipboard":
        (image, source) = try clipboardImage()
    case "decode-file" where arguments.count == 2:
        guard let fileImage = NSImage(contentsOfFile: arguments[1]) else { throw QRFailure.unreadableImage }
        image = fileImage
        source = "file"
    default:
        throw QRFailure.usage
    }
    let data = try JSONEncoder().encode(decode(image, source: source))
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
