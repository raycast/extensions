import AppKit
import ApplicationServices

// Accessibility helpers shared by Windows.swift and Sidebar.swift. Every AX call needs Raycast to have
// Accessibility permission (System Settings > Privacy & Security > Accessibility).
//
// Kept free of Raycast macros so it compiles with plain `swiftc` for quick checks.

func axTrusted() -> Bool { AXIsProcessTrusted() }

func pid(of bundleId: String) -> Int32? {
  NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first?.processIdentifier
}

func appElement(_ pid: Int32) -> AXUIElement {
  let app = AXUIElementCreateApplication(pid)
  // An unresponsive app must not stall the whole list.
  AXUIElementSetMessagingTimeout(app, 0.5)
  return app
}

func attribute(_ element: AXUIElement, _ name: String) -> AnyObject? {
  var value: AnyObject?
  return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}

func string(_ element: AXUIElement, _ name: String) -> String? { attribute(element, name) as? String }
func bool(_ element: AXUIElement, _ name: String) -> Bool { (attribute(element, name) as? Bool) ?? false }
func children(_ element: AXUIElement, _ name: String = kAXChildrenAttribute) -> [AXUIElement] {
  attribute(element, name) as? [AXUIElement] ?? []
}

func walk(_ element: AXUIElement, depth: Int, _ visit: (AXUIElement) -> Void) {
  visit(element)
  guard depth > 0 else { return }
  for child in children(element) { walk(child, depth: depth - 1, visit) }
}

func find(_ element: AXUIElement, depth: Int, where match: (AXUIElement) -> Bool) -> AXUIElement? {
  if match(element) { return element }
  guard depth > 0 else { return nil }
  for child in children(element) {
    if let found = find(child, depth: depth - 1, where: match) { return found }
  }
  return nil
}
