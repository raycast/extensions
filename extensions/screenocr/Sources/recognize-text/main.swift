import Cocoa
import Vision


let MODE = VNRequestTextRecognitionLevel.accurate
let USE_LANG_CORRECTION = false
var REVISION: Int
if #available(macOS 11, *) {
    REVISION = VNRecognizeTextRequestRevision2
} else {
    REVISION = VNRecognizeTextRequestRevision1
}

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
    let args = CommandLine.arguments
    let fullscreen = args.contains("--fullscreen")
    let imgRef: CGImage?

    if fullscreen {
        imgRef = captureScreen()
    } else {
        imgRef = captureSelectedArea()
    }

    guard let capturedImage = imgRef else {
        fputs("Error: failed to capture image\n", stderr)
        return 1
    }

    let request = VNRecognizeTextRequest { (request, error) in
        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        let obs: [String] = observations.map { $0.topCandidates(1).first?.string ?? "" }
        print(obs.joined(separator: "\n"))
    }
    request.recognitionLevel = MODE
    request.usesLanguageCorrection = USE_LANG_CORRECTION
    request.revision = REVISION

    try? VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])

    return 0
}

exit(main())
