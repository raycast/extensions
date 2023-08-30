import AppKit
import Vision

guard #available(OSX 10.15, *) else {
  print("macOS 10.15 or greater required")
  exit(1)
}

class NumberExtractor {
    func extractNumbers(fromPath imagePath: String, completionHandler: @escaping ([String]?) -> Void) {
        guard let image = NSImage(contentsOfFile: imagePath) else {
            completionHandler(nil)
            return
        }

        guard let ciImage = CIImage(data: image.tiffRepresentation!) else {
                    completionHandler(nil)
                    return
                }

        let request = VNRecognizeTextRequest(completionHandler: { (request, error) in
            if let error = error {
                print("Text recognition error: \(error)")
                completionHandler(nil)
                return
            }

            var text: [String] = []
            if let results = request.results as? [VNRecognizedTextObservation] {
                for result in results {
                    for observation in result.topCandidates(1) {
                        text.append(observation.string)
                    }
                }
            }

            completionHandler(text)
        })

        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = true
        request.customWords = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]

        let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
        do {
            try handler.perform([request])
        } catch {
            print("Image request handler error: \(error)")
            completionHandler(nil)
        }
    }
}

let numberExtractor = NumberExtractor()
let arguments = CommandLine.arguments

if arguments.count != 2 {
    print("Usage: screen-math <image path>")
    exit(1)
}

numberExtractor.extractNumbers(fromPath: arguments[1]) { numbers in
    if let numbers = numbers {
        print(numbers)
        exit(0)
    } else {
        print("Failed to extract numbers.")
        exit(1)
    }
}

RunLoop.main.run()
