import AppKit
import ApplicationServices
import CoreGraphics
import Darwin
import Foundation
import IOKit.pwr_mgt
import LocalAuthentication

enum LockPhase: String { case ready, preparing, locked, unlocking, error }

struct ProbeResult: Encodable {
    let accessibilityTrusted: Bool
    let inputMonitoringGranted: Bool
    let touchIDAvailable: Bool
    let passiveEventTapCreated: Bool
    let activePassthroughTapCreated: Bool
    let errors: [String: String]
}

struct CommandChord {
    private(set) var leftDown = false
    private(set) var rightDown = false
    private(set) var startedAt: TimeInterval?
    var authenticationTriggered = false

    mutating func flagsChanged(rawFlags: UInt64, keyCode: Int64, commandHeld: Bool, fallbackKeyDown: Bool, at time: TimeInterval) {
        // Side bits are from the macOS SDK's NX_DEVICELCMDKEYMASK and NX_DEVICERCMDKEYMASK.
        let sideFlags = rawFlags & 0x18
        if !commandHeld {
            leftDown = false
            rightDown = false
        } else if sideFlags != 0 {
            leftDown = sideFlags & 0x8 != 0
            rightDown = sideFlags & 0x10 != 0
        } else if keyCode == 55 {
            leftDown = fallbackKeyDown
        } else if keyCode == 54 {
            rightDown = fallbackKeyDown
        }
        if leftDown && rightDown {
            if startedAt == nil { startedAt = time }
        } else {
            startedAt = nil
            authenticationTriggered = false
        }
    }

    func heldFor(at time: TimeInterval) -> TimeInterval? { startedAt.map { time - $0 } }
}

let lockedMessage = "Hold left and right Command for 3 seconds to use Touch ID. Keep holding for 8 seconds to force unlock."

func writeJSON<Value: Encodable>(_ value: Value) {
    do {
        try FileHandle.standardOutput.write(contentsOf: JSONEncoder().encode(value) + Data([0x0a]))
    } catch {
        fputs("failed to write helper status: \(error)\n", stderr)
        exit(1)
    }
}

func emit(_ phase: LockPhase, _ message: String, reason: String? = nil) {
    var line = ["phase": phase.rawValue, "message": message]
    if let reason { line["reason"] = reason }
    writeJSON(line)
}

func probe() {
    let accessibilityTrusted = AXIsProcessTrusted()
    let inputMonitoringGranted = CGPreflightListenEventAccess()
    let context = LAContext()
    var biometricError: NSError?
    let canAuthenticate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometricError)
    let touchIDAvailable = canAuthenticate && context.biometryType == .touchID
    let eventTap = CGEvent.tapCreate(
        tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly,
        eventsOfInterest: CGEventMask(1) << CGEventType.keyDown.rawValue,
        callback: { _, _, event, _ in Unmanaged.passUnretained(event) }, userInfo: nil
    )
    let activeTap = CGEvent.tapCreate(
        tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
        eventsOfInterest: CGEventMask(1) << CGEventType.keyDown.rawValue,
        callback: { _, _, event, _ in Unmanaged.passUnretained(event) }, userInfo: nil
    )
    var activePassthroughTapCreated = false
    if let eventTap {
        CGEvent.tapEnable(tap: eventTap, enable: false)
        CFMachPortInvalidate(eventTap)
    }
    if let activeTap, let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, activeTap, 0) {
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        activePassthroughTapCreated = CGEvent.tapIsEnabled(tap: activeTap)
        CFRunLoopRunInMode(.defaultMode, 0.05, false)
        CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: activeTap, enable: false)
        CFMachPortInvalidate(activeTap)
    }
    var errors: [String: String] = [:]
    if !accessibilityTrusted { errors["accessibility"] = "Accessibility permission is not granted" }
    if !inputMonitoringGranted { errors["inputMonitoring"] = "Input Monitoring permission is not granted" }
    if !touchIDAvailable { errors["touchID"] = biometricError?.localizedDescription ?? "Touch ID is unavailable" }
    if eventTap == nil { errors["passiveEventTap"] = "Could not create a listen-only event tap" }
    if !activePassthroughTapCreated { errors["activePassthroughTap"] = "Could not create an active passthrough event tap" }
    let result = ProbeResult(
        accessibilityTrusted: accessibilityTrusted, inputMonitoringGranted: inputMonitoringGranted,
        touchIDAvailable: touchIDAvailable, passiveEventTapCreated: eventTap != nil,
        activePassthroughTapCreated: activePassthroughTapCreated, errors: errors
    )
    writeJSON(result)
}

