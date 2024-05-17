import Cocoa
import RaycastSwiftMacros

class RulerWindow: NSWindow {
  private var lineView: NSView?
  private var trackingArea: NSTrackingArea?
  private var isShiftKeyPressed: Bool = false
  private var coordinatesOverlay: NSView?
  private var coordinatesLabel: NSTextField?

  override var canBecomeKey: Bool {
    return true
  }

  override var acceptsFirstResponder: Bool {
    return true
  }

  override func flagsChanged(with event: NSEvent) {
    isShiftKeyPressed = event.modifierFlags.contains(.shift)
    super.flagsChanged(with: event)
  }

  override func keyUp(with event: NSEvent) {
    if event.keyCode == 56 {  // 56 is the key code for Shift
      isShiftKeyPressed = false
    }
    super.keyUp(with: event)
  }

  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {  // 53 is the key code for ESC
      NSApplication.shared.terminate(nil)
    } else {
      super.keyDown(with: event)
    }
  }

  override func mouseDragged(with event: NSEvent) {
    let point = convertToScreenCoordinates(event.locationInWindow)
    Ruler.shared.handleMouseDragged(to: point)

  }

  override func mouseUp(with event: NSEvent) {
    let point = convertToScreenCoordinates(event.locationInWindow)
    Ruler.shared.handleMouseUp(at: point)
  }

  override func mouseMoved(with event: NSEvent) {
    let point = convertToScreenCoordinates(event.locationInWindow)
    updateCoordinatesOverlay(at: point)
  }

  private func convertToScreenCoordinates(_ point: NSPoint) -> NSPoint {
    return NSPoint(x: point.x, y: point.y)
  }

  override var isOpaque: Bool {
    get {
      return false
    }
    set {}
  }

  func removeCoordinatesOverlay() {
    coordinatesOverlay?.removeFromSuperview()
    coordinatesOverlay = nil
  }

  private var distanceOverlay: NSView?

  private func createOverlay(at point: NSPoint, with text: String) -> NSView {
    let label = NSTextField(labelWithString: text)
    label.font = NSFont.systemFont(ofSize: 14, weight: .medium)
    label.textColor = NSColor.white
    label.sizeToFit()

    let labelWidth = label.frame.width + 20
    let labelHeight = label.frame.height + 10

    let overlay = NSView(
      frame: NSRect(x: point.x + 8, y: point.y + 8, width: labelWidth, height: labelHeight))
    overlay.wantsLayer = true
    overlay.layer?.cornerRadius = 15
    overlay.layer?.backgroundColor =
      NSColor(red: 0.25, green: 0.25, blue: 0.25, alpha: 1.0).cgColor

    label.frame = NSRect(
      x: 10, y: (labelHeight - label.frame.height) / 2, width: label.frame.width,
      height: label.frame.height)
    overlay.addSubview(label)

    return overlay
  }

  func drawStroke(from startPoint: NSPoint, to endPoint: NSPoint) {
    if lineView == nil {
      lineView = NSView(frame: NSZeroRect)
      lineView?.wantsLayer = true
      contentView?.addSubview(lineView!)
    }

    let distanceX = endPoint.x - startPoint.x
    let distanceY = endPoint.y - startPoint.y
    let distance = sqrt(pow(distanceX, 2) + pow(distanceY, 2))

    let angle = atan2(distanceY, distanceX)
    var angleInDegrees = angle * 180 / CGFloat.pi

    if isShiftKeyPressed {
      let degreeInterval: CGFloat = 10
      let remainder = angleInDegrees.truncatingRemainder(dividingBy: degreeInterval)
      angleInDegrees += remainder < degreeInterval / 2 ? -remainder : degreeInterval - remainder
    }

    let width = distance
    let height: CGFloat = 1
    let x = startPoint.x
    let y = startPoint.y

    lineView?.frame = NSRect(x: x, y: y, width: width, height: height)
    lineView?.layer?.anchorPoint = CGPoint(x: 0, y: 0.5)
    lineView?.layer?.position = CGPoint(x: x, y: y)
    lineView?.layer?.transform = CATransform3DMakeRotation(
      angleInDegrees * CGFloat.pi / 180, 0, 0, 1)

    // Change line color based on whether it's straight or not
    let isStraight = abs(distanceX) < 2 || abs(distanceY) < 2
    let isStraightByPressingShift =
      isShiftKeyPressed && abs(angleInDegrees).truncatingRemainder(dividingBy: 90) == 0

    if isStraight || isStraightByPressingShift {
      lineView?.layer?.backgroundColor = NSColor.green.cgColor
    } else {
      lineView?.layer?.backgroundColor = NSColor.red.cgColor
    }

    // Remove previous distance overlay if exists
    distanceOverlay?.removeFromSuperview()

    let distanceText = "\(Int(distance)) pixels"
    distanceOverlay = createOverlay(at: endPoint, with: distanceText)
    contentView?.addSubview(distanceOverlay!)
  }

  func removeLine() {
    self.lineView?.removeFromSuperview()
    self.lineView = nil
  }

  func setupTrackingArea() {
    if let trackingArea = self.trackingArea {
      self.contentView?.removeTrackingArea(trackingArea)
    }

    let options: NSTrackingArea.Options = [
      .activeAlways, .mouseMoved, .inVisibleRect, .cursorUpdate,
    ]
    let trackingArea = NSTrackingArea(
      rect: self.contentView?.bounds ?? NSZeroRect, options: options, owner: self, userInfo: nil)
    self.contentView?.addTrackingArea(trackingArea)
    self.trackingArea = trackingArea
  }

  override func cursorUpdate(with event: NSEvent) {
    NSCursor.crosshair.set()
  }

  private func updateCoordinatesOverlay(at point: NSPoint) {
    // Remove the previous coordinates overlay if it exists
    coordinatesOverlay?.removeFromSuperview()

    let coordinatesText = "\(Int(point.x)) × \(Int(point.y))"
    coordinatesOverlay = createOverlay(at: point, with: coordinatesText)
    contentView?.addSubview(coordinatesOverlay!)
  }
}

