import AppKit

/// One display's part of the picker overlay.
final class PickerView: NSView {
  private let picker: Picker
  private let screen: NSScreen
  private let hint: NSView
  private let hintLabel = HUDLabel("", size: 13, weight: .medium)
  private var hintMode: Picker.Mode?

  init(picker: Picker, screen: NSScreen) {
    self.picker = picker
    self.screen = screen
    hint = makeHUDBackground(frame: .zero, cornerRadius: 16)
    super.init(frame: NSRect(origin: .zero, size: screen.frame.size))
    wantsLayer = true
    hintLabel.wantsLayer = true
    hint.addSubview(hintLabel)
    addSubview(hint)
    addTrackingArea(
      NSTrackingArea(
        rect: .zero, options: [.mouseMoved, .activeAlways, .inVisibleRect], owner: self, userInfo: nil))
    refresh()
  }

  required init?(coder: NSCoder) { fatalError() }

  override var acceptsFirstResponder: Bool { true }
  override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

  private func local(_ rect: NSRect) -> NSRect {
    rect.offsetBy(dx: -screen.frame.minX, dy: -screen.frame.minY)
  }

  func refresh() {
    needsDisplay = true
    updateHint()
  }

  /// A floating material bar on the display under the mouse.
  private func updateHint() {
    hint.isHidden = screen != Geometry.screenUnderMouse()
    guard hintMode != picker.mode else { return }

    hintMode = picker.mode
    let text =
      picker.mode == .region
      ? "Drag to select   Space: pick a window   Enter: record   Esc: cancel"
      : "Click a window to record   Space: draw a region   Esc: cancel"
    // Cross-fade the text when the mode changes, rather than swapping it in one frame.
    let transition = CATransition()
    transition.type = .fade
    transition.duration = 0.15
    hintLabel.layer?.add(transition, forKey: "text")
    hintLabel.text = text
    let width = hintLabel.intrinsicContentSize.width + 36
    hint.frame = NSRect(x: (bounds.width - width) / 2, y: 40, width: width, height: 32)
    hintLabel.frame = NSRect(x: 0, y: 7, width: width, height: 18)
  }

  override func draw(_ dirtyRect: NSRect) {
    NSColor.black.withAlphaComponent(0.4).setFill()
    bounds.fill()

    if let highlight = picker.highlight {
      let rect = local(highlight)
      NSColor.clear.setFill()
      rect.fill(using: .copy)
      NSColor.systemRed.setStroke()
      let border = NSBezierPath(rect: rect)
      border.lineWidth = 2
      border.stroke()
      drawSizeLabel(for: highlight, at: rect)
      if picker.mode == .region { drawHandles(rect) }
    }

    if let button = picker.recordButtonRect() {
      drawButton(local(button), pressed: picker.isPressingRecord)
    }
  }

  private func drawHandles(_ rect: NSRect) {
    let s = Picker.handleSize
    let xs = [rect.minX, rect.midX, rect.maxX]
    let ys = [rect.minY, rect.midY, rect.maxY]
    NSColor.white.setFill()
    NSColor.systemRed.setStroke()
    for x in xs {
      for y in ys where !(x == rect.midX && y == rect.midY) {
        let handle = NSBezierPath(ovalIn: NSRect(x: x - s / 2, y: y - s / 2, width: s, height: s))
        handle.fill()
        handle.stroke()
      }
    }
  }

  private func drawSizeLabel(for global: NSRect, at rect: NSRect) {
    let text = "\(Int(global.width.rounded())) x \(Int(global.height.rounded()))" as NSString
    let attrs: [NSAttributedString.Key: Any] = [
      .font: NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .semibold),
      .foregroundColor: NSColor.white,
      .kern: 0.12,
    ]
    let size = text.size(withAttributes: attrs)
    let y = rect.maxY + 6 + 22 < bounds.maxY ? rect.maxY + 6 : rect.maxY - 28
    let capsule = NSRect(x: rect.minX, y: y, width: size.width + 16, height: 22)
    NSColor.black.withAlphaComponent(Accessibility.reduceTransparency ? 0.95 : 0.75).setFill()
    NSBezierPath(roundedRect: capsule, xRadius: 11, yRadius: 11).fill()
    text.draw(at: NSPoint(x: capsule.minX + 8, y: capsule.midY - size.height / 2), withAttributes: attrs)
  }

  /// Highlights on press (darker, slightly smaller); the action fires on release.
  private func drawButton(_ rect: NSRect, pressed: Bool) {
    let shape = pressed && !Accessibility.reduceMotion ? rect.insetBy(dx: 2, dy: 1) : rect
    let fill = pressed ? NSColor.systemRed.blended(withFraction: 0.25, of: .black) ?? .systemRed : .systemRed
    fill.setFill()
    NSBezierPath(roundedRect: shape, xRadius: 8, yRadius: 8).fill()
    let attrs: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: 13, weight: .semibold), .foregroundColor: NSColor.white, .kern: 0.13,
    ]
    let title = "Record" as NSString
    let size = title.size(withAttributes: attrs)
    title.draw(at: NSPoint(x: shape.midX - size.width / 2, y: shape.midY - size.height / 2), withAttributes: attrs)
  }

  override func mouseMoved(with event: NSEvent) {
    picker.mouseMoved(to: NSEvent.mouseLocation)
    // The hint follows the mouse across displays.
    let current = Geometry.screenUnderMouse()
    if PickerView.hintScreen != current {
      PickerView.hintScreen = current
      picker.redraw()
    }
  }

  private static var hintScreen: NSScreen?

  override func mouseDown(with event: NSEvent) {
    picker.mouseDown(at: NSEvent.mouseLocation, clickCount: event.clickCount)
  }

  override func mouseDragged(with event: NSEvent) {
    picker.mouseDragged(to: NSEvent.mouseLocation)
  }

  override func mouseUp(with event: NSEvent) {
    picker.mouseUp(at: NSEvent.mouseLocation)
  }

  override func keyDown(with event: NSEvent) {
    picker.keyDown(event)
  }
}
