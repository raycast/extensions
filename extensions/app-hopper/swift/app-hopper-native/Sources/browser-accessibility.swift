import AppKit
import ApplicationServices
import Foundation

// Shared discovery mechanism; callers retain their browser-specific scan limits and AX settings.
@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ wid: UnsafeMutablePointer<CGWindowID>) -> AXError

@_silgen_name("_AXUIElementCreateWithRemoteToken")
func _AXUIElementCreateWithRemoteToken(_ data: CFData) -> Unmanaged<AXUIElement>?

func copyAttr(_ element: AXUIElement, _ attribute: String) -> Any? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
  return error == .success ? value : nil
}

func stringAttr(_ element: AXUIElement, _ attribute: String) -> String {
  if let str = copyAttr(element, attribute) as? String {
    return str
  }
  return ""
}

func boolFromAny(_ value: Any) -> Bool {
  if let flag = value as? Bool {
    return flag
  }
  if let num = value as? NSNumber {
    return num.intValue != 0
  }
  return false
}

func boolAttr(_ element: AXUIElement, _ attribute: String) -> Bool {
  guard let val = copyAttr(element, attribute) else { return false }
  return boolFromAny(val)
}

func windowId(of element: AXUIElement) -> CGWindowID {
  var wid: CGWindowID = 0
  if _AXUIElementGetWindow(element, &wid) == .success {
    return wid
  }
  return 0
}

func findBrowserPIDs(appName: String, nativeWindows: [NativeWindowInput]) -> [Int32] {
  var seen = Set<Int32>()
  var result: [Int32] = []
  for win in nativeWindows where win.pid > 0 {
    if seen.insert(win.pid).inserted {
      result.append(win.pid)
    }
  }
  if !result.isEmpty {
    return result
  }
  for app in NSWorkspace.shared.runningApplications {
    let pid = app.processIdentifier
    guard pid > 0 else { continue }
    let localized = app.localizedName ?? ""
    let bundleName = app.bundleURL?.deletingPathExtension().lastPathComponent ?? ""
    if localized == appName || bundleName == appName {
      if seen.insert(pid).inserted {
        result.append(pid)
      }
    }
  }
  return result
}

func discoverAXWindows(
  pid: Int32,
  expectedWindowIds: Set<CGWindowID>,
  maxElementId: UInt64 = 500,
  enhancedUI: Bool = false
) -> [CGWindowID: AXUIElement] {
  var found: [CGWindowID: AXUIElement] = [:]
  let app = AXUIElementCreateApplication(pid)
  AXUIElementSetMessagingTimeout(app, 0.4)
  if enhancedUI {
    _ = AXUIElementSetAttributeValue(app, "AXEnhancedUserInterface" as CFString, kCFBooleanTrue)
  }

  if let wins = copyAttr(app, kAXWindowsAttribute) as? [AXUIElement] {
    for win in wins {
      let wid = windowId(of: win)
      guard wid > 0, found[wid] == nil else { continue }
      if stringAttr(win, kAXRoleAttribute) == "AXWindow" {
        found[wid] = win
      }
    }
  }

  if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
    return found
  }

  for attr in [kAXMainWindowAttribute, kAXFocusedWindowAttribute] {
    if let rawWin = copyAttr(app, attr) {
      let win = rawWin as! AXUIElement
      let wid = windowId(of: win)
      guard wid > 0, found[wid] == nil else { continue }
      if stringAttr(win, kAXRoleAttribute) == "AXWindow" {
        found[wid] = win
      }
    }
  }

  if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
    return found
  }

  var remoteToken = Data(count: 20)
  remoteToken.replaceSubrange(0..<4, with: withUnsafeBytes(of: pid) { Data($0) })
  remoteToken.replaceSubrange(4..<8, with: withUnsafeBytes(of: Int32(0)) { Data($0) })
  remoteToken.replaceSubrange(8..<12, with: withUnsafeBytes(of: Int32(0x636f636f)) { Data($0) })

  for elementId: UInt64 in 1...maxElementId {
    remoteToken.replaceSubrange(12..<20, with: withUnsafeBytes(of: elementId) { Data($0) })
    guard let element = _AXUIElementCreateWithRemoteToken(remoteToken as CFData)?.takeRetainedValue() else {
      continue
    }
    let wid = windowId(of: element)
    guard wid > 0, found[wid] == nil else { continue }
    if !expectedWindowIds.isEmpty && !expectedWindowIds.contains(wid) {
      continue
    }
    AXUIElementSetMessagingTimeout(element, 0.15)
    guard stringAttr(element, kAXRoleAttribute) == "AXWindow" else {
      continue
    }
    found[wid] = element
    if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
      break
    }
  }

  return found
}
