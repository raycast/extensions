import AVFoundation
import Cocoa

/// How much of the screen the preview window takes up.
enum WindowSize: String {
  case fullScreen
  case large
  case medium
  case small

  /// Smallest to largest, which is the order the arrow keys step through.
  static let ordered: [WindowSize] = [.small, .medium, .large, .fullScreen]

  init(preference: String) {
    self = WindowSize(rawValue: preference) ?? .fullScreen
  }

  /// Width of the window relative to the screen. Unused for `fullScreen`.
  var widthRatio: CGFloat {
    switch self {
    case .fullScreen: 1
    case .large: 0.5
    case .medium: 0.32
    case .small: 0.2
    }
  }

  var larger: WindowSize {
    guard let i = Self.ordered.firstIndex(of: self), i + 1 < Self.ordered.count else { return self }
    return Self.ordered[i + 1]
  }

  var smaller: WindowSize {
    guard let i = Self.ordered.firstIndex(of: self), i > 0 else { return self }
    return Self.ordered[i - 1]
  }

  /// Frame for this size, keeping the window centred on `center` when resizing an existing window.
  func frame(on screen: NSScreen, centeredOn center: NSPoint? = nil) -> NSRect {
    guard self != .fullScreen else { return screen.frame }
    // Windowed mode uses a 16:9 box.
    let width = (screen.frame.width * widthRatio).rounded()
    let height = (width * 9 / 16).rounded()
    let target = center ?? NSPoint(x: screen.frame.midX, y: screen.frame.midY)

    // Growing next to an edge would push the window off screen, so clamp it back in.
    let visible = screen.visibleFrame
    let x = min(max(target.x - width / 2, visible.minX), max(visible.maxX - width, visible.minX))
    let y = min(max(target.y - height / 2, visible.minY), max(visible.maxY - height, visible.minY))
    return NSRect(x: x, y: y, width: width, height: height)
  }
}

/// Shows the live camera feed and runs until the user closes it.
///
/// `AVCaptureVideoPreviewLayer` renders the feed through the standard macOS video path, so the
/// preview stays perfectly smooth — unlike pushing decoded frames into a Raycast `Detail` view.
@MainActor func runPreviewApp(
  mirror: Bool,
  fill: Bool,
  cameraId: String,
  cameraType: CameraType,
  windowSize: String,
  saveDirectory: String
) -> Never {
  let devices = discoverDevices()
  guard !devices.isEmpty else { exit(EXIT_FAILURE) }

  // A camera kind picked in the preferences wins; otherwise fall back to the one chosen with the
  // Select Default Camera command. Either way an unavailable camera lands on the first one.
  var startIndex = 0
  if cameraType == .selected {
    if !cameraId.isEmpty, let index = devices.firstIndex(where: { $0.uniqueID == cameraId }) {
      startIndex = index
    }
  } else if let index = devices.firstIndex(where: { cameraType.matches($0) }) {
    startIndex = index
  }

  let app = NSApplication.shared
  app.setActivationPolicy(.regular)
  let controller = AppController(
    devices: devices,
    startIndex: startIndex,
    mirror: mirror,
    fill: fill,
    size: WindowSize(preference: windowSize),
    destination: CaptureDestination(preference: saveDirectory)
  )
  app.delegate = controller
  app.run()
  exit(EXIT_SUCCESS)
}

/// Hosts the preview layer and forwards key presses.
final class CameraView: NSView {
  let previewLayer: AVCaptureVideoPreviewLayer
  let label: NSTextField
  /// Recording state and capture messages, pinned to the top-left corner.
  ///
  /// The text sits in its own view rather than drawing its own background: a single-line
  /// `NSTextField` positions its text on the baseline, so padding added to the field itself would
  /// push the text off centre.
  let badgeBackground: NSView
  let badge: NSTextField
  var onKey: ((UInt16) -> Void)?
  var onClick: (() -> Void)?

  var isCompact: Bool {
    didSet {
      guard isCompact != oldValue else { return }
      label.font = .systemFont(ofSize: Self.labelFontSize(isCompact: isCompact), weight: .medium)
      needsLayout = true
    }
  }

  /// Scale applied to the preview layer. The view clips, so this crops in on the centre.
  var zoom: CGFloat = 1 {
    didSet {
      guard zoom != oldValue else { return }
      needsLayout = true
    }
  }

  var isMirrored = false {
    didSet {
      guard isMirrored != oldValue else { return }
      needsLayout = true
    }
  }

