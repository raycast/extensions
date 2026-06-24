import AppKit

private let defaultDurationSeconds = 60
private let minDurationSeconds = 10
private let maxDurationSeconds = 600
private var shouldExit = false

private func normalizedDuration() -> Int {
  guard CommandLine.arguments.count > 1,
        let value = Int(CommandLine.arguments[1])
  else {
    return defaultDurationSeconds
  }

  return min(max(value, minDurationSeconds), maxDurationSeconds)
}

private final class BlackrWindow: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }
}

private final class OverlayView: NSView {
  private let exitButtonRect: NSRect

  override var acceptsFirstResponder: Bool { true }

  override init(frame frameRect: NSRect) {
    let buttonWidth: CGFloat = 96
    let buttonHeight: CGFloat = 34
    exitButtonRect = NSRect(
      x: (frameRect.width - buttonWidth) / 2,
      y: 44,
      width: buttonWidth,
      height: buttonHeight
    )

    super.init(frame: frameRect)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func draw(_ dirtyRect: NSRect) {
    NSColor.black.setFill()
    bounds.fill()

    let buttonPath = NSBezierPath(roundedRect: exitButtonRect, xRadius: 8, yRadius: 8)
    NSColor.white.withAlphaComponent(0.10).setFill()
    buttonPath.fill()
    NSColor.white.withAlphaComponent(0.16).setStroke()
    buttonPath.lineWidth = 1
    buttonPath.stroke()

    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .center

    let attributes: [NSAttributedString.Key: Any] = [
      .foregroundColor: NSColor.white.withAlphaComponent(0.72),
      .font: NSFont.systemFont(ofSize: 13, weight: .regular),
      .paragraphStyle: paragraphStyle,
    ]
    let title = "Exit" as NSString
    let titleSize = title.size(withAttributes: attributes)
    let titleRect = NSRect(
      x: exitButtonRect.minX,
      y: exitButtonRect.midY - titleSize.height / 2,
      width: exitButtonRect.width,
      height: titleSize.height
    )

    title.draw(in: titleRect, withAttributes: attributes)
  }

  override func mouseDown(with event: NSEvent) {
    let location = convert(event.locationInWindow, from: nil)

    if exitButtonRect.contains(location) {
      shouldExit = true
      return
    }

    super.mouseDown(with: event)
  }

  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {
      shouldExit = true
      return
    }

    super.keyDown(with: event)
  }
}

private func makeEscEventTap() -> CFMachPort? {
  let eventMask = CGEventMask(1 << CGEventType.keyDown.rawValue)

  return CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: eventMask,
    callback: { _, eventType, event, _ in
      if eventType == .keyDown,
         event.getIntegerValueField(.keyboardEventKeycode) == 53
      {
        DispatchQueue.main.async {
          shouldExit = true
        }
      }

      return Unmanaged.passUnretained(event)
    },
    userInfo: nil
  )
}

let durationSeconds = normalizedDuration()
let app = NSApplication.shared
app.setActivationPolicy(.accessory)

guard let screen = NSScreen.main else {
  exit(1)
}

let frame = screen.frame
private let window = BlackrWindow(
  contentRect: frame,
  styleMask: [.borderless],
  backing: .buffered,
  defer: false
)

window.backgroundColor = .black
window.isOpaque = true
window.isReleasedWhenClosed = false
window.ignoresMouseEvents = false
window.level = .screenSaver
window.collectionBehavior = [
  .canJoinAllSpaces,
  .fullScreenAuxiliary,
  .stationary,
]

private let overlayView = OverlayView(frame: NSRect(origin: .zero, size: frame.size))
window.contentView = overlayView
app.activate(ignoringOtherApps: true)
window.makeKeyAndOrderFront(nil)
window.makeMain()
window.makeKey()
window.makeFirstResponder(overlayView)

let keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
  if event.keyCode == 53 {
    shouldExit = true
    return nil
  }

  return event
}

private let escEventTap = makeEscEventTap()
if let escEventTap {
  let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, escEventTap, 0)
  CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, .commonModes)
  CGEvent.tapEnable(tap: escEventTap, enable: true)
}

let endDate = Date().addingTimeInterval(TimeInterval(durationSeconds))

while !shouldExit && Date() < endDate {
  autoreleasepool {
    if let event = app.nextEvent(
      matching: .any,
      until: Date(timeIntervalSinceNow: 0.05),
      inMode: .default,
      dequeue: true
    ) {
      app.sendEvent(event)
    }
  }
}

window.orderOut(nil)
window.close()

if let keyMonitor {
  NSEvent.removeMonitor(keyMonitor)
}
