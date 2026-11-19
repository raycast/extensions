import AppKit

/// A uniform scale around the center of `bounds`. AppKit owns a view layer's
/// anchor point and position, so scale with a transform instead of re-anchoring.
func scaleAboutCenter(_ scale: CGFloat, in bounds: CGRect) -> CATransform3D {
  var transform = CATransform3DMakeTranslation(bounds.midX, bounds.midY, 0)
  transform = CATransform3DScale(transform, scale, scale, 1)

  return CATransform3DTranslate(transform, -bounds.midX, -bounds.midY, 0)
}

/// A critically damped Core Animation spring in Apple's damping/response terms.
func springAnimation(from: CATransform3D, to: CATransform3D, parameters: SpringParameters = .standard)
  -> CASpringAnimation
{
  let animation = CASpringAnimation(keyPath: "transform")
  animation.mass = 1
  animation.stiffness = pow(2 * .pi / parameters.response, 2)
  animation.damping = 4 * .pi * parameters.damping / parameters.response
  animation.fromValue = NSValue(caTransform3D: from)
  animation.toValue = NSValue(caTransform3D: to)
  animation.duration = animation.settlingDuration

  return animation
}

/// Draws one glyph so that it looks centered, not just its line box.
///
/// Horizontally it uses the glyph's visual center of mass (alpha-weighted
/// centroid of the rendered ink), so a "1" with its flag does not lean left.
/// Vertically it uses the ink bounds, since digits share a baseline and cap height.
final class OpticalGlyphView: NSView {
  private let font: NSFont
  var text = "" { didSet { needsDisplay = true } }

  init(frame: NSRect, font: NSFont) {
    self.font = font
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError() }

  private var attributed: NSAttributedString {
    NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: NSColor.white])
  }

  /// Ink bounds and centroid in line coordinates (origin on the baseline), measured from a 4x bitmap.
  private func measure() -> (ink: CGRect, centroid: CGPoint)? {
    let line = CTLineCreateWithAttributedString(attributed)
    let typographic = CTLineGetBoundsWithOptions(line, [])
    let scale: CGFloat = 4
    let width = Int(ceil(typographic.width * scale)) + 8
    let height = Int(ceil(typographic.height * scale)) + 8
    guard
      let context = CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
    else { return nil }

    context.scaleBy(x: scale, y: scale)
    context.setFillColor(gray: 1, alpha: 1)
    let origin = CGPoint(x: 1, y: 1 - typographic.minY)
    context.textPosition = origin
    CTLineDraw(line, context)
    guard let data = context.data?.assumingMemoryBound(to: UInt8.self) else { return nil }

    var total = 0.0, sumX = 0.0, sumY = 0.0
    var minX = width, maxX = 0, minY = height, maxY = 0
    for row in 0..<height {
      for column in 0..<width {
        let value = Double(data[row * width + column])
        guard value > 0 else { continue }

        total += value
        sumX += value * Double(column)
        sumY += value * Double(row)
        minX = min(minX, column)
        maxX = max(maxX, column)
        minY = min(minY, row)
        maxY = max(maxY, row)
      }
    }
    guard total > 0 else { return nil }

    // Bitmap rows run top-down; flip into the context's bottom-up space, then into line space.
    func toLine(_ x: Double, _ y: Double) -> CGPoint {
      CGPoint(x: CGFloat(x) / scale - origin.x, y: CGFloat(Double(height) - y) / scale - origin.y)
    }

    let low = toLine(Double(minX), Double(maxY + 1))
    let high = toLine(Double(maxX + 1), Double(minY))
    let ink = CGRect(x: low.x, y: low.y, width: high.x - low.x, height: high.y - low.y)

    return (ink, toLine(sumX / total, sumY / total))
  }

  override func draw(_ dirtyRect: NSRect) {
    guard !text.isEmpty, let (ink, centroid) = measure(), let context = NSGraphicsContext.current?.cgContext else {
      return
    }

    let baseline = CGPoint(x: bounds.midX - centroid.x, y: bounds.midY - ink.midY)
    context.textPosition = baseline
    CTLineDraw(CTLineCreateWithAttributedString(attributed), context)
  }
}

/// Countdown disc: HUD material with a large rounded number that settles in each second.
final class CountdownView: NSView {
  var onClick: (() -> Void)?
  private let number: OpticalGlyphView

