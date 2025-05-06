#!/usr/bin/env xcrun swift

// A minimal VisionKit OCR script.
// Saves a screenshot of the user’s selection, runs VisionKit OCR on it,
// and prints the resulting text to stdout.

import Cocoa
import Vision

// 1) Prompt for selection & capture
let task = Process()
task.launchPath = "/usr/sbin/screencapture"
task.arguments = ["-i", "-s", "/tmp/raycast_ocr.png"]
task.launch()
task.waitUntilExit()

// 2) Load image
guard let nsImage = NSImage(contentsOfFile: "/tmp/raycast_ocr.png"),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  exit(1)
}

// 3) OCR request
let request = VNRecognizeTextRequest { req, err in
  guard err == nil else { exit(1) }
  let text = req.results?
               .compactMap { ($0 as? VNRecognizedTextObservation)?
                              .topCandidates(1).first?.string }
               .joined(separator: "\n") ?? ""
  print(text)
}
request.recognitionLevel = .accurate

// 4) Perform
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])