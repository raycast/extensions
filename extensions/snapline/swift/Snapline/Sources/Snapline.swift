import Cocoa
import RaycastSwiftMacros

class PixelSampler {
  private let pixelData: UnsafePointer<UInt8>
  private let imageWidth: Int
  private let imageHeight: Int
  private let bytesPerRow: Int
  let scaleFactor: CGFloat
  let screenLogicalHeight: CGFloat
  private let dataProvider: CGDataProvider

  init?(cgImage: CGImage, screen: NSScreen) {
    guard let dp = cgImage.dataProvider else { return nil }
    dataProvider = dp
    guard let data = dp.data else { return nil }

    pixelData = CFDataGetBytePtr(data)!
    imageWidth = cgImage.width
    imageHeight = cgImage.height
    bytesPerRow = cgImage.bytesPerRow
    scaleFactor = screen.backingScaleFactor
    screenLogicalHeight = screen.frame.height
  }

  private func toPhysical(_ logicalX: CGFloat, _ logicalY: CGFloat) -> (px: Int, py: Int) {
    let px = Int(logicalX * scaleFactor)
    let py = Int((screenLogicalHeight - logicalY) * scaleFactor)
    return (
      max(0, min(px, imageWidth - 1)),
      max(0, min(py, imageHeight - 1))
    )
  }

  private func toLogical(px: Int, py: Int) -> NSPoint {
    return NSPoint(
      x: CGFloat(px) / scaleFactor,
      y: screenLogicalHeight - CGFloat(py) / scaleFactor
    )
  }

  private func colorAtPhysical(px: Int, py: Int) -> (r: UInt8, g: UInt8, b: UInt8) {
    let offset = py * bytesPerRow + px * 4
    guard offset >= 0, offset + 2 < bytesPerRow * imageHeight else { return (0, 0, 0) }
    return (pixelData[offset + 2], pixelData[offset + 1], pixelData[offset])
  }

  private func luminanceAt(px: Int, py: Int) -> UInt8 {
    let c = colorAtPhysical(px: px, py: py)
    return UInt8((Int(c.r) * 77 + Int(c.g) * 150 + Int(c.b) * 29) >> 8)
  }

  private func isDifferentLuminance(_ a: UInt8, _ b: UInt8, threshold: Int) -> Bool {
    return abs(Int(a) - Int(b)) > threshold
  }

  func colorAt(logicalX: CGFloat, logicalY: CGFloat) -> (r: UInt8, g: UInt8, b: UInt8) {
    let (px, py) = toPhysical(logicalX, logicalY)
    return colorAtPhysical(px: px, py: py)
  }

  private func isDifferent(_ a: (r: UInt8, g: UInt8, b: UInt8), _ b: (r: UInt8, g: UInt8, b: UInt8), threshold: Int) -> Bool {
    return abs(Int(a.r) - Int(b.r)) + abs(Int(a.g) - Int(b.g)) + abs(Int(a.b) - Int(b.b)) > threshold
  }

  func findEdgeRight(from startX: CGFloat, to endX: CGFloat, at y: CGFloat, threshold: Int = 40) -> CGFloat {
    let bgColor = colorAt(logicalX: startX, logicalY: y)
    let (startPx, py) = toPhysical(startX, y)
    let (endPx, _) = toPhysical(endX, y)

    var px = startPx + 1
    while px <= endPx {
      let c = colorAtPhysical(px: px, py: py)
      if isDifferent(bgColor, c, threshold: threshold) {
        return CGFloat(px) / scaleFactor
      }
      px += 1
    }
    return endX
  }

  func findEdgeLeft(from startX: CGFloat, to endX: CGFloat, at y: CGFloat, threshold: Int = 40) -> CGFloat {
    let bgColor = colorAt(logicalX: startX, logicalY: y)
    let (startPx, py) = toPhysical(startX, y)
    let (endPx, _) = toPhysical(endX, y)

    var px = startPx - 1
    while px >= endPx {
      let c = colorAtPhysical(px: px, py: py)
      if isDifferent(bgColor, c, threshold: threshold) {
        return CGFloat(px) / scaleFactor
      }
      px -= 1
    }
    return endX
  }

