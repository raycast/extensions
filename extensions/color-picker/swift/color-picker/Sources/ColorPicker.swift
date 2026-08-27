import AppKit
import RaycastSwiftMacros

private final class ColorPreviewView: NSView {
  private let font = NSFont.monospacedSystemFont(ofSize: 13, weight: .semibold)
  var color = NSColor.clear
  var foregroundColor = NSColor.white
  var text = ""

  override func draw(_ dirtyRect: NSRect) {
    super.draw(dirtyRect)

    let swatch = NSBezierPath(roundedRect: bounds.insetBy(dx: 0.5, dy: 0.5), xRadius: 7, yRadius: 7)
    color.setFill()
    swatch.fill()
    foregroundColor.withAlphaComponent(0.28).setStroke()
    swatch.lineWidth = 1
    swatch.stroke()

    let attributes: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: foregroundColor,
    ]
    let textSize = text.size(withAttributes: attributes)
    let textOrigin = NSPoint(
      x: (bounds.width - textSize.width) / 2,
      y: (bounds.height - textSize.height) / 2
    )
    text.draw(at: textOrigin, withAttributes: attributes)
  }
}

@MainActor
private final class LiveColorPreview {
  private static let size = NSSize(width: 92, height: 30)
  private static let cursorOffset: CGFloat = 58

  private let panel: NSPanel
  private let previewView: ColorPreviewView
  private var timer: Timer?

  init() {
    previewView = ColorPreviewView(frame: NSRect(origin: .zero, size: Self.size))

    panel = NSPanel(
      contentRect: NSRect(origin: .zero, size: Self.size),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    panel.contentView = previewView
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.ignoresMouseEvents = true
    panel.hidesOnDeactivate = false
    panel.level = .screenSaver
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
    panel.sharingType = .none
  }

  func start() {
    update()
    let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.update()
      }
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  func stop() {
    timer?.invalidate()
    timer = nil
    panel.orderOut(nil)
  }

  private func update() {
    guard let color = colorUnderCursor() else { return }

    let red = Int(round(color.redComponent * 255))
    let green = Int(round(color.greenComponent * 255))
    let blue = Int(round(color.blueComponent * 255))
    previewView.text = String(format: "#%02X%02X%02X", red, green, blue)
    previewView.color = color

    let luminance = 0.2126 * color.redComponent + 0.7152 * color.greenComponent + 0.0722 * color.blueComponent
    previewView.foregroundColor = luminance > 0.55 ? NSColor.black : NSColor.white
    previewView.needsDisplay = true

    positionPanel()
    panel.orderFrontRegardless()
  }

  private func colorUnderCursor() -> NSColor? {
    guard let cursor = CGEvent(source: nil)?.location,
      let image = CGWindowListCreateImage(
        CGRect(x: cursor.x, y: cursor.y, width: 1, height: 1),
        .optionOnScreenOnly,
        kCGNullWindowID,
        [.bestResolution, .boundsIgnoreFraming]
      )
    else { return nil }

    var pixel = [UInt8](repeating: 0, count: 4)
    let rendered = pixel.withUnsafeMutableBytes { bytes -> Bool in
      guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
        let context = CGContext(
          data: bytes.baseAddress,
          width: 1,
          height: 1,
          bitsPerComponent: 8,
          bytesPerRow: 4,
          space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
      else { return false }

      context.interpolationQuality = .none
      context.draw(image, in: CGRect(x: 0, y: 0, width: 1, height: 1))
      return true
    }
    guard rendered else { return nil }

    return NSColor(
      srgbRed: CGFloat(pixel[0]) / 255,
      green: CGFloat(pixel[1]) / 255,
      blue: CGFloat(pixel[2]) / 255,
      alpha: 1
    )
  }

  private func positionPanel() {
    let cursor = NSEvent.mouseLocation
    guard let screen = NSScreen.screens.first(where: { NSMouseInRect(cursor, $0.frame, false) }) else { return }

    var x = cursor.x - Self.size.width / 2
    var y = cursor.y - Self.cursorOffset - Self.size.height
    if y < screen.frame.minY + 8 {
      y = cursor.y + Self.cursorOffset
    }
    x = min(max(x, screen.frame.minX + 8), screen.frame.maxX - Self.size.width - 8)
    panel.setFrameOrigin(NSPoint(x: x, y: y))
  }
}

struct Color: Encodable {
  let red: Float
  let blue: Float
  let green: Float
  let alpha: Float
  let colorSpace: String
}

@MainActor
@raycast func pickColor() async -> Color? {
  let livePreview = LiveColorPreview()
  livePreview.start()

  let colorSampler = NSColorSampler()
  let sampledColor = await colorSampler.sample()
  livePreview.stop()

  guard let color = sampledColor?.usingColorSpace(.displayP3) else { return nil }

  return Color(
    red: Float(color.redComponent),
    blue: Float(color.blueComponent),
    green: Float(color.greenComponent),
    alpha: Float(color.alphaComponent),
    colorSpace: "p3"
  )
}