  private static func labelFontSize(isCompact: Bool) -> CGFloat { isCompact ? 10 : 14 }

  init(previewLayer: AVCaptureVideoPreviewLayer, isCompact: Bool) {
    self.previewLayer = previewLayer
    self.label = NSTextField(labelWithString: "")
    self.badgeBackground = NSView()
    self.badge = NSTextField(labelWithString: "")
    self.isCompact = isCompact
    super.init(frame: .zero)
    wantsLayer = true
    layer?.backgroundColor = NSColor.black.cgColor
    layer?.addSublayer(previewLayer)

    label.textColor = .white
    label.backgroundColor = NSColor.black.withAlphaComponent(0.55)
    label.drawsBackground = true
    label.isBezeled = false
    label.isEditable = false
    label.isSelectable = false
    label.alignment = .center
    label.font = .systemFont(ofSize: Self.labelFontSize(isCompact: isCompact), weight: .medium)
    addSubview(label)

    badgeBackground.wantsLayer = true
    badgeBackground.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.65).cgColor
    badgeBackground.layer?.cornerRadius = 6
    badgeBackground.isHidden = true
    addSubview(badgeBackground)

    badge.drawsBackground = false
    badge.isBezeled = false
    badge.isEditable = false
    badge.isSelectable = false
    badge.alignment = .center
    badgeBackground.addSubview(badge)
  }

  /// Shows the recording state and capture messages in the top-left corner, where they are hard to
  /// miss — unlike the bottom bar, which is a long line of key hints.
  func setBadge(recording: Bool, message: String?) {
    let text = NSMutableAttributedString()
    let font = NSFont.systemFont(ofSize: isCompact ? 11 : 15, weight: .semibold)
    if recording {
      text.append(
        NSAttributedString(
          string: "● ", attributes: [.foregroundColor: NSColor.systemRed, .font: font]))
      text.append(
        NSAttributedString(
          string: "REC", attributes: [.foregroundColor: NSColor.white, .font: font])
      )
    }
    if let message {
      if recording {
        text.append(
          NSAttributedString(string: "   ", attributes: [.font: font]))
      }
      text.append(
        NSAttributedString(
          string: message, attributes: [.foregroundColor: NSColor.white, .font: font]))
    }
    badge.attributedStringValue = text
    badge.invalidateIntrinsicContentSize()
    badgeBackground.isHidden = text.length == 0
    needsLayout = true
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  override var acceptsFirstResponder: Bool { true }
  override func keyDown(with event: NSEvent) { onKey?(event.keyCode) }
  override func mouseDown(with event: NSEvent) { onClick?() }

  override func layout() {
    super.layout()
    // Resizing the window would otherwise animate the layer a frame behind the view.
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    // Setting bounds and position rather than frame, so the zoom transform scales about the centre.
    previewLayer.bounds = CGRect(origin: .zero, size: bounds.size)
    previewLayer.position = CGPoint(x: bounds.midX, y: bounds.midY)
    previewLayer.setAffineTransform(CGAffineTransform(scaleX: isMirrored ? -zoom : zoom, y: zoom))
    CATransaction.commit()

    let labelHeight: CGFloat = isCompact ? 20 : 30
    let bottomInset: CGFloat = isCompact ? 8 : 36
    label.frame = CGRect(x: 0, y: bottomInset, width: bounds.width, height: labelHeight)

    let inset: CGFloat = isCompact ? 10 : 20
    let paddingX: CGFloat = isCompact ? 8 : 12
    let paddingY: CGFloat = isCompact ? 4 : 7
    // Asking the field itself: `NSAttributedString.size()` reports less than the field lays out,
    // which cut the text off inside the badge.
    let fitting = badge.fittingSize
    let textWidth = min(ceil(fitting.width), bounds.width - inset * 2 - paddingX * 2)
    let textHeight = ceil(fitting.height)
    badgeBackground.frame = CGRect(
      x: inset,
      y: bounds.height - inset - textHeight - paddingY * 2,
      width: textWidth + paddingX * 2,
      height: textHeight + paddingY * 2
    )
    // Centred inside its background, rather than sitting on the field's own baseline.
    badge.frame = CGRect(x: paddingX, y: paddingY, width: textWidth, height: textHeight)
  }
}

