import Cocoa
import Vision

let MODE: VNRequestTextRecognitionLevel
let USE_LANG_CORRECTION: Bool
var LANGUAGES: [String]

let args = CommandLine.arguments
let fullscreen = args.contains("--fullscreen")
let fast = args.contains("--fast")
let languageCorrection = args.contains("--languagecorrection")
let languagesIndex = args.firstIndex(of: "--languages")
let ignoreLineBreaks = args.contains("--ignorelinebreaks")
let customWordsListIndex = args.firstIndex(of: "--customwordslist")
var CUSTOM_WORDS_LIST: [String]
if let index = customWordsListIndex, index + 1 < args.count {
    CUSTOM_WORDS_LIST = args[index + 1].components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
} else {
    CUSTOM_WORDS_LIST = []
}

MODE = fast ? .fast : .accurate
USE_LANG_CORRECTION = languageCorrection

if let index = languagesIndex, index + 1 < args.count {
    LANGUAGES = args[index + 1].components(separatedBy: " ")
} else {
    LANGUAGES = ["en-US"]
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
          let image = NSImage(data: data)
    else {
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

    let request = VNRecognizeTextRequest { request, _ in
        var output = ""
        guard let observations = request.results as? [VNRecognizedTextObservation] else {
            print("No text observations found.")
            return
        }
        for observation in observations {
            guard let candidate = observation.topCandidates(1).first else {
                continue
            }
            if !output.isEmpty {
                output.append(ignoreLineBreaks ? " " : "\n")
            }
            output.append(candidate.string)
        }
        print(output)
    }
    request.recognitionLevel = MODE
    request.usesLanguageCorrection = USE_LANG_CORRECTION
    request.recognitionLanguages = LANGUAGES
    request.customWords = CUSTOM_WORDS_LIST
    try? VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])

    return 0
}

exit(main())
