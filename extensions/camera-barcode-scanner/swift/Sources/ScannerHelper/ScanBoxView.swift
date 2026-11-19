import AppKit

/// Green scan box over the preview. It dims the rest and can be moved and resized with the mouse.
@MainActor
final class ScanBoxView: NSView {
  static let defaultBox = CGRect(x: 0.2, y: 0.325, width: 0.6, height: 0.35)
  private static let defaults = UserDefaults(suiteName: "com.daanmlab.camera-barcode-scanner") ?? .standard
  private static let key = "scanBox"
  private static let handle: CGFloat = 12
  private static let minSize = CGSize(width: 60, height: 40)

  /// Normalized rect, top-left origin, relative to this view.
  private(set) var box: CGRect
  var onChange: ((CGRect) -> Void)?

  private let dimLayer = CAShapeLayer()
  private let borderLayer = CAShapeLayer()
  private let handlesLayer = CAShapeLayer()
  private enum Drag { case move, edges(left: Bool, right: Bool, top: Bool, bottom: Bool) }
  private var drag: Drag?
  private var dragStart = CGPoint.zero
  private var boxAtStart = CGRect.zero

  override var isFlipped: Bool { true }
  override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

  override init(frame: NSRect) {
    box = Self.loadBox()
    super.init(frame: frame)
    wantsLayer = true
    dimLayer.fillRule = .evenOdd
    dimLayer.fillColor = NSColor.black.withAlphaComponent(0.45).cgColor
    borderLayer.fillColor = nil
    borderLayer.strokeColor = NSColor.systemGreen.cgColor
    borderLayer.lineWidth = 2
    handlesLayer.fillColor = NSColor.systemGreen.cgColor
    [dimLayer, borderLayer, handlesLayer].forEach { layer?.addSublayer($0) }
    addTrackingArea(
      NSTrackingArea(
        rect: .zero, options: [.mouseMoved, .activeAlways, .inVisibleRect, .mouseEnteredAndExited],
        owner: self))
    relayout()
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layout() {
    super.layout()
    relayout()
  }

  private static func loadBox() -> CGRect {
    guard let values = defaults.array(forKey: key) as? [Double], values.count == 4 else { return defaultBox }
    let rect = CGRect(x: values[0], y: values[1], width: values[2], height: values[3])
    let unit = CGRect(x: 0, y: 0, width: 1, height: 1)
    return unit.contains(rect) && rect.width > 0.05 && rect.height > 0.05 ? rect : defaultBox
  }

  private func save() {
    Self.defaults.set([box.minX, box.minY, box.width, box.height].map(Double.init), forKey: Self.key)
  }

  func resetBox() {
    box = Self.defaultBox
    save()
    relayout()
    onChange?(box)
  }

  /// The box in view points.
  private var boxRect: CGRect {
    CGRect(
      x: box.minX * bounds.width, y: box.minY * bounds.height,
      width: box.width * bounds.width, height: box.height * bounds.height)
  }

  private func relayout() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    [dimLayer, borderLayer, handlesLayer].forEach { $0.frame = bounds }
    let rect = boxRect
    let dim = CGMutablePath()
    dim.addRect(bounds)
    dim.addRect(rect)
    dimLayer.path = dim
    borderLayer.path = CGPath(rect: rect, transform: nil)
    let h = Self.handle / 2
    let handles = CGMutablePath()
    for p in [
      CGPoint(x: rect.minX, y: rect.minY), CGPoint(x: rect.maxX, y: rect.minY),
      CGPoint(x: rect.minX, y: rect.maxY), CGPoint(x: rect.maxX, y: rect.maxY),
      CGPoint(x: rect.midX, y: rect.minY), CGPoint(x: rect.midX, y: rect.maxY),
      CGPoint(x: rect.minX, y: rect.midY), CGPoint(x: rect.maxX, y: rect.midY),
    ] {
      handles.addRect(CGRect(x: p.x - h / 2, y: p.y - h / 2, width: h, height: h))
    }
    handlesLayer.path = handles
    CATransaction.commit()
  }

