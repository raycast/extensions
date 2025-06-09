import CoreGraphics
import Foundation
import RaycastSwiftMacros

enum KeyCode: CGKeyCode {
  case u = 0x20
}

class EventHandler {
  var isLocked = true
  var supportPath: String
  var stateFile: String
  var timer: Timer?

  init(supportPath: String) {
    self.supportPath = supportPath
    self.stateFile = "\(supportPath)/keyboard-lock-state.txt"
  }

  func scheduleTimer(duration: Int?) {
    guard let duration = duration else { return }
    
    // Write initial state to file
    writeState(duration: duration, timeLeft: duration)
    
    // Invalidate existing timer if any
    timer?.invalidate()
    
    // For "Forever" (duration == -1), don't create a countdown timer
    if duration == -1 {
      // Just keep the state file updated with -1 for both duration and timeLeft
      return
    }
    
    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
      // Read current state
      let (currentDuration, currentTimeLeft) = self.readState()
      
      if currentTimeLeft <= 0 {
        // Timer expired
        self.writeState(duration: 0, timeLeft: 0)
        self.timer?.invalidate()
        self.timer = nil
        let message = "Timer expired ⏱️\n"
        if let data = message.data(using: .utf8) {
          FileHandle.standardError.write(data)
        }
        CFRunLoopStop(CFRunLoopGetCurrent())
        return
      }
      
      // Update time left
      self.writeState(duration: currentDuration, timeLeft: currentTimeLeft - 1)
    }
  }

  func writeState(duration: Int, timeLeft: Int) {
    let content = "\(duration)\n\(timeLeft)"
    do {
      try content.write(toFile: stateFile, atomically: true, encoding: .utf8)
    } catch {
      print("Error writing state: \(error)")
    }
  }

  func readState() -> (duration: Int, timeLeft: Int) {
    do {
      let content = try String(contentsOfFile: stateFile, encoding: .utf8)
      let lines = content.components(separatedBy: .newlines)
      if lines.count >= 2 {
        let duration = Int(lines[0]) ?? 0
        let timeLeft = Int(lines[1]) ?? 0
        return (duration, timeLeft)
      }
    } catch {
      print("Error reading state: \(error)")
    }
    return (0, 0)
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

    if controlFlag, keyCode == KeyCode.u.rawValue {
      isLocked = false
      // Clear the state file when manually unlocked
      writeState(duration: 0, timeLeft: 0)
      timer?.invalidate()
      timer = nil
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

@raycast func handler(duration: Int?, supportPath: String?) {
  let path = supportPath ?? ""
  let handler = EventHandler(supportPath: path)
  handler.scheduleTimer(duration: duration ?? 15)
  handler.run()
}

@raycast func stopHandler(supportPath: String?) {
  let path = supportPath ?? ""
  let stateFile = "\(path)/keyboard-lock-state.txt"
  
  // Clear the state file
  do {
    try "0\n0".write(toFile: stateFile, atomically: true, encoding: .utf8)
  } catch {
    print("Error clearing state: \(error)")
  }
  
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

@raycast func getState(supportPath: String?) -> String {
  let path = supportPath ?? ""
  let stateFile = "\(path)/keyboard-lock-state.txt"
  
  do {
    let content = try String(contentsOfFile: stateFile, encoding: .utf8)
    return content
  } catch {
    return "0\n0"
  }
}
