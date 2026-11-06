import LocalAuthentication
import RaycastSwiftMacros

/// Whether the device owner can authenticate (Touch ID, Apple Watch or device password).
@raycast func canAuthenticateDeviceOwner() -> Bool {
  LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
}

/// Prompts for device owner authentication. Returns `false` when the user cancels.
@raycast func authenticateDeviceOwner(reason: String) async throws -> Bool {
  do {
    return try await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
  } catch let error as LAError where [.userCancel, .systemCancel, .appCancel].contains(error.code) {
    return false
  }
}
