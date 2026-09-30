// dock-badges: read the Dock's app items and their badge text once, print one
// JSON document to stdout, and exit. No arguments, no prompts, no network, no
// file writes, no long-running mode.
//
// Exit codes (SPEC.md section 5.4):
//   0  read succeeded
//   10 Accessibility not granted to the responsible process
//   11 Dock process not found
//   12 Dock list not readable

import AppKit
import ApplicationServices
import Foundation

func emit(_ object: [String: Any], code: Int32) -> Never {
  if let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]) {
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
  }
  exit(code)
}

func fail(_ code: Int32, _ error: String, _ detail: String? = nil) -> Never {
  var object: [String: Any] = ["trusted": code != 10, "error": error]
  if let detail { object["detail"] = detail }
  emit(object, code: code)
}

func attribute(_ element: AXUIElement, _ name: String) -> (AXError, CFTypeRef?) {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  return (error, value)
}

// Check trust without prompting. The extension decides how to guide the user.
guard AXIsProcessTrusted() else {
  fail(10, "accessibility_not_granted")
}

guard let dock = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.dock").first else {
  fail(11, "dock_not_running")
}

let dockElement = AXUIElementCreateApplication(dock.processIdentifier)
AXUIElementSetMessagingTimeout(dockElement, 1.0)

let (childrenError, childrenValue) = attribute(dockElement, kAXChildrenAttribute)
if childrenError == .apiDisabled {
  fail(10, "accessibility_not_granted", "AXError \(childrenError.rawValue)")
}
guard childrenError == .success, let dockChildren = childrenValue as? [AXUIElement] else {
  fail(12, "dock_children_unreadable", "AXError \(childrenError.rawValue)")
}

let list = dockChildren.first { element in
  let (error, role) = attribute(element, kAXRoleAttribute)
  return error == .success && (role as? String) == kAXListRole
}
guard let list else {
  fail(12, "dock_list_not_found")
}

let (itemsError, itemsValue) = attribute(list, kAXChildrenAttribute)
guard itemsError == .success, let dockItems = itemsValue as? [AXUIElement] else {
  fail(12, "dock_items_unreadable", "AXError \(itemsError.rawValue)")
}

var apps: [[String: Any]] = []
for item in dockItems {
  let (_, subrole) = attribute(item, kAXSubroleAttribute)
  guard (subrole as? String) == "AXApplicationDockItem" else { continue }

  let (_, titleValue) = attribute(item, kAXTitleAttribute)
  let (_, urlValue) = attribute(item, kAXURLAttribute)
  let (_, runningValue) = attribute(item, "AXIsApplicationRunning")
  // AXStatusLabel is the Dock's badge text. It is not in Apple's public
  // headers. A missing badge returns kAXErrorNoValue.
  let (badgeError, badgeValue) = attribute(item, "AXStatusLabel")

  var path: Any = NSNull()
  var bundleId: Any = NSNull()
  if let urlValue, CFGetTypeID(urlValue) == CFURLGetTypeID() {
    let url = (urlValue as! CFURL) as URL
    path = url.path
    if let identifier = Bundle(url: url)?.bundleIdentifier { bundleId = identifier }
  }

  var badge: Any = NSNull()
  if badgeError == .success, let text = badgeValue as? String { badge = text }

  apps.append([
    "bundleId": bundleId,
    "path": path,
    "title": (titleValue as? String) ?? NSNull(),
    "running": (runningValue as? Bool) ?? false,
    "badge": badge,
  ])
}

emit(["trusted": true, "apps": apps], code: 0)
