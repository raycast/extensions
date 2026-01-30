import Cocoa
import Vision

// 1. Get image path
guard CommandLine.arguments.count > 1 else {
    print("Error: Missing image path argument")
    exit(1)
}
let imagePath = CommandLine.arguments[1]

// 2. Load image
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("Error: Unable to load image at \(imagePath)")
    exit(1)
}

// 3. Create OCR request with Row Grouping Logic
let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    
    // Config: How close vertical positions must be to be considered the "same line" (0.0~1.0)
    let yThreshold: CGFloat = 0.02 
    
    // A helper struct to hold text and position
    struct TextBlock {
        let text: String
        let x: CGFloat
        let y: CGFloat // Center Y
    }
    
    var blocks: [TextBlock] = []
    
    for obs in observations {
        guard let candidate = obs.topCandidates(1).first else { continue }
        // Vision coordinates: (0,0) is bottom-left. We use 1-y to think from top-down.
        let box = obs.boundingBox
        let centerY = 1.0 - (box.minY + box.maxY) / 2
        let minX = box.minX
        
        blocks.append(TextBlock(text: candidate.string, x: minX, y: centerY))
    }
    
    // Sort by Y first (Top to Bottom)
    blocks.sort { $0.y < $1.y }
    
    var lines: [[TextBlock]] = []
    
    for block in blocks {
        if let lastLineIndex = lines.indices.last,
           let lastBlock = lines[lastLineIndex].last,
           abs(lastBlock.y - block.y) < yThreshold {
            // Same line
            lines[lastLineIndex].append(block)
        } else {
            // New line
            lines.append([block])
        }
    }
    
    // Sort each line by X (Left to Right) and join
    let output = lines.map { line in
        line.sorted { $0.x < $1.x }
            .map { $0.text }
            .joined(separator: "   ") // Use 3 spaces to separate columns visually
    }.joined(separator: "\n")
    
    print(output)
}

// Crucial: Use accurate mode for layout detection
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = true

// 4. Perform request
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])