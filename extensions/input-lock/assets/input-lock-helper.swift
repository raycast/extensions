// input-lock-helper
//
// Swallows keyboard, trackpad and mouse events through a HID-level CGEventTap
// until the unlock sequence is typed (or the safety timeout fires).
//
// Configuration comes from environment variables so the secret never shows up
// in `ps` output:
//   INPUT_LOCK_SEQUENCE       characters to type to unlock (required)
//   INPUT_LOCK_TIMEOUT        auto-unlock after N seconds, 0 = never
//   INPUT_LOCK_BLOCK_POINTER  "0" to leave trackpad / mouse alone
//   INPUT_LOCK_OVERLAY        "0" to hide the on-screen overlay
//   INPUT_LOCK_SOUND          "0" to skip the unlock sound
//
// Protocol with the Raycast command: prints exactly one line on stdout,
// "READY" once the tap is active, or "ERROR:<code>:<message>" and exits.

import AppKit
import ApplicationServices
import Carbon.HIToolbox
import CoreGraphics

// MARK: - Configuration

let env = ProcessInfo.processInfo.environment

func fail(_ code: String, _ message: String) -> Never {
    print("ERROR:\(code):\(message)")
    fflush(stdout)
    exit(1)
}

guard let rawSequence = env["INPUT_LOCK_SEQUENCE"], !rawSequence.isEmpty else {
    fail("config", "No unlock sequence was provided.")
}
let sequence = Array(rawSequence.lowercased())
let timeoutSeconds = max(0, Double(env["INPUT_LOCK_TIMEOUT"] ?? "0") ?? 0)
let blockPointer = env["INPUT_LOCK_BLOCK_POINTER"] != "0"
let showOverlay = env["INPUT_LOCK_OVERLAY"] != "0"
let playSound = env["INPUT_LOCK_SOUND"] != "0"

// MARK: - Preflight

if !AXIsProcessTrusted() {
    // Triggers the system prompt for the responsible app (Raycast).
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    _ = AXIsProcessTrustedWithOptions(options)
    fail("accessibility", "Raycast needs Accessibility permission to block input.")
}

// While Secure Keyboard Entry is on (password fields, Terminal's option, some
// password managers) keystrokes bypass event taps. We could still block the
// trackpad but would never see the unlock sequence, so refuse up front.
if IsSecureEventInputEnabled() {
    fail("secure-input", "Secure keyboard entry is active (a password field or app is capturing the keyboard).")
}

// MARK: - Lock state

let modifierMask: CGEventFlags = [
    .maskShift, .maskControl, .maskAlternate, .maskCommand, .maskSecondaryFn, .maskAlphaShift,
]

var typed: [Character] = []
var progress = 0
/// Keys / buttons whose down event we swallowed; their up event is swallowed too.
/// Up events for keys held *before* locking pass through so nothing gets stuck.
var swallowedKeys = Set<Int64>()
var swallowedButtons = Set<UInt32>()
/// Modifier state as last seen by apps; only releases relative to it pass through.
var visibleModifiers = CGEventSource.flagsState(.combinedSessionState).intersection(modifierMask)
let frozenCursor = CGEvent(source: nil)?.location ?? .zero
var eventTap: CFMachPort?
var overlay: Overlay?
var unlocking = false

let pointerTypes: Set<UInt32> = [
    CGEventType.leftMouseDown.rawValue, CGEventType.leftMouseUp.rawValue,
    CGEventType.rightMouseDown.rawValue, CGEventType.rightMouseUp.rawValue,
    CGEventType.otherMouseDown.rawValue, CGEventType.otherMouseUp.rawValue,
    CGEventType.mouseMoved.rawValue, CGEventType.leftMouseDragged.rawValue,
    CGEventType.rightMouseDragged.rawValue, CGEventType.otherMouseDragged.rawValue,
    CGEventType.scrollWheel.rawValue, CGEventType.tabletPointer.rawValue,
    CGEventType.tabletProximity.rawValue,
    // Trackpad gesture events (not exposed in CGEventType): rotate, begin/end
    // gesture, gesture, magnify, swipe, smart magnify, quick look, pressure.
    18, 19, 20, 29, 30, 31, 32, 33, 34,
]
let mouseDownTypes: Set<UInt32> = [
    CGEventType.leftMouseDown.rawValue, CGEventType.rightMouseDown.rawValue, CGEventType.otherMouseDown.rawValue,
]
let mouseUpTypes: Set<UInt32> = [
    CGEventType.leftMouseUp.rawValue, CGEventType.rightMouseUp.rawValue, CGEventType.otherMouseUp.rawValue,
]
let mouseMoveTypes: Set<UInt32> = [
    CGEventType.mouseMoved.rawValue, CGEventType.leftMouseDragged.rawValue,
    CGEventType.rightMouseDragged.rawValue, CGEventType.otherMouseDragged.rawValue,
]
/// NX_SYSDEFINED: media, volume, brightness and other special keys.
let systemDefinedType: UInt32 = 14

