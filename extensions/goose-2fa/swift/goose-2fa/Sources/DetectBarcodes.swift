import Foundation
import ImageIO
import Vision
import RaycastSwiftMacros

enum BarcodeError: Error {
    case unreadableImage
}

@raycast func detectBarcodes(imagePath: String) throws -> [String] {
    let url = URL(fileURLWithPath: imagePath)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw BarcodeError.unreadableImage
    }
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr, .aztec, .code128]
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    return (request.results ?? []).compactMap { observation in
        guard let payload = observation.payloadStringValue, !payload.isEmpty else { return nil }
        return payload
    }
}
