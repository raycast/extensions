import AppKit
import ApplicationServices
import CoreGraphics
import Darwin
import Foundation
import IOKit.pwr_mgt
import LocalAuthentication
import RaycastSwiftMacros

enum KeyCode: CGKeyCode {
  case u = 0x20
}

private let displayChanged: CGDisplayReconfigurationCallBack = { _, _, refcon in
  guard let refcon else { return }
  Unmanaged<EventHandler>.fromOpaque(refcon).takeUnretainedValue().stop(reason: "displayChanged")
}

class EventHandler {
  private let lockMouse: Bool
  private let parentPID = getppid()
  private let runLoop = CFRunLoopGetCurrent()
  private let stateLock = NSLock()
  private var locked = true
  private var lastTick = ProcessInfo.processInfo.systemUptime
  private var reason = "manual"
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?
  private var timer: Timer?
  private var watchdog: DispatchSourceTimer?
  private var deadline: TimeInterval?
  private var instanceFD: Int32 = -1
  private var assertions: [IOPMAssertionID] = []
  private var observers: [NSObjectProtocol] = []
  private var displayCallbackRegistered = false
  private var authenticationContext: LAContext?
  private var leftCommand = false
  private var rightCommand = false
  private var bothCommandSince: TimeInterval?
  private var commandWasDown = false
  private var commandTapCount = 0
  private var commandSequenceStarted: TimeInterval = 0

  init(lockMouse: Bool) {
    self.lockMouse = lockMouse
  }

