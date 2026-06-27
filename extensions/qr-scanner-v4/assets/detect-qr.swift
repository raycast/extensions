import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else {
    fputs("Usage: detect-qr <image-path>\n", stderr)
    exit(1)
}

let imagePath = args[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Error: Could not load image\n", stderr)
    exit(1)
}

let request = VNDetectBarcodesRequest()
request.symbologies = [.qr]

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    fputs("Error: \(error.localizedDescription)\n", stderr)
    exit(1)
}

guard let results = request.results else {
    exit(0)
}

for result in results {
    if let payload = result.payloadStringValue {
        print(payload)
    }
}