  /// Thicker, brighter border for a moment after a read.
  func flash() {
    borderLayer.removeAllAnimations()
    let width = CABasicAnimation(keyPath: "lineWidth")
    width.fromValue = 7
    width.toValue = 2
    let color = CABasicAnimation(keyPath: "strokeColor")
    color.fromValue = NSColor(calibratedRed: 0.55, green: 1, blue: 0.55, alpha: 1).cgColor
    color.toValue = NSColor.systemGreen.cgColor
    let group = CAAnimationGroup()
    group.animations = [width, color]
    group.duration = 0.25
    borderLayer.add(group, forKey: "flash")
  }

  // MARK: Mouse

  private func hit(_ point: CGPoint) -> Drag? {
    let rect = boxRect
    let slop = Self.handle
    guard rect.insetBy(dx: -slop / 2, dy: -slop / 2).contains(point) else { return nil }
    let left = abs(point.x - rect.minX) <= slop
    let right = abs(point.x - rect.maxX) <= slop
    let top = abs(point.y - rect.minY) <= slop
    let bottom = abs(point.y - rect.maxY) <= slop
    if left || right || top || bottom {
      return .edges(left: left && !right || (left && right && point.x < rect.midX),
        right: right && !left || (left && right && point.x >= rect.midX),
        top: top && !bottom || (top && bottom && point.y < rect.midY),
        bottom: bottom && !top || (top && bottom && point.y >= rect.midY))
    }
    return .move
  }

  private func cursor(for drag: Drag?) -> NSCursor {
    switch drag {
    case nil: return .arrow
    case .move: return .openHand
    case .edges(let left, let right, let top, let bottom):
      if #available(macOS 15.0, *) {
        return .frameResize(position: Self.position(left: left, right: right, top: top, bottom: bottom), directions: .all)
      }
      let horizontal = left || right
      let vertical = top || bottom
      if horizontal && vertical { return .crosshair }
      return horizontal ? .resizeLeftRight : .resizeUpDown
    }
  }

  @available(macOS 15.0, *)
  private static func position(left: Bool, right: Bool, top: Bool, bottom: Bool) -> NSCursor.FrameResizePosition {
    switch (left, right, top, bottom) {
    case (true, _, true, _): return .topLeft
    case (_, true, true, _): return .topRight
    case (true, _, _, true): return .bottomLeft
    case (_, true, _, true): return .bottomRight
    case (true, _, _, _): return .left
    case (_, true, _, _): return .right
    case (_, _, true, _): return .top
    default: return .bottom
    }
  }

  override func mouseMoved(with event: NSEvent) {
    cursor(for: hit(convert(event.locationInWindow, from: nil))).set()
  }

  override func mouseExited(with event: NSEvent) { NSCursor.arrow.set() }

  override func mouseDown(with event: NSEvent) {
    let point = convert(event.locationInWindow, from: nil)
    if event.clickCount == 2, hit(point) != nil {
      resetBox()
      return
    }
    drag = hit(point)
    dragStart = point
    boxAtStart = box
    if case .move = drag { NSCursor.closedHand.set() }
  }

  override func mouseDragged(with event: NSEvent) {
    guard let drag, bounds.width > 0, bounds.height > 0 else { return }
    let point = convert(event.locationInWindow, from: nil)
    let dx = (point.x - dragStart.x) / bounds.width
    let dy = (point.y - dragStart.y) / bounds.height
    let minW = Self.minSize.width / bounds.width
    let minH = Self.minSize.height / bounds.height
    var next = boxAtStart
    switch drag {
    case .move:
      next.origin.x = min(max(0, boxAtStart.minX + dx), 1 - boxAtStart.width)
      next.origin.y = min(max(0, boxAtStart.minY + dy), 1 - boxAtStart.height)
    case .edges(let left, let right, let top, let bottom):
      var minX = boxAtStart.minX, maxX = boxAtStart.maxX
      var minY = boxAtStart.minY, maxY = boxAtStart.maxY
      if left { minX = min(max(0, minX + dx), maxX - minW) }
      if right { maxX = max(min(1, maxX + dx), minX + minW) }
      if top { minY = min(max(0, minY + dy), maxY - minH) }
      if bottom { maxY = max(min(1, maxY + dy), minY + minH) }
      next = CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }
    box = next
    relayout()
    onChange?(box)
  }

  override func mouseUp(with event: NSEvent) {
    guard drag != nil else { return }
    drag = nil
    save()
    cursor(for: hit(convert(event.locationInWindow, from: nil))).set()
  }
}
