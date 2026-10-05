import AppKit
import ApplicationServices

/// Bring a running app to the front like Cmd+Tab: via Accessibility, without the "reopen" Apple event that
/// Raycast `open()` sends. Some apps answer reopen by showing their main window over what the user was on
/// (TV opens its home window over a fullscreen player). See ADR-021 in
/// https://github.com/mattherwig/hopper/blob/main/docs/DECISIONS.md.
///
/// Returns false when the caller should use `open()` instead: no Accessibility permission, or no main window
/// to show (all minimized, or none open), where reopen restores or creates one like a Dock click. Checks the
/// main window rather than AXWindows, which only lists windows on the current Space.
///
/// Kept free of Raycast macros so it compiles with plain `swiftc` for quick checks.
func bringToFront(bundleId: String) -> Bool {
  guard axTrusted(), let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first
  else { return false }
  let element = appElement(app.processIdentifier)
  guard let main = attribute(element, kAXMainWindowAttribute), !bool(main as! AXUIElement, kAXMinimizedAttribute)
  else { return false }
  if app.isHidden { app.unhide() }
  return AXUIElementSetAttributeValue(element, kAXFrontmostAttribute as CFString, kCFBooleanTrue) == .success
}
