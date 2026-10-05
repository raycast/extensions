import Carbon
import Foundation
import InputMethodKit
import RaycastSwiftMacros

struct KeyboardLayout: Encodable {
    let title: String
    let id: String
    let active: Bool
}

struct LayoutKeyMap: Encodable {
    let id: String
    let title: String
    let active: Bool
    /// 96-char string: 35 unshifted + 35 shifted letter/punct keys, then 13 unshifted + 13 shifted number-row keys.
    /// Position i corresponds to the same physical key in every layout — used for cross-layout character mapping.
    let keyMap: String
}

// MARK: - Canonical key code order (matches existing EN/BE mapping strings)
// Rows: q-p+[]+a-l+;'\`+z-m+,./  (35 keys), then §+1-0+-=  (13 keys)
private let letterKeyCodes: [UInt16] = [
    12, 13, 14, 15, 17, 16, 32, 34, 31, 35, 33, 30, // q w e r t y u i o p [ ]
     0,  1,  2,  3,  5,  4, 38, 40, 37, 41, 39, 42, 50, // a s d f g h j k l ; ' \ `
     6,  7,  8,  9, 11, 45, 46, 43, 47, 44,           // z x c v b n m , . /
]
private let numberKeyCodes: [UInt16] = [
    10, 18, 19, 20, 21, 23, 22, 26, 28, 25, 29, 27, 24, // § 1 2 3 4 5 6 7 8 9 0 - =
]

// MARK: - Raycast Exports

@raycast func getEnabledLayouts() -> [KeyboardLayout] {
    let sources = enabledInputSources()
    let current = currentLayoutName()

    return sources.map { source in
        KeyboardLayout(
            title: getLocalizedName(source),
            id: getInputSourceID(source),
            active: getLocalizedName(source) == current
        )
    }
}

@raycast func getCurrentLayout() -> String {
    currentLayoutName()
}

@raycast func selectLayout(name: String) throws -> String {
    let sources = enabledInputSources()

    // Try to find by localized name
    if let source = sources.first(where: { getLocalizedName($0) == name }) {
        if TISSelectInputSource(source) == noErr {
            return "found"
        }
        throw "Failed to select layout \(name)"
    }

    // Try to find by ID
    if let source = sources.first(where: { getInputSourceID($0) == name }) {
        if TISSelectInputSource(source) == noErr {
            return "found"
        }
        throw "Failed to select layout \(name)"
    }

    // Try to find by short ID (last component)
    if let source = sources.first(where: { getInputSourceID($0).components(separatedBy: ".").last == name }) {
        if TISSelectInputSource(source) == noErr {
            return "found"
        }
        throw "Failed to select layout \(name)"
    }

    throw "Layout '\(name)' not found"
}

@raycast func getLayoutKeyMaps() -> [LayoutKeyMap] {
    let sources = enabledInputSources()
    let current = currentLayoutName()

    return sources.compactMap { source in
        guard let keyMap = buildKeyMap(for: source) else { return nil }
        return LayoutKeyMap(
            id: getInputSourceID(source),
            title: getLocalizedName(source),
            active: getLocalizedName(source) == current,
            keyMap: keyMap
        )
    }
}

// MARK: - Private Helpers

private func buildKeyMap(for source: TISInputSource) -> String? {
    guard let dataRef = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData) else {
        return nil
    }
    let keyboardData = Unmanaged<CFData>.fromOpaque(dataRef).takeUnretainedValue() as Data
    let kbdType = UInt32(LMGetKbdType())

    var result = ""
    result.reserveCapacity(192)

    // Layout (192 chars total):
    //   Positions   0- 95: base layers  (no-mod letters, shift letters, no-mod numbers, shift numbers)
    //   Positions  96-191: alt  layers  (option letters, option+shift letters, option numbers, option+shift numbers)
    //
    // Modifier values = Carbon modifier flags >> 8:
    //   0 = no modifier, 2 = Shift, 8 = Option, 10 = Option+Shift

    // Base (positions 0-95)
    for modifier: UInt32 in [0, 2] {
        for keyCode in letterKeyCodes {
            result += translateKey(keyCode, modifier: modifier, data: keyboardData, kbdType: kbdType)
        }
    }
    for modifier: UInt32 in [0, 2] {
        for keyCode in numberKeyCodes {
            result += translateKey(keyCode, modifier: modifier, data: keyboardData, kbdType: kbdType)
        }
    }

    // Alt (positions 96-191)
    for modifier: UInt32 in [8, 10] {
        for keyCode in letterKeyCodes {
            result += translateKey(keyCode, modifier: modifier, data: keyboardData, kbdType: kbdType)
        }
    }
    for modifier: UInt32 in [8, 10] {
        for keyCode in numberKeyCodes {
            result += translateKey(keyCode, modifier: modifier, data: keyboardData, kbdType: kbdType)
        }
    }

    return result
}

private func translateKey(_ keyCode: UInt16, modifier: UInt32, data: Data, kbdType: UInt32) -> String {
    var deadKeyState: UInt32 = 0
    var chars = [UniChar](repeating: 0, count: 4)
    var length = 0

    let status = data.withUnsafeBytes { ptr -> OSStatus in
        guard let layoutPtr = ptr.bindMemory(to: UCKeyboardLayout.self).baseAddress else {
            return OSStatus(-1)
        }
        return UCKeyTranslate(
            layoutPtr,
            keyCode,
            UInt16(kUCKeyActionDown),
            modifier,
            kbdType,
            OptionBits(kUCKeyTranslateNoDeadKeysBit),
            &deadKeyState,
            4,
            &length,
            &chars
        )
    }

    // JS indexes keyMap by UTF-16 unit, so every key must be exactly one unit or positions shift.
    // ponytail: multi-unit keys (ligatures, combining marks, non-BMP) are not mapped; widen the key map format if users need them.
    guard status == noErr, length == 1, let scalar = UnicodeScalar(chars[0]) else { return "\u{0}" }
    return String(scalar)
}

private func currentLayoutName() -> String {
    let source = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
    return getLocalizedName(source)
}

private func enabledInputSources() -> [TISInputSource] {
    var sources: [TISInputSource] = []

    // Get keyboard layouts
    if let layouts = TISCreateInputSourceList(
        [kTISPropertyInputSourceType as String: kTISTypeKeyboardLayout as String] as CFDictionary,
        false
    )?.takeRetainedValue() as? [TISInputSource] {
        sources.append(contentsOf: layouts.filter { isEnabled($0) })
    }

    // Get input modes (for languages like Chinese, Japanese)
    if let modes = TISCreateInputSourceList(
        [kTISPropertyInputSourceType as String: kTISTypeKeyboardInputMode as String] as CFDictionary,
        false
    )?.takeRetainedValue() as? [TISInputSource] {
        sources.append(contentsOf: modes.filter { isEnabled($0) })
    }

    return sources
}

private func getLocalizedName(_ source: TISInputSource) -> String {
    Unmanaged<CFString>.fromOpaque(
        TISGetInputSourceProperty(source, kTISPropertyLocalizedName)
    ).takeUnretainedValue() as String
}

private func getInputSourceID(_ source: TISInputSource) -> String {
    Unmanaged<CFString>.fromOpaque(
        TISGetInputSourceProperty(source, kTISPropertyInputSourceID)
    ).takeUnretainedValue() as String
}

private func isEnabled(_ source: TISInputSource) -> Bool {
    let enabled = Unmanaged<NSNumber>.fromOpaque(
        TISGetInputSourceProperty(source, kTISPropertyInputSourceIsEnabled)
    ).takeUnretainedValue()
    return enabled.boolValue
}

extension String: Error {}
