import Foundation
import Vision
import AppKit
import QuartzCore

let args = CommandLine.arguments

let deeplink = args[args.count - 6]
let imagePath = args[args.count - 5]
let preferLang = args[args.count - 4]
let customWords = args[args.count - 3]
let level = args[args.count - 2]
let mode = args[args.count - 1]

// Create a CIImage object from the contents of the URL
let imageUrl = URL(fileURLWithPath: imagePath)
guard let image = CIImage(contentsOf: imageUrl) else {
    fatalError("Failed to create CIImage from URL: \(imageUrl)")
}

let requestHandler = VNImageRequestHandler(ciImage: image, options: [:])
let request = VNRecognizeTextRequest()
if(customWords.count > 0){
    request.customWords = customWords.split(separator: ",").map {
        $0.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    request.usesLanguageCorrection = true
}
// ["en-US", "fr-FR", "it-IT", "de-DE", "es-ES", "pt-BR", "zh-Hans", "zh-Hant"]
request.recognitionLanguages = [ preferLang ]
request.recognitionLevel = (level == "fast" ? .fast : .accurate)

do {
    try requestHandler.perform([request])
} catch {
    fputs("Error: \(error.localizedDescription)", stderr)
    exit(1)
}

guard let observations = request.results else {
    fputs("Error: could not get text recognition results", stderr)
    exit(1)
}

let rep: NSCIImageRep = NSCIImageRep(ciImage: image)
let imageRef: NSImage = NSImage(size: rep.size)
imageRef.addRepresentation(rep)
let imageSize = imageRef.size
var imageRect = NSRect(origin: .zero, size: imageSize)


var output = ""
var previousY = CGFloat.infinity
var previousHeight: CGFloat = 0

for observation in observations {
    guard let topCandidate = observation.topCandidates(1).first else { continue }
    let boundingBox = observation.boundingBox
    let rect = VNImageRectForNormalizedRect(boundingBox,
                                            Int(imageRef.size.width),
                                            Int(imageRef.size.height))
    imageRef.lockFocus()
    let color = NSColor.blue
    let strokeWidth: CGFloat = 2.0
    let context = NSGraphicsContext.current?.cgContext
    context?.setStrokeColor(color.cgColor)
    context?.setLineWidth(strokeWidth)
    context?.stroke(rect)
    imageRef.unlockFocus()

    let y = boundingBox.origin.y
    let height = boundingBox.size.height

    if output.count == 0 {
        output = topCandidate.string
    }else if previousHeight > 0 && abs(y - previousY) < (height + previousHeight)/3 {
        output += "\t\(topCandidate.string)"
    } else {
        output += "\n\(topCandidate.string)"
    }
    previousHeight = height
    previousY = y
}

let outputURL = URL(fileURLWithPath: imagePath)

guard let imageData = imageRef.tiffRepresentation else {
    fputs("Error: could not get image data", stderr)
    exit(1)
}

let bitmapImageRep = NSBitmapImageRep(data: imageData)
let properties: [NSBitmapImageRep.PropertyKey : Any] = [:]

guard let pngData = bitmapImageRep?.representation(using: .png, properties: properties) else {
    fputs("Error: could not convert image to PNG data", stderr)
    exit(1)
}

do {
    try pngData.write(to: outputURL)
} catch {
    fputs("Error: \(error.localizedDescription)", stderr)
    exit(1)
}

if(output.count == 0){
    fputs("Error: Not text found", stderr)
    exit(1)
}

if(deeplink == "deeplink"){
    let absolutePath = URL(fileURLWithPath: imagePath, relativeTo: URL(fileURLWithPath: FileManager.default.currentDirectoryPath)).standardizedFileURL.path

    let responseMessages = ["txt": output,
                            "mode": mode,
                            "img": absolutePath]
    do {
        let jsonData = try JSONSerialization.data(withJSONObject: responseMessages, options: [])
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            let encodedString = jsonString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let url = URL(string: "raycast://extensions/douo/openai-translator/translate?context=\(encodedString)")
            NSWorkspace.shared.open(url!)
        }
    } catch {
        print("Error converting dictionary to JSON: \(error.localizedDescription)")
    }
}else{
    print(output)
}
