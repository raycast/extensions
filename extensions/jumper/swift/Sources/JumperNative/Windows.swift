import AppKit
import ApplicationServices

// Windows of any app, and native macOS tab bars (Ghostty, Finder, TextEdit...), through Accessibility.
// Used by the tab level's fallback source (src/lib/tabs/sources/windows.ts).

struct AppWindows: Codable {
  let bundleId: String
  let windows: [AXWindowInfo]
}

struct AXWindowInfo: Codable {
  /// 1-based position in the app's AX window list, front to back.
  let index: Int
  let title: String
  let minimized: Bool
  let tabs: [AXTabInfo]
}

struct AXTabInfo: Codable {
  let title: String
  let selected: Bool
}

/// Standard windows of each running app; apps not running are omitted.
func readWindows(bundleIds: [String]) -> [AppWindows] {
  bundleIds.compactMap { bundleId in
    guard let pid = pid(of: bundleId) else { return nil }
    let windows = children(appElement(pid), kAXWindowsAttribute).enumerated().compactMap { i, window -> AXWindowInfo? in
      guard string(window, kAXSubroleAttribute) == kAXStandardWindowSubrole as String else { return nil }
      return AXWindowInfo(
        index: i + 1,
        title: string(window, kAXTitleAttribute) ?? "",
        minimized: bool(window, kAXMinimizedAttribute),
        tabs: nativeTabs(window).map { AXTabInfo(title: string($0, kAXTitleAttribute) ?? "", selected: isSelected($0)) }
      )
    }
    return AppWindows(bundleId: bundleId, windows: windows)
  }
}

/// Raise the window with this title (falling back to its index), then select the native tab with this title.
/// The caller still has to bring the app to the front (Raycast `open()`, ADR-007).
func raiseWindow(bundleId: String, index: Int, title: String, tab: String?) -> Bool {
  guard let pid = pid(of: bundleId) else { return false }
  let windows = children(appElement(pid), kAXWindowsAttribute)
  let window =
    windows.first { string($0, kAXTitleAttribute) == title }
    ?? (index >= 1 && index <= windows.count ? windows[index - 1] : nil)
  guard let window else { return false }
  if bool(window, kAXMinimizedAttribute) {
    AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
  }
  AXUIElementSetAttributeValue(window, kAXMainAttribute as CFString, kCFBooleanTrue)
  AXUIElementPerformAction(window, kAXRaiseAction as CFString)
  if let tab {
    guard let button = nativeTabs(window).first(where: { string($0, kAXTitleAttribute) == tab }) else { return false }
    AXUIElementPerformAction(button, kAXPressAction as CFString)
  }
  return true
}

/// Tab buttons of a window's native tab bar: an AXTabGroup directly in the window.
private func nativeTabs(_ window: AXUIElement) -> [AXUIElement] {
  guard let group = children(window).first(where: { string($0, kAXRoleAttribute) == kAXTabGroupRole as String })
  else { return [] }
  return children(group).filter { string($0, kAXRoleAttribute) == kAXRadioButtonRole as String }
}

private func isSelected(_ tab: AXUIElement) -> Bool {
  (attribute(tab, kAXValueAttribute) as? NSNumber)?.boolValue ?? false
}
