import AppKit

private final class ToastPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

private final class CenteredTextFieldCell: NSTextFieldCell {
  override func drawingRect(forBounds rect: NSRect) -> NSRect {
    var drawingRect = super.drawingRect(forBounds: rect)
    let textSize = cellSize(forBounds: rect)
    drawingRect.origin.y = rect.origin.y + max((rect.height - textSize.height) / 2, 0)
    drawingRect.size.height = min(textSize.height, rect.height)
    return drawingRect
  }
}

private final class ToastView: NSView {
  private let text: String
  private let font = NSFont.systemFont(ofSize: 16, weight: .semibold)
  private let dot = NSView()
  private let label: NSTextField
  private let close: () -> Void
  private var tracking: NSTrackingArea?
  var isHovering = false

  init(text: String, close: @escaping () -> Void) {
    self.text = text
    self.label = NSTextField(frame: .zero)
    self.close = close
    super.init(frame: .zero)

    wantsLayer = true
    layer?.cornerRadius = 22
    layer?.backgroundColor = NSColor(calibratedRed: 0.10, green: 0.24, blue: 0.16, alpha: 0.96).cgColor
    layer?.borderColor = NSColor(calibratedRed: 0.25, green: 0.86, blue: 0.55, alpha: 0.18).cgColor
    layer?.borderWidth = 1

    dot.wantsLayer = true
    dot.layer?.cornerRadius = 4
    dot.layer?.backgroundColor = NSColor(calibratedRed: 0.25, green: 0.86, blue: 0.55, alpha: 1).cgColor
    addSubview(dot)

    let cell = CenteredTextFieldCell(textCell: text)
    cell.lineBreakMode = .byTruncatingTail
    cell.usesSingleLineMode = true
    label.cell = cell
    label.font = font
    label.textColor = .white
    label.drawsBackground = false
    label.isBezeled = false
    label.isEditable = false
    label.isSelectable = false
    label.maximumNumberOfLines = 1
    addSubview(label)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layout() {
    super.layout()
    dot.frame = NSRect(x: 22, y: (bounds.height - 8) / 2, width: 8, height: 8)
    label.frame = NSRect(x: 46, y: 0, width: bounds.width - 68, height: bounds.height)
  }

  override func updateTrackingAreas() {
    if let tracking {
      removeTrackingArea(tracking)
    }

    tracking = NSTrackingArea(
      rect: bounds,
      options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
      owner: self,
      userInfo: nil
    )

    if let tracking {
      addTrackingArea(tracking)
    }
  }

  override func mouseEntered(with event: NSEvent) {
    isHovering = true
  }

  override func mouseExited(with event: NSEvent) {
    isHovering = false
    close()
  }
}

private final class AppDelegate: NSObject, NSApplicationDelegate {
  private let text: String
  private var panel: ToastPanel?
  private var toastView: ToastView?
  private var timer: Timer?
  private let expiresAt = Date().addingTimeInterval(4.0)

  init(text: String) {
    self.text = text
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)

    let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
    let maxWidth = min(screenFrame.width - 80, 980)
    let textWidth = (text as NSString).size(withAttributes: [
      .font: NSFont.systemFont(ofSize: 16, weight: .semibold)
    ]).width
    let width = min(max(textWidth + 92, 220), maxWidth)
    let height: CGFloat = 54
    let origin = NSPoint(x: screenFrame.midX - width / 2, y: screenFrame.minY + 58)

    let panel = ToastPanel(
      contentRect: NSRect(origin: origin, size: NSSize(width: width, height: height)),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    panel.level = .floating
    panel.collectionBehavior = [.canJoinAllSpaces, .transient, .ignoresCycle]
    panel.backgroundColor = .clear
    panel.isOpaque = false
    panel.hasShadow = true
    panel.acceptsMouseMovedEvents = true
    panel.ignoresMouseEvents = false

    let toastView = ToastView(text: text) { [weak self] in
      self?.closeIfExpiredOrNotHovering(force: false)
    }
    toastView.frame = panel.contentView?.bounds ?? NSRect(origin: .zero, size: panel.frame.size)
    toastView.autoresizingMask = [.width, .height]
    panel.contentView = toastView

    self.panel = panel
    self.toastView = toastView
    panel.orderFrontRegardless()
    toastView.isHovering = panel.frame.contains(NSEvent.mouseLocation)

    timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
      self?.closeIfExpiredOrNotHovering(force: false)
    }
  }

  private func closeIfExpiredOrNotHovering(force: Bool) {
    guard force || Date() >= expiresAt else {
      return
    }

    if toastView?.isHovering == true && !force {
      return
    }

    timer?.invalidate()
    panel?.orderOut(nil)
    NSApp.terminate(nil)
  }
}

let text = CommandLine.arguments.dropFirst().joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
private let delegate = AppDelegate(text: text.isEmpty ? "Translated" : text)
NSApplication.shared.delegate = delegate
NSApplication.shared.run()