  func findEdgeUp(from startY: CGFloat, to endY: CGFloat, at x: CGFloat, threshold: Int = 40) -> CGFloat {
    let bgColor = colorAt(logicalX: x, logicalY: startY)
    let (px, startPy) = toPhysical(x, startY)
    let (_, endPy) = toPhysical(x, endY)

    var py = startPy - 1
    while py >= endPy {
      let c = colorAtPhysical(px: px, py: py)
      if isDifferent(bgColor, c, threshold: threshold) {
        return screenLogicalHeight - CGFloat(py) / scaleFactor
      }
      py -= 1
    }
    return endY
  }

  func findEdgeDown(from startY: CGFloat, to endY: CGFloat, at x: CGFloat, threshold: Int = 40) -> CGFloat {
    let bgColor = colorAt(logicalX: x, logicalY: startY)
    let (px, startPy) = toPhysical(x, startY)
    let (_, endPy) = toPhysical(x, endY)

    var py = startPy + 1
    while py <= endPy {
      let c = colorAtPhysical(px: px, py: py)
      if isDifferent(bgColor, c, threshold: threshold) {
        return screenLogicalHeight - CGFloat(py) / scaleFactor
      }
      py += 1
    }
    return endY
  }

  func findSmartBoundingBox(in logicalRect: NSRect, tolerance: Int = 40) -> NSRect? {
    let (leftPx, topPy) = toPhysical(logicalRect.minX, logicalRect.maxY)
    let (rightPx, bottomPy) = toPhysical(logicalRect.maxX, logicalRect.minY)
    guard rightPx > leftPx, bottomPy > topPy else { return nil }

    let bg = colorAtPhysical(px: leftPx, py: topPy)

    var minX = rightPx, maxX = leftPx, minY = bottomPy, maxY = topPy

    for py in topPy...bottomPy {
      for px in leftPx...rightPx {
        if isDifferent(colorAtPhysical(px: px, py: py), bg, threshold: tolerance) {
          if px < minX { minX = px }
          if px > maxX { maxX = px }
          if py < minY { minY = py }
          if py > maxY { maxY = py }
        }
      }
    }

    guard maxX > minX, maxY > minY else { return nil }

    let tl = toLogical(px: minX, py: minY)
    let br = toLogical(px: maxX, py: maxY)
    return NSRect(x: tl.x, y: br.y, width: br.x - tl.x, height: tl.y - br.y)
  }
}

class OverlayView: NSView {
  var startPoint: NSPoint?
  var currentPoint: NSPoint?
  var smartRect: NSRect?
  var stabilizedSmartRect: NSRect?
  var screenshot: NSImage?
  var showCrosshair: Bool = true
  var mouseLocation: NSPoint = .zero
  var snappedRect: NSRect?
  var tickPhase: CGFloat = 0
  var completedRects: [NSRect] = []
  var animatingFrom: NSRect?
  var animatingTo: NSRect?
  var animationProgress: CGFloat = 0
  var animationStartTime: CFTimeInterval = 0
  static let animationDuration: CFTimeInterval = 0.25

  func updateSmartRect(_ newRect: NSRect?) {
    guard let newRect = newRect else {
      smartRect = nil
      stabilizedSmartRect = nil
      return
    }

    smartRect = newRect

    if let prev = stabilizedSmartRect {
      let lerp: CGFloat = 0.4
      let x = prev.origin.x * (1 - lerp) + newRect.origin.x * lerp
      let y = prev.origin.y * (1 - lerp) + newRect.origin.y * lerp
      let w = prev.width * (1 - lerp) + newRect.width * lerp
      let h = prev.height * (1 - lerp) + newRect.height * lerp
      stabilizedSmartRect = NSRect(x: x, y: y, width: w, height: h)
    } else {
      stabilizedSmartRect = newRect
    }
  }

