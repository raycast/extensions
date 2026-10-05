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

// SidecarDevice.status is an undocumented bitfield. Bit 9 is set whenever the
// device is reachable — connected OR merely nearby and idle — and clears when its
// radios go away. Established empirically (macOS 26.6) by sampling the field
// across connect, disconnect, and Airplane Mode; see docs/ARCHITECTURE.md.
//
// WARN: Bits 1, 8, 39 flap on their own and mean nothing useful. Bit 9 itself has
//   been observed to dip for ~10s while the device stayed connected, so a single
//   clear read is NOT proof of absence — callers must debounce.
let reachableStatusBit: UInt64 = 1 << 9

// Bits 2 and 24 track the CABLE. Established on macOS 26.6 over two full
// plug/unplug cycles with the iPad in Airplane Mode throughout, so wireless
// state could not confound it: in 0x1880106 / out 0x880102 / in / out.
// Sidecar-over-USB raises no NCM interface and does not appear in IOUSB, so this
// is the only signal that a cable is attached.
//
// WARN: Both bits are required. They have only ever been observed moving
//   together, and demanding both means one flapping bit cannot fake a cable.
let wiredStatusBits: UInt64 = (1 << 2) | (1 << 24)

/// The device's raw status bitfield, or nil when it cannot be read.
///
/// WARN: `value(forKey:)` raises NSUnknownKeyException — uncatchable from Swift,
///   so it would abort the helper — if macOS ever drops the property. Guarded
///   with `responds(to:)` first, matching `runWithCompletion` below. Returns nil
///   rather than a default, so an unreadable field degrades to "unknown" instead
///   of masquerading as a confident answer.
func deviceStatus(_ device: NSObject) -> UInt64? {
  guard device.responds(to: NSSelectorFromString("status")),
    let status = device.value(forKey: "status") as? UInt64
  else { return nil }
  return status
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
