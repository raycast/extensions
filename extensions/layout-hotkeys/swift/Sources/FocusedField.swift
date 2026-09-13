// Reads and selects the whole contents of the focused text field, so a convert
// command can still do something useful when the user has not selected anything.
//
// This goes through the Accessibility API rather than synthesizing a ⌘A
// keystroke: a synthetic keystroke lands on whichever app is frontmost, and
// Raycast itself is frontmost for a moment after a command fires. Querying the
// focused element of the frontmost *other* app avoids that race entirely.

import AppKit
import ApplicationServices
import RaycastSwiftMacros

struct FocusedField: Encodable {
  let text: String
  let appName: String
}

enum FocusedFieldError: LocalizedError {
  case notTrusted
  case noFocusedField
  case notEditable

  var errorDescription: String? {
    switch self {
    case .notTrusted:
      return "Raycast needs Accessibility permission. Grant it in System Settings › Privacy & Security › Accessibility."
    case .noFocusedField:
      return "No text field is focused."
    case .notEditable:
      return "That text field cannot be edited."
    }
  }
}

private func isRaycast(_ app: NSRunningApplication) -> Bool {
  (app.bundleIdentifier ?? "").hasPrefix(raycastBundlePrefix)
}

/// The app whose text field the user means: the one in front of everything
/// except Raycast.
///
/// Waiting for Raycast to yield focus is enough for a no-view hotkey, which
/// dismisses the window a moment after firing, but not for the Convert Selection
/// picker — that is a view command, and its window stays up for as long as the
/// list is open, so the wait would always time out and the query would land on
/// Raycast's own search field. CGWindowListCopyWindowInfo reports on-screen
/// windows front to back, so the first ordinary window that is not Raycast's
/// belongs to the app being typed in. Only the owner PID and the window layer
/// are read, and neither needs Screen Recording permission — window titles
/// would.
private func targetApplication() throws -> NSRunningApplication {
  if let frontmost = NSWorkspace.shared.frontmostApplication, !isRaycast(frontmost) {
    return frontmost
  }

  guard
    let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
      as? [[String: Any]]
  else {
    throw FocusedFieldError.noFocusedField
  }

  for window in windows {
    guard
      // Layer 0 is the ordinary window level, which skips the Dock, the menu
      // bar and other floating chrome.
      window[kCGWindowLayer as String] as? Int == 0,
      let pid = window[kCGWindowOwnerPID as String] as? Int,
      let app = NSRunningApplication(processIdentifier: pid_t(pid)),
      !isRaycast(app)
    else { continue }

    return app
  }

  throw FocusedFieldError.noFocusedField
}

/// The focused element of `targetApplication()`, and the app it belongs to.
///
/// Accessibility reads and writes do not need the target app to be active, so
/// there is nothing to wait for here.
private func focusedElement() throws -> (element: AXUIElement, app: NSRunningApplication) {
  guard AXIsProcessTrusted() else { throw FocusedFieldError.notTrusted }

  let app = try targetApplication()

  let application = AXUIElementCreateApplication(app.processIdentifier)
  var focused: CFTypeRef?
  // Swift will not conditionally downcast to a CoreFoundation type, so check the
  // type ID before forcing the cast.
  guard
    AXUIElementCopyAttributeValue(application, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
    let value = focused,
    CFGetTypeID(value) == AXUIElementGetTypeID()
  else {
    throw FocusedFieldError.noFocusedField
  }

  return (value as! AXUIElement, app)
}

private func stringValue(of element: AXUIElement) -> String? {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value) == .success else {
    return nil
  }
  return value as? String
}

@raycast func readFocusedField() throws -> FocusedField {
  let (element, app) = try focusedElement()

  guard let text = stringValue(of: element), !text.isEmpty else {
    throw FocusedFieldError.noFocusedField
  }

  return FocusedField(text: text, appName: app.localizedName ?? "the frontmost app")
}

/// Selects everything in the focused field so a subsequent paste replaces it.
///
/// Setting the selected range rather than writing kAXValue directly means the
/// replacement still goes through the app's normal text input path, which is
/// both more widely supported and leaves an undo entry behind.
@raycast func selectAllInFocusedField() throws {
  let (element, _) = try focusedElement()

  guard let text = stringValue(of: element) else { throw FocusedFieldError.noFocusedField }

  var settable = DarwinBoolean(false)
  AXUIElementIsAttributeSettable(element, kAXSelectedTextRangeAttribute as CFString, &settable)
  guard settable.boolValue else { throw FocusedFieldError.notEditable }

  // AXSelectedTextRange counts UTF-16 code units, the same unit AppKit text
  // views use, so Hebrew and Cyrillic ranges line up correctly.
  var range = CFRange(location: 0, length: text.utf16.count)
  guard let value = AXValueCreate(.cfRange, &range) else { throw FocusedFieldError.notEditable }

  let status = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, value)
  guard status == .success else { throw FocusedFieldError.notEditable }
}
