import AppKit
import RaycastSwiftMacros

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
      NSApp.terminate(nil)
      return
    }

    super.mouseDown(with: event)
  }

  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {
      NSApp.terminate(nil)
      return
    }

    super.keyDown(with: event)
  }
}

private final class OverlayAppDelegate: NSObject, NSApplicationDelegate {
  private let durationSeconds: Int
  private var window: NSWindow?
  private var keyMonitor: Any?
  private var timer: Timer?

  init(durationSeconds: Int) {
    self.durationSeconds = durationSeconds
    super.init()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    guard let screen = NSScreen.main else {
      NSApp.terminate(nil)
      return
    }

    let frame = screen.frame
    let window = BlackrWindow(
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

    let overlayView = OverlayView(frame: NSRect(origin: .zero, size: frame.size))
    window.contentView = overlayView

    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    window.makeMain()
    window.makeKey()
    window.makeFirstResponder(overlayView)

    self.window = window

    keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
      if event.keyCode == 53 {
        NSApp.terminate(nil)
        return nil
      }

      return event
    }

    timer = Timer.scheduledTimer(withTimeInterval: TimeInterval(durationSeconds), repeats: false) { _ in
      NSApp.terminate(nil)
    }
  }

  func applicationWillTerminate(_ notification: Notification) {
    timer?.invalidate()
    timer = nil

    if let keyMonitor {
      NSEvent.removeMonitor(keyMonitor)
      self.keyMonitor = nil
    }

    window?.orderOut(nil)
    window?.close()
    window = nil
  }
}

@raycast func blackrOverlay(durationSeconds: Int) {
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  let delegate = OverlayAppDelegate(durationSeconds: durationSeconds)
  app.delegate = delegate
  app.run()
}
