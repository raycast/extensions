// =============================================================================
// SIDECAR BRIDGE
// Connect/disconnect via the private SidecarCore framework; mirror/main state
// and control via public CoreGraphics.
// -----------------------------------------------------------------------------
// WARN: `setMirror` only ever reconfigures the Sidecar display, always keeping
//   the current main display as the mirror master. The main display is never
//   reassigned, and no display is disconnected.
// NOTE: SidecarCore is a private framework, loaded at runtime via dlopen so the
//   binary links nothing private. Selectors may change across macOS releases.
// =============================================================================

import AppKit
import CoreGraphics
import Foundation

// -----------------------------------------------------------
// ERRORS
// -----------------------------------------------------------

/// A helper failure whose message is forwarded to the TypeScript caller.
struct HelperError: LocalizedError, CustomStringConvertible {
  let message: String
  init(_ message: String) { self.message = message }
  var description: String { message }
  var errorDescription: String? { message }
}

// -----------------------------------------------------------
// SIDECARCORE (private, runtime-dispatched)
// -----------------------------------------------------------

/// The shared SidecarDisplayManager, loading the private framework on demand.
func sidecarManager() throws -> NSObject {
  guard dlopen("/System/Library/PrivateFrameworks/SidecarCore.framework/SidecarCore", RTLD_LAZY) != nil else {
    throw HelperError("Could not load SidecarCore.framework")
  }
  guard let cls = NSClassFromString("SidecarDisplayManager") as? NSObject.Type,
    let manager = cls.perform(NSSelectorFromString("sharedManager"))?.takeUnretainedValue() as? NSObject
  else {
    throw HelperError("SidecarDisplayManager unavailable (macOS may have changed the private API)")
  }
  return manager
}

/// Every paired Sidecar device the manager knows about, present or not.
func sidecarDevices(_ manager: NSObject) -> [NSObject] {
  (manager.perform(NSSelectorFromString("devices"))?.takeUnretainedValue() as? [NSObject]) ?? []
}

/// A device's display name, or an empty string when the selector is unavailable.
func deviceName(_ device: NSObject) -> String {
  (device.perform(NSSelectorFromString("name"))?.takeUnretainedValue() as? String) ?? ""
}

/// Locates a paired device by name, returning it with its manager.
func findDevice(named target: String) throws -> (NSObject, NSObject) {
  let manager = try sidecarManager()
  for device in sidecarDevices(manager) where deviceName(device) == target {
    return (manager, device)
  }
  throw HelperError("No Sidecar device named \"\(target)\"")
}

/// Runs a `...completion:` selector and waits for its NSError? callback.
func runWithCompletion(_ selector: String, _ manager: NSObject, _ device: NSObject) throws {
  let sel = NSSelectorFromString(selector)
  guard manager.responds(to: sel) else { throw HelperError("Selector \(selector) unavailable") }

  let semaphore = DispatchSemaphore(value: 0)
  var failure: NSError?
  let completion: @convention(block) (NSError?) -> Void = { error in
    failure = error
    semaphore.signal()
  }
  _ = manager.perform(sel, with: device, with: completion)

  if semaphore.wait(timeout: .now() + 20) == .timedOut {
    throw HelperError("Timed out running \(selector)")
  }
  if let failure = failure {
    throw HelperError("\(selector) failed: \(failure.localizedDescription)")
  }
}

// -----------------------------------------------------------
// COREGRAPHICS (public)
// -----------------------------------------------------------

// Apple's AirPlay/Sidecar display vendor number: the ASCII bytes "aapl".
let airplayVendor: UInt32 = 0x6161_706C

/// CGDirectDisplayIDs whose NSScreen name marks them as Sidecar/AirPlay.
///
/// NOTE: NSScreen omits displays that are in a mirror set, so this finds the
///   Sidecar display only while it is extended. The vendor check below is what
///   still finds it once it has been folded into a mirror set.
func namedSidecarDisplayIDs() -> Set<CGDirectDisplayID> {
  var ids = Set<CGDirectDisplayID>()
  for screen in NSScreen.screens {
    let name = screen.localizedName
    guard name.localizedCaseInsensitiveContains("sidecar") || name.localizedCaseInsensitiveContains("airplay")
    else { continue }
    if let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? UInt32 {
      ids.insert(CGDirectDisplayID(number))
    }
  }
  return ids
}

/// The CGDirectDisplayID of the online Sidecar display, if one is present.
///
/// NOTE: Uses the CoreGraphics online list (which, unlike NSScreen, includes
///   mirrored displays) so the Sidecar display is found whether it is extended
///   or mirrored. A display qualifies if it carries the AirPlay vendor signature
///   or matches a Sidecar-named NSScreen.
func sidecarDisplayID() -> CGDirectDisplayID? {
  let named = namedSidecarDisplayIDs()
  var ids = [CGDirectDisplayID](repeating: 0, count: 16)
  var count: UInt32 = 0
  guard CGGetOnlineDisplayList(16, &ids, &count) == .success else { return nil }
  for id in ids.prefix(Int(count)) where CGDisplayIsBuiltin(id) == 0 {
    if CGDisplayVendorNumber(id) == airplayVendor || named.contains(id) {
      return id
    }
  }
  return nil
}

/// Points `display` at `master`'s mirror set, or detaches it with a null master.
///
/// WARN: Only ever called with the Sidecar display as `display`. Passing the
///   main display here would relocate the user's windows.
func setMirror(of display: CGDirectDisplayID, master: CGDirectDisplayID) throws {
  var config: CGDisplayConfigRef?
  guard CGBeginDisplayConfiguration(&config) == .success, let config else {
    throw HelperError("Could not begin a display configuration")
  }
  let result = CGConfigureDisplayMirrorOfDisplay(config, display, master)
  guard result == .success else {
    CGCancelDisplayConfiguration(config)
    throw HelperError("Could not configure mirroring (error \(result.rawValue))")
  }
  guard CGCompleteDisplayConfiguration(config, .permanently) == .success else {
    CGCancelDisplayConfiguration(config)
    throw HelperError("Could not apply the display configuration")
  }
}