  private func failure(_ message: String) -> NSError {
    NSError(domain: "CleanKeyboard", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  func run(duration: Int?) throws -> String {
    if let duration, duration <= 0 || duration > Int(Int32.max) {
      throw failure("Choose a positive duration, or Forever.")
    }
    defer { cleanup() }
    instanceFD = open(NSTemporaryDirectory() + "raycast-clean-keyboard.lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard instanceFD >= 0, flock(instanceFD, LOCK_EX | LOCK_NB) == 0 else {
      throw failure("Clean Keyboard is already running.")
    }
    if lockMouse {
      let context = LAContext()
      var error: NSError?
      guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error),
            context.biometryType == .touchID else {
        throw failure(error?.localizedDescription ?? "Enroll a Touch ID fingerprint before locking mouse clicks.")
      }
      guard AXIsProcessTrusted(), CGPreflightListenEventAccess() else {
        throw failure("Grant Accessibility and Input Monitoring in System Settings before locking mouse clicks.")
      }
    }
    try setupEventTap()
    if lockMouse {
      for type in [kIOPMAssertionTypePreventUserIdleDisplaySleep, kIOPMAssertionTypePreventUserIdleSystemSleep] {
        var identifier = IOPMAssertionID(0)
        guard IOPMAssertionCreateWithName(type as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn),
                                        "Clean Keyboard" as CFString, &identifier) == kIOReturnSuccess else {
          throw failure("Could not prevent idle sleep.")
        }
        assertions.append(identifier)
      }
      let center = NSWorkspace.shared.notificationCenter
      for name in [NSWorkspace.willSleepNotification, NSWorkspace.sessionDidResignActiveNotification] {
        observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
          self?.stop(reason: "sessionChanged")
        })
      }
      guard CGDisplayRegisterReconfigurationCallback(displayChanged, Unmanaged.passUnretained(self).toOpaque()) == .success else {
        throw failure("Could not watch for display changes.")
      }
      displayCallbackRegistered = true
    }
    if let duration { deadline = ProcessInfo.processInfo.systemUptime + TimeInterval(duration) }
    updateRecoveryHold(now: ProcessInfo.processInfo.systemUptime)
    scheduleTimer()
    CFRunLoopRun()
    stateLock.lock()
    let result = reason
    stateLock.unlock()
    return result
  }

  private func scheduleTimer() {
    let pulse = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in
      guard let self else { return }
      let now = ProcessInfo.processInfo.systemUptime
      self.stateLock.lock()
      self.lastTick = now
      self.stateLock.unlock()
      self.updateRecoveryHold(now: now)
    }
    timer = pulse
    RunLoop.current.add(pulse, forMode: .common)

    let watch = DispatchSource.makeTimerSource(queue: DispatchQueue.global(qos: .userInitiated))
    watch.schedule(deadline: .now() + 0.1, repeating: 0.1)
    watch.setEventHandler { [weak self] in
      guard let self else { return }
      let now = ProcessInfo.processInfo.systemUptime
      self.stateLock.lock()
      let stalled = now - self.lastTick > 2
      self.stateLock.unlock()
      if let deadline = self.deadline, now >= deadline { self.stop(reason: "timeout") }
      else if self.parentPID == 1 || getppid() != self.parentPID || stalled { self.stop(reason: "watchdog") }
    }
    watchdog = watch
    watch.resume()
  }

  private func updateRecoveryHold(now: TimeInterval) {
    guard lockMouse else { return }
    let bothHeld = CGEventSource.keyState(.hidSystemState, key: 55)
      && CGEventSource.keyState(.hidSystemState, key: 54)
    guard bothHeld else { bothCommandSince = nil; return }
    if let started = bothCommandSince {
      if now - started >= 8 { stop(reason: "recovery") }
    } else {
      bothCommandSince = now
    }
  }

  private func setupEventTap() throws {
    var types: [CGEventType] = [.keyDown, .keyUp]
    if lockMouse {
      types += [.flagsChanged, .leftMouseDown, .leftMouseUp, .leftMouseDragged,
                .rightMouseDown, .rightMouseUp, .rightMouseDragged,
                .otherMouseDown, .otherMouseUp, .otherMouseDragged]
    }
    let eventMask = types.reduce(CGEventMask(0)) { $0 | (CGEventMask(1) << $1.rawValue) }
    guard let tap = CGEvent.tapCreate(tap: .cghidEventTap, place: .headInsertEventTap, options: .defaultTap,
                                    eventsOfInterest: eventMask, callback: globalKeyEventHandler,
                                    userInfo: Unmanaged.passUnretained(self).toOpaque()) else {
      throw failure("Could not lock the keyboard. Check Accessibility access in System Settings.")
    }
    eventTap = tap
    guard let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0) else {
      throw failure("Could not start the keyboard event handler.")
    }
    runLoopSource = source
    CFRunLoopAddSource(runLoop, source, .commonModes)
    CGEvent.tapEnable(tap: tap, enable: true)
  }

  func stop(reason: String) {
    stateLock.lock()
    guard locked else { stateLock.unlock(); return }
    locked = false
    self.reason = reason
    let tap = eventTap
    stateLock.unlock()
    if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
    CFRunLoopStop(runLoop)
  }

  func handleKeyEvent(proxy _: CGEventTapProxy, type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
      stop(reason: "eventTapDisabled")
      return Unmanaged.passUnretained(event)
    }
    stateLock.lock()
    let active = locked
    stateLock.unlock()
    guard active else { return Unmanaged.passUnretained(event) }
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    if type == .keyDown, keyCode == KeyCode.u.rawValue, event.flags.contains(.maskControl) {
      if lockMouse { authenticate() } else { stop(reason: "manual") }
    } else if type == .keyDown, keyCode == 53, let context = authenticationContext {
      context.invalidate()
    } else if lockMouse, type == .flagsChanged {
      let now = ProcessInfo.processInfo.systemUptime
      let sides = event.flags.rawValue & 0x18
      if !event.flags.contains(.maskCommand) {
        leftCommand = false
        rightCommand = false
      } else if sides != 0 {
        leftCommand = sides & 0x8 != 0
        rightCommand = sides & 0x10 != 0
      } else if keyCode == 55 {
        leftCommand = CGEventSource.keyState(.combinedSessionState, key: 55)
      } else if keyCode == 54 {
        rightCommand = CGEventSource.keyState(.combinedSessionState, key: 54)
      }
      if !leftCommand || !rightCommand { bothCommandSince = nil }
      let commandDown = leftCommand || rightCommand
      if keyCode != 55 && keyCode != 54 { commandTapCount = 0 }
      else if commandDown && !commandWasDown {
        if commandTapCount == 0 || now - commandSequenceStarted > 1.5 {
          commandTapCount = 0
          commandSequenceStarted = now
        }
      } else if !commandDown && commandWasDown {
        if now - commandSequenceStarted <= 1.5 {
          commandTapCount += 1
          if commandTapCount == 3 { commandTapCount = 0; authenticate() }
        } else { commandTapCount = 0 }
      }
      commandWasDown = commandDown
    } else if type == .keyDown || type == .leftMouseDown || type == .rightMouseDown || type == .otherMouseDown {
      commandTapCount = 0
    }
    return nil
  }

  private func authenticate() {
    guard authenticationContext == nil else { return }
    commandTapCount = 0
    let context = LAContext()
    authenticationContext = context
    DispatchQueue.main.async {
      context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "unlock Clean Keyboard") { [weak self] success, _ in
        DispatchQueue.main.async {
          guard let self else { return }
          self.authenticationContext = nil
          self.commandTapCount = 0
          if success { self.stop(reason: "touchID") }
        }
      }
    }
  }

  private func cleanup() {
    watchdog?.cancel()
    watchdog = nil
    timer?.invalidate()
    timer = nil
    authenticationContext?.invalidate()
    authenticationContext = nil
    for observer in observers {
      NSWorkspace.shared.notificationCenter.removeObserver(observer)
    }
    observers.removeAll()
    if displayCallbackRegistered {
      CGDisplayRemoveReconfigurationCallback(displayChanged, Unmanaged.passUnretained(self).toOpaque())
      displayCallbackRegistered = false
    }
    if let runLoopSource { CFRunLoopRemoveSource(runLoop, runLoopSource, .commonModes) }
    runLoopSource = nil
    stateLock.lock()
    let tap = eventTap
    eventTap = nil
    stateLock.unlock()
    if let tap { CGEvent.tapEnable(tap: tap, enable: false); CFMachPortInvalidate(tap) }
    for identifier in assertions { IOPMAssertionRelease(identifier) }
    assertions.removeAll()
    if instanceFD >= 0 { close(instanceFD) }
    instanceFD = -1
  }
}

func globalKeyEventHandler(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent,
                           refcon: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
  guard let refcon else { return Unmanaged.passUnretained(event) }
  return Unmanaged<EventHandler>.fromOpaque(refcon).takeUnretainedValue()
    .handleKeyEvent(proxy: proxy, type: type, event: event)
}

@raycast func handler(duration: Int?, lockMouse: Bool?) throws -> String {
  try EventHandler(lockMouse: lockMouse ?? false).run(duration: duration)
}

@raycast func stopHandler() {
  let keyDownEvent = CGEvent(keyboardEventSource: nil, virtualKey: KeyCode.u.rawValue, keyDown: true)
  keyDownEvent?.flags = .maskControl
  keyDownEvent?.post(tap: .cghidEventTap)
  usleep(10000)
  let keyUpEvent = CGEvent(keyboardEventSource: nil, virtualKey: KeyCode.u.rawValue, keyDown: false)
  keyUpEvent?.flags = .maskControl
  keyUpEvent?.post(tap: .cghidEventTap)
}
