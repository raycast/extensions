@preconcurrency import AVFoundation
import AppKit

/// Runs a block on the main run loop. The scanner blocks inside NSApplication.run, nested in a
/// main-queue block, so DispatchQueue.main would never drain.
func onMainRunLoop(_ block: @escaping @Sendable () -> Void) {
  let loop = CFRunLoopGetMain()
  CFRunLoopPerformBlock(loop, CFRunLoopMode.commonModes.rawValue, block)
  CFRunLoopWakeUp(loop)
}

/// Non-activating panel. It never becomes key, so typing keeps going to the frontmost app.
final class ScannerPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

@MainActor
final class ScannerController: NSObject, NSWindowDelegate {
  private let options: ScannerOptions
  private let once: Bool
  private let panel: ScannerPanel
  private let previewView = NSView(frame: NSRect(x: 0, y: 50, width: 340, height: 240))
  private let boxView = ScanBoxView(frame: NSRect(x: 0, y: 0, width: 340, height: 240))
  private let resetButton = NSButton(title: "Reset Box", target: nil, action: nil)
  private let popup = NSPopUpButton(frame: NSRect(x: 10, y: 298, width: 235, height: 26))
  private let label = NSTextField(labelWithString: "")
  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(label: "barcode-scanner.session")
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var reader: FrameReader?
  private var devices: [AVCaptureDevice] = []
  private var currentDevice: AVCaptureDevice?
  private var userChoseCamera = false
  private var lastSeen: [String: Date] = [:]
  private var observers: [NSObjectProtocol] = []
  private var signalSources: [DispatchSourceSignal] = []
  private var finished = false
  private let stopFlag = StopFlag()
  private var typing = false
  private var didType = false
  private var promptedAccessibility = false
  private var warning: String?

  init(options: ScannerOptions, once: Bool) {
    self.options = options
    self.once = once
    panel = ScannerPanel(
      contentRect: NSRect(x: 0, y: 0, width: 340, height: 330),
      styleMask: [.titled, .closable, .utilityWindow, .nonactivatingPanel],
      backing: .buffered, defer: false)
    super.init()
    buildWindow()
  }

  // MARK: Run

  /// Shows the window and blocks until the scanner finishes. True when a code was typed.
  /// `onReady` runs once the window shows.
  func run(onReady: () -> Void = {}) -> Bool {
    NSApplication.shared.setActivationPolicy(.accessory)
    // Only the detached scanner owns its process. scanOnce runs inside the Raycast call.
    if !once { installSignalHandlers() }
    panel.orderFrontRegardless()
    onReady()
    checkAccessibility()
    requestCameraAccess()
    if once, options.timeoutSeconds > 0 {
      Timer.scheduledTimer(withTimeInterval: options.timeoutSeconds, repeats: false) { [weak self] _ in
        MainActor.assumeIsolated { self?.finish() }
      }
    }
    NSApplication.shared.run()
    return didType
  }

  func finish() {
    guard !finished else { return }
    finished = true
    stopFlag.set()
    removeSignalHandlers()
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    let session = session
    sessionQueue.async { session.stopRunning() }
    panel.delegate = nil
    panel.orderOut(nil)
    NSApplication.shared.stop(nil)
    // stop(_:) takes effect after the next event, so post a dummy one.
    if let event = NSEvent.otherEvent(
      with: .applicationDefined, location: .zero, modifierFlags: [], timestamp: 0,
      windowNumber: 0, context: nil, subtype: 0, data1: 0, data2: 0)
    {
      NSApplication.shared.postEvent(event, atStart: true)
    }
  }

  func windowWillClose(_ notification: Notification) { finish() }

  private func installSignalHandlers() {
    for sig in [SIGINT, SIGTERM] {
      signal(sig, SIG_IGN)
      let source = DispatchSource.makeSignalSource(signal: sig, queue: sessionQueue)
      source.setEventHandler { [weak self] in
        onMainRunLoop { MainActor.assumeIsolated { self?.finish() } }
      }
      source.resume()
      signalSources.append(source)
    }
  }

