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

private func focusedElement() throws -> AXUIElement {
  guard AXIsProcessTrusted() else { throw FocusedFieldError.notTrusted }

  waitForRaycastToYieldFocus()

  guard let app = NSWorkspace.shared.frontmostApplication else {
    throw FocusedFieldError.noFocusedField
  }

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

  return value as! AXUIElement
}

private func stringValue(of element: AXUIElement) -> String? {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value) == .success else {
    return nil
  }
  return value as? String
}

@raycast func readFocusedField() throws -> FocusedField {
  let element = try focusedElement()

  guard let text = stringValue(of: element), !text.isEmpty else {
    throw FocusedFieldError.noFocusedField
  }

  let appName = NSWorkspace.shared.frontmostApplication?.localizedName ?? "the frontmost app"
  return FocusedField(text: text, appName: appName)
}

/// Selects everything in the focused field so a subsequent paste replaces it.
///
/// Setting the selected range rather than writing kAXValue directly means the
/// replacement still goes through the app's normal text input path, which is
/// both more widely supported and leaves an undo entry behind.
@raycast func selectAllInFocusedField() throws {
  let element = try focusedElement()

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
