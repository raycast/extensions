import Foundation
import Vision
import AppKit

// Check if input file path is provided
guard CommandLine.arguments.count > 1 else {
    print("Error: No image path provided")
    exit(1)
}

let imagePath = CommandLine.arguments[1]

// Load image
guard let image = NSImage(contentsOfFile: imagePath) else {
    print("Error: Could not load image at \(imagePath)")
    exit(1)
}

// Convert to CGImage
guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("Error: Could not convert to CGImage")
    exit(1)
}

// Create request handler
let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])

// Create text recognition request
let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        print("Error: Could not process observations")
        exit(1)
    }
    
    let recognizedStrings = observations.compactMap { observation in
        // Return the top candidate
        return observation.topCandidates(1).first?.string
    }
    
    // Join all strings with newlines
    print(recognizedStrings.joined(separator: "\n"))
}

// Configure for accuracy and language
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
// Automatically detects language, works great for Chinese + English mixed

do {
    try requestHandler.perform([request])
} catch {
    print("Error: \(error)")
    exit(1)
}
