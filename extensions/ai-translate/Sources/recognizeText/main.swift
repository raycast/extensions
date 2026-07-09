import Cocoa
import Vision

let recognitionLevel = VNRequestTextRecognitionLevel.accurate
let usesLanguageCorrection = true

func captureSelectedArea() -> CGImage? {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    task.arguments = ["-i", "-c"]

    do {
        try task.run()
    } catch {
        fputs("Error: failed to start screencapture: \(error.localizedDescription)\n", stderr)
        return nil
    }

    task.waitUntilExit()
    guard task.terminationStatus == 0 else {
        fputs("Error: screenshot cancelled\n", stderr)
        return nil
    }

    guard let item = NSPasteboard.general.pasteboardItems?.first else {
        fputs("Error: no image on pasteboard\n", stderr)
        return nil
    }

    for type in item.types {
        guard let data = item.data(forType: type), let image = NSImage(data: data) else {
            continue
        }

        var proposedRect = NSRect.zero
        if let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) {
            return cgImage
        }
    }

    fputs("Error: failed to convert captured image\n", stderr)
    return nil
}

func imageFromFile(_ path: String) -> CGImage? {
    guard let image = NSImage(contentsOfFile: path) else {
        fputs("Error: failed to read image file\n", stderr)
        return nil
    }

    var proposedRect = NSRect.zero
    guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
        fputs("Error: failed to convert image file\n", stderr)
        return nil
    }

    return cgImage
}

func main() -> Int32 {
    let sourceImage = CommandLine.arguments.count > 1
        ? imageFromFile(CommandLine.arguments[1])
        : captureSelectedArea()

    guard let capturedImage = sourceImage else {
        return 1
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = recognitionLevel
    request.usesLanguageCorrection = usesLanguageCorrection
    if #available(macOS 13.0, *) {
        request.automaticallyDetectsLanguage = true
    }
    request.recognitionLanguages = [
        "zh-Hans",
        "zh-Hant",
        "en-US",
        "ja-JP",
        "ko-KR",
        "fr-FR",
        "de-DE",
        "es-ES",
        "pt-BR",
        "it-IT",
        "ru-RU",
        "uk-UA"
    ]

    do {
        try VNImageRequestHandler(cgImage: capturedImage, options: [:]).perform([request])
    } catch {
        fputs("Error: \(error.localizedDescription)\n", stderr)
        return 1
    }

    guard let observations = request.results else {
        fputs("Error: could not get text recognition results\n", stderr)
        return 1
    }

    let recognizedText = observations
        .compactMap { $0.topCandidates(1).first?.string }
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
        .joined(separator: "\n")

    print(recognizedText)
    return recognizedText.isEmpty ? 2 : 0
}

exit(main())
