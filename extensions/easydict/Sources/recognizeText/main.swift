// The Swift Programming Language
// https://docs.swift.org/swift-book
// swift build -c release

import Cocoa
import Vision

let recognitionLevel = VNRequestTextRecognitionLevel.accurate
let usesLanguageCorrection = true

func captureScreen() -> CGImage? {
    let screenRect = NSScreen.main?.frame ?? .zero
    let imageRef = CGWindowListCreateImage(screenRect, .optionOnScreenOnly, kCGNullWindowID, .bestResolution)
    return imageRef
}

func captureSelectedArea() -> CGImage? {
    let task = Process()
    task.launchPath = "/usr/sbin/screencapture"
    task.arguments = ["-i", "-c"]
    task.launch()
    task.waitUntilExit()

    guard let pasteboard = NSPasteboard.general.pasteboardItems?.first,
          let fileType = pasteboard.types.first,
          let data = pasteboard.data(forType: fileType),
          let image = NSImage(data: data) else {
        fputs("Error: failed to capture selected area\n", stderr)
        return nil
    }

    var proposedRect = NSRect.zero
    guard let imgRef = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
        fputs("Error: failed to convert NSImage to CGImage for captured area\n", stderr)
        return nil
    }

    return imgRef
}

func main() -> Int32 {
    let imgRef: CGImage? = captureSelectedArea()

    guard let capturedImage = imgRef else {
        fputs("Error: failed to capture image\n", stderr)
        return 1
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = recognitionLevel
    request.usesLanguageCorrection = usesLanguageCorrection
    if #available(macOS 13.0, *) {
        request.automaticallyDetectsLanguage = true
    }

// "en-US", "fr-FR", "it-IT", "de-DE", "es-ES", "pt-BR", "zh-Hans", "zh-Hant", "yue-Hans", "yue-Hant", "ko-KR", "ja-JP", "ru-RU", "uk-UA"
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US", "ja-JP", "fr-FR", "de-DE", "es-ES", "pt-BR", "it-IT", "ko-KR", "ru-RU", "uk-UA"]

    do {
        try VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])
    } catch {
        fputs("Error: \(error.localizedDescription)", stderr)
        return 1
    }
    
    guard let observations = request.results else {
        fputs("Error: could not get text recognition results", stderr)
        return 1
    }
    
    let obs = observations
        .map { $0.topCandidates(1).first?.string ?? "" }
        .joined(separator: "\n")
    
    print(obs)
    
    return 0
}

exit(main())
