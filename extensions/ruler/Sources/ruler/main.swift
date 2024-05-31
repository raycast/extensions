import Cocoa

class RulerWindow: NSWindow {
  private var lineView: NSView?
  private var trackingArea: NSTrackingArea?
  private var isShiftKeyPressed: Bool = false

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

  override func mouseDown(with event: NSEvent) {
    let point = convertToScreenCoordinates(event.locationInWindow)
    Ruler.shared.handleMouseClick(at: point)
  }

  override func mouseMoved(with event: NSEvent) {
    let point = convertToScreenCoordinates(event.locationInWindow)
    Ruler.shared.handleMouseMoved(to: point)
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

  private var distanceOverlay: NSView?

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

    // Calculate the position of the distance label

    // Get the main screen
    guard let mainScreen = NSScreen.main else {
      print("Failed to get the main screen")
      exit(1)
    }

    // Get the screen's frame
    let screenFrame = mainScreen.frame

    // Remove previous distance overlay if exists
    distanceOverlay?.removeFromSuperview()

    // Create a transparent box overlay with the same length as the line but keep minimum width
    let overlayWidth = width > 80 ? width : 80
    let overlayHeight: CGFloat = 20  // Adjust the height as desired
    var overlayX = x + width / 2 - overlayWidth / 2
    let overlayY: CGFloat

    // if there is no space above the line, put the overlay below the line
    if y + height + overlayHeight < screenFrame.size.height {
      overlayY = y + height
    } else {
      overlayY = y - overlayHeight
    }

    // if last point is on the left side of the first point, put the overlay on the left side
    if endPoint.x < startPoint.x {
      overlayX = x - width / 2 - overlayWidth / 2
    }

    distanceOverlay = NSView(
      frame: NSRect(x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight))
    distanceOverlay?.wantsLayer = true
    distanceOverlay?.layer?.backgroundColor = NSColor.clear.cgColor

    // Add the overlay to the window's content view
    contentView?.addSubview(distanceOverlay!)

    // Calculate the distance and update the overlay's contents
    let distanceLabel = NSTextField(labelWithString: "\(distance.rounded()) pixels")
    distanceLabel.frame = distanceOverlay?.bounds ?? NSZeroRect
    distanceLabel.alignment = .center
    distanceLabel.textColor = NSColor.white
    distanceLabel.backgroundColor = NSColor.clear
    distanceOverlay?.addSubview(distanceLabel)
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

    // Get the screen's frame
    let screenFrame = mainScreen.frame

    // Retrieve the width and height
    let screenWidth = screenFrame.size.width
    let screenHeight = screenFrame.size.height

    let contentRect = NSRect(x: 0, y: 0, width: screenWidth, height: screenHeight)
    let styleMask: NSWindow.StyleMask = [
      .borderless
    ]
    let window = RulerWindow(
      contentRect: contentRect, styleMask: styleMask, backing: .buffered, defer: false)

    // Create a color with full opacity (1.0)
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

  func handleMouseClick(at point: NSPoint) {
    guard let rulerWindow = rulerWindow else {
      return
    }

    if startPoint == nil {
      startPoint = point
      rulerWindow.drawStroke(from: point, to: point)
    } else if endPoint == nil {
      endPoint = point
      calculateAndCopyDistance()
      NSApplication.shared.terminate(nil)
    }
  }

  func handleMouseMoved(to point: NSPoint) {
    guard let startPoint = startPoint, let rulerWindow = rulerWindow else {
      return
    }

    rulerWindow.drawStroke(from: startPoint, to: point)
  }

  private func copyToClipboard(_ string: String) {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    pasteboard.setString(string, forType: .string)
  }

  private func calculateAndCopyDistance() {
    guard let startPoint = startPoint, let endPoint = endPoint else {
      print("Invalid points")
      exit(1)
    }

    let distance: CGFloat = calculateDistance(from: startPoint, to: endPoint).rounded()

    print(distance)
  }

  private func calculateDistance(from startPoint: NSPoint, to endPoint: NSPoint) -> CGFloat {
    let distanceX = endPoint.x - startPoint.x
    let distanceY = endPoint.y - startPoint.y
    return sqrt(pow(distanceX, 2) + pow(distanceY, 2))
  }
}

let ruler = Ruler.shared
ruler.measureDistance()