func selfTest() {
    var chord = CommandChord()
    chord.flagsChanged(rawFlags: 0x8, keyCode: 55, commandHeld: true, fallbackKeyDown: true, at: 0)
    chord.flagsChanged(rawFlags: 0x18, keyCode: 54, commandHeld: true, fallbackKeyDown: true, at: 0.1)
    chord.flagsChanged(rawFlags: 0x18, keyCode: 54, commandHeld: true, fallbackKeyDown: true, at: 0.2)
    precondition(chord.leftDown && chord.rightDown && chord.startedAt == 0.1)
    precondition(chord.heldFor(at: 3.09)! < 3)
    precondition(chord.heldFor(at: 3.1)! >= 3)
    chord.authenticationTriggered = true
    precondition(chord.heldFor(at: 8.1)! >= 8)
    chord.flagsChanged(rawFlags: 0x10, keyCode: 55, commandHeld: true, fallbackKeyDown: false, at: 9)
    precondition(chord.startedAt == nil && !chord.authenticationTriggered)
    chord.flagsChanged(rawFlags: 0x18, keyCode: 55, commandHeld: true, fallbackKeyDown: true, at: 10)
    precondition(chord.startedAt == 10)
    chord.flagsChanged(rawFlags: 0, keyCode: 54, commandHeld: false, fallbackKeyDown: false, at: 11)
    precondition(chord.startedAt == nil && !chord.leftDown && !chord.rightDown)
    var fallback = CommandChord()
    fallback.flagsChanged(rawFlags: 0, keyCode: 55, commandHeld: true, fallbackKeyDown: true, at: 0)
    fallback.flagsChanged(rawFlags: 0, keyCode: 55, commandHeld: true, fallbackKeyDown: true, at: 1)
    fallback.flagsChanged(rawFlags: 0, keyCode: 54, commandHeld: true, fallbackKeyDown: true, at: 2)
    precondition(fallback.leftDown && fallback.rightDown && fallback.startedAt == 2)
    emit(.ready, "self-test passed", reason: "selfTest")
}

// ponytail: session events only; device-level gesture filtering needs a separate proven path.
let eventTypes: [CGEventType] = [
    .keyDown, .keyUp, .flagsChanged, .mouseMoved,
    .leftMouseDown, .leftMouseUp, .leftMouseDragged,
    .rightMouseDown, .rightMouseUp, .rightMouseDragged,
    .otherMouseDown, .otherMouseUp, .otherMouseDragged,
]
let eventMask = eventTypes.reduce(CGEventMask(0)) { $0 | (CGEventMask(1) << $1.rawValue) }

private let displayChanged: CGDisplayReconfigurationCallBack = { _, _, userInfo in
    guard let userInfo else { return }
    let owner = Unmanaged<LockController>.fromOpaque(userInfo).takeUnretainedValue()
    DispatchQueue.main.async { owner.finish(reason: "displayChanged") }
}

final class LockController {
    private(set) var phase = LockPhase.ready
    private var chord = CommandChord()
    private var tap: CFMachPort?
    private var tapSource: CFRunLoopSource?
    private var assertions: [IOPMAssertionID] = []
    private var displayCallbackRegistered = false
    private var observers: [NSObjectProtocol] = []
    private var signals: [DispatchSourceSignal] = []
    private var timer: Timer?
    private var authenticationContext: LAContext?
    private var authenticationInProgress = false
    private var escapeDeadline: TimeInterval?
    private let parentPID = getppid()
    private let lockPath = NSTemporaryDirectory() + "raycast-input-lock.lock"
    private var lockFD: Int32 = -1

