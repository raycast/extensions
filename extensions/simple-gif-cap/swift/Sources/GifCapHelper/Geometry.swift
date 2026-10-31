import AppKit

/// Rectangles cross the process boundary in global top-left points ("x,y,w,h"),
/// the format `screencapture -R` and CGWindowList use. AppKit works bottom-left.
enum Geometry {
  static var mainHeight: CGFloat { NSScreen.screens[0].frame.height }

  static func toCocoa(_ rect: CGRect) -> NSRect {
    NSRect(x: rect.minX, y: mainHeight - rect.maxY, width: rect.width, height: rect.height)
  }

  static func toTopLeft(_ rect: NSRect) -> CGRect {
    CGRect(x: rect.minX, y: mainHeight - rect.maxY, width: rect.width, height: rect.height)
  }

  static func format(_ rect: CGRect) -> String {
    let r = rect.integral

    return "\(Int(r.minX)),\(Int(r.minY)),\(Int(r.width)),\(Int(r.height))"
  }

  static func parse(_ text: String) -> CGRect? {
    let parts = text.split(separator: ",").compactMap { Double($0) }
    guard parts.count == 4 else { return nil }

    return CGRect(x: parts[0], y: parts[1], width: parts[2], height: parts[3])
  }

  static func screenUnderMouse() -> NSScreen {
    let mouse = NSEvent.mouseLocation

    return NSScreen.screens.first { $0.frame.contains(mouse) } ?? NSScreen.screens[0]
  }
}

struct WindowInfo {
  let id: Int
  let owner: String
  /// Global top-left points.
  let bounds: CGRect
}

enum Windows {
  private static let skippedOwners: Set<String> = ["Raycast", "Window Server", "Dock"]

  /// Normal on-screen windows, front to back, excluding our own and Raycast's.
  static func list() -> [WindowInfo] {
    let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    guard let raw = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
      return []
    }

    let ownPid = Int(ProcessInfo.processInfo.processIdentifier)

    return raw.compactMap { info in
      let layer = info[kCGWindowLayer as String] as? Int ?? -1
      let owner = info[kCGWindowOwnerName as String] as? String ?? ""
      let pid = info[kCGWindowOwnerPID as String] as? Int ?? -1
      guard layer == 0, pid != ownPid, !skippedOwners.contains(owner),
        let id = info[kCGWindowNumber as String] as? Int,
        let boundsDict = info[kCGWindowBounds as String] as? NSDictionary,
        let bounds = CGRect(dictionaryRepresentation: boundsDict),
        bounds.width > 40, bounds.height > 40
      else { return nil }

      return WindowInfo(id: id, owner: owner, bounds: bounds)
    }
  }

  static func bounds(of id: Int) -> CGRect? {
    list().first { $0.id == id }?.bounds
  }
}

/// GIFCAP_SHOW_UI=1 makes the overlays visible to screenshots, for debugging.
let overlaySharing: NSWindow.SharingType =
  ProcessInfo.processInfo.environment["GIFCAP_SHOW_UI"] == nil ? .none : .readOnly

/// A borderless window that never shows up in screen recordings.
func makeOverlayWindow(frame: NSRect, panel: Bool = false) -> NSWindow {
  let window: NSWindow
  if panel {
    window = NSPanel(
      contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
  } else {
    window = KeyableWindow(contentRect: frame, styleMask: .borderless, backing: .buffered, defer: false)
  }

  window.isOpaque = false
  window.backgroundColor = .clear
  window.hasShadow = false
  window.sharingType = overlaySharing
  window.level = .screenSaver
  window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]

  return window
}

final class KeyableWindow: NSWindow {
  override var canBecomeKey: Bool { true }
}
