import CoreGraphics
import AppKit
import Carbon.HIToolbox

/// Captures global keyboard events via CGEventTap
class EventTap {
    static let shared = EventTap()

    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var displayMode: DisplayMode = .commandKeys
    private var showMouseClicks: Bool = true
    private var uppercaseKeys: Bool = true
    private var showSpaceSymbol: Bool = true
    private var onKeystroke: ((String, Bool) -> Void)?

    // Cached keyboard layout — invalidated on input source change
    // Retain the CFData so the pointer stays valid
    private var cachedLayoutData: CFData?
    private var cachedKeyboardLayout: UnsafePointer<UCKeyboardLayout>?

    enum DisplayMode: String {
        case commandKeys = "commandKeys"
        case allModified = "allModified"
        case allKeys = "allKeys"
    }

    private init() {
        // Invalidate cached layout when keyboard input source changes
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDistributedCenter(),
            Unmanaged.passUnretained(self).toOpaque(),
            { _, observer, _, _, _ in
                guard let observer = observer else { return }
                let instance = Unmanaged<EventTap>.fromOpaque(observer).takeUnretainedValue()
                // .deliverImmediately can invoke on an arbitrary thread; sync with main where the event tap runs.
                DispatchQueue.main.async {
                    instance.cachedLayoutData = nil
                    instance.cachedKeyboardLayout = nil
                }
            },
            kTISNotifySelectedKeyboardInputSourceChanged as CFString,
            nil,
            .deliverImmediately
        )
    }

    /// onKeystroke: (displayText, isCommand) — isCommand=true means it should get its own pill
    func start(displayMode: String, showMouseClicks: Bool = true, uppercaseKeys: Bool = true, showSpaceSymbol: Bool = true, onKeystroke: @escaping (String, Bool) -> Void) -> Bool {
        self.displayMode = DisplayMode(rawValue: displayMode) ?? .commandKeys
        self.showMouseClicks = showMouseClicks
        self.uppercaseKeys = uppercaseKeys
        self.showSpaceSymbol = showSpaceSymbol
        self.onKeystroke = onKeystroke

        if !CGPreflightListenEventAccess() {
            CGRequestListenEventAccess()
            return false
        }

        let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
            | (1 << CGEventType.flagsChanged.rawValue)
            | (1 << CGEventType.leftMouseDown.rawValue)
            | (1 << CGEventType.rightMouseDown.rawValue)
            | (1 << CGEventType.otherMouseDown.rawValue)

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: eventMask,
            callback: { (proxy, type, event, refcon) -> Unmanaged<CGEvent>? in
                guard let refcon = refcon else { return Unmanaged.passUnretained(event) }
                let instance = Unmanaged<EventTap>.fromOpaque(refcon).takeUnretainedValue()

                // Re-enable tap if system disabled it (happens under heavy load during screen recordings)
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    if let tap = instance.eventTap {
                        CGEvent.tapEnable(tap: tap, enable: true)
                    }
                    return Unmanaged.passUnretained(event)
                }

                instance.handleEvent(type: type, event: event)
                return Unmanaged.passUnretained(event)
            },
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else {
            return false
        }

        self.eventTap = tap
        self.runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)

        if let source = self.runLoopSource {
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .defaultMode)
        }

        CGEvent.tapEnable(tap: tap, enable: true)

        // Verify we can actually receive keyDown events.
        // flagsChanged taps can succeed without full accessibility permissions,
        // so test with a keyDown-only tap to confirm.
        let keyOnlyMask: CGEventMask = 1 << CGEventType.keyDown.rawValue
        if let testTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: keyOnlyMask,
            callback: { _, _, event, _ in Unmanaged.passUnretained(event) },
            userInfo: nil
        ) {
            // Tap created successfully, keyDown permissions are granted. Clean up test tap.
            CGEvent.tapEnable(tap: testTap, enable: false)
        } else {
            // flagsChanged works but keyDown doesn't — partial permissions
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
        onKeystroke = nil
    }

    private var activeModifiers: CGEventFlags = []
    private var pendingModifierID: UInt64 = 0  // increments to cancel stale modifier displays

    private func isHyper(control: Bool, option: Bool, shift: Bool, command: Bool) -> Bool {
        // Raycast can emit Hyper as Ctrl+Opt+Cmd, with Shift optional depending on the user's Hyper Key setup.
        _ = shift
        return control && option && command
    }

    private func formatModifiers(control: Bool, option: Bool, shift: Bool, command: Bool) -> String {
        if isHyper(control: control, option: option, shift: shift, command: command) {
            return shift ? "✦⇧" : "✦"
        }

        var modifiers = ""
        if control { modifiers += "⌃" }
        if option { modifiers += "⌥" }
        if shift { modifiers += "⇧" }
        if command { modifiers += "⌘" }
        return modifiers
    }

    private func handleEvent(type: CGEventType, event: CGEvent) {
        let flags = event.flags

        if type == .flagsChanged {
            let newMods = flags.intersection([.maskCommand, .maskControl, .maskAlternate, .maskShift, .maskSecondaryFn])
            let prevMods = activeModifiers
            let isHyperNow = isHyper(
                control: newMods.contains(.maskControl),
                option: newMods.contains(.maskAlternate),
                shift: newMods.contains(.maskShift),
                command: newMods.contains(.maskCommand)
            )

            var pressed: [String] = []
            if newMods.contains(.maskControl) && !prevMods.contains(.maskControl) { pressed.append("⌃") }
            if newMods.contains(.maskAlternate) && !prevMods.contains(.maskAlternate) { pressed.append("⌥") }
            if newMods.contains(.maskShift) && !prevMods.contains(.maskShift) { pressed.append("⇧") }
            if newMods.contains(.maskCommand) && !prevMods.contains(.maskCommand) { pressed.append("⌘") }
            if newMods.contains(.maskSecondaryFn) && !prevMods.contains(.maskSecondaryFn) { pressed.append("Fn") }

            activeModifiers = newMods

            // Show modifier-only events in allKeys mode.
            // Hyper is a meaningful standalone chord, so always show it.
            if !pressed.isEmpty && (displayMode == .allKeys || isHyperNow) {
                pendingModifierID &+= 1
                let thisID = pendingModifierID
                let modText = formatModifiers(
                    control: newMods.contains(.maskControl),
                    option: newMods.contains(.maskAlternate),
                    shift: newMods.contains(.maskShift),
                    command: newMods.contains(.maskCommand)
                )
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                    // Only show if no keyDown cancelled this
                    if self?.pendingModifierID == thisID {
                        self?.onKeystroke?(modText, false)
                    }
                }
            }
            return
        }

        // Mouse clicks: show modifier+click in the overlay (e.g. "⌘Click", "⌥⌘Click")
        if showMouseClicks && (type == .leftMouseDown || type == .rightMouseDown || type == .otherMouseDown) {
            let hasCommand = flags.contains(.maskCommand)
            let hasControl = flags.contains(.maskControl)
            let hasOption = flags.contains(.maskAlternate)
            let hasShift = flags.contains(.maskShift)
            let hasAnyModifier = hasCommand || hasControl || hasOption || hasShift

            // Only show clicks that have modifiers (plain clicks are too noisy)
            // Exception: right-click is always shown since it's intentional
            if hasAnyModifier || type == .rightMouseDown {
                let mods = formatModifiers(control: hasControl, option: hasOption, shift: hasShift, command: hasCommand)

                let clickName: String
                if type == .rightMouseDown { clickName = "Right Click" }
                else if type == .otherMouseDown { clickName = "Middle Click" }
                else { clickName = "Click" }

                let displayText = mods.isEmpty ? clickName : "\(mods)\(clickName)"
                onKeystroke?(displayText, true)
            }
            return
        }

        guard type == .keyDown else { return }

        // Cancel any pending modifier-only display — this keyDown consumed the modifier
        pendingModifierID &+= 1

        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)

        let hasCommand = flags.contains(.maskCommand)
        let hasControl = flags.contains(.maskControl)
        let hasOption = flags.contains(.maskAlternate)
        let hasShift = flags.contains(.maskShift)
        let hasModifier = hasCommand || hasControl || hasOption

        // Filter based on display mode
        switch displayMode {
        case .commandKeys:
            if !hasCommand && !hasControl { return }
        case .allModified:
            if !hasModifier && !hasShift { return }
        case .allKeys:
            break
        }

        // Shift+Tab → ⇤ (backtab)
        if hasShift && !hasModifier && keyCode == 48 {
            onKeystroke?("⇤", false)
            return
        }

        // In allKeys / allModified, pass shift to UCKeyTranslate so we get the actual character (e.g. ! not 1).
        // When other modifiers are held, shift is shown as a modifier symbol instead.
        let hasCapsLock = flags.contains(.maskAlphaShift)
        let shiftForTranslate = (hasShift || hasCapsLock) && !hasModifier && (displayMode == .allKeys || displayMode == .allModified)
        // Uppercase: always if setting is on, or when displaying shortcuts (has modifiers)
        let shouldUppercase = uppercaseKeys || hasModifier || displayMode != .allKeys
        let keyString = keyCodeToString(keyCode: keyCode, event: event, withShift: shiftForTranslate, uppercase: shouldUppercase)
        guard !keyString.isEmpty else { return }

        // Omit ⇧ when shift is already reflected in the translated character (allKeys / shift-only allModified).
        let shouldShowShiftModifier = hasShift && !shiftForTranslate && (hasModifier || displayMode != .allKeys)
        let modifiers = formatModifiers(
            control: hasControl,
            option: hasOption,
            shift: shouldShowShiftModifier,
            command: hasCommand
        )

        let isCommand = hasCommand || hasControl
        let displayText = modifiers.isEmpty ? keyString : "\(modifiers)\(keyString)"

        onKeystroke?(displayText, isCommand)
    }

    private func currentKeyboardLayout() -> UnsafePointer<UCKeyboardLayout>? {
        if let cached = cachedKeyboardLayout { return cached }
        guard let inputSource = TISCopyCurrentKeyboardInputSource()?.takeRetainedValue(),
              let layoutDataRef = TISGetInputSourceProperty(inputSource, kTISPropertyUnicodeKeyLayoutData) else {
            return nil
        }
        let layoutData = unsafeBitCast(layoutDataRef, to: CFData.self)
        let layout = unsafeBitCast(CFDataGetBytePtr(layoutData), to: UnsafePointer<UCKeyboardLayout>.self)
        cachedLayoutData = layoutData  // Retain so pointer stays valid
        cachedKeyboardLayout = layout
        return layout
    }

    private func keyCodeToString(keyCode: Int64, event: CGEvent, withShift: Bool = false, uppercase: Bool = true) -> String {
        guard let keyboardLayout = currentKeyboardLayout() else {
            return fallbackKeyCodeToString(keyCode)
        }

        var deadKeyState: UInt32 = 0
        var chars = [UniChar](repeating: 0, count: 4)
        var actualLength: Int = 0

        // Shift modifier bit for UCKeyTranslate: bit 1 (shiftKey >> 8)
        let modifierKeyState: UInt32 = withShift ? (UInt32(shiftKey >> 8) & 0xFF) : 0

        let status = UCKeyTranslate(
            keyboardLayout,
            UInt16(keyCode),
            UInt16(kUCKeyActionDown),
            modifierKeyState,
            UInt32(LMGetKbdType()),
            UInt32(kUCKeyTranslateNoDeadKeysBit),
            &deadKeyState,
            chars.count,
            &actualLength,
            &chars
        )

        if status == noErr && actualLength > 0 {
            // Handle special keys first
            if let special = specialKeyString(keyCode) { return special }

            let str = String(utf16CodeUnits: chars, count: actualLength)
            // If shift was passed to UCKeyTranslate, it already gave us the right char
            if withShift || !uppercase {
                return str
            }
            // Uppercase for shortcut display, but only ASCII to avoid mangling (e.g. ß → SS)
            return str.allSatisfy({ $0.isASCII }) ? str.uppercased() : str
        }

        return fallbackKeyCodeToString(keyCode)
    }

    /// Maps keycodes for special (non-character) keys. Shared between TIS and fallback paths.
    private func specialKeyString(_ keyCode: Int64) -> String? {
        switch keyCode {
        case 36: return "↩"        // Return
        case 48: return "⇥"        // Tab
        case 49: return showSpaceSymbol ? "␣" : " "  // Space
        case 51: return "⌫"        // Delete (backspace)
        case 53: return "⎋"        // Escape
        case 71: return "⌧"        // Clear
        case 76: return "⌅"        // Enter (numpad)
        case 114: return "?⃝"      // Help
        case 115: return "↖"       // Home
        case 116: return "⇞"       // Page Up
        case 117: return "⌦"       // Forward Delete
        case 119: return "↘"       // End
        case 121: return "⇟"       // Page Down
        case 123: return "←"       // Left arrow
        case 124: return "→"       // Right arrow
        case 125: return "↓"       // Down arrow
        case 126: return "↑"       // Up arrow
        // Function keys
        case 122: return "F1";  case 120: return "F2";  case 99: return "F3";  case 118: return "F4"
        case 96: return "F5";  case 97: return "F6";   case 98: return "F7";  case 100: return "F8"
        case 101: return "F9"; case 109: return "F10";  case 103: return "F11"; case 111: return "F12"
        case 105: return "F13"; case 107: return "F14"; case 113: return "F15"
        case 106: return "F16"; case 64: return "F17";  case 79: return "F18"
        case 80: return "F19";  case 90: return "F20"
        // JIS keyboard
        case 0x66: return "英数"    // Eisu
        case 0x68: return "かな"    // Kana
        default: return nil
        }
    }

    private func fallbackKeyCodeToString(_ keyCode: Int64) -> String {
        if let special = specialKeyString(keyCode) { return special }
        switch keyCode {
        case 0: return "A"; case 1: return "S"; case 2: return "D"; case 3: return "F"
        case 4: return "H"; case 5: return "G"; case 6: return "Z"; case 7: return "X"
        case 8: return "C"; case 9: return "V"
        case 10: return "§"   // ISO §/± (non-US)
        case 11: return "B"; case 12: return "Q"
        case 13: return "W"; case 14: return "E"; case 15: return "R"; case 16: return "Y"
        case 17: return "T"; case 18: return "1"; case 19: return "2"; case 20: return "3"
        case 21: return "4"; case 22: return "6"; case 23: return "5"; case 24: return "="
        case 25: return "9"; case 26: return "7"; case 27: return "-"; case 28: return "8"
        case 29: return "0"; case 30: return "]"; case 31: return "O"; case 32: return "U"
        case 33: return "["; case 34: return "I"; case 35: return "P"
        case 37: return "L"; case 38: return "J"; case 39: return "'"; case 40: return "K"
        case 41: return ";"; case 42: return "\\"; case 43: return ","; case 44: return "/"
        case 45: return "N"; case 46: return "M"; case 47: return "."
        case 50: return "`"   // grave / tilde (US)
        default: return ""
        }
    }
}