  override init(frame: NSRect) {
    var font = NSFont.systemFont(ofSize: 64, weight: .semibold)
    if let rounded = font.fontDescriptor.withDesign(.rounded) {
      font = NSFont(descriptor: rounded, size: 64) ?? font
    }
    number = OpticalGlyphView(frame: NSRect(origin: .zero, size: frame.size), font: font)
    super.init(frame: frame)
    wantsLayer = true
    addSubview(makeHUDBackground(frame: bounds, cornerRadius: bounds.width / 2))
    number.wantsLayer = true
    addSubview(number)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

  func show(_ value: Int) {
    number.text = "\(value)"
    guard let layer = number.layer else { return }

    let fadeIn = CABasicAnimation(keyPath: "opacity")
    fadeIn.fromValue = 0
    fadeIn.toValue = 1
    fadeIn.duration = 0.18
    layer.add(fadeIn, forKey: "fade")
    // Each number arrives slightly large and settles, hinting at the count moving forward.
    if !Accessibility.reduceMotion {
      layer.add(
        springAnimation(from: scaleAboutCenter(1.25, in: number.bounds), to: CATransform3DIdentity),
        forKey: "settle")
    }
  }

  override func mouseDown(with event: NSEvent) {
    onClick?()
  }
}

/// Dashed outline around the recorded area.
final class FrameView: NSView {
  override func draw(_ dirtyRect: NSRect) {
    let rect = bounds.insetBy(dx: 2, dy: 2)
    if Accessibility.increaseContrast {
      NSColor.white.setStroke()
      let halo = NSBezierPath(rect: rect)
      halo.lineWidth = 5
      halo.stroke()
    }

    NSColor.systemRed.setStroke()
    let path = NSBezierPath(rect: rect)
    path.lineWidth = 3
    path.setLineDash([10, 6], count: 2, phase: 0)
    path.stroke()
  }
}

/// Red capsule button: highlights on press, acts on release inside, cancels when dragged away.
final class StopButton: NSView {
  var onPress: (() -> Void)?
  var isEnabled = true { didSet { alphaValue = isEnabled ? 1 : 0.5 } }
  private var pressed = false { didSet { updatePressed() } }
  private let title = HUDLabel("Stop", size: 13, weight: .semibold)

  override init(frame: NSRect) {
    super.init(frame: frame)
    wantsLayer = true
    layer?.cornerRadius = frame.height / 2
    layer?.cornerCurve = .continuous
    layer?.backgroundColor = NSColor.systemRed.cgColor
    title.frame = NSRect(x: 0, y: (frame.height - 17) / 2, width: frame.width, height: 17)
    addSubview(title)
  }

  required init?(coder: NSCoder) { fatalError() }

  override var mouseDownCanMoveWindow: Bool { false }
  override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

  private func updatePressed() {
    let color = pressed ? NSColor.systemRed.blended(withFraction: 0.25, of: .black) : NSColor.systemRed
    layer?.backgroundColor = color?.cgColor
    let scale: CGFloat = pressed && !Accessibility.reduceMotion ? 0.94 : 1
    NSAnimationContext.runAnimationGroup { context in
      context.duration = 0.1
      context.allowsImplicitAnimation = true
      layer?.transform = scaleAboutCenter(scale, in: bounds)
    }
  }

  override func mouseDown(with event: NSEvent) {
    guard isEnabled else { return }

    pressed = true
  }

  override func mouseDragged(with event: NSEvent) {
    guard isEnabled else { return }

    pressed = bounds.insetBy(dx: -10, dy: -10).contains(convert(event.locationInWindow, from: nil))
  }

  override func mouseUp(with event: NSEvent) {
    guard pressed else { return }

    pressed = false
    onPress?()
  }
}

/// Floating recording control: steady red dot, timer, Stop. Draggable, never takes focus.
final class PillPanel: NSPanel {
  var onStop: (() -> Void)?
  private let label = HUDLabel("0:00", size: 13, weight: .semibold, monospacedDigits: true)
  private let button = StopButton(frame: NSRect(x: 100, y: 6, width: 62, height: 28))

  init() {
    let size = NSSize(width: 168, height: 40)
    super.init(
      contentRect: NSRect(origin: .zero, size: size), styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered, defer: false)
    isOpaque = false
    backgroundColor = .clear
    hasShadow = true
    sharingType = overlaySharing
    // Above the dim overlay macOS draws outside a region recording.
    level = NSWindow.Level(rawValue: Int(CGShieldingWindowLevel()))
    isMovableByWindowBackground = true
    collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

    let background = makeHUDBackground(frame: NSRect(origin: .zero, size: size), cornerRadius: size.height / 2)
    contentView = background

    // Steady, like the system recording indicator: no blinking loop to distract.
    let dot = NSView(frame: NSRect(x: 16, y: 15, width: 10, height: 10))
    dot.wantsLayer = true
    dot.layer?.backgroundColor = NSColor.systemRed.cgColor
    dot.layer?.cornerRadius = 5
    background.addSubview(dot)

    label.alignment = .left
    label.frame = NSRect(x: 34, y: 11, width: 62, height: 18)
    background.addSubview(label)

    button.onPress = { [weak self] in self?.onStop?() }
    background.addSubview(button)
  }

  override var canBecomeKey: Bool { false }

  func setElapsed(_ seconds: Int, max: Int) {
    label.text = String(format: "%d:%02d", seconds / 60, seconds % 60)
    // Warn before the automatic stop, rather than stopping by surprise.
    label.color = max > 0 && max - seconds <= 5 ? .systemOrange : .white
  }

  func showSaving() {
    label.text = "Saving..."
    button.isEnabled = false
  }
}
