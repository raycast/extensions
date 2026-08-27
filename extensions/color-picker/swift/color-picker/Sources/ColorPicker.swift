import AppKit
import CoreMedia
import CoreVideo
import RaycastSwiftMacros
import ScreenCaptureKit

private struct RGBSample: Sendable {
  let red: UInt8
  let green: UInt8
  let blue: UInt8
}

private protocol LiveColorSampling: AnyObject, Sendable {
  func isCapturing(_ cursor: CGPoint) -> Bool
  func sample(at cursor: CGPoint) -> RGBSample?
  func switchDisplay(at cursor: CGPoint) async throws
  func stop() async
}

private func sampleColor(at cursor: CGPoint) -> RGBSample? {
  guard
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

  return RGBSample(red: pixel[0], green: pixel[1], blue: pixel[2])
}

@available(macOS 13.0, *)
private final class ScreenColorSampler: NSObject, LiveColorSampling, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
  private let lock = NSLock()
  private let outputQueue = DispatchQueue(label: "com.raycast.color-picker.preview", qos: .userInteractive)
  private var displays: [SCDisplay] = []
  private var activeDisplay: SCDisplay?
  private var latestFrame: CVPixelBuffer?
  private var stream: SCStream?
  private var isStopped = false

  func start(at cursor: CGPoint) async throws {
    let content = try await SCShareableContent.current
    guard let display = Self.display(containing: cursor, in: content.displays) else { return }

    let configuration = Self.configuration(for: display)
    let filter = SCContentFilter(display: display, excludingWindows: [])
    let stream = SCStream(filter: filter, configuration: configuration, delegate: self)
    try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: outputQueue)

    let shouldStart = locked {
      guard !isStopped else { return false }
      displays = content.displays
      activeDisplay = display
      self.stream = stream
      return true
    }
    guard shouldStart else { return }

    try await stream.startCapture()
    if locked({ isStopped }) {
      try? await stream.stopCapture()
    }
  }

  func switchDisplay(at cursor: CGPoint) async throws {
    let (displays, currentDisplayID, stream) = locked {
      (displays, activeDisplay?.displayID, stream)
    }

    guard let display = Self.display(containing: cursor, in: displays),
      display.displayID != currentDisplayID,
      let stream
    else { return }

    let configuration = Self.configuration(for: display)
    let filter = SCContentFilter(display: display, excludingWindows: [])
    try await stream.updateConfiguration(configuration)
    try await stream.updateContentFilter(filter)

    locked {
      activeDisplay = display
      latestFrame = nil
    }
  }

  func stop() async {
    let stream = locked {
      isStopped = true
      latestFrame = nil
      let stream = stream
      self.stream = nil
      return stream
    }

    try? await stream?.stopCapture()
  }

  func sample(at cursor: CGPoint) -> RGBSample? {
    lock.lock()
    guard let display = activeDisplay,
      display.frame.contains(cursor),
      let frame = latestFrame
    else {
      lock.unlock()
      return nil
    }

    CVPixelBufferLockBaseAddress(frame, .readOnly)
    defer {
      CVPixelBufferUnlockBaseAddress(frame, .readOnly)
      lock.unlock()
    }

    guard CVPixelBufferGetPixelFormatType(frame) == kCVPixelFormatType_32BGRA,
      let baseAddress = CVPixelBufferGetBaseAddress(frame)
    else { return nil }

    let width = CVPixelBufferGetWidth(frame)
    let height = CVPixelBufferGetHeight(frame)
    guard width > 0, height > 0, display.frame.width > 0, display.frame.height > 0 else { return nil }

    let relativeX = (cursor.x - display.frame.minX) / display.frame.width
    let relativeY = (cursor.y - display.frame.minY) / display.frame.height
    let x = min(max(Int(relativeX * CGFloat(width)), 0), width - 1)
    let y = min(max(Int(relativeY * CGFloat(height)), 0), height - 1)
    let pixel = baseAddress
      .advanced(by: y * CVPixelBufferGetBytesPerRow(frame) + x * 4)
      .assumingMemoryBound(to: UInt8.self)

    return RGBSample(red: pixel[2], green: pixel[1], blue: pixel[0])
  }

  func isCapturing(_ cursor: CGPoint) -> Bool {
    locked { activeDisplay?.frame.contains(cursor) == true }
  }

  func stream(
    _ stream: SCStream,
    didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
    of outputType: SCStreamOutputType
  ) {
    guard outputType == .screen,
      sampleBuffer.isValid,
      let attachments = CMSampleBufferGetSampleAttachmentsArray(
        sampleBuffer,
        createIfNecessary: false
      ) as? [[SCStreamFrameInfo: Any]],
      let statusRawValue = attachments.first?[.status] as? Int,
      SCFrameStatus(rawValue: statusRawValue) == .complete,
      let frame = sampleBuffer.imageBuffer
    else { return }

    lock.lock()
    latestFrame = frame
    lock.unlock()
  }

  func stream(_ stream: SCStream, didStopWithError error: Error) {
    lock.lock()
    latestFrame = nil
    lock.unlock()
  }

  private static func display(containing cursor: CGPoint, in displays: [SCDisplay]) -> SCDisplay? {
    displays.first { $0.frame.contains(cursor) }
  }

  private static func configuration(for display: SCDisplay) -> SCStreamConfiguration {
    let configuration = SCStreamConfiguration()
    configuration.width = CGDisplayPixelsWide(display.displayID)
    configuration.height = CGDisplayPixelsHigh(display.displayID)
    configuration.minimumFrameInterval = CMTime(value: 1, timescale: 60)
    configuration.queueDepth = 2
    configuration.pixelFormat = kCVPixelFormatType_32BGRA
    configuration.showsCursor = false
    configuration.colorSpaceName = CGColorSpace.sRGB
    return configuration
  }

  private func locked<T>(_ body: () throws -> T) rethrows -> T {
    lock.lock()
    defer { lock.unlock() }
    return try body()
  }
}

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
  private var streamSampler: (any LiveColorSampling)?
  private var isRunning = false
  private var isSampling = false
  private var isSwitchingDisplay = false

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
    panel.sharingType = .readOnly
  }

  func start() {
    isRunning = true
    if #available(macOS 13.0, *), let cursor = CGEvent(source: nil)?.location {
      let sampler = ScreenColorSampler()
      streamSampler = sampler
      Task {
        try? await sampler.start(at: cursor)
      }
    }
    update()
    let timer = Timer(timeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.update()
      }
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  func stop() {
    isRunning = false
    timer?.invalidate()
    timer = nil
    if let streamSampler {
      Task {
        await streamSampler.stop()
      }
    }
    streamSampler = nil
    panel.orderOut(nil)
  }

  private func update() {
    positionPanel()
    guard let cursor = CGEvent(source: nil)?.location else { return }

    if let streamSampler {
      if let sample = streamSampler.sample(at: cursor) {
        finishSampling(sample)
        return
      }

      if !streamSampler.isCapturing(cursor) {
        switchDisplayIfNeeded(streamSampler, cursor: cursor)
      }
    }

    guard !isSampling else { return }

    isSampling = true
    Task.detached(priority: .userInitiated) { [weak self] in
      let sample = sampleColor(at: cursor)
      await self?.finishSampling(sample)
    }
  }

  private func finishSampling(_ sample: RGBSample?) {
    isSampling = false
    guard isRunning, let sample else { return }

    let color = NSColor(
      srgbRed: CGFloat(sample.red) / 255,
      green: CGFloat(sample.green) / 255,
      blue: CGFloat(sample.blue) / 255,
      alpha: 1
    )
    previewView.text = String(format: "#%02X%02X%02X", sample.red, sample.green, sample.blue)
    previewView.color = color

    let luminance = 0.2126 * color.redComponent + 0.7152 * color.greenComponent + 0.0722 * color.blueComponent
    previewView.foregroundColor = luminance > 0.55 ? NSColor.black : NSColor.white
    previewView.needsDisplay = true

    panel.orderFrontRegardless()
  }

  private func switchDisplayIfNeeded(_ sampler: any LiveColorSampling, cursor: CGPoint) {
    guard !isSwitchingDisplay else { return }
    isSwitchingDisplay = true
    Task {
      try? await sampler.switchDisplay(at: cursor)
      isSwitchingDisplay = false
    }
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