  private func removeSignalHandlers() {
    signalSources.forEach { $0.cancel() }
    signalSources.removeAll()
    if !once { [SIGINT, SIGTERM].forEach { signal($0, SIG_DFL) } }
  }

  // MARK: Window

  private func buildWindow() {
    panel.title = once ? "Scan Barcode Once" : "Barcode Scanner"
    panel.level = .floating
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.becomesKeyOnlyIfNeeded = true
    panel.isReleasedWhenClosed = false
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    panel.delegate = self

    let content = NSView(frame: NSRect(x: 0, y: 0, width: 340, height: 330))
    panel.contentView = content

    popup.target = self
    popup.action = #selector(cameraChanged)
    content.addSubview(popup)

    previewView.wantsLayer = true
    previewView.layer?.backgroundColor = NSColor.black.cgColor
    content.addSubview(previewView)

    resetButton.frame = NSRect(x: 250, y: 298, width: 80, height: 26)
    resetButton.bezelStyle = .rounded
    resetButton.controlSize = .small
    resetButton.target = self
    resetButton.action = #selector(resetBox)
    content.addSubview(resetButton)

    boxView.onChange = { [weak self] _ in self?.updateRegion() }
    previewView.addSubview(boxView)

    label.frame = NSRect(x: 10, y: 6, width: 320, height: 38)
    label.alignment = .center
    label.maximumNumberOfLines = 2
    label.cell?.truncatesLastVisibleLine = true
    show("Point the camera at a barcode")
    content.addSubview(label)

    if let screen = NSScreen.main {
      let frame = screen.visibleFrame
      panel.setFrameOrigin(
        NSPoint(x: frame.maxX - panel.frame.width - 20, y: frame.maxY - panel.frame.height - 20))
    }
  }

  /// Shows a status line or a read code. A permission warning stays until the scanner closes.
  private func show(_ text: String) {
    guard warning == nil else { return }
    label.lineBreakMode = .byTruncatingMiddle
    label.font = .monospacedSystemFont(ofSize: 13, weight: .medium)
    label.stringValue = text
  }

  private func showWarning(_ message: String) {
    warning = message
    label.lineBreakMode = .byWordWrapping
    label.font = .systemFont(ofSize: 12, weight: .medium)
    label.stringValue = message
  }

  private func flash() {
    boxView.flash()
  }

  @objc private func resetBox() { boxView.resetBox() }

  /// Converts the box (view space) to Vision's normalized, bottom-left image rect.
  /// The layer conversion handles aspect-fill cropping and mirroring.
  private func updateRegion() {
    guard let layer = previewLayer, let reader else { return }
    let box = boxView.box
    let rect = CGRect(
      x: box.minX * previewView.bounds.width, y: box.minY * previewView.bounds.height,
      width: box.width * previewView.bounds.width, height: box.height * previewView.bounds.height)
    // previewView is not flipped, so convert the flipped box to layer coordinates first.
    let layerRect = CGRect(
      x: rect.minX, y: previewView.bounds.height - rect.maxY, width: rect.width, height: rect.height)
    let meta = layer.metadataOutputRectConverted(fromLayerRect: layerRect)
    let unit = CGRect(x: 0, y: 0, width: 1, height: 1)
    let clipped = meta.intersection(unit)
    guard !clipped.isNull, clipped.width > 0, clipped.height > 0 else { return }
    reader.setRegion(
      CGRect(x: clipped.minX, y: 1 - clipped.maxY, width: clipped.width, height: clipped.height))
  }

  // MARK: Permissions

  /// Checks Accessibility before the first code. Opens System Settings at most once per run.
  private func checkAccessibility() {
    guard !Typing.isTrusted else { return }
    showWarning(ScannerError.accessibility)
    guard !promptedAccessibility else { return }
    promptedAccessibility = true
    Typing.requestAccessibility()
  }

