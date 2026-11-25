import Foundation
import FoundationModels
import RaycastSwiftMacros

struct ModelAvailability: Encodable {
  let status: String
  let reason: String?
}

@raycast func modelAvailability() -> ModelAvailability {
  switch SystemLanguageModel.default.availability {
  case .available:
    return ModelAvailability(status: "available", reason: nil)
  case .unavailable(.appleIntelligenceNotEnabled):
    return ModelAvailability(status: "unavailable", reason: "appleIntelligenceNotEnabled")
  case .unavailable(.deviceNotEligible):
    return ModelAvailability(status: "unavailable", reason: "deviceNotEligible")
  case .unavailable(.modelNotReady):
    return ModelAvailability(status: "unavailable", reason: "modelNotReady")
  default:
    return ModelAvailability(status: "unavailable", reason: "unknown")
  }
}
