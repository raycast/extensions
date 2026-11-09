import Foundation
import RaycastSwiftMacros

// Mirrors the macOS "Automatically hide and show the menu bar" setting.
// Options: 0 Always, 1 On Desktop Only, 2 In Full Screen Only, 3 Never.
private let modeNames = ["always", "desktop-only", "fullscreen-only", "never"]

struct MenuBarError: Error, CustomStringConvertible, LocalizedError {
  let description: String
  var errorDescription: String? { description }

  init(_ description: String) {
    self.description = description
  }
}

// MARK: - Exported functions

/// Returns the current mode without changing anything.
@raycast func currentMode() throws -> String {
  let lock = try ModeLock(shared: true)
  defer { lock.release() }
  return modeNames[try readCurrentOption()]
}

/// Applies a mode and returns the mode macOS retained.
@raycast func applyMode(mode: String) throws -> String {
  let target = try option(for: mode)
  let lock = try ModeLock(shared: false)
  defer { lock.release() }
  return modeNames[try pulse(to: target)]
}

/// Switches from `first` to `second`; any other current mode switches to `first`.
/// Reading, choosing and applying happen under one lock so concurrent toggles serialize.
@raycast func toggleModes(first: String, second: String) throws -> String {
  let firstOption = try option(for: first)
  let secondOption = try option(for: second)
  let lock = try ModeLock(shared: false)
  defer { lock.release() }
  let current = try readCurrentOption()
  return modeNames[try pulse(to: current == firstOption ? secondOption : firstOption)]
}

private func option(for mode: String) throws -> Int {
  guard let index = modeNames.firstIndex(of: mode) else {
    throw MenuBarError("Unknown menu bar mode: \(mode)")
  }
  return index
}

// MARK: - Pulse

private func pulse(to target: Int) throws -> Int {
  let skyLight = try SkyLight.load()
  defer { skyLight.close() }

  // Traverse the four states in Gray-code order, starting and ending on the
  // target. Every notified transition flips exactly one real preference, so
  // already-open AppKit full-screen spaces see a real change on each step.
  let grayOrder = [2, 0, 1, 3]
  let targetIndex = grayOrder.firstIndex(of: target)!
  let stepDelay: useconds_t = 60_000

  for step in 0...grayOrder.count {
    let option = grayOrder[(targetIndex + step) % grayOrder.count]
    let isTarget = step == 0 || step == grayOrder.count
    do {
      try writeMode(option, updateControlCenter: isTarget, skyLight: skyLight)
    } catch {
      // Best-effort restoration: never intentionally leave an intermediate mode behind.
      try? writeMode(target, updateControlCenter: true, skyLight: skyLight)
      postRefreshNotifications()
      throw error
    }
    // The first write is an unnotified baseline; the next four are real transitions.
    if step > 0 {
      postRefreshNotifications()
    }
    if step > 0 && step < grayOrder.count {
      usleep(stepDelay)
    }
  }

  // Repeat only the notification while the requested values stay stable, then make
  // the requested values the last synchronized write and the final notification.
  usleep(120_000)
  postRefreshNotifications()
  usleep(200_000)
  postRefreshNotifications()
  try writeMode(target, updateControlCenter: true, skyLight: skyLight)
  usleep(100_000)
  postRefreshNotifications()

  let applied = try readGlobalOption()
  guard applied == target else {
    throw MenuBarError("macOS did not retain the requested menu bar mode")
  }
  return applied
}

private func writeMode(_ option: Int, updateControlCenter: Bool, skyLight: SkyLight) throws {
  let hideOnDesktop = option <= 1
  let visibleInFullScreen = option % 2 == 1

  CFPreferencesSetValue(
    "_HIHideMenuBar" as CFString, (hideOnDesktop ? kCFBooleanTrue : kCFBooleanFalse),
    kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, kCFPreferencesAnyHost)
  CFPreferencesSetValue(
    "AppleMenuBarVisibleInFullscreen" as CFString,
    (visibleInFullScreen ? kCFBooleanTrue : kCFBooleanFalse),
    kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, kCFPreferencesAnyHost)
  guard
    CFPreferencesSynchronize(
      kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, kCFPreferencesAnyHost)
  else {
    throw MenuBarError("Could not synchronize the global menu bar preferences")
  }

  // AutoHideMenuBarOption is only the Control Center popup's display value. Keep it
  // in sync for the requested mode only, so readers never see an intermediate mode.
  if updateControlCenter {
    CFPreferencesSetAppValue(
      "AutoHideMenuBarOption" as CFString, NSNumber(value: Int32(option)),
      "com.apple.controlcenter" as CFString)
    guard CFPreferencesAppSynchronize("com.apple.controlcenter" as CFString) else {
      throw MenuBarError("Could not synchronize the Control Center preference")
    }
  }

  let result = skyLight.setMenuBarAutohideEnabled(skyLight.mainConnectionID(), hideOnDesktop)
  guard result == 0 else {
    throw MenuBarError("WindowServer rejected the menu bar mode (\(result))")
  }
}

private func postRefreshNotifications() {
  let center = DistributedNotificationCenter.default()
  for name in [
    "AppleInterfaceFullScreenMenuBarVisibilityChangedNotification",
    "AppleInterfaceMenuBarHidingChangedNotification",
  ] {
    center.postNotificationName(
      NSNotification.Name(name), object: nil, userInfo: nil, deliverImmediately: true)
  }
}