  override func draw(_ dirtyRect: NSRect) {
    super.draw(dirtyRect)

    guard let context = NSGraphicsContext.current?.cgContext else { return }
    guard let screenshot = screenshot else { return }

    let screenFrame = NSScreen.main!.frame
    let imageRect = NSRect(x: 0, y: 0, width: screenFrame.width, height: screenFrame.height)
    screenshot.draw(in: imageRect)

    for rect in completedRects {
      let roundedPath = CGPath(roundedRect: rect, cornerWidth: 3, cornerHeight: 3, transform: nil)

      context.setFillColor(NSColor.systemRed.withAlphaComponent(0.15).cgColor)
      context.addPath(roundedPath)
      context.fillPath()

      context.setStrokeColor(NSColor.systemRed.cgColor)
      context.setLineWidth(1.0)
      context.addPath(roundedPath)
      context.strokePath()

      drawSmartBBoxLabels(context: context, rect: rect)
    }
    if let from = animatingFrom, let to = animatingTo {
      let t = easeOutCubic(animationProgress)
      let rect = lerpRect(from, to, t: t)
      let roundedPath = CGPath(roundedRect: rect, cornerWidth: 3, cornerHeight: 3, transform: nil)

      context.setFillColor(NSColor.systemRed.withAlphaComponent(0.15).cgColor)
      context.addPath(roundedPath)
      context.fillPath()

      context.setStrokeColor(NSColor.systemRed.cgColor)
      context.setLineWidth(1.0)
      context.addPath(roundedPath)
      context.strokePath()

      drawSmartBBoxLabels(context: context, rect: rect)
    }
    if let start = startPoint, let current = currentPoint {
      let dragRect = rectFromPoints(start, current)

      context.setFillColor(NSColor.systemRed.withAlphaComponent(0.05).cgColor)
      context.fill(dragRect)

      context.setStrokeColor(NSColor.systemRed.withAlphaComponent(0.3).cgColor)
      context.setLineWidth(1.0)
      context.setLineDash(phase: 0, lengths: [4, 4])
      context.stroke(dragRect)
      context.setLineDash(phase: 0, lengths: [])

      if let sr = stabilizedSmartRect, sr.width > 2, sr.height > 2 {
        context.setFillColor(NSColor.systemRed.withAlphaComponent(0.08).cgColor)
        context.fill(sr)

        context.setStrokeColor(NSColor.systemRed.cgColor)
        context.setLineWidth(1.0)
        context.stroke(sr)

        drawSegmentTicks(context: context, from: sr.minX, to: sr.maxX, fixed: sr.minY, isHorizontal: true)
        drawSegmentTicks(context: context, from: sr.minX, to: sr.maxX, fixed: sr.maxY, isHorizontal: true)
        drawSegmentTicks(context: context, from: sr.minY, to: sr.maxY, fixed: sr.minX, isHorizontal: false)
        drawSegmentTicks(context: context, from: sr.minY, to: sr.maxY, fixed: sr.maxX, isHorizontal: false)

        drawSmartBBoxLabels(context: context, rect: sr)
      } else {
        drawDimensionLabels(context: context, rect: dragRect)
      }

      if showCrosshair {
        drawCrosshairGuides(context: context, rect: dragRect)
      }
    } else if showCrosshair {
      drawSnappedCrosshair(context: context, at: mouseLocation, snapRect: snappedRect)
    }
  }

  func rectFromPoints(_ a: NSPoint, _ b: NSPoint) -> NSRect {
    let x = min(a.x, b.x)
    let y = min(a.y, b.y)
    let w = abs(b.x - a.x)
    let h = abs(b.y - a.y)
    return NSRect(x: x, y: y, width: w, height: h)
  }

  private func drawSmartBBoxLabels(context: CGContext, rect: NSRect) {
    let width = Int(round(rect.width))
    let height = Int(round(rect.height))

    if width > 0 {
      let label = "\(width)px"
      drawLabel(label, at: NSPoint(x: rect.midX, y: rect.maxY + 10), context: context)
    }

    if height > 0 {
      let label = "\(height)px"
      drawLabel(label, at: NSPoint(x: rect.maxX + 10, y: rect.midY), context: context)
    }

    if width > 20 && height > 20 {
      let combinedLabel = "\(width) \u{00D7} \(height)"
      drawLabel(combinedLabel, at: NSPoint(x: rect.midX, y: rect.midY), context: context, isLarge: true)
    }
  }

  private func drawDimensionLabels(context: CGContext, rect: NSRect) {
    let width = Int(rect.width)
    let height = Int(rect.height)

    if width > 0 {
      let label = "\(width)px"
      drawLabel(label, at: NSPoint(x: rect.midX, y: rect.maxY + 8), context: context)
    }

    if height > 0 {
      let label = "\(height)px"
      drawLabel(label, at: NSPoint(x: rect.maxX + 8, y: rect.midY), context: context)
    }

    if width > 30 && height > 20 {
      let combinedLabel = "\(width) \u{00D7} \(height)"
      drawLabel(combinedLabel, at: NSPoint(x: rect.midX, y: rect.midY), context: context, isLarge: true)
    }
  }

