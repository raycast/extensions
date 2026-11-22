import AppKit
import ApplicationServices
import CoreGraphics

/// Set when the scanner stops. Typing checks it between chunks.
final class StopFlag: @unchecked Sendable {
  private let lock = NSLock()
  private var stopped = false

  var isSet: Bool {
    lock.lock()
    defer { lock.unlock() }
    return stopped
  }

  func set() {
    lock.lock()
    stopped = true
    lock.unlock()
  }
}

enum Typing {
  private static let returnKeyCode: CGKeyCode = 36
  private static let tabKeyCode: CGKeyCode = 48
  private static let chunkSize = 16
  private static let queue = DispatchQueue(label: "barcode-scanner.typing")

  static var isTrusted: Bool { AXIsProcessTrusted() }

  /// Adds Raycast to the Accessibility list and opens that pane. Call at most once per run.
  static func requestAccessibility() {
    let options = ["AXTrustedCheckOptionPrompt" as CFString: true] as CFDictionary
    _ = AXIsProcessTrustedWithOptions(options)
    if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
      NSWorkspace.shared.open(url)
    }
  }

  /// Throws the Accessibility message, after one prompt, when typing is not allowed.
  static func requireAccessibility() throws {
    guard !isTrusted else { return }
    requestAccessibility()
    throw ScannerError(ScannerError.accessibility)
  }

  /// Applies the group separator option to a raw code.
  static func prepare(_ code: String, options: ScannerOptions) -> String {
    let gs = "\u{1D}"
    switch options.gsSeparator {
    case "keep": return code
    case "replace": return code.replacingOccurrences(of: gs, with: options.gsReplacement)
    default: return code.replacingOccurrences(of: gs, with: "")
    }
  }

  /// Types the text, then the suffix key, on a serial queue. Stops between chunks once `stop` is
  /// set. Calls `done` with true when everything was typed.
  static func type(
    _ text: String, suffix: String, stop: StopFlag, done: @escaping @Sendable (Bool) -> Void = { _ in }
  ) {
    queue.async {
      let units = Array(text.utf16)
      var index = 0
      while index < units.count {
        if stop.isSet { return done(false) }
        var end = min(index + chunkSize, units.count)
        // Do not split a surrogate pair across two events.
        if end < units.count, UTF16.isLeadSurrogate(units[end - 1]) { end -= 1 }
        postUnicode(Array(units[index..<end]))
        index = end
      }
      if stop.isSet { return done(false) }
      switch suffix {
      case "enter": postKey(returnKeyCode)
      case "tab": postKey(tabKeyCode)
      default: break
      }
      done(true)
    }
  }

  private static func postUnicode(_ chars: [UniChar]) {
    guard !chars.isEmpty else { return }
    for keyDown in [true, false] {
      guard let event = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: keyDown) else { continue }
      event.flags = []
      event.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: chars)
      event.post(tap: .cghidEventTap)
    }
    usleep(3000)
  }

  private static func postKey(_ code: CGKeyCode) {
    for keyDown in [true, false] {
      guard let event = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: keyDown) else { continue }
      event.flags = []
      event.post(tap: .cghidEventTap)
    }
    usleep(3000)
  }
}
