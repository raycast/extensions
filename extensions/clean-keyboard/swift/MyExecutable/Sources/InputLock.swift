import AppKit
import ApplicationServices
import CoreGraphics
import Darwin
import Foundation
import IOKit.pwr_mgt
import LocalAuthentication
import RaycastSwiftMacros

enum LockPhase: String { case ready, preparing, locked, unlocking, error }

struct CommandChord {
    private(set) var leftDown = false
    private(set) var rightDown = false
    private(set) var startedAt: TimeInterval?

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
        }
    }

    func heldFor(at time: TimeInterval) -> TimeInterval? { startedAt.map { time - $0 } }
}

struct CommandTap {
    private enum Sequence {
        case idle, blocked
        case pressed(count: Int, startedAt: TimeInterval)
        case released(count: Int, startedAt: TimeInterval)
    }
    private var sequence = Sequence.idle
    private var previousSides: UInt8 = 0

    mutating func reset() { sequence = previousSides == 0 ? .idle : .blocked }

    mutating func reset(leftDown: Bool, rightDown: Bool) {
        previousSides = (leftDown ? 1 : 0) | (rightDown ? 2 : 0)
        reset()
    }

    mutating func update(leftDown: Bool, rightDown: Bool, at time: TimeInterval) -> Bool {
        let sides: UInt8 = (leftDown ? 1 : 0) | (rightDown ? 2 : 0)
        guard sides != previousSides else { return false }
        let previous = previousSides
        previousSides = sides
        switch sequence {
        case .blocked:
            if sides == 0 { sequence = .idle }
        case .idle:
            if sides != 0 { sequence = .pressed(count: 0, startedAt: time) }
        case let .pressed(count, startedAt):
            guard sides == 0 else { return false }
            guard time - startedAt <= 1.5 else { sequence = .idle; return false }
            if count == 2 { sequence = .idle; return true }
            sequence = .released(count: count + 1, startedAt: startedAt)
        case let .released(count, startedAt):
            guard previous == 0, sides != 0 else { sequence = .blocked; return false }
            sequence = time - startedAt <= 1.5
                ? .pressed(count: count, startedAt: startedAt)
                : .pressed(count: 0, startedAt: time)
        }
        return false
    }
}

let lockedMessage = "Tap either or both Command keys 3 times quickly to use Touch ID. Hold both Command keys for 8 seconds to force unlock."

