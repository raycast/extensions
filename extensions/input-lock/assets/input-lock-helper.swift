// input-lock-helper
//
// Swallows keyboard, trackpad and mouse events through a HID-level CGEventTap
// until the user unlocks with Touch ID or the unlock sequence (or the safety
// timeout fires).
//
// Configuration comes from environment variables so the secret never shows up
// in `ps` output:
//   INPUT_LOCK_METHOD         "touchid", "sequence" or "either" (default "sequence")
//   INPUT_LOCK_SEQUENCE       characters to type to unlock (required unless method is touchid)
//   INPUT_LOCK_TIMEOUT        auto-unlock after N seconds, 0 = never
//   INPUT_LOCK_BLOCK_POINTER  "0" to leave trackpad / mouse alone
//   INPUT_LOCK_OVERLAY        "0" to hide the on-screen overlay
//   INPUT_LOCK_SOUND          "0" to skip the unlock sound
//   INPUT_LOCK_LOCKFILE       file to flock so only one lock runs at a time
//
// Protocol with the Raycast command: prints exactly one line on stdout,
// "READY" once the tap is active, or "ERROR:<code>:<message>" and exits.

import AppKit
import ApplicationServices
import Carbon.HIToolbox
import CoreGraphics
import LocalAuthentication

// MARK: - Configuration

let env = ProcessInfo.processInfo.environment

func fail(_ code: String, _ message: String) -> Never {
    print("ERROR:\(code):\(message)")
    fflush(stdout)
    exit(1)
}

let method = env["INPUT_LOCK_METHOD"] ?? "sequence"
let useTouchID = method == "touchid" || method == "either"
let useSequence = method == "sequence" || method == "either"
let sequence = Array((env["INPUT_LOCK_SEQUENCE"] ?? "").lowercased())
if useSequence && sequence.isEmpty { fail("config", "No unlock sequence was provided.") }
let timeoutSeconds = max(0, Double(env["INPUT_LOCK_TIMEOUT"] ?? "0") ?? 0)
let blockPointer = env["INPUT_LOCK_BLOCK_POINTER"] != "0"
let showOverlay = env["INPUT_LOCK_OVERLAY"] != "0"
let playSound = env["INPUT_LOCK_SOUND"] != "0"

// MARK: - Preflight

// Only one helper may block input at a time. The kernel drops the flock when
// this process exits for any reason, so a crash can't leave a stale lock.
if let lockPath = env["INPUT_LOCK_LOCKFILE"] {
    let fd = open(lockPath, O_CREAT | O_RDWR, 0o600)
    if fd < 0 { fail("lockfile", "Could not open \(lockPath).") }
    if flock(fd, LOCK_EX | LOCK_NB) != 0 { fail("already-locked", "Input is already locked.") }
    // fd stays open, holding the lock, for the lifetime of the process.
}

if !AXIsProcessTrusted() {
    // Triggers the system prompt for the responsible app (Raycast).
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    _ = AXIsProcessTrustedWithOptions(options)
    fail("accessibility", "Raycast needs Accessibility permission to block input.")
}

// Touch ID only: there must be a sensor to unlock with (not lid-closed, fingerprints enrolled).
if method == "touchid" {
    var error: NSError?
    if !LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
        fail("touchid-unavailable", "Touch ID isn't available right now (\(error?.localizedDescription ?? "no sensor")).")
    }
}

// While Secure Keyboard Entry is on (password fields, Terminal's option, some
// password managers) keystrokes bypass event taps. With only the typed sequence
// we'd never see it, so refuse up front. Touch ID doesn't need keystrokes.
if !useTouchID && IsSecureEventInputEnabled() {
    fail("secure-input", "Secure keyboard entry is active (a password field or app is capturing the keyboard).")
}

// MARK: - Lock state

let modifierMask: CGEventFlags = [
    .maskShift, .maskControl, .maskAlternate, .maskCommand, .maskSecondaryFn, .maskAlphaShift,
]

var typed: [Character] = []
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

enum UnlockReason { case sequence, touchID, timeout, secureInput, signal }

/// Releases input immediately, then lingers briefly for the sound / overlay feedback.
func unlock(_ reason: UnlockReason) {
    if unlocking { return }
    unlocking = true
    if let tap = eventTap { CGEvent.tapEnable(tap: tap, enable: false) }
    if blockPointer { CGAssociateMouseAndMouseCursorPosition(1) }
    touchID.cancel()
    if reason == .signal { exit(0) }

    if playSound { NSSound(named: "Glass")?.play() }
    overlay?.showUnlocked(reason)
    let linger = overlay != nil ? 1.0 : (playSound ? 0.6 : 0)
    DispatchQueue.main.asyncAfter(deadline: .now() + linger) { exit(0) }
}

func characters(of event: CGEvent) -> [Character] {
    var length = 0
    var buffer = [UniChar](repeating: 0, count: 8)
    event.keyboardGetUnicodeString(maxStringLength: buffer.count, actualStringLength: &length, unicodeString: &buffer)
    return Array(String(utf16CodeUnits: buffer, count: length).lowercased())
}

