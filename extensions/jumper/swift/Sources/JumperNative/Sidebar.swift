import AppKit
import ApplicationServices

// Rows of an in-window list (Claude sessions, Muse side chats) through Accessibility. Used by the tab level's
// sidebar sources (src/lib/tabs/sources/sidebar.ts). Chromium/Electron apps only expose their web content
// after AXManualAccessibility is set; WebKit apps expose it by default.

struct SidebarRow: Codable {
  /// The row's accessible title, e.g. "Idle main" in Claude.
  let title: String
  /// First text inside the row, e.g. "main"; empty if none.
  let text: String
  let selected: Bool
}

/// Rows of the first element whose AXTitle or AXDescription is `container` (e.g. Claude's "Sidebar"
/// landmark, Muse's "Side chats" navigation): every descendant with role `rowRole` that has a title.
func readSidebarRows(bundleId: String, container: String, rowRole: String) -> [SidebarRow] {
  guard let pid = pid(of: bundleId), let root = findContainer(pid, container) else { return [] }
  return rows(root, rowRole).map { row in
    SidebarRow(
      title: string(row, kAXTitleAttribute) ?? "",
      text: firstStaticText(row) ?? "",
      selected: bool(row, kAXSelectedAttribute) || bool(row, kAXFocusedAttribute)
    )
  }
}

/// Opens the row called `name`. Rows are matched by name, not title, since titles change with state (Claude's
/// "Running"/"Idle" prefix, Muse's hover suffix): a row matches if its title, its inner text, or the
/// `namePattern` capture of its title is `name`.
///
/// `keyboard`: focus the row and send Return to the app instead of AXPress. Some web UIs (Muse) report AXPress
/// as handled but never navigate; a keyboard activation goes through their normal click path.
func openSidebarRow(
  bundleId: String, container: String, rowRole: String, name: String, namePattern: String, keyboard: Bool
) -> Bool {
  let pattern = namePattern.isEmpty ? nil : try? NSRegularExpression(pattern: namePattern)
  func matches(_ row: AXUIElement) -> Bool {
    let title = string(row, kAXTitleAttribute) ?? ""
    if title == name || firstStaticText(row) == name { return true }
    guard let pattern, let match = pattern.firstMatch(in: title, range: NSRange(title.startIndex..., in: title)),
      let range = Range(match.range(at: 1), in: title)
    else { return false }
    return title[range] == name
  }
  guard
    let pid = pid(of: bundleId), let root = findContainer(pid, container),
    let row = rows(root, rowRole).first(where: matches)
  else { return false }

  guard keyboard else { return AXUIElementPerformAction(row, kAXPressAction as CFString) == .success }
  guard AXUIElementSetAttributeValue(row, kAXFocusedAttribute as CFString, kCFBooleanTrue) == .success else { return false }
  Thread.sleep(forTimeInterval: 0.1)
  let returnKey: CGKeyCode = 36
  for keyDown in [true, false] {
    CGEvent(keyboardEventSource: nil, virtualKey: returnKey, keyDown: keyDown)?.postToPid(pid)
  }
  // Posted events are delivered asynchronously and dropped if this process exits first.
  Thread.sleep(forTimeInterval: 0.15)
  return true
}

/// Description of the first element whose AXDescription ends with `suffix`, minus the suffix. Claude shows
/// the open session as a "<name>, rename session" button above the transcript.
func readLabel(bundleId: String, suffix: String) -> String? {
  guard let pid = pid(of: bundleId) else { return nil }
  for window in children(appElement(pid), kAXWindowsAttribute) {
    if let element = find(window, depth: 30, where: { (string($0, kAXDescriptionAttribute) ?? "").hasSuffix(suffix) }),
      let desc = string(element, kAXDescriptionAttribute)
    {
      return String(desc.dropLast(suffix.count))
    }
  }
  return nil
}

private func findContainer(_ pid: Int32, _ name: String) -> AXUIElement? {
  let app = appElement(pid)
  AXUIElementSetAttributeValue(app, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  for attempt in 0..<2 {
    // The first time accessibility is switched on, Chromium needs a moment to build the tree.
    if attempt > 0 { Thread.sleep(forTimeInterval: 0.4) }
    for window in children(app, kAXWindowsAttribute) {
      if let found = find(window, depth: 16, where: {
        string($0, kAXTitleAttribute) == name || string($0, kAXDescriptionAttribute) == name
      }) {
        return found
      }
    }
  }
  return nil
}

private func rows(_ root: AXUIElement, _ role: String) -> [AXUIElement] {
  var found: [AXUIElement] = []
  walk(root, depth: 14) { element in
    if string(element, kAXRoleAttribute) == role, !(string(element, kAXTitleAttribute) ?? "").isEmpty {
      found.append(element)
    }
  }
  return found
}

private func firstStaticText(_ element: AXUIElement) -> String? {
  var text: String?
  walk(element, depth: 4) { e in
    if text == nil, string(e, kAXRoleAttribute) == kAXStaticTextRole as String,
      let value = string(e, kAXValueAttribute), !value.isEmpty
    {
      text = value
    }
  }
  return text
}
