import Cocoa
import RaycastSwiftMacros
import Vision

@raycast
func recognizeTextFromScreenshot() -> String {
  let imgRef = captureSelectedArea()
  
  guard let capturedImage = imgRef else {
    return "Error: failed to capture image"
  }
  
  var recognizedText = ""
  let request = VNRecognizeTextRequest { request, _ in
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
      recognizedText = "No text observations found."
      return
    }
    for observation in observations {
      guard let candidate = observation.topCandidates(1).first else {
        continue
      }
      if !recognizedText.isEmpty {
        recognizedText.append("\n")
      }
      recognizedText.append(candidate.string)
    }
  }
  
  // Use fast mode for better performance
  request.recognitionLevel = .fast
  request.usesLanguageCorrection = true
  // Automatically detect language
  if #available(macOS 13.0, *) {
    request.automaticallyDetectsLanguage = true
  }
  
  do {
    try VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])
  } catch {
    return "Error: \(error.localizedDescription)"
  }
  
  return recognizedText
}

func captureSelectedArea() -> CGImage? {
  let filePath = randomPngPath()
  let task = Process()
  task.launchPath = "/usr/sbin/screencapture"
  // Capture without sound (-x flag)
  let arguments: [String] = ["-i", "-x", filePath]
  task.arguments = arguments
  task.launch()
  task.waitUntilExit()
  
  guard let imgData = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
        let image = NSImage(data: imgData)
  else {
    return nil
  }
  
  var proposedRect = NSRect.zero
  guard let imgRef = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    return nil
  }
  
  try? FileManager.default.removeItem(atPath: filePath)
  
  return imgRef
}

func randomPngPath() -> String {
  let tempDir = NSTemporaryDirectory()
  let uuid = UUID().uuidString
  return "\(tempDir)/\(uuid).png"
}