  private func drawLabel(_ text: String, at point: NSPoint, context: CGContext, isLarge: Bool = false) {
    let fontSize: CGFloat = isLarge ? 13 : 11
    let fontWeight: NSFont.Weight = isLarge ? .semibold : .medium
    let attrs: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: fontSize, weight: fontWeight),
      .foregroundColor: NSColor.white,
    ]
    let attrString = NSAttributedString(string: text, attributes: attrs)
    let size = attrString.size()

    let bgRect = NSRect(
      x: point.x - size.width / 2 - 6,
      y: point.y - size.height / 2 - 3,
      width: size.width + 12,
      height: size.height + 6
    )

    context.setFillColor(NSColor(white: 0.15, alpha: 0.85).cgColor)
    let path = CGPath(roundedRect: bgRect, cornerWidth: 4, cornerHeight: 4, transform: nil)
    context.addPath(path)
    context.fillPath()

    let textPoint = NSPoint(x: point.x - size.width / 2, y: point.y - size.height / 2)
    attrString.draw(at: textPoint)
  }

  private func drawSnappedCrosshair(context: CGContext, at point: NSPoint, snapRect: NSRect?) {
    if let sr = snapRect, sr.width > 2 || sr.height > 2 {
      context.setStrokeColor(NSColor.systemRed.withAlphaComponent(0.7).cgColor)
      context.setLineWidth(1.0)

      context.move(to: NSPoint(x: point.x, y: sr.minY))
      context.addLine(to: NSPoint(x: point.x, y: sr.maxY))
      context.move(to: NSPoint(x: sr.minX, y: point.y))
      context.addLine(to: NSPoint(x: sr.maxX, y: point.y))
      context.strokePath()

      drawSegmentTicks(context: context, from: sr.minX, to: sr.maxX, fixed: point.y, isHorizontal: true)
      drawSegmentTicks(context: context, from: sr.minY, to: sr.maxY, fixed: point.x, isHorizontal: false)
    } else {
      context.setStrokeColor(NSColor.systemRed.withAlphaComponent(0.5).cgColor)
      context.setLineWidth(2)
      context.setLineDash(phase: 0, lengths: [4, 2])

      context.move(to: NSPoint(x: 0, y: point.y))
      context.addLine(to: NSPoint(x: bounds.width, y: point.y))
      context.move(to: NSPoint(x: point.x, y: 0))
      context.addLine(to: NSPoint(x: point.x, y: bounds.height))
      context.strokePath()

      context.setLineDash(phase: 0, lengths: [])
    }

    if let sr = snapRect, sr.width > 2 || sr.height > 2 {
      let w = Int(round(sr.width))
      let h = Int(round(sr.height))
      let dimText = "\(w) \u{00D7} \(h)"
      drawLabel(dimText, at: NSPoint(x: point.x + 14, y: point.y + 14), context: context)
    } else {
      let coordText = "\(Int(point.x)), \(Int(point.y))"
      drawLabel(coordText, at: NSPoint(x: point.x + 14, y: point.y + 14), context: context)
    }
  }

  private func drawSegmentTicks(context: CGContext, from: CGFloat, to: CGFloat, fixed: CGFloat, isHorizontal: Bool) {
    let spacing: CGFloat = 10
    let tickLen: CGFloat = 4
    let majorTickLen: CGFloat = 6
    let segmentLength = abs(to - from)
    guard segmentLength >= spacing else { return }

    let lo = min(from, to)
    let hi = max(from, to)
    let mid = (lo + hi) / 2.0
    let halfSpan = (hi - lo) / 2.0
    let animBoost = 0.1 * tickPhase

    context.setLineWidth(1.0)

    var pos = lo + spacing
    var idx = 1
    while pos < hi - 1 {
      let isMajor = idx % 5 == 0
      let len: CGFloat = isMajor ? majorTickLen : tickLen
      let halfLen = len / 2.0

      let distFromCenter = abs(pos - mid) / halfSpan
      let baseAlpha: CGFloat = isMajor ? 0.8 : 0.5
      let alpha = (baseAlpha + animBoost) * (1.0 - distFromCenter * 0.5)

      context.setStrokeColor(NSColor.systemRed.withAlphaComponent(alpha).cgColor)

      if isHorizontal {
        context.move(to: NSPoint(x: pos, y: fixed - halfLen))
        context.addLine(to: NSPoint(x: pos, y: fixed + halfLen))
      } else {
        context.move(to: NSPoint(x: fixed - halfLen, y: pos))
        context.addLine(to: NSPoint(x: fixed + halfLen, y: pos))
      }

      pos += spacing
      idx += 1
    }
    context.strokePath()
  }

  private func easeOutCubic(_ t: CGFloat) -> CGFloat {
    let p = t - 1
    return p * p * p + 1
  }

  private func lerpRect(_ a: NSRect, _ b: NSRect, t: CGFloat) -> NSRect {
    return NSRect(
      x: a.origin.x + (b.origin.x - a.origin.x) * t,
      y: a.origin.y + (b.origin.y - a.origin.y) * t,
      width: a.width + (b.width - a.width) * t,
      height: a.height + (b.height - a.height) * t
    )
  }

  private func drawCrosshairGuides(context: CGContext, rect: NSRect) {
    context.setStrokeColor(NSColor.systemCyan.withAlphaComponent(0.25).cgColor)
    context.setLineWidth(0.5)
    context.setLineDash(phase: 0, lengths: [2, 3])

    context.move(to: NSPoint(x: rect.minX, y: 0))
    context.addLine(to: NSPoint(x: rect.minX, y: bounds.height))
    context.move(to: NSPoint(x: rect.maxX, y: 0))
    context.addLine(to: NSPoint(x: rect.maxX, y: bounds.height))
    context.move(to: NSPoint(x: 0, y: rect.minY))
    context.addLine(to: NSPoint(x: bounds.width, y: rect.minY))
    context.move(to: NSPoint(x: 0, y: rect.maxY))
    context.addLine(to: NSPoint(x: bounds.width, y: rect.maxY))
    context.strokePath()

    context.setLineDash(phase: 0, lengths: [])
  }
}

