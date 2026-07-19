// =============================================================================
// SIDECAR EXPORTS
// The @raycast global functions the TypeScript Native engine calls.
// -----------------------------------------------------------------------------
// Context: Each function is invoked as a fresh short-lived process by the
//   Raycast Swift bridge, so nothing persists between calls. Errors thrown here
//   surface to TypeScript as a rejected promise carrying the message.
// WARN: `extend`/`mirror` only reconfigure the Sidecar display; the main display
//   is never reassigned and no display is disconnected.
// =============================================================================

import CoreGraphics
import Foundation
import RaycastSwiftMacros

/// The Sidecar display's presence and state.
struct Status: Encodable {
  let present: Bool
  let main: Bool
  let mirrored: Bool
}

/// Names of every paired Sidecar device (present or not).
@raycast func listDevices() throws -> [String] {
  sidecarDevices(try sidecarManager()).map(deviceName).filter { !$0.isEmpty }
}

/// Attaches the named Sidecar device.
@raycast func connect(name: String) throws {
  let (manager, device) = try findDevice(named: name)
  try runWithCompletion("connectToDevice:completion:", manager, device)
}

/// Detaches the named Sidecar device.
@raycast func disconnect(name: String) throws {
  let (manager, device) = try findDevice(named: name)
  try runWithCompletion("disconnectFromDevice:completion:", manager, device)
}

/// Reports whether a Sidecar display is present and its main/mirror state.
@raycast func status() -> Status {
  guard let id = sidecarDisplayID() else {
    return Status(present: false, main: false, mirrored: false)
  }
  return Status(present: true, main: CGDisplayIsMain(id) != 0, mirrored: CGDisplayIsInMirrorSet(id) != 0)
}

/// Detaches the Sidecar display from any mirror set (extend).
@raycast func extend() throws {
  guard let id = sidecarDisplayID() else { throw HelperError("No Sidecar display is present") }
  let main = CGMainDisplayID()
  if main == id { throw HelperError("The Sidecar display is the main display; refusing to reconfigure it") }
  try setMirror(of: id, master: kCGNullDirectDisplay)
}

/// Folds the Sidecar display into the current main display's mirror set (mirror).
@raycast func mirror() throws {
  guard let id = sidecarDisplayID() else { throw HelperError("No Sidecar display is present") }
  let main = CGMainDisplayID()
  if main == id { throw HelperError("The Sidecar display is the main display; refusing to mirror onto it") }
  try setMirror(of: id, master: main)
}
