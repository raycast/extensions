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

import AppKit
import CoreGraphics
import Foundation
import RaycastSwiftMacros

/// How the iPad can currently be reached, if at all.
struct Presence: Encodable {
  /// Reachable over the air — connected, or merely nearby and idle.
  let wireless: Bool
  /// A cable is attached. Independent of `wireless`: an iPad in Airplane Mode on
  /// a cable is wired-only, and a nearby iPad with no cable is wireless-only.
  let wired: Bool
}

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

/// Reports how the named device can currently be reached.
///
/// NOTE: A pure read of SidecarCore's cached device record — it attempts no
///   connection, so unlike a failed connect it produces no macOS error banner.
///   That is the whole point: it lets a background tick ask "is the iPad back?"
///   as often as it likes for free. Returns false when the device is not paired.
@raycast func presence(name: String) throws -> Presence {
  let manager = try sidecarManager()
  guard let device = sidecarDevices(manager).first(where: { deviceName($0) == name }) else {
    // Not in the list at all: an out-of-range iPad leaves it entirely, so this is
    // the one unambiguous "absent" this API offers.
    return Presence(wireless: false, wired: false)
  }
  guard let status = deviceStatus(device) else {
    // Throwing lands as "unknown" on the TypeScript side, which falls back to
    // the probe-free behaviour — the right answer when the field is unreadable.
    throw HelperError("Sidecar device status is unavailable (macOS may have changed the private API)")
  }
  return Presence(
    wireless: status & reachableStatusBit != 0,
    wired: status & wiredStatusBits == wiredStatusBits
  )
}

/// The path to BetterDisplay's executable, or "" when it is not installed.
///
/// NOTE: Replaces a configured CLI path. `betterdisplaycli` is only a one-line
///   wrapper that execs this same binary, and hardcoding a Homebrew path missed
///   anyone who installed the app directly or into ~/Applications. Asking
///   NSWorkspace by bundle identifier finds it wherever it lives.
@raycast func betterDisplayPath() -> String {
  guard
    let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "pro.betterdisplay.BetterDisplay")
  else { return "" }
  return url.appendingPathComponent("Contents/MacOS/BetterDisplay").path
}

/// Whether BetterDisplay is currently running.
///
/// NOTE: `betterdisplaycli` is a one-line wrapper that execs the whole
///   BetterDisplay app binary, and with the app not running every call cold-loads
///   it and then blocks until it gives up (measured: 16s). Asking AppKit first is
///   an in-process lookup costing microseconds, so nothing shells out to a host
///   that cannot answer.
@raycast func betterDisplayRunning() -> Bool {
  !NSRunningApplication.runningApplications(withBundleIdentifier: "pro.betterdisplay.BetterDisplay").isEmpty
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

/// The current main display's CoreGraphics ID.
///
/// NOTE: Exists for the hardware suites, which need an oracle for "the main
///   display did not change" that is independent of the orchestration under test.
///   It reads public CoreGraphics directly and touches nothing.
@raycast func mainDisplay() -> Int {
  Int(CGMainDisplayID())
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
