import Foundation
import FoundationModels
import RaycastSwiftMacros

public enum ModelError: Error {
  case modelUnavailable(String)
}

@raycast func runModel(prompt: String) async throws -> String {
  if #available(macOS 26.0, *) {
    let model = SystemLanguageModel.default

    guard model.availability == .available else {
      if case .unavailable(let reason) = model.availability {
        throw ModelError.modelUnavailable("\(reason)")
      }
      throw ModelError.modelUnavailable("Unknown reason")
    }

    let session = LanguageModelSession()

    let response = try await session.respond(to: prompt)
    return response.content
  } else {
    throw ModelError.modelUnavailable("Raycast Swift does not support this macOS version.")
  }
}

/// - attention: This is frown upon in Swift :)
extension String: Swift.Error {}