enum UnlockReason { case sequence, timeout, secureInput, signal }

/// Releases input immediately, then lingers briefly for the sound / overlay feedback.
func unlock(_ reason: UnlockReason) {
    if unlocking { return }
    unlocking = true
    if let tap = eventTap { CGEvent.tapEnable(tap: tap, enable: false) }
    if blockPointer { CGAssociateMouseAndMouseCursorPosition(1) }
    if reason == .signal { exit(0) }

    if playSound { NSSound(named: "Glass")?.play() }
    overlay?.showUnlocked(reason)
    let linger = overlay != nil ? 1.0 : (playSound ? 0.6 : 0)
    DispatchQueue.main.asyncAfter(deadline: .now() + linger) { exit(0) }
}

/// Length of the longest suffix of `typed` that is a prefix of `sequence`.
func matchedPrefixLength() -> Int {
    for length in stride(from: min(typed.count, sequence.count), through: 1, by: -1) {
        if Array(typed.suffix(length)) == Array(sequence.prefix(length)) { return length }
    }
    return 0
}

func characters(of event: CGEvent) -> [Character] {
    var length = 0
    var buffer = [UniChar](repeating: 0, count: 8)
    event.keyboardGetUnicodeString(maxStringLength: buffer.count, actualStringLength: &length, unicodeString: &buffer)
    return Array(String(utf16CodeUnits: buffer, count: length).lowercased())
}

func handleKeyDown(_ event: CGEvent) {
    swallowedKeys.insert(event.getIntegerValueField(.keyboardEventKeycode))
    if event.getIntegerValueField(.keyboardEventAutorepeat) != 0 { return }

    for char in characters(of: event) {
        typed.append(char)
        if typed.count > sequence.count { typed.removeFirst(typed.count - sequence.count) }
    }
    progress = matchedPrefixLength()
    if progress == sequence.count {
        unlock(.sequence)
    } else {
        overlay?.update(progress: progress)
    }
}

// MARK: - Event tap

let callback: CGEventTapCallBack = { _, type, event, _ in
    let raw = type.rawValue
    if unlocking { return Unmanaged.passUnretained(event) }

    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let tap = eventTap { CGEvent.tapEnable(tap: tap, enable: true) }
        return Unmanaged.passUnretained(event)
    }

    switch type {
    case .keyDown:
        handleKeyDown(event)
        return nil
    case .keyUp:
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        return swallowedKeys.remove(keyCode) != nil ? nil : Unmanaged.passUnretained(event)
    case .flagsChanged:
        let modifiers = event.flags.intersection(modifierMask)
        if visibleModifiers.contains(modifiers) && modifiers != visibleModifiers {
            visibleModifiers = modifiers  // releasing a modifier held before the lock
            return Unmanaged.passUnretained(event)
        }
        return nil
    default:
        break
    }

    if raw == systemDefinedType { return nil }

    if blockPointer && pointerTypes.contains(raw) {
        if mouseDownTypes.contains(raw) {
            swallowedButtons.insert(UInt32(event.getIntegerValueField(.mouseEventButtonNumber)))
        } else if mouseUpTypes.contains(raw) {
            let button = UInt32(event.getIntegerValueField(.mouseEventButtonNumber))
            if swallowedButtons.remove(button) == nil { return Unmanaged.passUnretained(event) }
        } else if mouseMoveTypes.contains(raw) {
            CGWarpMouseCursorPosition(frozenCursor)
        }
        return nil
    }

    return Unmanaged.passUnretained(event)
}

