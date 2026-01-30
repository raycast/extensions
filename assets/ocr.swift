import Cocoa
import Vision

// 1. Validate Arguments
guard CommandLine.arguments.count > 1 else {
    print("Error: Missing image path argument")
    exit(1)
}
let imagePath = CommandLine.arguments[1]

// 2. Load Image
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("Error: Unable to load image at \(imagePath)")
    exit(1)
}

// 3. Configure OCR for English Structure
let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    
    // We join with simple newlines here.
    // The "Smart Formatting" in TypeScript will handle the logic of merging lines vs. keeping paragraphs.
    let recognizedText = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    print(recognizedText)
}

// 4. Strict English Configuration
// By focusing only on English, we reduce false positives (like reading English as Korean).
request.recognitionLanguages = ["en-US"] 
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

// 5. Execute
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])