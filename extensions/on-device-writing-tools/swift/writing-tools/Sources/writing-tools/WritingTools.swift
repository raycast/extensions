import FoundationModels
import NaturalLanguage
import RaycastSwiftMacros

enum WritingToolsError: Error, CustomStringConvertible {
  case unavailable(String)
  var description: String {
    switch self {
    case .unavailable(let reason): "Apple Intelligence is unavailable (\(reason)). Turn it on in System Settings → Apple Intelligence & Siri."
    }
  }
}

/// Runs `text` through the on-device Apple Intelligence model with `instructions`.
@raycast func transform(instructions: String, text: String) async throws -> String {
  let model = SystemLanguageModel.default
  guard case .available = model.availability else {
    throw WritingToolsError.unavailable(String(describing: model.availability))
  }

  // The small on-device model drifts to the instruction language (English); naming the input language pins it.
  var instructions = instructions
  if let code = NLLanguageRecognizer.dominantLanguage(for: text)?.rawValue,
     let name = Locale(identifier: "en").localizedString(forLanguageCode: code) {
    instructions += " The text is in \(name). Write your answer in \(name), never in another language."
  }

  let session = LanguageModelSession(model: model, instructions: instructions)
  return try await session.respond(to: text).content.trimmingCharacters(in: .whitespacesAndNewlines)
}