// MARK: - Reading the current mode

/// Reads a global flag stored as a boolean, or as the integer 0/1 written by
/// earlier versions of this extension (`defaults write -int`). Nil when absent.
private func readFlag(_ key: String) throws -> Bool? {
  guard
    let value = CFPreferencesCopyValue(
      key as CFString, kCFPreferencesAnyApplication, kCFPreferencesCurrentUser,
      kCFPreferencesAnyHost)
  else {
    return nil
  }
  if CFGetTypeID(value) == CFBooleanGetTypeID() {
    return CFBooleanGetValue((value as! CFBoolean))
  }
  if CFGetTypeID(value) == CFNumberGetTypeID() {
    var number: Int64 = 0
    if CFNumberGetValue((value as! CFNumber), .sInt64Type, &number), number == 0 || number == 1 {
      return number == 1
    }
  }
  throw MenuBarError("Unexpected value stored for \(key)")
}

private func option(hideOnDesktop: Bool, visibleInFullScreen: Bool) -> Int {
  if hideOnDesktop {
    return visibleInFullScreen ? 1 : 0
  }
  return visibleInFullScreen ? 3 : 2
}

/// The mode the two global preferences describe. Used to confirm a write.
private func readGlobalOption() throws -> Int {
  guard
    CFPreferencesSynchronize(
      kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, kCFPreferencesAnyHost),
    let hideOnDesktop = try readFlag("_HIHideMenuBar"),
    let visibleInFullScreen = try readFlag("AppleMenuBarVisibleInFullscreen")
  else {
    throw MenuBarError("Could not read the global menu bar preferences")
  }
  return option(hideOnDesktop: hideOnDesktop, visibleInFullScreen: visibleInFullScreen)
}

/// The current mode. The global preferences are authoritative. Only when a key is
/// absent is the Control Center value used, and otherwise macOS's defaults (menu bar
/// shown on the desktop, hidden in full screen) fill the gap. Failed reads and
/// invalid stored values are errors, never guesses.
private func readCurrentOption() throws -> Int {
  guard
    CFPreferencesSynchronize(
      kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, kCFPreferencesAnyHost)
  else {
    throw MenuBarError("Could not read the global menu bar preferences")
  }
  let hideOnDesktop = try readFlag("_HIHideMenuBar")
  let visibleInFullScreen = try readFlag("AppleMenuBarVisibleInFullscreen")
  if let hideOnDesktop, let visibleInFullScreen {
    return option(hideOnDesktop: hideOnDesktop, visibleInFullScreen: visibleInFullScreen)
  }
  if let option = readControlCenterOption() {
    return option
  }
  return option(
    hideOnDesktop: hideOnDesktop ?? false, visibleInFullScreen: visibleInFullScreen ?? false)
}

private func readControlCenterOption() -> Int? {
  guard
    let value = CFPreferencesCopyAppValue(
      "AutoHideMenuBarOption" as CFString, "com.apple.controlcenter" as CFString),
    CFGetTypeID(value) == CFNumberGetTypeID()
  else {
    return nil
  }
  var option: Int32 = -1
  guard CFNumberGetValue((value as! CFNumber), .sInt32Type, &option), (0...3).contains(option)
  else {
    return nil
  }
  return Int(option)
}

// MARK: - Process lock

/// A kernel `flock` shared by every helper process. Mutations hold it exclusively
/// across read, target choice and pulse; status reads take it shared so they never
/// observe an intermediate pulse mode. The kernel releases it if a process dies.
private struct ModeLock {
  let descriptor: Int32

  init(shared: Bool) throws {
    let path = (NSTemporaryDirectory() as NSString).appendingPathComponent(
      "toggle-menu-bar-mutation.lock")
    let descriptor = open(path, O_CREAT | O_RDWR, 0o600)
    guard descriptor >= 0 else {
      throw MenuBarError("Could not open the menu bar mode lock")
    }
    guard flock(descriptor, shared ? LOCK_SH : LOCK_EX) == 0 else {
      close(descriptor)
      throw MenuBarError("Could not acquire the menu bar mode lock")
    }
    self.descriptor = descriptor
  }

  func release() {
    close(descriptor)
  }
}

// MARK: - SkyLight

/// The private WindowServer function the macOS menu bar settings pane calls.
private struct SkyLight {
  typealias MainConnectionID = @convention(c) () -> UInt32
  typealias SetMenuBarAutohideEnabled = @convention(c) (UInt32, Bool) -> Int32

  let handle: UnsafeMutableRawPointer
  let mainConnectionID: MainConnectionID
  let setMenuBarAutohideEnabled: SetMenuBarAutohideEnabled

  static func load() throws -> SkyLight {
    let path = "/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight"
    guard let handle = dlopen(path, RTLD_NOW | RTLD_LOCAL) else {
      throw MenuBarError("Could not load SkyLight")
    }
    guard let connection = dlsym(handle, "CGSMainConnectionID"),
      let autohide = dlsym(handle, "CGSSetMenuBarAutohideEnabled")
    else {
      dlclose(handle)
      throw MenuBarError("Could not resolve the SkyLight menu bar functions")
    }
    return SkyLight(
      handle: handle,
      mainConnectionID: unsafeBitCast(connection, to: MainConnectionID.self),
      setMenuBarAutohideEnabled: unsafeBitCast(autohide, to: SetMenuBarAutohideEnabled.self))
  }

  func close() {
    dlclose(handle)
  }
}
