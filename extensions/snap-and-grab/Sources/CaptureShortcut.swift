import CoreGraphics

struct CaptureShortcut {
    let modifiers: CGEventFlags

    init(initialFlags: CGEventFlags) {
        let supported: CGEventFlags = [.maskControl, .maskAlternate, .maskShift, .maskCommand, .maskSecondaryFn]
        modifiers = initialFlags.intersection(supported)
    }

    func isHeld(in flags: CGEventFlags) -> Bool {
        !modifiers.isEmpty && flags.intersection(modifiers) == modifiers
    }

    var label: String {
        var result = ""
        if modifiers.contains(.maskSecondaryFn) { result += "fn" }
        if modifiers.contains(.maskControl) { result += "⌃" }
        if modifiers.contains(.maskAlternate) { result += "⌥" }
        if modifiers.contains(.maskShift) { result += "⇧" }
        if modifiers.contains(.maskCommand) { result += "⌘" }
        return result
    }
}
