// Functions exported to TypeScript. Import them with `from "swift:../swift"`.

import Foundation
import RaycastSwiftMacros

@raycast func recognizeTextInFile(
  path: String,
  languages: [String],
  autoDetectLanguage: Bool,
  mergeLines: Bool,
  tabBetweenColumns: Bool
) throws -> OCRResult {
  let image = try loadImage(atPath: path)
  let options = OCROptions(
    languages: languages, autoDetectLanguage: autoDetectLanguage, mergeLines: mergeLines,
    tabBetweenColumns: tabBetweenColumns)
  return try recognizeText(in: image, options: options)
}

@raycast func recognizeTextInFiles(
  paths: [String],
  languages: [String],
  autoDetectLanguage: Bool,
  mergeLines: Bool,
  tabBetweenColumns: Bool
) throws -> OCRResult {
  let options = OCROptions(
    languages: languages, autoDetectLanguage: autoDetectLanguage, mergeLines: mergeLines,
    tabBetweenColumns: tabBetweenColumns)
  return try recognizeText(inFiles: paths, options: options)
}

@raycast func recognizeTextOnClipboard(
  languages: [String],
  autoDetectLanguage: Bool,
  mergeLines: Bool,
  tabBetweenColumns: Bool
) throws -> OCRResult {
  let image = try loadImageFromClipboard()
  let options = OCROptions(
    languages: languages, autoDetectLanguage: autoDetectLanguage, mergeLines: mergeLines,
    tabBetweenColumns: tabBetweenColumns)
  return try recognizeText(in: image, options: options)
}

/// Started before the screen capture begins: warms Vision up while the user drags, waits for the
/// `readyMarker` written once the PNG is complete, then recognizes it. Throws "cancelled" on `cancelMarker`.
@raycast func recognizeCaptureWhenReady(
  path: String,
  readyMarker: String,
  cancelMarker: String,
  timeoutSeconds: Double,
  languages: [String],
  autoDetectLanguage: Bool,
  mergeLines: Bool,
  tabBetweenColumns: Bool
) throws -> OCRResult {
  warmUpVision()
  try waitForCapture(readyMarker: readyMarker, cancelMarker: cancelMarker, timeoutSeconds: timeoutSeconds)
  let image = try loadImage(atPath: path)
  let options = OCROptions(
    languages: languages, autoDetectLanguage: autoDetectLanguage, mergeLines: mergeLines,
    tabBetweenColumns: tabBetweenColumns)
  return try recognizeText(in: image, options: options)
}

/// Checks Screen Recording permission for Raycast; `request` shows the system prompt when missing.
@raycast func hasScreenCaptureAccess(request: Bool) -> Bool {
  screenCaptureAccess(request: request)
}
