import Cocoa
import RaycastSwiftMacros
import Vision

@raycast
func recognizeText(
  fullscreen: Bool,
  keepImage: Bool,
  fast: Bool,
  languageCorrection: Bool,
  ignoreLineBreaks: Bool,
  customWordsList: [String],
  languages: [String]
) -> String {
  let mode: VNRequestTextRecognitionLevel = fast ? .fast : .accurate
  let useLangCorrection: Bool = languageCorrection
  let languagesList: [String] = languages.isEmpty ? ["en-US"] : languages
  let customWords: [String] = customWordsList

  let imgRef: CGImage?
  if fullscreen {
    imgRef = captureScreen(keepImage: keepImage)
  } else {
    imgRef = captureSelectedArea(keepImage: keepImage)
  }

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
        recognizedText.append(ignoreLineBreaks ? " " : "\n")
      }
      recognizedText.append(candidate.string)
    }
  }
  request.recognitionLevel = mode
  request.usesLanguageCorrection = useLangCorrection
  request.recognitionLanguages = languagesList
  request.customWords = customWords

  do {
    try VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])
  } catch {
    return "Error: \(error.localizedDescription)"
  }

  return recognizedText
}

@raycast
func detectBarcode(
  keepImage: Bool
) -> String {
  let imgRef = captureSelectedArea(keepImage: keepImage)

  guard let capturedImage = imgRef else {
    return "Error: failed to capture image"
  }

  var detectedText = ""
  let semaphore = DispatchSemaphore(value: 0)
  
  let request = VNDetectBarcodesRequest { request, error in
    defer { semaphore.signal() }
    
    if let error = error {
      detectedText = "Error: \(error.localizedDescription)"
      return
    }
    
    guard let observations = request.results as? [VNBarcodeObservation] else {
      detectedText = "No barcodes or QR codes detected"
      return
    }
    
    for observation in observations {
      let barcodeValue = observation.payloadStringValue ?? "Unknown value"
      if !detectedText.isEmpty {
        detectedText += "\n"
      }
      detectedText += barcodeValue
    }
    
    if detectedText.isEmpty {
      detectedText = "No barcodes or QR codes detected"
    } else {
      detectedText = detectedText.trimmingCharacters(in: .whitespacesAndNewlines)
    }
  }

  DispatchQueue.global(qos: .userInitiated).async {
    do {
      try VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])
    } catch {
      detectedText = "Error: \(error.localizedDescription)"
      semaphore.signal()
    }
  }
  
  semaphore.wait()
  return detectedText
}

func captureScreen(keepImage: Bool) -> CGImage? {
  let screenRect = NSScreen.main?.frame ?? .zero
  let imageRef = CGWindowListCreateImage(
    screenRect, .optionOnScreenOnly, kCGNullWindowID, .bestResolution
  )

  if keepImage, let imageRef = imageRef {
    let image = NSImage(cgImage: imageRef, size: NSSize.zero)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.writeObjects([image])
  }

  return imageRef
}

func captureSelectedArea(keepImage: Bool) -> CGImage? {
  let filePath = randomPngPath()
  let task = Process()
  task.launchPath = "/usr/sbin/screencapture"
  task.arguments = ["-i", keepImage ? "-c" : filePath]
  task.launch()
  task.waitUntilExit()

  var image: NSImage?
  if keepImage {
    guard let pasteboard = NSPasteboard.general.pasteboardItems?.first,
          let fileType = pasteboard.types.first,
          let data = pasteboard.data(forType: fileType)
    else {
      return nil
    }
    image = NSImage(data: data)
  } else {
    guard let imgData = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
          let img = NSImage(data: imgData)
    else {
      return nil
    }
    image = img
  }

  var proposedRect = NSRect.zero
  guard let imgRef = image?.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    return nil
  }

  if !keepImage {
    try? FileManager.default.removeItem(atPath: filePath)
  }

  return imgRef
}

func randomPngPath() -> String {
  let tempDir = NSTemporaryDirectory()
  let uuid = UUID().uuidString
  return "\(tempDir)/\(uuid).png"
}