enum KeyCode {
  static let escape: UInt16 = 53
  static let q: UInt16 = 12
  static let m: UInt16 = 46
  static let s: UInt16 = 1
  static let r: UInt16 = 15
  static let space: UInt16 = 49
  static let leftArrow: UInt16 = 123
  static let rightArrow: UInt16 = 124
  static let downArrow: UInt16 = 125
  static let upArrow: UInt16 = 126
  static let zero: UInt16 = 29
  static let minus: UInt16 = 27
  /// The `=` key, which is `+` with shift.
  static let equal: UInt16 = 24
  static let keypadPlus: UInt16 = 69
  static let keypadMinus: UInt16 = 78
}

final class PreviewWindow: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }
}

@MainActor final class AppController: NSObject, NSApplicationDelegate {
  let session = AVCaptureSession()
  let previewLayer: AVCaptureVideoPreviewLayer
  var devices: [AVCaptureDevice]
  var index: Int
  var mirror: Bool
  let fill: Bool
  var size: WindowSize
  var zoom: CGFloat = 1
  var window: PreviewWindow!
  var cameraView: CameraView!

  let videoOutput = AVCaptureVideoDataOutput()
  let destination: CaptureDestination
  private let frameGrabber = FrameGrabber()
  private let frameQueue = DispatchQueue(label: "camera-preview.frames")
  /// Shown in the label for a moment after a file is written, or fails to be.
  private var status: String?
  /// `AVCaptureMovieFileOutput.isRecording` only flips once recording actually begins, so the
  /// label would miss the first moments. Track the intent instead.
  private var isRecording = false
  /// Clears the current message; invalidated when a newer one takes its place.
  private var statusTimer: Timer?
  private var canCapturePhoto = false
  private var canRecord = false

  init(
    devices: [AVCaptureDevice],
    startIndex: Int,
    mirror: Bool,
    fill: Bool,
    size: WindowSize,
    destination: CaptureDestination
  ) {
    self.devices = devices
    self.index = startIndex
    self.mirror = mirror
    self.fill = fill
    self.size = size
    self.destination = destination
    self.previewLayer = AVCaptureVideoPreviewLayer(session: session)
    super.init()
    previewLayer.videoGravity = fill ? .resizeAspectFill : .resizeAspect
  }

  /// Writes the next frame as a JPEG.
  func takeSnapshot() {
    guard canCapturePhoto, videoOutput.connection(with: .video) != nil else {
      show(status: "Snapshot unavailable")
      return
    }
    guard destination.prepare() else {
      show(status: "Cannot write to save folder")
      return
    }
    // Say something before the shutter, so the key press is never silent.
    show(status: "Saving photo…")
    frameGrabber.savePhoto(to: destination.url(extension: "jpg")) { [weak self] saved in
      // Success needs no announcement: the badge going away is the signal that it finished.
      if saved {
        self?.clearStatus()
      } else {
        self?.show(status: "Could not save photo")
      }
    }
  }

  /// Starts recording, or stops the recording in progress.
  func toggleRecording() {
    if isRecording {
      isRecording = false
      frameGrabber.stopRecording()
      show(status: "Saving recording…")
      return
    }
    guard canRecord, videoOutput.connection(with: .video) != nil else {
      show(status: "Recording unavailable")
      return
    }
    guard destination.prepare() else {
      show(status: "Cannot write to save folder")
      return
    }
    let started = frameGrabber.startRecording(to: destination.url(extension: "mov")) {
      [weak self] saved in
      if saved {
        self?.clearStatus()
      } else {
        self?.show(status: "Could not save recording")
      }
    }
    guard started else {
      show(status: "Recording unavailable")
      return
    }
    isRecording = true
    updateBadge()
  }