class SnaplineWindow: NSWindow {
  private var overlayView: OverlayView?
  private var trackingArea: NSTrackingArea?
  private var isDragging = false
  private var sampler: PixelSampler?
  private var screenshotCGImage: CGImage?
  private var tickTimer: Timer?
  private var tickDirection: Bool = true
  private var edgeTolerance: Int = 40

  override var canBecomeKey: Bool { true }
  override var acceptsFirstResponder: Bool { true }
  override var isOpaque: Bool {
    get { false }
    set {}
  }

  func setup(showCrosshair: Bool, tolerance: Int = 40) {
    guard let screen = NSScreen.main else { return }
    let frame = screen.frame
    edgeTolerance = tolerance

    let cgImage = CGWindowListCreateImage(
      frame,
      .optionOnScreenOnly,
      kCGNullWindowID,
      [.bestResolution]
    )

    let view = OverlayView(frame: frame)
    view.showCrosshair = showCrosshair
    if let cgImage = cgImage {
      screenshotCGImage = cgImage
      view.screenshot = NSImage(cgImage: cgImage, size: frame.size)
      sampler = PixelSampler(cgImage: cgImage, screen: screen)
    }
    view.wantsLayer = true
    contentView = view
    overlayView = view

    backgroundColor = .clear
    hasShadow = false
    ignoresMouseEvents = false
    titleVisibility = .hidden
    titlebarAppearsTransparent = true
    level = .screenSaver
    setFrame(frame, display: true)
    makeKeyAndOrderFront(nil)
    makeFirstResponder(self)

    let options: NSTrackingArea.Options = [.activeAlways, .mouseMoved, .inVisibleRect, .cursorUpdate]
    let area = NSTrackingArea(rect: frame, options: options, owner: self, userInfo: nil)
    contentView?.addTrackingArea(area)
    trackingArea = area

    NSCursor.crosshair.set()

    let mouseScreen = NSEvent.mouseLocation
    let mouseInWindow = NSPoint(x: mouseScreen.x - frame.origin.x, y: mouseScreen.y - frame.origin.y)
    view.mouseLocation = mouseInWindow

    if let sampler = sampler {
      let leftEdge = sampler.findEdgeLeft(from: mouseInWindow.x, to: 0, at: mouseInWindow.y)
      let rightEdge = sampler.findEdgeRight(from: mouseInWindow.x, to: frame.width, at: mouseInWindow.y)
      let topEdge = sampler.findEdgeUp(from: mouseInWindow.y, to: frame.height, at: mouseInWindow.x)
      let bottomEdge = sampler.findEdgeDown(from: mouseInWindow.y, to: 0, at: mouseInWindow.x)
      view.snappedRect = NSRect(
        x: leftEdge, y: bottomEdge,
        width: rightEdge - leftEdge, height: topEdge - bottomEdge
      )
    }

    tickTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
      self?.animateTick()
    }
  }

  private func animateTick() {
    guard let view = overlayView else { return }
    let step: CGFloat = 0.03
    if tickDirection {
      view.tickPhase += step
      if view.tickPhase >= 1.0 {
        view.tickPhase = 1.0
        tickDirection = false
      }
    } else {
      view.tickPhase -= step
      if view.tickPhase <= 0.0 {
        view.tickPhase = 0.0
        tickDirection = true
      }
    }

    if view.animatingFrom != nil, view.animatingTo != nil {
      let elapsed = CACurrentMediaTime() - view.animationStartTime
      let progress = min(1.0, CGFloat(elapsed / OverlayView.animationDuration))
      view.animationProgress = progress
      if progress >= 1.0 {
        view.completedRects.append(view.animatingTo!)
        view.animatingFrom = nil
        view.animatingTo = nil
      }
    }

    view.needsDisplay = true
  }

  override func cursorUpdate(with event: NSEvent) {
    NSCursor.crosshair.set()
  }

  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {
      tickTimer?.invalidate()
      tickTimer = nil
      close()
      NSApplication.shared.terminate(nil)
    }
    super.keyDown(with: event)
  }

  override func mouseDown(with event: NSEvent) {
    let point = event.locationInWindow
    overlayView?.startPoint = point
    overlayView?.currentPoint = point
    overlayView?.smartRect = nil
    overlayView?.stabilizedSmartRect = nil
    isDragging = true
    overlayView?.needsDisplay = true
  }

  override func mouseDragged(with event: NSEvent) {
    guard isDragging else { return }
    overlayView?.currentPoint = event.locationInWindow
    overlayView?.needsDisplay = true
  }

  override func mouseUp(with event: NSEvent) {
    guard isDragging else { return }
    isDragging = false

    guard let start = overlayView?.startPoint, let end = overlayView?.currentPoint else { return }

    let dragRect = overlayView?.rectFromPoints(start, end) ?? NSRect.zero

    var finalRect = dragRect
    if let sampler = sampler, dragRect.width > 4 || dragRect.height > 4 {
      if let smart = sampler.findSmartBoundingBox(in: dragRect, tolerance: edgeTolerance) {
        finalRect = smart
      }
    }

    let width = Int(round(finalRect.width))
    let height = Int(round(finalRect.height))

    if width >= 2 || height >= 2 {
      overlayView?.animatingFrom = dragRect
      overlayView?.animatingTo = finalRect
      overlayView?.animationProgress = 0
      overlayView?.animationStartTime = CACurrentMediaTime()
      print("\(width)x\(height)")
    }

    overlayView?.startPoint = nil
    overlayView?.currentPoint = nil
    overlayView?.smartRect = nil
    overlayView?.stabilizedSmartRect = nil
    overlayView?.needsDisplay = true
  }

  override func mouseMoved(with event: NSEvent) {
    let point = event.locationInWindow
    overlayView?.mouseLocation = point

    if isDragging { return }

    if let sampler = sampler, let screen = NSScreen.main {
      let frame = screen.frame
      let leftEdge = sampler.findEdgeLeft(from: point.x, to: 0, at: point.y)
      let rightEdge = sampler.findEdgeRight(from: point.x, to: frame.width, at: point.y)
      let topEdge = sampler.findEdgeUp(from: point.y, to: frame.height, at: point.x)
      let bottomEdge = sampler.findEdgeDown(from: point.y, to: 0, at: point.x)

      overlayView?.snappedRect = NSRect(
        x: leftEdge,
        y: bottomEdge,
        width: rightEdge - leftEdge,
        height: topEdge - bottomEdge
      )
    }

    overlayView?.needsDisplay = true
  }
}

class Snapline: NSObject {
  static let shared = Snapline()

  func startMeasurement(showCrosshair: Bool = true, tolerance: Int = 40) {
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)

    let window = SnaplineWindow(
      contentRect: NSScreen.main!.frame,
      styleMask: [.borderless],
      backing: .buffered,
      defer: false
    )
    window.setup(showCrosshair: showCrosshair, tolerance: tolerance)

    app.activate(ignoringOtherApps: true)
    app.run()
  }
}

@raycast func measureScreen(showCrosshair: Bool = true, edgeTolerance: String = "40") {
  let tolerance = Int(edgeTolerance) ?? 40
  return Snapline.shared.startMeasurement(showCrosshair: showCrosshair, tolerance: tolerance)
}
