import AppKit
import ApplicationServices
import RaycastSwiftMacros

/// An application tile in the Dock, read through the Accessibility API.
struct DockTile: Encodable {
  /// Tile name as shown in the Dock (usually the app name).
  let name: String
  /// Raw badge label (AXStatusLabel), or "" when there is no badge.
  let badge: String
  /// Path of the app bundle the tile represents (AXURL), when the Dock exposes one.
  let path: String?
  /// Bundle identifier read from that bundle, when it has one.
  let bundleId: String?
  /// 0-based position among application tiles, so the exact tile can be pressed later.
  let index: Int
}

/// Descriptions are what TypeScript sees as the error message, so they stay stable and greppable.
enum DockError: Error, CustomStringConvertible {
  case accessibilityDenied
  case dockNotRunning
  case dockUnreadable
  case tileNotFound(String)
  case pressFailed(String, Int32)

  var description: String {
    switch self {
    case .accessibilityDenied: "Accessibility permission is required to read the Dock"
    case .dockNotRunning: "The Dock is not running"
    case .dockUnreadable: "Could not read the Dock's application list"
    case .tileNotFound(let name): "No Dock tile named \"\(name)\""
    case .pressFailed(let name, let code): "Could not click the Dock tile \"\(name)\" (AXError \(code))"
    }
  }
}

/// Every application tile in the Dock, in Dock order, with its badge and the app it represents.
/// Only AXApplicationDockItem tiles are returned: the Handoff tile carries a device identifier in its
/// status label, and folders, the separator and Trash never have badges.
@raycast func readDockTiles() throws -> [DockTile] {
  try applicationTiles().enumerated().map { index, tile in
    let url = fileURL(of: tile)
    return DockTile(
      name: stringAttribute(tile, kAXTitleAttribute) ?? "",
      badge: stringAttribute(tile, "AXStatusLabel") ?? "",
      path: url?.path,
      bundleId: url.flatMap { Bundle(url: $0)?.bundleIdentifier },
      index: index
    )
  }
}

/// Clicks an application Dock tile, exactly as the user would. The tile still at `index` is used when it
/// still matches (by path, or by name when there is no path), which tells apart two running instances of
/// the same app. If the Dock has changed since it was read, a tile with the same path is used; without a
/// path, `ordinal` picks among tiles sharing `name`, falling back to the nearest remaining one. A tile
/// with a path that is no longer in the Dock is not found, so the caller can launch the app instead.
@raycast func pressDockTile(name: String, ordinal: Int, index: Int, path: String?) throws {
  let tiles = try applicationTiles()
  let matches: (AXUIElement) -> Bool =
    if let path { { fileURL(of: $0)?.path == path } } else { { stringAttribute($0, kAXTitleAttribute) == name } }
  let tile: AXUIElement?
  if let atIndex = tiles[safe: index], matches(atIndex) {
    tile = atIndex
  } else if path != nil {
    tile = tiles.first(where: matches)
  } else {
    let named = tiles.filter(matches)
    tile = named[safe: min(max(ordinal, 1), named.count) - 1]
  }
  guard let tile else { throw DockError.tileNotFound(name) }
  let result = AXUIElementPerformAction(tile, kAXPressAction as CFString)
  guard result == .success else { throw DockError.pressFailed(name, result.rawValue) }
}

/// Whether macOS is in Dark appearance. Menu bar dropdowns follow this, not Raycast's own theme.
@raycast func isDarkMode() -> Bool {
  UserDefaults.standard.string(forKey: "AppleInterfaceStyle") == "Dark"
}

// MARK: - Accessibility helpers

private func applicationTiles() throws -> [AXUIElement] {
  guard AXIsProcessTrusted() else { throw DockError.accessibilityDenied }
  guard let dock = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.dock").first else {
    throw DockError.dockNotRunning
  }
  let app = AXUIElementCreateApplication(dock.processIdentifier)
  guard let list = children(of: app).first(where: { stringAttribute($0, kAXRoleAttribute) == kAXListRole }) else {
    throw DockError.dockUnreadable
  }
  return children(of: list).filter { stringAttribute($0, kAXSubroleAttribute) == "AXApplicationDockItem" }
}

private func copyAttribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
  return value
}

private func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
  copyAttribute(element, name) as? String
}

private func children(of element: AXUIElement) -> [AXUIElement] {
  copyAttribute(element, kAXChildrenAttribute) as? [AXUIElement] ?? []
}

private func fileURL(of tile: AXUIElement) -> URL? {
  guard let url = copyAttribute(tile, kAXURLAttribute) as? URL, url.isFileURL else { return nil }
  return url.standardizedFileURL
}

extension Array {
  fileprivate subscript(safe index: Int) -> Element? {
    indices.contains(index) ? self[index] : nil
  }
}