  private func requestCameraAccess() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      startCamera()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        onMainRunLoop {
          MainActor.assumeIsolated {
            if granted { self.startCamera() } else { self.showWarning(ScannerError.camera) }
          }
        }
      }
    default:
      showWarning(ScannerError.camera)
    }
  }

  // MARK: Camera

  private func startCamera() {
    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = previewView.bounds
    previewView.layer?.insertSublayer(layer, at: 0)
    previewLayer = layer

    let reader = FrameReader(symbologies: options.visionSymbologies) { [weak self] code in
      onMainRunLoop { MainActor.assumeIsolated { self?.handle(code: code) } }
    }
    self.reader = reader
    updateRegion()
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(reader, queue: reader.queue)
    session.beginConfiguration()
    if session.canAddOutput(output) { session.addOutput(output) }
    session.commitConfiguration()

    let center = NotificationCenter.default
    for name in [AVCaptureDevice.wasConnectedNotification, AVCaptureDevice.wasDisconnectedNotification] {
      observers.append(
        center.addObserver(forName: name, object: nil, queue: nil) { [weak self] _ in
          onMainRunLoop { MainActor.assumeIsolated { self?.refreshDevices() } }
        })
    }
    refreshDevices()
  }

  private func refreshDevices() {
    devices = Cameras.discover()
    popup.removeAllItems()
    for device in devices { popup.addItem(withTitle: device.localizedName) }

    if devices.isEmpty {
      currentDevice = nil
      show(ScannerError.noCamera)
      return
    }
    let wantsContinuity = options.camera != "builtin"
    let continuityArrived = !userChoseCamera && wantsContinuity
      && devices.first(where: Cameras.isContinuity).map { $0.uniqueID != currentDevice?.uniqueID } == true
    let stillThere = currentDevice.map { current in devices.contains { $0.uniqueID == current.uniqueID } } ?? false
    if !stillThere || continuityArrived, let pick = Cameras.pick(from: devices, option: options.camera) {
      use(pick)
    } else if let current = currentDevice,
      let index = devices.firstIndex(where: { $0.uniqueID == current.uniqueID })
    {
      popup.selectItem(at: index)
    }
  }

  private func use(_ device: AVCaptureDevice) {
    guard let input = try? AVCaptureDeviceInput(device: device) else {
      show("Could not open \(device.localizedName).")
      return
    }
    let session = session
    session.beginConfiguration()
    session.inputs.forEach { session.removeInput($0) }
    if session.canAddInput(input) { session.addInput(input) }
    session.commitConfiguration()
    currentDevice = device
    if let index = devices.firstIndex(where: { $0.uniqueID == device.uniqueID }) {
      popup.selectItem(at: index)
    }
    sessionQueue.async { if !session.isRunning { session.startRunning() } }
    // The preview connection exists only after the input is added; update again once it is live.
    updateRegion()
    for delay in [0.3, 1.0] {
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
        MainActor.assumeIsolated { self?.updateRegion() }
      }
    }
    show(once ? "Scan one barcode" : "Point the camera at a barcode")
  }

  @objc private func cameraChanged() {
    let index = popup.indexOfSelectedItem
    guard devices.indices.contains(index) else { return }
    userChoseCamera = true
    use(devices[index])
  }

  // MARK: Codes

  private func handle(code: String) {
    guard !finished, !typing else { return }
    let now = Date()
    lastSeen = lastSeen.filter { now.timeIntervalSince($0.value) < options.dedupeSeconds }
    if !once, lastSeen[code] != nil {
      lastSeen[code] = now
      return
    }
    lastSeen[code] = now
    flash()

    let trusted = Typing.isTrusted
    if trusted, warning == ScannerError.accessibility { warning = nil }
    let text = Typing.prepare(code, options: options)
    show(text.replacingOccurrences(of: "\u{1D}", with: "<GS>"))

    guard trusted else {
      checkAccessibility()
      return
    }
    guard once else {
      Typing.type(text, suffix: options.suffix, stop: stopFlag)
      return
    }
    typing = true  // one code per run
    Typing.type(text, suffix: options.suffix, stop: stopFlag) { [weak self] complete in
      onMainRunLoop {
        MainActor.assumeIsolated {
          self?.didType = complete
          self?.finish()
        }
      }
    }
  }
}
