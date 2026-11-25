import AppKit
import ApplicationServices
import Foundation

/** Focus an already identified window; tab selection and discovery belong to the caller. */
func focusWindow(
  _ window: AXUIElement,
  pid: Int32,
  windowId: CGWindowID,
  unhide: Bool = true,
  setFocused: Bool = false
) throws {
  if boolAttr(window, kAXMinimizedAttribute) {
    _ = AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
  }
  let application = NSRunningApplication(processIdentifier: pid)
  if unhide { application?.unhide() }
  if #available(macOS 14.0, *) {
    application?.activate()
  } else {
    application?.activate(options: [.activateIgnoringOtherApps])
  }
  // Activation can restore the previous key window. Raise the requested window afterward.
  _ = AXUIElementPerformAction(window, kAXRaiseAction as CFString)
  _ = AXUIElementSetAttributeValue(window, kAXMainAttribute as CFString, kCFBooleanTrue)
  if setFocused {
    _ = AXUIElementSetAttributeValue(window, kAXFocusedAttribute as CFString, kCFBooleanTrue)
  }
  try verifyFocusedWindow(pid: pid, windowId: windowId)
}

func isFocusedWindow(pid: Int32, windowId expectedWindowId: CGWindowID) -> Bool {
  guard NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else { return false }
  let application = AXUIElementCreateApplication(pid)
  AXUIElementSetMessagingTimeout(application, 0.1)
  guard let rawWindow = copyAttr(application, kAXFocusedWindowAttribute) else { return false }
  let focusedWindow = rawWindow as! AXUIElement
  return windowId(of: focusedWindow) == expectedWindowId && !boolAttr(focusedWindow, kAXMinimizedAttribute)
}

/** Activation and Space transitions are asynchronous; verify their final window identity. */
func verifyFocusedWindow(
  pid: Int32,
  windowId: CGWindowID,
  timeout: TimeInterval = 1.5,
  isFocused: (Int32, CGWindowID) -> Bool = isFocusedWindow,
  now: () -> TimeInterval = { ProcessInfo.processInfo.systemUptime },
  // AppKit updates activation state through the main run loop; sleeping prevents those updates.
  pause: (TimeInterval) -> Void = { RunLoop.current.run(until: Date(timeIntervalSinceNow: $0)) }
) throws {
  let deadline = now() + timeout
  while !isFocused(pid, windowId) {
    guard now() < deadline else {
      throw NSError(
        domain: "WindowFocus", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Window did not become focused. Refresh the list."]
      )
    }
    pause(0.025)
  }
}
