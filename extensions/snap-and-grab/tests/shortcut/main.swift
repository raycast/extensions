import CoreGraphics
import Foundation
func check(_ result: Bool, _ message: String) { if !result { fputs("FAIL: \(message)\n", stderr); exit(1) } }
let current = CaptureShortcut(initialFlags: [.maskControl, .maskCommand, .maskAlphaShift])
check(current.label == "⌃⌘", "Caps Lock is excluded from shortcut modifiers")
check(current.isHeld(in: [.maskControl, .maskCommand]), "current shortcut remains held")
check(!current.isHeld(in: [.maskCommand]), "release of a required modifier finalizes")
let native = CaptureShortcut(initialFlags: [.maskCommand, .maskShift])
check(native.label == "⇧⌘", "default screenshot modifiers are supported")
check(native.isHeld(in: [.maskCommand, .maskShift, .maskAlternate]), "additional modifiers do not prematurely finalize")
check(!native.isHeld(in: [.maskCommand]), "Shift release finalizes default screenshot chord")
let alternate = CaptureShortcut(initialFlags: [.maskAlternate, .maskCommand])
check(alternate.label == "⌥⌘" && alternate.isHeld(in: [.maskAlternate, .maskCommand]), "custom modifier combinations work")
let search = CaptureShortcut(initialFlags: [])
check(!search.isHeld(in: []), "launching from search gives a normal single capture")
print("PASS: configurable modifier chords, release detection, labels, and search launch")
