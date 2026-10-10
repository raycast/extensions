import Foundation
import RaycastSwiftMacros

private struct BridgeError: Error, CustomStringConvertible {
  let description: String
}

@raycast func redactImage(
  outputPath: String, style: String, padding: String, categories: String,
  extraWords: String, recognition: String, customRegex: String, inputPath: String?
) throws -> Report {
  do {
    let configuration = try parseConfiguration(
      inputPath: inputPath, outputPath: outputPath, style: style, padding: padding,
      categories: categories, extraWords: extraWords, recognition: recognition, customRegex: customRegex
    )
    return try redact(configuration)
  } catch {
    throw BridgeError(description: error.localizedDescription)
  }
}

@raycast func copyRedactedImage(outputPath: String, expectedChangeCount: Int?) throws {
  do {
    if let expectedChangeCount, expectedChangeCount < 0 {
      throw RedactionError(message: "Invalid clipboard change count. Scan the current clipboard again.")
    }
    try copyClipboardImage(outputURL: URL(fileURLWithPath: outputPath), expectedChangeCount: expectedChangeCount)
  } catch {
    throw BridgeError(description: error.localizedDescription)
  }
}