func writeJSON<Value: Encodable>(_ value: Value) {
    do {
        let data = try JSONEncoder().encode(value) + Data([0x0a])
        let count = data.withUnsafeBytes { Darwin.write(STDOUT_FILENO, $0.baseAddress, $0.count) }
        guard count == data.count else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
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

// Session-level tap only: it cannot block keys that macOS handles below the session (Fn, media keys, Touch ID).
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
    private var commandTap = CommandTap()
    private var authenticationRequestPending = false
    private var tap: CFMachPort?
    private var tapSource: CFRunLoopSource?
    private var assertions: [IOPMAssertionID] = []
    private var displayCallbackRegistered = false
    private var observers: [NSObjectProtocol] = []
    private var signals: [DispatchSourceSignal] = []
    private var timer: Timer?
    private var authenticationContext: LAContext?
    private var authenticationInProgress = false
    private let parentPID = getppid()
    private let lockPath = NSTemporaryDirectory() + "raycast-input-lock.lock"
    private var lockFD: Int32 = -1
    private var controlPending = Data()
    private var lastHeartbeat: TimeInterval = 0

    func start() {
        guard makeNonblocking(STDIN_FILENO), makeNonblocking(STDOUT_FILENO) else { fail("guardianStartup", "Could not arm the recovery connection") }
        lockFD = open(lockPath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard lockFD >= 0 else { fail("singleInstance", "Could not open instance lock") }
        guard flock(lockFD, LOCK_EX | LOCK_NB) == 0 else { fail("alreadyActive", "Lock Keyboard and Mouse is already active") }
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
            fail("accessibility", "Grant Accessibility in System Settings, then run Lock Keyboard and Mouse again")
        }
        guard inputMonitoringGranted else {
            fail("inputMonitoring", "Grant Input Monitoring in System Settings, then run Lock Keyboard and Mouse again")
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
                type as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn), "Lock Keyboard and Mouse" as CFString, &id
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
        writeJSON(["kind": "prepared"])
        timer = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in self?.tick() }
        if let timer { RunLoop.main.add(timer, forMode: .common) }
        withExtendedLifetime(self) { RunLoop.main.run() }
    }

    private func handle(_ type: CGEventType, _ event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            DispatchQueue.main.async { self.finish(reason: "eventTapDisabled") }
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
            if keyCode != 55 && keyCode != 54 {
                commandTap.reset()
            } else if phase == .locked {
                let triggered = commandTap.update(leftDown: chord.leftDown, rightDown: chord.rightDown, at: ProcessInfo.processInfo.systemUptime)
                if triggered, !authenticationRequestPending {
                    authenticationRequestPending = true
                    DispatchQueue.main.async {
                        guard self.authenticationRequestPending else { return }
                        self.authenticationRequestPending = false
                        if self.phase == .locked { self.authenticate() }
                    }
                }
            }
        } else if type == .keyDown || type == .leftMouseDown || type == .rightMouseDown || type == .otherMouseDown {
            commandTap.reset()
        }
        return phase == .locked || phase == .unlocking ? nil : Unmanaged.passUnretained(event)
    }

    private func tick() {
        guard phase == .preparing || phase == .locked || phase == .unlocking else { return }
        guard getppid() == parentPID else { finish(reason: "watchdog"); return }
        readControl()
        guard phase == .locked || phase == .unlocking else { return }
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastHeartbeat >= 1 { writeJSON(["kind": "heartbeat"]); lastHeartbeat = now }
        guard AXIsProcessTrusted(), CGPreflightListenEventAccess() else { finish(reason: "permissionLost"); return }
        guard let tap, CGEvent.tapIsEnabled(tap: tap) else { finish(reason: "eventTapDisabled"); return }
        guard let duration = chord.heldFor(at: ProcessInfo.processInfo.systemUptime) else { return }
        if duration >= 8 { finish(reason: "recovery"); return }
    }

    private func readControl() {
        var bytes = [UInt8](repeating: 0, count: 1024)
        let count = read(STDIN_FILENO, &bytes, bytes.count)
        if count == 0 || (count < 0 && errno != EAGAIN && errno != EINTR) { finish(reason: "watchdog"); return }
        guard count > 0 else { return }
        controlPending.append(contentsOf: bytes.prefix(count))
        guard controlPending.count <= 2048 else { finish(reason: "watchdog"); return }
        while let end = controlPending.firstIndex(of: 10) {
            let line = Data(controlPending[..<end])
            controlPending.removeSubrange(...end)
            guard let packet = try? JSONDecoder().decode([String: String].self, from: line) else { finish(reason: "watchdog"); return }
            if packet["command"] == "activate", phase == .preparing {
                let activation = ProcessInfo.processInfo.systemUptime
                writeJSON(["kind": "active", "uptime": String(activation)])
                phase = .locked
                chord = CommandChord()
                commandTap = CommandTap()
                lastHeartbeat = activation
                emit(phase, lockedMessage)
            } else if packet["command"] == "release" {
                finish(reason: packet["reason"] == "timeout" ? "timeout" : "watchdog")
            } else { finish(reason: "watchdog"); return }
        }
    }

    private func authenticate() {
        guard phase == .locked, !authenticationInProgress else { return }
        commandTap.reset()
        authenticationInProgress = true
        phase = .unlocking
        emit(phase, "Waiting for Touch ID")
        let context = LAContext()
        authenticationContext = context
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "unlock the keyboard and mouse") { [weak self] success, _ in
            DispatchQueue.main.async {
                guard let self, self.phase == .unlocking else { return }
                self.authenticationInProgress = false
                self.authenticationContext = nil
                self.commandTap.reset(leftDown: self.chord.leftDown, rightDown: self.chord.rightDown)
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
        emit(phase, "Keyboard and mouse released", reason: reason)
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

@raycast func lockInputs(duration: String) {
    signal(SIGPIPE, SIG_IGN)
    guard let lockDuration = LockDuration(duration) else {
        fputs("unsupported lock duration\n", stderr)
        exit(2)
    }
    exit(supervise(lockDuration))
}

@raycast func lockInputsWorker(parent: Int32) {
    signal(SIGPIPE, SIG_IGN)
    var input = stat(), output = stat()
    guard hasGuardianParent(parent),
          fstat(STDIN_FILENO, &input) == 0, fstat(STDOUT_FILENO, &output) == 0,
          input.st_mode & S_IFMT == S_IFIFO, output.st_mode & S_IFMT == S_IFIFO else { exit(2) }
    LockController().start()
}
