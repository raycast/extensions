import AppKit

/// Full-screen overlay to pick what to record.
///
/// Region mode: drag to draw, then drag inside to move or drag an edge or corner
/// to resize. Click without dragging selects the whole display. Enter, a double
/// click or the Record button confirms.
/// Window mode: hover highlights the window under the mouse, click picks it.
/// Space switches between the modes, Escape cancels.
///
/// Calls `onDone` with the picked target, or nil when cancelled.
final class Picker {
  enum Mode { case region, window }

  private enum Drag {
    case drawing(start: NSPoint)
    case moving(offset: NSPoint)
    /// `grab` is the pointer's distance from the edge it took hold of, kept while resizing.
    case resizing(edges: Edges, original: NSRect, grab: NSPoint)
    /// Button-style press: highlighted on down, confirmed on release inside.
    case pressingRecord(inside: Bool)
    case pressingWindow
  }

  struct Edges: OptionSet {
    let rawValue: Int
    static let left = Edges(rawValue: 1)
    static let right = Edges(rawValue: 2)
    static let bottom = Edges(rawValue: 4)
    static let top = Edges(rawValue: 8)
  }

  var mode: Mode
  /// Global Cocoa coordinates. The logical selection; `highlight` is what is drawn.
  private(set) var selection: NSRect?
  private(set) var hovered: WindowInfo?
  /// The rectangle on screen right now, which springs toward its target.
  private(set) var highlight: NSRect?
  private var drag: Drag?
  private var dragMoved = false
  private let windows = Windows.list()
  private var overlays: [NSWindow] = []
  private let onDone: (PickResult?) -> Void
  private lazy var highlightMotion = SpringAnimator(values: [0, 0, 0, 0], parameters: .snappy) { [weak self] v in
    self?.highlight = NSRect(x: v[0], y: v[1], width: v[2], height: v[3])
    self?.redraw()
  }

  init(mode: Mode, onDone: @escaping (PickResult?) -> Void) {
    self.mode = mode
    self.onDone = onDone
  }

  func show() {
    for screen in NSScreen.screens {
      let window = makeOverlayWindow(frame: screen.frame)
      window.acceptsMouseMovedEvents = true
      window.contentView = PickerView(picker: self, screen: screen)
      window.alphaValue = 0
      window.makeKeyAndOrderFront(nil)
      // Ease the dim in rather than dropping the screen's brightness in one frame.
      fade(window, to: 1, duration: 0.18)
      overlays.append(window)
    }

    let mouse = NSEvent.mouseLocation
    overlays.first { $0.frame.contains(mouse) }?.makeKey()
    NSCursor.crosshair.set()
    updateHover(at: mouse)
  }

  private func finish(_ result: PickResult?) {
    if result != nil { confirmHaptic() }
    let windows = overlays
    overlays = []
    var remaining = windows.count
    for window in windows {
      fade(window, to: 0, duration: 0.12) {
        window.orderOut(nil)
        remaining -= 1
        if remaining == 0 { self.onDone(result) }
      }
    }
    if windows.isEmpty { onDone(result) }
  }

  func redraw() {
    overlays.forEach { ($0.contentView as? PickerView)?.refresh() }
  }

  // MARK: highlight

  /// Moves the drawn highlight: 1:1 while the pointer drives it, springing otherwise.
  private func setHighlight(_ rect: NSRect?, animated: Bool) {
    guard let rect else {
      highlightMotion.jump(to: [0, 0, 0, 0])
      highlight = nil
      redraw()

      return
    }

    let values = [rect.minX, rect.minY, rect.width, rect.height]
    if animated, highlight != nil {
      highlightMotion.animate(to: values)
    } else {
      highlightMotion.jump(to: values)
    }
  }

  // MARK: geometry

  static let handleSize: CGFloat = 10

  var isPressingRecord: Bool {
    if case .pressingRecord(let inside) = drag { return inside }

    return false
  }

