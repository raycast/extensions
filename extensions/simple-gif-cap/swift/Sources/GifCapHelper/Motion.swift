import AppKit

/// The user's motion and transparency settings. Read live: they can change while the helper runs.
enum Accessibility {
  static var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }
  static var reduceTransparency: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency }
  static var increaseContrast: Bool { NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast }
}

/// Spring parameters in Apple's terms: damping ratio (1 = no overshoot) and
/// response (seconds to reach the target, roughly; not a fixed duration).
struct SpringParameters {
  var damping: CGFloat = 1
  var response: CGFloat = 0.35

  static let standard = SpringParameters()
  /// Highlights following the pointer: quick and settled.
  static let snappy = SpringParameters(damping: 1, response: 0.22)
}

/// Animates a fixed set of values with independent springs.
///
/// Interruptible by design: `animate(to:)` keeps each channel's current value
/// and velocity and only changes the target, so a retarget mid-flight never jumps.
final class SpringAnimator {
  private(set) var values: [CGFloat]
  private var velocities: [CGFloat]
  private var targets: [CGFloat]
  private var parameters: SpringParameters
  private var timer: Timer?
  private var lastTick: CFTimeInterval = 0
  private var completion: (() -> Void)?
  private let onUpdate: ([CGFloat]) -> Void

  init(values: [CGFloat], parameters: SpringParameters = .standard, onUpdate: @escaping ([CGFloat]) -> Void) {
    self.values = values
    self.velocities = values.map { _ in 0 }
    self.targets = values
    self.parameters = parameters
    self.onUpdate = onUpdate
  }

  var isAnimating: Bool { timer != nil }

  func animate(
    to targets: [CGFloat], parameters: SpringParameters? = nil, completion: (() -> Void)? = nil
  ) {
    if let parameters { self.parameters = parameters }
    self.targets = targets
    self.completion = completion
    if Accessibility.reduceMotion {
      jump(to: targets)

      return
    }

    guard timer == nil else { return }

    lastTick = CACurrentMediaTime()
    let timer = Timer(timeInterval: 1.0 / 120, repeats: true) { [weak self] _ in self?.tick() }
    // .common keeps it running while the mouse is down (event tracking mode).
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  /// Sets values without animating, e.g. while tracking the pointer 1:1.
  func jump(to targets: [CGFloat]) {
    timer?.invalidate()
    timer = nil
    values = targets
    self.targets = targets
    velocities = targets.map { _ in 0 }
    onUpdate(values)
    finish()
  }

  private func finish() {
    let done = completion
    completion = nil
    done?()
  }

  private func tick() {
    let now = CACurrentMediaTime()
    var remaining = min(now - lastTick, 1.0 / 30)
    lastTick = now

    let stiffness = pow(2 * .pi / parameters.response, 2)
    let friction = 4 * .pi * parameters.damping / parameters.response
    // Small fixed substeps keep stiff springs stable.
    while remaining > 0 {
      let dt = CGFloat(min(remaining, 1.0 / 480))
      remaining -= Double(dt)
      for index in values.indices {
        let force = -stiffness * (values[index] - targets[index]) - friction * velocities[index]
        velocities[index] += force * dt
        values[index] += velocities[index] * dt
      }
    }

    let settled = values.indices.allSatisfy {
      abs(values[$0] - targets[$0]) < 0.05 && abs(velocities[$0]) < 0.5
    }
    if settled {
      jump(to: targets)

      return
    }

    onUpdate(values)
  }
}

/// Apple's rubber-band curve: the further past the bound, the less it follows.
func rubberband(_ overshoot: CGFloat, dimension: CGFloat, constant: CGFloat = 0.55) -> CGFloat {
  (overshoot * dimension * constant) / (dimension + constant * abs(overshoot))
}

/// Fades a window in or out. Opacity changes stay on with Reduce Motion: they do not move anything.
func fade(_ window: NSWindow, to alpha: CGFloat, duration: TimeInterval, completion: (() -> Void)? = nil) {
  NSAnimationContext.runAnimationGroup(
    { context in
      context.duration = duration
      context.timingFunction = CAMediaTimingFunction(name: alpha > window.alphaValue ? .easeOut : .easeIn)
      window.animator().alphaValue = alpha
    }, completionHandler: completion)
}

/// Dark HUD material for floating controls. Falls back to a solid surface with
/// Reduce Transparency, and adds a defined border with Increase Contrast.
func makeHUDBackground(frame: NSRect, cornerRadius: CGFloat) -> NSView {
  let view: NSView
  if Accessibility.reduceTransparency {
    view = NSView(frame: frame)
    view.wantsLayer = true
    view.layer?.backgroundColor = NSColor(white: 0.12, alpha: 1).cgColor
  } else {
    let material = NSVisualEffectView(frame: frame)
    material.material = .hudWindow
    material.blendingMode = .behindWindow
    material.state = .active
    material.appearance = NSAppearance(named: .darkAqua)
    material.wantsLayer = true
    view = material
  }

  view.layer?.cornerRadius = cornerRadius
  view.layer?.cornerCurve = .continuous
  view.layer?.masksToBounds = true
  // A bright top-edge hairline reads as light catching the material.
  view.layer?.borderWidth = Accessibility.increaseContrast ? 1.5 : 0.5
  view.layer?.borderColor = NSColor.white.withAlphaComponent(Accessibility.increaseContrast ? 0.7 : 0.18).cgColor

  return view
}

/// Text on a HUD material: white, a touch heavier and tracked out so it stays legible over anything.
final class HUDLabel: NSTextField {
  private let textFont: NSFont
  var color: NSColor = .white { didSet { text = stringValue } }

  override var alignment: NSTextAlignment {
    didSet { text = stringValue }
  }

  init(
    _ text: String, size: CGFloat, weight: NSFont.Weight = .semibold, monospacedDigits: Bool = false,
    rounded: Bool = false
  ) {
    var font: NSFont =
      monospacedDigits
      ? .monospacedDigitSystemFont(ofSize: size, weight: weight) : .systemFont(ofSize: size, weight: weight)
    if rounded, let descriptor = font.fontDescriptor.withDesign(.rounded) {
      font = NSFont(descriptor: descriptor, size: size) ?? font
    }
    textFont = font
    super.init(frame: .zero)
    isEditable = false
    isSelectable = false
    isBordered = false
    drawsBackground = false
    alignment = .center
    self.text = text
  }

  required init?(coder: NSCoder) { fatalError() }

  /// Size-specific tracking: tighter as text grows, slightly open when small.
  private var tracking: CGFloat {
    textFont.pointSize >= 20 ? textFont.pointSize * -0.02 : textFont.pointSize * 0.01
  }

  var text: String {
    get { stringValue }
    set {
      // Attributed text ignores `alignment` unless it carries a paragraph style.
      let paragraph = NSMutableParagraphStyle()
      paragraph.alignment = alignment
      attributedStringValue = NSAttributedString(
        string: newValue,
        attributes: [.font: textFont, .foregroundColor: color, .kern: tracking, .paragraphStyle: paragraph])
    }
  }
}

/// Light, physical confirmation on the trackpad for a committed action.
func confirmHaptic() {
  NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .now)
}