    func testEscape() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        let accessibilityTrusted = AXIsProcessTrustedWithOptions(options)
        let inputMonitoringGranted = CGPreflightListenEventAccess() || CGRequestListenEventAccess()
        guard accessibilityTrusted, inputMonitoringGranted else {
            endEscapeTest(passed: false, message: "Grant Accessibility and Input Monitoring in System Settings, then run Lock Inputs again")
        }
        tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly,
            eventsOfInterest: CGEventMask(1) << CGEventType.flagsChanged.rawValue,
            callback: { _, type, event, userInfo in
                guard let userInfo else { return Unmanaged.passUnretained(event) }
                return Unmanaged<LockController>.fromOpaque(userInfo).takeUnretainedValue().handle(type, event)
            }, userInfo: Unmanaged.passUnretained(self).toOpaque()
        )
        guard let tap else { endEscapeTest(passed: false, message: "Could not create a listen-only input tap") }
        tapSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        guard let tapSource else { endEscapeTest(passed: false, message: "Could not create the input tap run loop source") }
        CFRunLoopAddSource(CFRunLoopGetMain(), tapSource, .commonModes)
        guard CGEvent.tapIsEnabled(tap: tap) else { endEscapeTest(passed: false, message: "The input tap was disabled") }
        escapeDeadline = ProcessInfo.processInfo.systemUptime + 15
        emit(.ready, "Hold left and right Command for 3 seconds within 15 seconds", reason: "escapeTest")
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.tickEscapeTest() }
        withExtendedLifetime(self) { RunLoop.main.run() }
    }

    private func tickEscapeTest() {
        guard let deadline = escapeDeadline else { return }
        guard AXIsProcessTrusted(), CGPreflightListenEventAccess(),
              let tap, CGEvent.tapIsEnabled(tap: tap) else {
            endEscapeTest(passed: false, message: "Input monitoring stopped")
        }
        let now = ProcessInfo.processInfo.systemUptime
        if now >= deadline { endEscapeTest(passed: false, message: "Escape gesture timed out") }
        if let duration = chord.heldFor(at: now), duration >= 3 {
            endEscapeTest(passed: true, message: "Escape gesture passed")
        }
    }

    private func endEscapeTest(passed: Bool, message: String) -> Never {
        cleanup()
        escapeDeadline = nil
        phase = passed ? .ready : .error
        emit(phase, message, reason: "escapeTest")
        exit(passed ? 0 : 1)
    }

    func start() {
        lockFD = open(lockPath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard lockFD >= 0 else { fail("singleInstance", "Could not open instance lock") }
        guard flock(lockFD, LOCK_EX | LOCK_NB) == 0 else { fail("alreadyActive", "Input Lock is already active") }
        for number in [SIGTERM, SIGINT] {
            signal(number, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: number, queue: .main)
            source.setEventHandler { [weak self] in self?.finish(reason: "signal") }
            source.resume()
            signals.append(source)
        }
        phase = .preparing
        emit(phase, "Checking permissions and input tap")
        let context = LAContext()
        var biometricError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometricError),
              context.biometryType == .touchID else {
            fail("touchID", biometricError?.localizedDescription ?? "Touch ID is unavailable")
        }

        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        let accessibilityTrusted = AXIsProcessTrustedWithOptions(options)
        let inputMonitoringGranted = CGPreflightListenEventAccess() || CGRequestListenEventAccess()
        guard accessibilityTrusted else {
            fail("accessibility", "Grant Accessibility in System Settings, then run Lock Inputs again")
        }
        guard inputMonitoringGranted else {
            fail("inputMonitoring", "Grant Input Monitoring in System Settings, then run Lock Inputs again")
        }

        tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
            eventsOfInterest: eventMask,
            callback: { _, type, event, userInfo in
                guard let userInfo else { return Unmanaged.passUnretained(event) }
                return Unmanaged<LockController>.fromOpaque(userInfo).takeUnretainedValue().handle(type, event)
            }, userInfo: Unmanaged.passUnretained(self).toOpaque()
        )
        guard let tap else { fail("eventTap", "Could not create an active input tap") }
        tapSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        guard let tapSource else { fail("eventTap", "Could not create the input tap run loop source") }
        for type in [kIOPMAssertionTypePreventUserIdleDisplaySleep, kIOPMAssertionTypePreventUserIdleSystemSleep] {
            var id = IOPMAssertionID(0)
            let result = IOPMAssertionCreateWithName(
                type as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn), "Input Lock" as CFString, &id
            )
            guard result == kIOReturnSuccess else { fail("powerAssertion", "Could not prevent idle sleep") }
            assertions.append(id)
        }
        guard CGDisplayRegisterReconfigurationCallback(displayChanged, Unmanaged.passUnretained(self).toOpaque()) == .success else {
            fail("displayCallback", "Could not monitor display changes")
        }
        displayCallbackRegistered = true
        let notifications = NSWorkspace.shared.notificationCenter
        observers.append(notifications.addObserver(forName: NSWorkspace.willSleepNotification, object: nil, queue: .main) { [weak self] _ in
            self?.finish(reason: "sleep")
        })
        observers.append(notifications.addObserver(forName: NSWorkspace.sessionDidResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.finish(reason: "sessionResigned")
        })
        CFRunLoopAddSource(CFRunLoopGetMain(), tapSource, .commonModes)
        guard CGEvent.tapIsEnabled(tap: tap) else { fail("eventTap", "The input tap was disabled") }
        phase = .locked
        emit(phase, lockedMessage)
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.tick() }
        withExtendedLifetime(self) { RunLoop.main.run() }
    }

    private func handle(_ type: CGEventType, _ event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            DispatchQueue.main.async {
                if self.escapeDeadline != nil {
                    self.endEscapeTest(passed: false, message: "Input tap was disabled")
                } else {
                    self.finish(reason: "eventTapDisabled")
                }
            }
            return Unmanaged.passUnretained(event)
        }
        if type == .flagsChanged {
            let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
            let fallbackKeyDown = (keyCode == 55 || keyCode == 54)
                && CGEventSource.keyState(.combinedSessionState, key: CGKeyCode(keyCode))
            chord.flagsChanged(
                rawFlags: event.flags.rawValue,
                keyCode: keyCode,
                commandHeld: event.flags.contains(.maskCommand),
                fallbackKeyDown: fallbackKeyDown,
                at: ProcessInfo.processInfo.systemUptime
            )
        }
        return phase == .locked || phase == .unlocking ? nil : Unmanaged.passUnretained(event)
    }

    private func tick() {
        guard phase == .locked || phase == .unlocking else { return }
        guard getppid() == parentPID else { finish(reason: "parentExited"); return }
        guard AXIsProcessTrusted(), CGPreflightListenEventAccess() else { finish(reason: "permissionLost"); return }
        guard let tap, CGEvent.tapIsEnabled(tap: tap) else { finish(reason: "eventTapDisabled"); return }
        guard let duration = chord.heldFor(at: ProcessInfo.processInfo.systemUptime) else { return }
        if duration >= 8 { finish(reason: "recovery"); return }
        if duration >= 3 && !chord.authenticationTriggered {
            chord.authenticationTriggered = true
            authenticate()
        }
    }

    private func authenticate() {
        guard !authenticationInProgress else { return }
        authenticationInProgress = true
        phase = .unlocking
        emit(phase, "Waiting for Touch ID")
        let context = LAContext()
        authenticationContext = context
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock input") { [weak self] success, _ in
            DispatchQueue.main.async {
                guard let self, self.phase == .unlocking else { return }
                self.authenticationInProgress = false
                self.authenticationContext = nil
                if success { self.finish(reason: "touchID") }
                else { self.phase = .locked; emit(self.phase, lockedMessage) }
            }
        }
    }

    private func fail(_ reason: String, _ message: String) -> Never {
        cleanup()
        phase = .error
        emit(phase, message, reason: reason)
        exit(1)
    }

    func finish(reason: String) {
        guard phase == .locked || phase == .unlocking || phase == .preparing else { return }
        cleanup()
        phase = .ready
        emit(phase, "Input Lock released", reason: reason)
        exit(0)
    }

    private func cleanup() {
        timer?.invalidate()
        timer = nil
        authenticationContext?.invalidate()
        authenticationContext = nil
        let notifications = NSWorkspace.shared.notificationCenter
        for observer in observers { notifications.removeObserver(observer) }
        observers.removeAll()
        for source in signals { source.cancel() }
        signals.removeAll()
        if displayCallbackRegistered {
            CGDisplayRemoveReconfigurationCallback(displayChanged, Unmanaged.passUnretained(self).toOpaque())
            displayCallbackRegistered = false
        }
        if let tapSource { CFRunLoopRemoveSource(CFRunLoopGetMain(), tapSource, .commonModes) }
        tapSource = nil
        if let tap { CGEvent.tapEnable(tap: tap, enable: false); CFMachPortInvalidate(tap) }
        tap = nil
        for id in assertions { IOPMAssertionRelease(id) }
        assertions.removeAll()
        if lockFD >= 0 { close(lockFD) }
        lockFD = -1
    }
}

let arguments = Array(CommandLine.arguments.dropFirst())
signal(SIGPIPE, SIG_IGN)
switch arguments {
case ["--probe"]: probe()
case ["--self-test"]: selfTest()
case ["--test-escape"]: LockController().testEscape()
case ["--lock"]: LockController().start()
default: fputs("usage: input-lock [--lock|--probe|--self-test|--test-escape]\n", stderr); exit(2)
}