  /// Puts a short message in the top-left badge and clears it again after a few seconds.
  ///
  /// A run-loop timer rather than `asyncAfter`, for the same reason the capture callbacks use the
  /// run loop: `NSApplication.run()` owns the main thread for the life of the preview.
  private func show(status message: String) {
    status = message
    updateBadge()
    statusTimer?.invalidate()
    let timer = Timer(timeInterval: 2.5, repeats: false) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.status = nil
        self?.updateBadge()
      }
    }
    RunLoop.main.add(timer, forMode: .common)
    statusTimer = timer
  }

  /// Drops the current message immediately, cancelling the timer that would have cleared it.
  private func clearStatus() {
    statusTimer?.invalidate()
    statusTimer = nil
    status = nil
    updateBadge()
  }

  private func updateBadge() {
    cameraView?.setBadge(recording: isRecording, message: status)
  }

  /// Finishes an in-flight recording before the app goes away. Terminating mid-write would leave
  /// a movie without its metadata — a file that exists but cannot be played.
  func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
    guard isRecording else { return .terminateNow }
    isRecording = false
    show(status: "Saving recording…")
    frameGrabber.stopRecording {
      onMainThread { sender.reply(toApplicationShouldTerminate: true) }
    }
    return .terminateLater
  }

  /// Mirroring is done with the preview layer's transform rather than
  /// `AVCaptureConnection.isVideoMirrored`, which does not reliably pick up changes made while the
  /// session is running. Some cameras mirror themselves by default, so that is turned off first.
  func applyMirror() {
    if let connection = previewLayer.connection, connection.isVideoMirroringSupported {
      connection.automaticallyAdjustsVideoMirroring = false
      connection.isVideoMirrored = false
    }
    cameraView?.isMirrored = mirror
    syncLook()
  }

  /// Captures are written with the same mirroring and zoom the preview is showing.
  private func syncLook() {
    frameGrabber.update(look: CaptureLook(mirror: mirror, zoom: zoom))
  }

  func toggleMirror() {
    mirror.toggle()
    applyMirror()
    updateLabel()
  }

  /// Zoom steps between 1× and 3×, cropping in on the centre of the frame.
  func setZoom(_ value: CGFloat) {
    zoom = min(max(value, 1), 3)
    cameraView?.zoom = zoom
    syncLook()
    updateLabel()
  }

  /// Moves `step` positions through the camera list, re-reading it first.
  ///
  /// The list is captured at launch, so a camera plugged in afterwards — or one that went away —
  /// would otherwise stay invisible until the preview is reopened.
  func stepDevice(by step: Int) {
    if refreshDevices() {
      selectDevice(from: index + step, step: step)
    } else {
      // The camera on screen is gone and `index` now points at its replacement. Stepping past it
      // would skip that replacement in one direction and land beyond it in the other.
      selectDevice(from: index, step: step)
    }
  }

  /// Re-reads the connected cameras, and reports whether the one on screen is still among them.
  /// When it is not, `index` is left pointing at the first camera as the replacement to try.
  private func refreshDevices() -> Bool {
    let currentId = devices.indices.contains(index) ? devices[index].uniqueID : nil
    let latest = discoverDevices()
    // Nothing connected at all: keep the stale list so the current picture stays up.
    guard !latest.isEmpty else { return true }
    devices = latest
    if let currentId, let found = latest.firstIndex(where: { $0.uniqueID == currentId }) {
      index = found
      return true
    }
    index = 0
    return false
  }

  /// Shows the camera at `start`, or the next one that opens when walking the list by `step`.
  ///
  /// A camera can disappear between being listed and being selected — an unplugged webcam, or an
  /// iPhone that stopped offering Continuity Camera. Skipping over those keeps the arrow keys
  /// moving instead of getting stuck on a camera that will never open. If none of them can be
  /// opened, whatever is already on screen keeps playing and this returns `false`.
  @discardableResult
  func selectDevice(from start: Int, step: Int) -> Bool {
    guard !devices.isEmpty else { return false }
    var candidate = (start + devices.count) % devices.count
    for _ in devices.indices {
      if activate(devices[candidate]) {
        index = candidate
        updateLabel()
        return true
      }
      candidate = (candidate + step + devices.count) % devices.count
    }
    return false
  }

  /// Makes `device` the session's input. Restores the previous input if the swap fails, so a
  /// failed switch never leaves the session without an input and the preview black.
  private func activate(_ device: AVCaptureDevice) -> Bool {
    guard let input = try? AVCaptureDeviceInput(device: device) else { return false }

    session.beginConfiguration()
    let previousInputs = session.inputs
    for existing in previousInputs { session.removeInput(existing) }
    guard session.canAddInput(input) else {
      for existing in previousInputs where session.canAddInput(existing) {
        session.addInput(existing)
      }
      session.commitConfiguration()
      return false
    }
    session.addInput(input)
    session.commitConfiguration()
    applyMirror()
    return true
  }

  func updateLabel() {
    let name = devices.isEmpty ? "No camera" : devices[index].localizedName
    let zoomText = zoom > 1 ? String(format: "  %.2g×", zoom) : ""
    let mirrorText = mirror ? "  mirrored" : ""
    // Recording state and capture messages live in the top-left badge, so the bottom bar stays a
    // stable line of hints.
    let switchHint = devices.count > 1 ? "   ←/→ Camera" : ""
    cameraView?.label.stringValue =
      "\(name)\(zoomText)\(mirrorText)\(switchHint)"
      + "   ↑/↓ Size   +/− Zoom   M Mirror   S Photo   R Rec   Esc Close"
  }

  /// Swaps the window between full screen and a floating window, in place.
  func applySize(_ newSize: WindowSize) {
    size = newSize

    let screen = window.screen ?? NSScreen.main ?? NSScreen.screens[0]
    let isFullScreen = newSize == .fullScreen
    // Resizing keeps the window where the user dragged it; entering full screen ignores that.
    let center = NSPoint(x: window.frame.midX, y: window.frame.midY)

    cameraView.isCompact = !isFullScreen

    if isFullScreen {
      window.isOpaque = true
      window.backgroundColor = .black
      window.level = .normal
      window.collectionBehavior = [.fullScreenPrimary, .canJoinAllSpaces]
      window.isMovableByWindowBackground = false
      window.hasShadow = false
      cameraView.layer?.cornerRadius = 0
      // A click anywhere closes the full-screen preview; there is nothing else to aim at.
      cameraView.onClick = { NSApp.terminate(nil) }
      NSApp.presentationOptions = [.hideDock, .hideMenuBar]
    } else {
      // A small window is meant to sit in a corner while you work, so keep it above other
      // windows and let it be dragged. Clicking must not close it or dragging would be useless.
      window.isOpaque = false
      window.backgroundColor = .clear
      window.level = .floating
      window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
      window.isMovableByWindowBackground = true
      window.hasShadow = true
      cameraView.layer?.cornerRadius = 12
      cameraView.onClick = nil
      NSApp.presentationOptions = []
    }

    window.setFrame(newSize.frame(on: screen, centeredOn: center), display: true)
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    let screen = NSScreen.main ?? NSScreen.screens[0]
    let initialSize = size

    window = PreviewWindow(
      contentRect: initialSize.frame(on: screen),
      styleMask: [.borderless],
      backing: .buffered,
      defer: false
    )
    window.backgroundColor = .black

    cameraView = CameraView(previewLayer: previewLayer, isCompact: initialSize != .fullScreen)
    cameraView.frame = window.contentLayoutRect
    cameraView.autoresizingMask = [.width, .height]
    cameraView.layer?.masksToBounds = true
    cameraView.onKey = { [weak self] code in
      guard let self else { return }
      switch code {
      case KeyCode.escape, KeyCode.q: NSApp.terminate(nil)
      case KeyCode.leftArrow: self.stepDevice(by: -1)
      case KeyCode.rightArrow, KeyCode.space: self.stepDevice(by: 1)
      case KeyCode.upArrow: self.applySize(self.size.larger)
      case KeyCode.downArrow: self.applySize(self.size.smaller)
      case KeyCode.m: self.toggleMirror()
      case KeyCode.s: self.takeSnapshot()
      case KeyCode.r: self.toggleRecording()
      case KeyCode.equal, KeyCode.keypadPlus: self.setZoom(self.zoom + 0.25)
      case KeyCode.minus, KeyCode.keypadMinus: self.setZoom(self.zoom - 0.25)
      case KeyCode.zero: self.setZoom(1)
      default: break
      }
    }
    window.contentView = cameraView
    applySize(initialSize)

    session.beginConfiguration()
    session.sessionPreset = .high
    // Remember what the session accepted, so S and R can say why nothing happened.
    videoOutput.alwaysDiscardsLateVideoFrames = true
    videoOutput.setSampleBufferDelegate(frameGrabber, queue: frameQueue)
    canCapturePhoto = session.canAddOutput(videoOutput)
    if canCapturePhoto { session.addOutput(videoOutput) }
    // Stills and recordings are both written from the same stream of frames.
    canRecord = canCapturePhoto
    session.commitConfiguration()
    // Every camera was listed but none of them opens — showing an empty window would just be a
    // black rectangle, so quit before it reaches the screen.
    guard selectDevice(from: index, step: 1) else { exit(EXIT_FAILURE) }
    session.startRunning()

    window.makeKeyAndOrderFront(nil)
    window.makeFirstResponder(cameraView)
    NSApp.activate(ignoringOtherApps: true)

    // Tell the parent the window is up — it holds the Raycast command open until this byte
    // arrives, so a failure above still surfaces as an error instead of nothing happening.
    FileHandle.standardOutput.write(Data([0x0A]))
  }
}
