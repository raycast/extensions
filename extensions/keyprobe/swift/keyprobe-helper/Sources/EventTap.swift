import CoreGraphics
import AppKit
import Carbon.HIToolbox

/// One key transition, already resolved to a simple down/up — including for
/// modifier keys, which the OS only ever reports via flagsChanged (see the
/// toggle-tracking note on `modifierKeysCurrentlyDown` below).
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

    // Modifier keys (Shift/Ctrl/Option/Command/Fn/CapsLock, incl. left/right
    // pairs) never fire keyDown/keyUp — only flagsChanged, and that event's
    // flag bits are shared between e.g. left and right Shift, so they can't
    // tell which physical key just changed.
    // What's reliable is the event's own keycode field: the OS always
    // reports the specific physical key that changed. So instead of reading
    // direction from the flag bits, we toggle per keycode: the first
    // flagsChanged for a given modifier keycode is "down", the next is "up".
    // This also degrades fine for CapsLock (a hardware toggle switch) since
    // press and release still each fire their own flagsChanged.
    private var modifierKeysCurrentlyDown: Set<Int64> = []

    private static let modifierKeycodes: Set<Int64> = [
        Int64(kVK_Shift), Int64(kVK_RightShift),
        Int64(kVK_Control), Int64(kVK_RightControl),
        Int64(kVK_Option), Int64(kVK_RightOption),
        Int64(kVK_Command), Int64(kVK_RightCommand),
        Int64(kVK_Function), Int64(kVK_CapsLock),
    ]

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
            guard Self.modifierKeycodes.contains(keyCode) else { return }
            let isDown: Bool
            if modifierKeysCurrentlyDown.contains(keyCode) {
                modifierKeysCurrentlyDown.remove(keyCode)
                isDown = false
            } else {
                modifierKeysCurrentlyDown.insert(keyCode)
                isDown = true
            }
            emit(keyCode: keyCode, isDown: isDown, label: isDown ? "keyDown*" : "keyUp*", flags: flags)
        default:
            break
        }
    }

    private func emit(keyCode: Int64, isDown: Bool, label: String, flags: CGEventFlags) {
        let logLine = "\(label.padding(toLength: 9, withPad: " ", startingAt: 0)) keycode=\(keyCode) name=\(KeyNames.name(for: keyCode)) flags=\(Self.describeFlags(flags))"
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
