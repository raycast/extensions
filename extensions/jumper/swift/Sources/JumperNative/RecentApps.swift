import AppKit

/// A regular (Dock) app, as returned to TypeScript.
struct RunningApp: Codable {
  let bundleId: String
  let name: String
  let path: String
}

/// Running regular apps, most recently used first, across all Spaces.
///
/// Primary source: LaunchServices' private `_LSCopyApplicationArrayInFrontToBackOrder`, the same
/// front-to-back order Cmd+Tab uses (no permissions needed). Fallback if the private symbol ever
/// disappears: on-screen window z-order, which only sees the current Space. See ADR-001.
///
/// Kept free of Raycast macros so it compiles with plain `swiftc` for quick checks.
func readRecentApps() -> [RunningApp] {
  var seen = Set<String>()
  var apps = fromLaunchServices() ?? []
  if apps.isEmpty { apps = fromWindowOrder() }
  return apps.filter { seen.insert($0.bundleId).inserted }
}

private typealias CopyFrontToBack = @convention(c) (Int32, UInt32) -> Unmanaged<CFArray>?
private typealias CopyInformation = @convention(c) (Int32, CFTypeRef, CFArray?) -> Unmanaged<CFDictionary>?

/// kLSDefaultSessionID
private let defaultSession: Int32 = -2

private func fromLaunchServices() -> [RunningApp]? {
  guard
    let handle = dlopen("/System/Library/Frameworks/CoreServices.framework/CoreServices", RTLD_LAZY),
    let copyOrderSymbol = dlsym(handle, "_LSCopyApplicationArrayInFrontToBackOrder"),
    let copyInfoSymbol = dlsym(handle, "_LSCopyApplicationInformation")
  else { return nil }
  let copyOrder = unsafeBitCast(copyOrderSymbol, to: CopyFrontToBack.self)
  let copyInfo = unsafeBitCast(copyInfoSymbol, to: CopyInformation.self)

  guard let asns = copyOrder(defaultSession, 0)?.takeRetainedValue() as? [CFTypeRef] else { return nil }
  return asns.compactMap { asn in
    guard
      let info = copyInfo(defaultSession, asn, nil)?.takeRetainedValue() as? [String: Any],
      info["ApplicationType"] as? String == "Foreground",
      let bundleId = info["CFBundleIdentifier"] as? String,
      let path = info["LSBundlePath"] as? String
    else { return nil }
    return RunningApp(bundleId: bundleId, name: info["LSDisplayName"] as? String ?? bundleId, path: path)
  }
}

private func fromWindowOrder() -> [RunningApp] {
  let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
  guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else { return [] }
  return windows.compactMap { window in
    guard
      window[kCGWindowLayer as String] as? Int == 0,
      let pid = window[kCGWindowOwnerPID as String] as? pid_t,
      let app = NSRunningApplication(processIdentifier: pid),
      app.activationPolicy == .regular,
      let bundleId = app.bundleIdentifier,
      let path = app.bundleURL?.path
    else { return nil }
    return RunningApp(bundleId: bundleId, name: app.localizedName ?? bundleId, path: path)
  }
}