  func recordButtonRect() -> NSRect? {
    guard mode == .region, let selection else { return nil }

    switch drag {
    case nil, .pressingRecord: break
    default: return nil
    }

    let size = NSSize(width: 84, height: 28)
    var origin = NSPoint(x: selection.maxX - size.width, y: selection.minY - size.height - 10)
    let screen = NSScreen.screens.first { $0.frame.intersects(selection) } ?? NSScreen.screens[0]
    if origin.y < screen.frame.minY + 4 {
      origin.y = selection.minY + 10
    }

    return NSRect(origin: origin, size: size)
  }

  private func edges(at point: NSPoint, of rect: NSRect) -> Edges {
    let slop = Picker.handleSize
    guard rect.insetBy(dx: -slop, dy: -slop).contains(point) else { return [] }

    var edges: Edges = []
    if abs(point.x - rect.minX) <= slop { edges.insert(.left) }
    if abs(point.x - rect.maxX) <= slop { edges.insert(.right) }
    if abs(point.y - rect.minY) <= slop { edges.insert(.bottom) }
    if abs(point.y - rect.maxY) <= slop { edges.insert(.top) }

    return edges
  }

  private func grabOffset(_ point: NSPoint, edges: Edges, of rect: NSRect) -> NSPoint {
    NSPoint(
      x: point.x - (edges.contains(.left) ? rect.minX : rect.maxX),
      y: point.y - (edges.contains(.bottom) ? rect.minY : rect.maxY))
  }

  private func resized(_ original: NSRect, edges: Edges, to point: NSPoint) -> NSRect {
    var minX = original.minX, maxX = original.maxX, minY = original.minY, maxY = original.maxY
    if edges.contains(.left) { minX = min(point.x, maxX - 16) }
    if edges.contains(.right) { maxX = max(point.x, minX + 16) }
    if edges.contains(.bottom) { minY = min(point.y, maxY - 16) }
    if edges.contains(.top) { maxY = max(point.y, minY + 16) }

    return NSRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
  }

  private func screenFrame(containing point: NSPoint) -> NSRect {
    (NSScreen.screens.first { $0.frame.contains(point) } ?? NSScreen.screens[0]).frame
  }

  /// Past the display edge the selection resists instead of stopping dead.
  private func rubberbanded(_ rect: NSRect, within bounds: NSRect) -> NSRect {
    func axis(_ low: CGFloat, _ length: CGFloat, _ min: CGFloat, _ max: CGFloat) -> CGFloat {
      if low < min { return min - rubberband(min - low, dimension: length) }
      if low + length > max { return max - length + rubberband(low + length - max, dimension: length) }

      return low
    }

    return NSRect(
      x: axis(rect.minX, rect.width, bounds.minX, bounds.maxX),
      y: axis(rect.minY, rect.height, bounds.minY, bounds.maxY), width: rect.width, height: rect.height)
  }

  private func clamped(_ rect: NSRect, within bounds: NSRect) -> NSRect {
    NSRect(
      x: min(max(rect.minX, bounds.minX), bounds.maxX - rect.width),
      y: min(max(rect.minY, bounds.minY), bounds.maxY - rect.height), width: rect.width, height: rect.height)
  }

  // MARK: events (all points are global Cocoa coordinates)

  func updateHover(at point: NSPoint) {
    guard mode == .window else { return }

    let topLeft = CGPoint(x: point.x, y: Geometry.mainHeight - point.y)
    let next = windows.first { $0.bounds.contains(topLeft) }
    if next?.id != hovered?.id {
      hovered = next
      // The highlight glides to the next window instead of jumping.
      setHighlight(next.map { Geometry.toCocoa($0.bounds) }, animated: true)
    }
  }

  func mouseMoved(to point: NSPoint) {
    if mode == .window {
      updateHover(at: point)

      return
    }

    guard let selection else {
      NSCursor.crosshair.set()

      return
    }

    cursor(for: edges(at: point, of: selection), inside: selection.contains(point)).set()
  }

