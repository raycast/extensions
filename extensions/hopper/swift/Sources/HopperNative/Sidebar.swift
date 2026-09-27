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

/// Description or title of the first element whose description or title ends with `suffix`, minus the suffix.
/// Claude shows the open session as a "<name>, rename session" button (description) above the transcript;
/// Muse as a "<name> Open chat and side chats" button (title).
func readLabel(bundleId: String, suffix: String) -> String? {
  guard let pid = pid(of: bundleId) else { return nil }
  for window in children(appElement(pid), kAXWindowsAttribute) {
    var label: String?
    _ = find(window, depth: 30) { element in
      label = [kAXDescriptionAttribute, kAXTitleAttribute].lazy
        .compactMap { string(element, $0) }.first { $0.hasSuffix(suffix) }
      return label != nil
    }
    if let label { return String(label.dropLast(suffix.count)) }
  }
  return nil
}

struct WebPage: Codable {
  /// The page's document title, e.g. "Looper" in Notion.
  let title: String
  let url: String
}

/// Title and URL of every web view showing an http(s) page, in all the app's windows. Notion keeps one per
/// open tab (hidden tabs' views are moved off-screen, not removed). Page content isn't searched.
func readWebPages(bundleId: String) -> [WebPage] {
  guard let pid = pid(of: bundleId) else { return [] }
  let app = appElement(pid)
  AXUIElementSetAttributeValue(app, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  var pages: [WebPage] = []
  func visit(_ element: AXUIElement, _ depth: Int) {
    if string(element, kAXRoleAttribute) == "AXWebArea" {
      if let url = (attribute(element, kAXURLAttribute) as? URL)?.absoluteString, url.hasPrefix("http") {
        pages.append(WebPage(title: string(element, kAXTitleAttribute) ?? "", url: url))
      }
      return
    }
    guard depth > 0 else { return }
    for child in children(element) { visit(child, depth - 1) }
  }
  for window in children(app, kAXWindowsAttribute) { visit(window, 12) }
  return pages
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

/// Presses the `occurrence`-th (0-based) element of a web UI whose DOM classes include `className` and whose
/// description or title is `label`, inside an element with DOM class `within` (any, if empty) and not inside one
/// with DOM class `outside` (if not empty), in the windows whose title contains `window` (all, if empty), front
/// to back. For web tab bars whose tabs are plain
/// elements identified only by their classes (Obsidian's "workspace-tab-header"). False if not found.
func pressWebElementMatching(
  bundleId: String, window: String, within: String, outside: String, className: String, label: String,
  occurrence: Int
) -> Bool {
  guard let pid = pid(of: bundleId) else { return false }
  let app = appElement(pid)
  AXUIElementSetAttributeValue(app, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  func classes(_ element: AXUIElement) -> [String] { attribute(element, "AXDOMClassList") as? [String] ?? [] }
  var matches: [AXUIElement] = []
  func visit(_ element: AXUIElement, _ inside: Bool, _ depth: Int) {
    let own = classes(element)
    if !outside.isEmpty, own.contains(outside) { return }
    let inside = inside || own.contains(within)
    if inside, own.contains(className),
      string(element, kAXDescriptionAttribute) == label || string(element, kAXTitleAttribute) == label
    {
      matches.append(element)
      return
    }
    guard depth > 0 else { return }
    for child in children(element) { visit(child, inside, depth - 1) }
  }
  for attempt in 0..<2 {
    // The first time accessibility is switched on, Chromium needs a moment to build the tree.
    if attempt > 0 { Thread.sleep(forTimeInterval: 0.4) }
    for win in children(app, kAXWindowsAttribute)
    where window.isEmpty || (string(win, kAXTitleAttribute) ?? "").contains(window) {
      visit(win, within.isEmpty, 24)
    }
    if !matches.isEmpty { break }
  }
  guard occurrence < matches.count else { return false }
  return AXUIElementPerformAction(matches[occurrence], kAXPressAction as CFString) == .success
}
