import CoreGraphics
import AppKit
import Carbon.HIToolbox

/// One key transition, already resolved to a simple down/up — including for
/// modifier keys, which the OS only ever reports via flagsChanged (see the
/// note on `modifierKeysCurrentlyDown` below).
struct KeyActivity {
    let keycode: Int64
    let isDown: Bool
    let logLine: String
}

/// Captures global keyboard events via CGEventTap in listen-only mode —
/// this tool observes keystrokes, it never intercepts or blocks them.
class EventTap {
    static let shared = EventTap()

    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var onActivity: ((KeyActivity) -> Void)?

    // Modifier keys never fire keyDown/keyUp, only flagsChanged, which says
    // which key changed but not in which direction. Toggling per keycode
    // inverts for good if a release arrives first — e.g. letting go of the
    // shortcut that launched us after the tap is already running. So the
    // direction is read from the flags instead, and a release with no
    // recorded press is ignored.
    private var modifierKeysCurrentlyDown: Set<Int64> = []

    // Device-dependent bits (NX_DEVICE*KEYMASK in IOKit's IOLLEvent.h). The
    // generic masks like .maskShift are shared by left and right, so they
    // can't tell whether left Shift was released while right is still held.
    // The generic mask is still the fallback for sources that set no device
    // bits at all for that modifier.
    private struct ModifierMask {
        let device: UInt64
        let bothSides: UInt64
        let generic: CGEventFlags
    }

    private static let modifierMasks: [Int64: ModifierMask] = {
        let lCtl: UInt64 = 0x0000_0001, rCtl: UInt64 = 0x0000_2000
        let lShift: UInt64 = 0x0000_0002, rShift: UInt64 = 0x0000_0004
        let lCmd: UInt64 = 0x0000_0008, rCmd: UInt64 = 0x0000_0010
        let lAlt: UInt64 = 0x0000_0020, rAlt: UInt64 = 0x0000_0040
        let fn = CGEventFlags.maskSecondaryFn
        return [
            Int64(kVK_Control): ModifierMask(device: lCtl, bothSides: lCtl | rCtl, generic: .maskControl),
            Int64(kVK_RightControl): ModifierMask(device: rCtl, bothSides: lCtl | rCtl, generic: .maskControl),
            Int64(kVK_Shift): ModifierMask(device: lShift, bothSides: lShift | rShift, generic: .maskShift),
            Int64(kVK_RightShift): ModifierMask(device: rShift, bothSides: lShift | rShift, generic: .maskShift),
            Int64(kVK_Command): ModifierMask(device: lCmd, bothSides: lCmd | rCmd, generic: .maskCommand),
            Int64(kVK_RightCommand): ModifierMask(device: rCmd, bothSides: lCmd | rCmd, generic: .maskCommand),
            Int64(kVK_Option): ModifierMask(device: lAlt, bothSides: lAlt | rAlt, generic: .maskAlternate),
            Int64(kVK_RightOption): ModifierMask(device: rAlt, bothSides: lAlt | rAlt, generic: .maskAlternate),
            Int64(kVK_Function): ModifierMask(device: fn.rawValue, bothSides: fn.rawValue, generic: fn),
        ]
    }()

    private init() {}

    func start(onActivity: @escaping (KeyActivity) -> Void) -> Bool {
        self.onActivity = onActivity

        if !CGPreflightListenEventAccess() {
            CGRequestListenEventAccess()
            return false
        }

        let eventMask: CGEventMask =
            (1 << CGEventType.keyDown.rawValue)
            | (1 << CGEventType.keyUp.rawValue)
            | (1 << CGEventType.flagsChanged.rawValue)

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: eventMask,
            callback: { proxy, type, event, refcon in
                guard let refcon = refcon else { return Unmanaged.passUnretained(event) }
                let instance = Unmanaged<EventTap>.fromOpaque(refcon).takeUnretainedValue()

                // System disables the tap under load; re-enable immediately (KeyRaycast pattern).
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    if let tap = instance.eventTap {
                        CGEvent.tapEnable(tap: tap, enable: true)
                    }
                    return Unmanaged.passUnretained(event)
                }

                instance.handle(type: type, event: event)
                return Unmanaged.passUnretained(event)
            },
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else {
            return false
        }

        self.eventTap = tap
        self.runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        if let source = runLoopSource {
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .defaultMode)
        }
        CGEvent.tapEnable(tap: tap, enable: true)

        // flagsChanged-only taps can succeed without full permission; confirm
        // keyDown specifically is actually granted (KeyRaycast pattern).
        let keyOnlyMask: CGEventMask = 1 << CGEventType.keyDown.rawValue
        if let testTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: keyOnlyMask,
            callback: { _, _, event, _ in Unmanaged.passUnretained(event) },
            userInfo: nil
        ) {
            CGEvent.tapEnable(tap: testTap, enable: false)
        } else {
            stop()
            return false
        }

        return true
    }

    func stop() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .defaultMode)
        }
        eventTap = nil
        runLoopSource = nil
        onActivity = nil
        modifierKeysCurrentlyDown.removeAll()
    }

    private func handle(type: CGEventType, event: CGEvent) {
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = event.flags

        switch type {
        case .keyDown:
            emit(keyCode: keyCode, isDown: true, label: "keyDown", flags: flags)
        case .keyUp:
            emit(keyCode: keyCode, isDown: false, label: "keyUp", flags: flags)
        case .flagsChanged:
            let isDown: Bool
            if let mask = Self.modifierMasks[keyCode] {
                if flags.rawValue & mask.bothSides != 0 {
                    isDown = flags.rawValue & mask.device != 0
                } else {
                    isDown = flags.contains(mask.generic)
                }
            } else if keyCode == Int64(kVK_CapsLock) {
                // Its flag is the lock state, not whether the key is held.
                isDown = !modifierKeysCurrentlyDown.contains(keyCode)
            } else {
                return
            }
            guard isDown != modifierKeysCurrentlyDown.contains(keyCode) else { return }
            if isDown {
                modifierKeysCurrentlyDown.insert(keyCode)
            } else {
                modifierKeysCurrentlyDown.remove(keyCode)
            }
            emit(keyCode: keyCode, isDown: isDown, label: isDown ? "keyDown*" : "keyUp*", flags: flags)
        default:
            break
        }
    }

    private func emit(keyCode: Int64, isDown: Bool, label: String, flags: CGEventFlags) {
        let logLine = "\(label.padding(toLength: 9, withPad: " ", startingAt: 0)) keycode=\(keyCode) name=\(KeyNames.name(for: keyCode)) flags=\(Self.describeFlags(flags)) raw=0x\(String(flags.rawValue, radix: 16))"
        onActivity?(KeyActivity(keycode: keyCode, isDown: isDown, logLine: logLine))
    }

    private static func describeFlags(_ flags: CGEventFlags) -> String {
        var parts: [String] = []
        if flags.contains(.maskShift) { parts.append("shift") }
        if flags.contains(.maskControl) { parts.append("control") }
        if flags.contains(.maskAlternate) { parts.append("option") }
        if flags.contains(.maskCommand) { parts.append("command") }
        if flags.contains(.maskSecondaryFn) { parts.append("fn") }
        if flags.contains(.maskAlphaShift) { parts.append("capslock") }
        return parts.isEmpty ? "-" : parts.joined(separator: "+")
    }
}