class Ruler: NSObject {
  static let shared = Ruler()

  private var startPoint: NSPoint?
  private var endPoint: NSPoint?
  private var rulerWindow: RulerWindow?

  private override init() {
    super.init()
  }

  func measureDistance() {
    let application = NSApplication.shared
    application.setActivationPolicy(.accessory)

    // Get the main screen
    guard let mainScreen = NSScreen.main else {
      print("Failed to get the main screen")
      exit(1)
    }

    let screenFrame = mainScreen.frame

    let screenWidth = screenFrame.size.width
    let screenHeight = screenFrame.size.height

    let contentRect = NSRect(x: 0, y: 0, width: screenWidth, height: screenHeight)
    let styleMask: NSWindow.StyleMask = [
      .borderless
    ]
    let window = RulerWindow(
      contentRect: contentRect, styleMask: styleMask, backing: .buffered, defer: false)

    let bgColor = NSColor.blue

    window.backgroundColor = bgColor.withAlphaComponent(0.05)
    window.contentView?.wantsLayer = true
    window.contentView?.layer?.backgroundColor = NSColor.clear.cgColor
    window.center()
    window.level = .screenSaver
    // window should cover the entire screen
    window.setFrame(screenFrame, display: true)
    // entire screen should be clickable
    window.hasShadow = false
    window.ignoresMouseEvents = false
    // on mouseover do not show top bar
    window.titleVisibility = .hidden
    window.titlebarAppearsTransparent = true
    window.isOpaque = false

    // add dashed border
    window.contentView?.layer?.borderColor = NSColor.red.withAlphaComponent(0.5).cgColor
    window.contentView?.layer?.borderWidth = 1

    application.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    window.makeFirstResponder(window)

    rulerWindow = window
    rulerWindow?.setupTrackingArea()

    application.run()
  }

  func handleMouseDragged(to point: NSPoint) {
    guard let rulerWindow = rulerWindow else { return }

    if startPoint == nil {
      startPoint = point
      rulerWindow.drawStroke(from: point, to: point)
      rulerWindow.removeCoordinatesOverlay()
    } else {
      rulerWindow.drawStroke(from: startPoint!, to: point)
    }
  }

  func handleMouseUp(at point: NSPoint) {
    endPoint = point
    calculateDistance()
    NSApplication.shared.terminate(nil)
  }

  private func calculateDistance() {
    guard let startPoint = startPoint, let endPoint = endPoint else {
      return
    }

    let distanceX = endPoint.x - startPoint.x
    let distanceY = endPoint.y - startPoint.y
    let distance = sqrt(pow(distanceX, 2) + pow(distanceY, 2)).rounded()
    print(distance)
  }
}

@raycast func measureDistance() {
  return Ruler.shared.measureDistance()
}
