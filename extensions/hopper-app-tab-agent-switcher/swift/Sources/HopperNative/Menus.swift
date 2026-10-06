import AppKit
import ApplicationServices

// Items of an app's menu bar through Accessibility, found by AXIdentifier: AppKit sets it to the item's action
// selector (Notes' "showRecentNote:"), which, unlike titles, isn't localized. Used by the tab level's Notes source
// (src/lib/tabs/sources/notes.ts). Menus are read without being opened, so nothing shows on screen.
//
// Kept free of Raycast macros so it compiles with plain `swiftc` for quick checks.

struct MenuItem: Codable {
  let identifier: String
  let title: String
  let enabled: Bool
}

/// Items of the first menu holding an item whose identifier is one of `identifiers` (e.g. a "recent" submenu and
/// its "Clear Menu"), those items only, in menu order. [] if not found.
func readMenuItems(bundleId: String, identifiers: [String]) -> [MenuItem] {
  guard let pid = pid(of: bundleId) else { return [] }
  return menuItems(appElement(pid), Set(identifiers)).map {
    MenuItem(
      identifier: string($0, "AXIdentifier") ?? "", title: string($0, kAXTitleAttribute) ?? "",
      enabled: bool($0, kAXEnabledAttribute))
  }
}

/// Presses the item with `identifier` at `index` among those items while it has `title`, else the one titled
/// `title` if only one is (with several, a moved item can't be told apart: nothing is pressed). Apps enable such items only while they're frontmost with a window (Notes' recent notes), and a disabled
/// item ignores AXPress: then the app is brought to the front and the item waited for, up to 2s (Notes takes ~1s).
/// False if not found, if the app has no window to bring forward, or if the item stays disabled.
func pressMenuItem(bundleId: String, identifier: String, title: String, index: Int) -> Bool {
  guard let pid = pid(of: bundleId) else { return false }
  let app = appElement(pid)
  func find() -> AXUIElement? {
    let items = menuItems(app, [identifier])
    if index >= 0, index < items.count, string(items[index], kAXTitleAttribute) == title { return items[index] }
    let titled = items.filter { string($0, kAXTitleAttribute) == title }
    return titled.count == 1 ? titled[0] : nil
  }
  guard var item = find() else { return false }
  if !bool(item, kAXEnabledAttribute) {
    guard bringToFront(bundleId: bundleId) else { return false }
    let start = Date()
    while !bool(item, kAXEnabledAttribute) {
      guard Date().timeIntervalSince(start) < 2 else { return false }
      Thread.sleep(forTimeInterval: 0.05)
      // The app may rebuild the menu meanwhile (a recent list reordering).
      guard let fresh = find() else { return false }
      item = fresh
    }
  }
  return AXUIElementPerformAction(item, kAXPressAction as CFString) == .success
}

private func menuItems(_ app: AXUIElement, _ identifiers: Set<String>) -> [AXUIElement] {
  guard let bar = attribute(app, kAXMenuBarAttribute) else { return [] }
  // Menu bar > menu bar item > menu > item > submenu > item: a submenu item is 5 levels down.
  func search(_ element: AXUIElement, _ depth: Int) -> [AXUIElement]? {
    let kids = children(element)
    let matches = kids.filter { string($0, "AXIdentifier").map(identifiers.contains) ?? false }
    if !matches.isEmpty { return matches }
    guard depth > 0 else { return nil }
    for child in kids {
      if let found = search(child, depth - 1) { return found }
    }
    return nil
  }
  return search(bar as! AXUIElement, 5) ?? []
}
