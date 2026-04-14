import Vision
import AppKit
import Foundation

guard CommandLine.arguments.count > 1 else {
    fputs("Usage: ocr <image-path>\n", stderr)
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: imagePath)

guard let image = NSImage(contentsOf: url),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Error: cannot load image at \(imagePath)\n", stderr)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ko", "en", "ja", "zh-Hans", "zh-Hant", "fr", "de", "es"]

let handler = VNImageRequestHandler(cgImage: cgImage)
try handler.perform([request])

let results = request.results ?? []
for observation in results {
    if let text = observation.topCandidates(1).first?.string {
        print(text)
    }
}