  private func cursor(for hit: Edges, inside: Bool) -> NSCursor {
    if hit == [.left] || hit == [.right] { return .resizeLeftRight }
    if hit == [.top] || hit == [.bottom] { return .resizeUpDown }
    if !hit.isEmpty { return .crosshair }

    return inside ? .openHand : .crosshair
  }

  func mouseDown(at point: NSPoint, clickCount: Int) {
    dragMoved = false
    if mode == .window {
      drag = .pressingWindow

      return
    }

    if let button = recordButtonRect(), button.contains(point) {
      drag = .pressingRecord(inside: true)
      redraw()

      return
    }

    if let selection {
      if clickCount == 2, selection.contains(point) {
        confirm()

        return
      }

      let hit = edges(at: point, of: selection)
      if !hit.isEmpty {
        drag = .resizing(edges: hit, original: selection, grab: grabOffset(point, edges: hit, of: selection))

        return
      }

      if selection.contains(point) {
        drag = .moving(offset: NSPoint(x: point.x - selection.minX, y: point.y - selection.minY))
        NSCursor.closedHand.set()

        return
      }
    }

    drag = .drawing(start: point)
  }

  func mouseDragged(to point: NSPoint) {
    dragMoved = true
    switch drag {
    case .drawing(let start):
      selection = NSRect(
        x: min(start.x, point.x), y: min(start.y, point.y),
        width: abs(start.x - point.x), height: abs(start.y - point.y))
    case .moving(let offset):
      guard let current = selection else { return }

      let raw = NSRect(origin: NSPoint(x: point.x - offset.x, y: point.y - offset.y), size: current.size)
      selection = rubberbanded(raw, within: screenFrame(containing: point))
    case .resizing(let edges, let original, let grab):
      selection = resized(original, edges: edges, to: NSPoint(x: point.x - grab.x, y: point.y - grab.y))
    case .pressingRecord:
      // Drag away to cancel, back to re-arm; 10pt of slack around the button.
      let inside = recordButtonRect()?.insetBy(dx: -10, dy: -10).contains(point) ?? false
      drag = .pressingRecord(inside: inside)
      redraw()

      return
    case .pressingWindow, nil:
      return
    }

    // The pointer drives the selection directly: track it 1:1.
    setHighlight(selection, animated: false)
  }

  func mouseUp(at point: NSPoint) {
    // A stray mouse-up whose mouse-down happened before the overlay appeared.
    guard let finished = drag else { return }

    drag = nil
    switch finished {
    case .pressingRecord(let inside):
      redraw()
      if inside { confirm() }

      return
    case .pressingWindow:
      confirm()

      return
    case .drawing where !dragMoved || (selection.map { $0.width < 8 || $0.height < 8 } ?? true):
      selection = screenFrame(containing: point)
      setHighlight(selection, animated: true)
    case .moving:
      // Settle back inside the display from wherever the rubber band left it.
      if let current = selection {
        selection = clamped(current, within: screenFrame(containing: point))
        setHighlight(selection, animated: true)
      }
    default:
      break
    }

    mouseMoved(to: point)
    redraw()
  }

  func keyDown(_ event: NSEvent) {
    switch event.keyCode {
    case 53:
      finish(nil)
    case 36, 76:
      confirm()
    case 49:
      mode = mode == .region ? .window : .region
      hovered = nil
      if mode == .region {
        setHighlight(selection, animated: true)
      }
      updateHover(at: NSEvent.mouseLocation)
      mouseMoved(to: NSEvent.mouseLocation)
      redraw()
    default:
      break
    }
  }

  private func confirm() {
    switch mode {
    case .window:
      guard let hovered else { return }

      finish(PickResult(kind: "window", rect: Geometry.format(hovered.bounds), id: hovered.id))
    case .region:
      guard let selection else { return }

      finish(PickResult(kind: "region", rect: Geometry.format(Geometry.toTopLeft(selection)), id: nil))
    }
  }
}
