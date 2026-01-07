import Foundation
import Vision
import AppKit

func performOCR(imagePath: String) {
    let url = URL(fileURLWithPath: imagePath)
    guard let image = NSImage(contentsOf: url) else {
        print("Error: Could not load image at \(imagePath)")
        exit(1)
    }

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("Error: Could not create CGImage")
        exit(1)
    }

    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    let request = VNRecognizeTextRequest { (request, error) in
        if let error = error {
            print("Error: \(error.localizedDescription)")
            exit(1)
        }

        guard let observations = request.results as? [VNRecognizedTextObservation] else {
            return
        }

        let recognizedStrings = observations.compactMap { observation in
            observation.topCandidates(1).first?.string
        }

        print(recognizedStrings.joined(separator: "\n"))
    }

    // Set recognition level to accurate
    request.recognitionLevel = .accurate
    // Enable language detection if needed, but default usually works fine for common languages
    
    do {
        try requestHandler.perform([request])
    } catch {
        print("Error: \(error.localizedDescription)")
        exit(1)
    }
}

let arguments = CommandLine.arguments
if arguments.count < 2 {
    print("Usage: swift ocr.swift <image-path>")
    exit(1)
}

performOCR(imagePath: arguments[1])