guard let tap = CGEvent.tapCreate(
    tap: .cghidEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: CGEventMask.max,
    callback: callback,
    userInfo: nil
) else {
    fail("tap", "Could not create the event tap. Check Accessibility and Input Monitoring permissions for Raycast.")
}
eventTap = tap

let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
CGEvent.tapEnable(tap: tap, enable: true)
if blockPointer { CGAssociateMouseAndMouseCursorPosition(0) }

// MARK: - Failsafes

let lockedAt = Date()

if timeoutSeconds > 0 {
    Timer.scheduledTimer(withTimeInterval: timeoutSeconds, repeats: false) { _ in unlock(.timeout) }
}

// If secure input turns on mid-lock we can no longer see keystrokes; release.
Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
    if IsSecureEventInputEnabled() { unlock(.secureInput) }
    overlay?.tick()
}

signal(SIGPIPE, SIG_IGN)
var signalSources: [DispatchSourceSignal] = []
for sig in [SIGTERM, SIGINT, SIGHUP] {
    signal(sig, SIG_IGN)
    let handler = DispatchSource.makeSignalSource(signal: sig, queue: .main)
    handler.setEventHandler { unlock(.signal) }
    handler.resume()
    signalSources.append(handler)
}

// MARK: - Overlay

final class Overlay {
    private let panel: NSPanel
    private let icon = NSImageView()
    private let title = NSTextField(labelWithString: blockPointer ? "Keyboard & trackpad locked" : "Keyboard locked")
    private let dots = NSTextField(labelWithString: "")
    private let footer = NSTextField(labelWithString: "")

    init() {
        let size = NSSize(width: 340, height: 132)
        let screen = NSScreen.screens.first ?? NSScreen.main!
        let origin = NSPoint(x: screen.frame.midX - size.width / 2, y: screen.frame.minY + 120)

        panel = NSPanel(
            contentRect: NSRect(origin: origin, size: size),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .screenSaver
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]

        let background = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        background.material = .hudWindow
        background.state = .active
        background.wantsLayer = true
        background.layer?.cornerRadius = 18
        background.layer?.masksToBounds = true

        icon.image = NSImage(systemSymbolName: "lock.fill", accessibilityDescription: nil)
        icon.symbolConfiguration = .init(pointSize: 26, weight: .semibold)
        icon.contentTintColor = .labelColor

        title.font = .systemFont(ofSize: 15, weight: .semibold)

        dots.font = .monospacedSystemFont(ofSize: 15, weight: .bold)
        dots.textColor = .controlAccentColor
        footer.font = .systemFont(ofSize: 11)
        footer.textColor = .secondaryLabelColor

        let stack = NSStackView(views: [icon, title, dots, footer])
        stack.orientation = .vertical
        stack.alignment = .centerX
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false
        background.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: background.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: background.centerYAnchor),
        ])

        panel.contentView = background
        update(progress: 0)
        tick()
        panel.orderFrontRegardless()
    }

    func update(progress: Int) {
        dots.stringValue = progress == 0 ? " " : String(repeating: "● ", count: progress)
    }

    func showUnlocked(_ reason: UnlockReason) {
        icon.image = NSImage(systemSymbolName: "lock.open.fill", accessibilityDescription: nil)
        icon.contentTintColor = .systemGreen
        title.stringValue = reason == .sequence ? "Unlocked" : "Auto-unlocked"
        dots.stringValue = " "
        switch reason {
        case .timeout: footer.stringValue = "The safety timer ran out"
        case .secureInput: footer.stringValue = "Secure keyboard entry turned on"
        default: footer.stringValue = "Input restored"
        }
    }

    func tick() {
        if unlocking { return }
        guard timeoutSeconds > 0 else {
            footer.stringValue = "Type your unlock sequence"
            return
        }
        let remaining = max(0, Int(timeoutSeconds - Date().timeIntervalSince(lockedAt)))
        footer.stringValue = String(format: "Type your unlock sequence · auto-unlock in %d:%02d", remaining / 60, remaining % 60)
    }
}

// MARK: - Run

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
if showOverlay { overlay = Overlay() }

print("READY")
fflush(stdout)

app.run()
