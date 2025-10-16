import CoreGraphics
import Foundation
import RaycastSwiftMacros

enum KeyCode: CGKeyCode {
  case u = 0x20
}

class EventHandler {
  var isLocked = true

  init() {}

  func scheduleTimer(duration: Int?) {
    guard let duration = duration else { return }
    let timer = Timer(timeInterval: TimeInterval(duration), repeats: false) { _ in
      let message = "Timer expired ⏱️\n"
      if let data = message.data(using: .utf8) {
        FileHandle.standardError.write(data)
      }

      CFRunLoopStop(CFRunLoopGetCurrent())
    }

    RunLoop.current.add(timer, forMode: .common)
  }

  func run() {
    setupEventTap() // Setup event tap to capture key events
    CFRunLoopRun() // Start the run loop to handle events
  }

  private func setupEventTap() {
    let eventMask = CGEventMask(
      (1 << CGEventType.keyDown.rawValue) |
        (1 << CGEventType.keyUp.rawValue)
    )
    guard let eventTap = CGEvent.tapCreate(
      tap: .cghidEventTap,
      place: .headInsertEventTap,
      options: .defaultTap,
      eventsOfInterest: eventMask,
      callback: globalKeyEventHandler,
      userInfo: UnsafeMutableRawPointer(Unmanaged
        .passUnretained(self)
        .toOpaque())
    ) else {
      fatalError("Failed to create event tap")
    }

    let runLoopSource = CFMachPortCreateRunLoopSource(
      kCFAllocatorDefault,
      eventTap,
      0
    )
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
    CGEvent.tapEnable(tap: eventTap, enable: true)
  }

  func handleKeyEvent(
    proxy _: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent
  ) -> Unmanaged<CGEvent>? {
    guard type == .keyDown || type == .keyUp else {
      return Unmanaged.passRetained(event)
    }
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    let controlFlag = event.flags.contains(.maskControl)
    let eventType = type == .keyDown ? "pressed" : "released"

    if controlFlag, keyCode == KeyCode.u.rawValue {
      isLocked = false
      return Unmanaged.passRetained(event)
    }

    return isLocked ? nil : Unmanaged.passRetained(event)
  }
}

func globalKeyEventHandler(
  proxy: CGEventTapProxy,
  type: CGEventType,
  event: CGEvent,
  refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
  guard let refcon = refcon else { return Unmanaged.passRetained(event) }
  let mySelf = Unmanaged<EventHandler>.fromOpaque(refcon).takeUnretainedValue()
  return mySelf.handleKeyEvent(proxy: proxy, type: type, event: event)
}

@raycast func handler(duration: Int?) {
  let handler = EventHandler()
  handler.scheduleTimer(duration: duration ?? 15)
  handler.run()
}

@raycast func stopHandler() {
  // Create a key down event for 'u' key with control modifier
  let keyDownEvent = CGEvent(keyboardEventSource: nil, virtualKey: KeyCode.u.rawValue, keyDown: true)
  keyDownEvent?.flags = .maskControl
  keyDownEvent?.post(tap: .cghidEventTap)

  usleep(10000)

  // Create a key up event for 'u' key with control modifier
  let keyUpEvent = CGEvent(keyboardEventSource: nil, virtualKey: KeyCode.u.rawValue, keyDown: false)
  keyUpEvent?.flags = .maskControl
  keyUpEvent?.post(tap: .cghidEventTap)
}
