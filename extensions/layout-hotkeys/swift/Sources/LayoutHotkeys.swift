// Selecting a keyboard layout needs Carbon's Text Input Sources API, which is
// not reachable from TypeScript, so these functions are exposed to the
// extension through raycast/extensions-swift-tools.

import AppKit
import Carbon
import RaycastSwiftMacros

// Covers the release build (com.raycast.macos) and the beta (com.raycast-x.macos).
let raycastBundlePrefix = "com.raycast"

struct InputSource: Encodable {
  let id: String
  let name: String
  let isCurrent: Bool
}

enum InputSourceError: LocalizedError {
  case notEnabled(String)
  case noCurrentSource
  case selectionFailed(String, OSStatus)

  var errorDescription: String? {
    switch self {
    case .notEnabled(let id):
      return "\(id) is not an enabled input source. Add it in System Settings › Keyboard › Input Sources."
    case .noCurrentSource:
      return "Could not read the current keyboard input source."
    case .selectionFailed(let id, let status):
      return "Could not switch to \(id) (OSStatus \(status))."
    }
  }
}

// Internal rather than private so the text-conversion side can reuse them.
func property(_ source: TISInputSource, _ key: CFString) -> String? {
  guard let pointer = TISGetInputSourceProperty(source, key) else { return nil }
  return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}

private func boolProperty(_ source: TISInputSource, _ key: CFString) -> Bool {
  guard let pointer = TISGetInputSourceProperty(source, key) else { return false }
  return CFBooleanGetValue(Unmanaged<CFBoolean>.fromOpaque(pointer).takeUnretainedValue())
}

/// Enabled, selectable keyboard input sources, in the order macOS reports them.
func selectableSources() -> [(ref: TISInputSource, id: String, name: String)] {
  // `false` here means "enabled sources only" rather than every installed one.
  guard let list = TISCreateInputSourceList(nil, false)?.takeRetainedValue() as? [TISInputSource] else {
    return []
  }

  return list.compactMap { source in
    guard property(source, kTISPropertyInputSourceCategory) == (kTISCategoryKeyboardInputSource as String),
      boolProperty(source, kTISPropertyInputSourceIsSelectCapable),
      let id = property(source, kTISPropertyInputSourceID)
    else { return nil }

    return (source, id, property(source, kTISPropertyLocalizedName) ?? id)
  }
}

func currentSourceID() -> String? {
  guard let ref = TISCopyCurrentKeyboardInputSource()?.takeRetainedValue() else { return nil }
  return property(ref, kTISPropertyInputSourceID)
}

/// Raycast is frontmost for a moment after a command fires. Switching while it
/// holds focus can be undone by macOS's per-app input source memory once focus
/// returns, so wait for it to yield before touching the input source.
func waitForRaycastToYieldFocus(timeout: TimeInterval = 0.4) {
  let deadline = Date().addingTimeInterval(timeout)
  while Date() < deadline {
    let frontmost = NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? ""
    if !frontmost.hasPrefix(raycastBundlePrefix) { return }
    usleep(10_000)
  }
}

private func select(_ source: (ref: TISInputSource, id: String, name: String)) throws -> InputSource {
  if currentSourceID() != source.id {
    waitForRaycastToYieldFocus()

    let status = TISSelectInputSource(source.ref)
    guard status == noErr else { throw InputSourceError.selectionFailed(source.id, status) }
  }

  return InputSource(id: source.id, name: source.name, isCurrent: true)
}

@raycast func listInputSources() -> [InputSource] {
  let current = currentSourceID()
  return selectableSources().map { InputSource(id: $0.id, name: $0.name, isCurrent: $0.id == current) }
}

@raycast func currentInputSource() throws -> InputSource {
  guard let id = currentSourceID(), let match = selectableSources().first(where: { $0.id == id }) else {
    throw InputSourceError.noCurrentSource
  }
  return InputSource(id: match.id, name: match.name, isCurrent: true)
}

@raycast func selectInputSource(id: String) throws -> InputSource {
  // An input source that is installed but not enabled cannot be selected, and
  // TISSelectInputSource reports success anyway — so reject it up front.
  guard let target = selectableSources().first(where: { $0.id == id }) else {
    throw InputSourceError.notEnabled(id)
  }
  return try select(target)
}

@raycast func cycleInputSource() throws -> InputSource {
  let sources = selectableSources()
  guard !sources.isEmpty else { throw InputSourceError.noCurrentSource }
  let index = sources.firstIndex { $0.id == currentSourceID() } ?? -1
  return try select(sources[(index + 1) % sources.count])
}