func handleKeyDown(_ event: CGEvent) {
    swallowedKeys.insert(event.getIntegerValueField(.keyboardEventKeycode))
    if !useSequence || event.getIntegerValueField(.keyboardEventAutorepeat) != 0 { return }

    if isCoolingDown { return }

    for char in characters(of: event) {
        typed.append(char)
        if typed.count > sequence.count { typed.removeFirst(typed.count - sequence.count) }
    }
    if typed == sequence {
        unlock(.sequence)
        return
    }

    // No on-screen feedback for key presses, so nothing hints at the sequence.
    burstKeys += 1
    // Mid-burst, allow one sequence-length of slack so a typo followed straight away by
    // the right sequence still unlocks; the burst is fully counted when it ends.
    if burstKeys >= (maxFailedAttempts - failedAttempts + 1) * sequence.count {
        startCooldown()
        return
    }
    burstEnd?.cancel()
    let end = DispatchWorkItem { endBurst() }
    burstEnd = end
    DispatchQueue.main.asyncAfter(deadline: .now() + burstPause, execute: end)
}

// MARK: - Attempt limit

/// Each burst of typing (ended by a pause) is an attempt; a long burst counts as one attempt
/// per sequence-length of keys, so typing every combination in one go doesn't get around it.
let maxFailedAttempts = 3
let cooldownDuration: TimeInterval = 10 * 60
let burstPause: TimeInterval = 1.5
var failedAttempts = 0
var burstKeys = 0
var burstEnd: DispatchWorkItem?
var cooldownUntil: Date?

var isCoolingDown: Bool { cooldownUntil.map { Date() < $0 } ?? false }

func attempts(forKeys keys: Int) -> Int {
    (keys + sequence.count - 1) / sequence.count
}

func endBurst() {
    failedAttempts += attempts(forKeys: burstKeys)
    burstKeys = 0
    typed.removeAll()
    if failedAttempts >= maxFailedAttempts { startCooldown() }
}

func startCooldown() {
    burstEnd?.cancel()
    burstKeys = 0
    typed.removeAll()
    cooldownUntil = Date().addingTimeInterval(cooldownDuration)
    overlay?.tick()
}

/// Called every second: ends the cooldown once it has run out.
func checkCooldown() {
    if let until = cooldownUntil, Date() >= until {
        cooldownUntil = nil
        failedAttempts = 0
    }
}

// MARK: - Touch ID

/// Keeps a Touch ID prompt up for as long as input is locked.
final class TouchIDPrompt {
    private var context: LAContext?

    func start() {
        guard useTouchID, !unlocking else { return }
        let context = LAContext()
        context.localizedFallbackTitle = ""  // the "Use Password" button can't be clicked while locked anyway
        self.context = context

        // After too many failed fingerprints macOS disables Touch ID until the password is
        // entered, and with the lid closed there's no sensor. Ask for the Mac password then:
        // the system password field uses secure input, so typing reaches it past our tap.
        let biometricsAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        let policy: LAPolicy = biometricsAvailable ? .deviceOwnerAuthenticationWithBiometrics : .deviceOwnerAuthentication
        overlay?.setUsingPassword(!biometricsAvailable)

        context.evaluatePolicy(policy, localizedReason: "unlock your keyboard and trackpad") { [weak self] success, _ in
            DispatchQueue.main.async {
                if success {
                    unlock(.touchID)
                } else {
                    // Failed, cancelled or interrupted (e.g. screen locked): prompt again.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self?.start() }
                }
            }
        }
    }

    func cancel() {
        context?.invalidate()
        context = nil
    }
}

let touchID = TouchIDPrompt()

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

// If secure input turns on mid-lock we can no longer see the typed sequence;
// release, unless Touch ID can still unlock.
Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
    if !useTouchID && IsSecureEventInputEnabled() { unlock(.secureInput) }
    checkCooldown()
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
    private let footer = NSTextField(labelWithString: "")

    init() {
        let size = NSSize(width: 420, height: 112)
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

        footer.font = .systemFont(ofSize: 11)
        footer.textColor = .secondaryLabelColor

        let stack = NSStackView(views: [icon, title, footer])
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
        tick()
        panel.orderFrontRegardless()
    }

    func showUnlocked(_ reason: UnlockReason) {
        icon.image = NSImage(systemSymbolName: "lock.open.fill", accessibilityDescription: nil)
        icon.contentTintColor = .systemGreen
        title.stringValue = reason == .sequence || reason == .touchID ? "Unlocked" : "Auto-unlocked"
        switch reason {
        case .timeout: footer.stringValue = "The safety timer ran out"
        case .secureInput: footer.stringValue = "Secure keyboard entry turned on"
        default: footer.stringValue = "Input restored"
        }
    }

    private var usingPassword = false

    func setUsingPassword(_ value: Bool) {
        usingPassword = value
        tick()
    }

    private var instruction: String {
        if let until = cooldownUntil, isCoolingDown {
            let wait = max(0, Int(until.timeIntervalSinceNow.rounded(.up)))
            let countdown = String(format: "%d:%02d", wait / 60, wait % 60)
            return useTouchID
                ? "Too many attempts · Touch ID still works, sequence in \(countdown)"
                : "Too many attempts · try again in \(countdown)"
        }
        if useTouchID && usingPassword { return useSequence ? "Enter your Mac password or type your sequence" : "Enter your Mac password" }
        switch method {
        case "touchid": return "Touch ID to unlock"
        case "either": return "Touch ID or type your sequence"
        default: return "Type your unlock sequence"
        }
    }

    func tick() {
        if unlocking { return }
        guard timeoutSeconds > 0 else {
            footer.stringValue = instruction
            return
        }
        let remaining = max(0, Int(timeoutSeconds - Date().timeIntervalSince(lockedAt)))
        footer.stringValue = String(format: "%@ · auto-unlock in %d:%02d", instruction, remaining / 60, remaining % 60)
    }
}

// MARK: - Run

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
if showOverlay { overlay = Overlay() }

print("READY")
fflush(stdout)
touchID.start()

app.run()
