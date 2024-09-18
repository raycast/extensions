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

func captureScreen(keepImage: Bool = false) -> CGImage? {
    let screenRect = NSScreen.main?.frame ?? .zero
    let imageRef = CGWindowListCreateImage(
        screenRect, .optionOnScreenOnly, kCGNullWindowID, .bestResolution)

    if keepImage, let imageRef = imageRef {
        let image = NSImage(cgImage: imageRef, size: NSZeroSize)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.writeObjects([image])
    }

    return imageRef
}

func randomPngPath() -> String {
    let tempDir = NSTemporaryDirectory()
    let uuid = UUID().uuidString
    return "\(tempDir)/\(uuid).png"
}

func captureSelectedArea(keepImage: Bool = false) -> CGImage? {
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
            fputs("Error: failed to capture selected area\n", stderr)
            return nil
        }
        image = NSImage(data: data)
    } else {
        guard let imgData = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
            let img = NSImage(data: imgData)
        else {
            fputs("Error: failed to load image from file\n", stderr)
            return nil
        }
        image = img
    }

    var proposedRect = NSRect.zero
    guard let imgRef = image?.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
        fputs("Error: failed to convert NSImage to CGImage for captured area\n", stderr)
        return nil
    }

    // Delete the file after use if keepImage is false
    if !keepImage {
        do {
            try FileManager.default.removeItem(atPath: filePath)
        } catch {
            fputs("Error: failed to delete temporary file\n", stderr)
        }
    }

    return imgRef
}

func main() -> Int32 {
    let args = CommandLine.arguments
    let fullscreen = args.contains("--fullscreen")
    let keepImage = args.contains("--keepImage")
    let imgRef: CGImage?

    if fullscreen {
        imgRef = captureScreen(keepImage: keepImage)
    } else {
        imgRef = captureSelectedArea(keepImage: keepImage)
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
