import AppKit
import AVFoundation
import Foundation
import Vision

final class TitlebarHoverView: NSView {
  var onHoverChange: ((Bool) -> Void)?

  private var trackingAreaRef: NSTrackingArea?

  override func updateTrackingAreas() {
    if let trackingAreaRef {
      removeTrackingArea(trackingAreaRef)
    }

    let options: NSTrackingArea.Options = [.activeAlways, .inVisibleRect, .mouseEnteredAndExited]
    let trackingArea = NSTrackingArea(rect: .zero, options: options, owner: self, userInfo: nil)
    addTrackingArea(trackingArea)
    trackingAreaRef = trackingArea
    super.updateTrackingAreas()
  }

  override func mouseEntered(with event: NSEvent) {
    onHoverChange?(true)
    super.mouseEntered(with: event)
  }

  override func mouseExited(with event: NSEvent) {
    onHoverChange?(false)
    super.mouseExited(with: event)
  }
}

enum ScannerError: LocalizedError {
  case missingCommand
  case unknownCommand(String)
  case permissionDenied
  case noCameraAvailable
  case captureInputFailed
  case captureOutputFailed

  var errorDescription: String? {
    switch self {
    case .missingCommand:
      return "Missing command"
    case let .unknownCommand(name):
      return "Unknown command: \(name)"
    case .permissionDenied:
      return "Camera permission denied. Allow camera access in macOS Settings > Privacy & Security > Camera."
    case .noCameraAvailable:
      return "No camera device available"
    case .captureInputFailed:
      return "Failed to configure camera input"
    case .captureOutputFailed:
      return "Failed to configure video output"
    }
  }
}

final class ScannerDelegate: NSObject, NSApplicationDelegate, AVCaptureVideoDataOutputSampleBufferDelegate, NSWindowDelegate {
  var result: String?
  var startupError: Error?

  private var window: NSWindow?
  private let captureSession = AVCaptureSession()
  private var hasFinished = false
  private var isProcessingFrame = false
  private let sessionQueue = DispatchQueue(label: "raycast.qr.session")
  private let videoQueue = DispatchQueue(label: "raycast.qr.video")
  private var trafficLightControls: [NSButton] = []

  func applicationDidFinishLaunching(_ notification: Notification) {
    do {
      try ensureCameraAccess()
      try configureWindowAndCamera()
      NSApp.activate(ignoringOtherApps: true)
    } catch {
      startupError = error
      finish(with: nil)
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  func windowWillClose(_ notification: Notification) {
    finish(with: nil)
  }

  func windowDidBecomeKey(_ notification: Notification) {
    setTitlebarControlsVisible(false)
  }

  func windowDidResignKey(_ notification: Notification) {
    setTitlebarControlsVisible(true)
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    if hasFinished || isProcessingFrame {
      return
    }

    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }

    isProcessingFrame = true
    defer { isProcessingFrame = false }

    let request = VNDetectBarcodesRequest()
    request.symbologies = [.QR]

    let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])

    do {
      try handler.perform([request])
      if let value = (request.results ?? []).compactMap({ $0.payloadStringValue }).first, !value.isEmpty {
        DispatchQueue.main.async { [weak self] in
          self?.finish(with: value)
        }
      }
    } catch {
      // Ignore transient frame parsing errors.
    }
  }

  private func ensureCameraAccess() throws {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      return
    case .notDetermined:
      let semaphore = DispatchSemaphore(value: 0)
      var granted = false
      AVCaptureDevice.requestAccess(for: .video) { isGranted in
        granted = isGranted
        semaphore.signal()
      }
      semaphore.wait()
      if granted {
        return
      }
      throw ScannerError.permissionDenied
    default:
      throw ScannerError.permissionDenied
    }
  }

  private func configureWindowAndCamera() throws {
    guard let camera = AVCaptureDevice.default(for: .video) else {
      throw ScannerError.noCameraAvailable
    }

    let input: AVCaptureDeviceInput
    do {
      input = try AVCaptureDeviceInput(device: camera)
    } catch {
      throw ScannerError.captureInputFailed
    }

    captureSession.beginConfiguration()
    if captureSession.canSetSessionPreset(.hd1280x720) {
      captureSession.sessionPreset = .hd1280x720
    } else if captureSession.canSetSessionPreset(.high) {
      captureSession.sessionPreset = .high
    }

    guard captureSession.canAddInput(input) else {
      captureSession.commitConfiguration()
      throw ScannerError.captureInputFailed
    }
    captureSession.addInput(input)

    let videoOutput = AVCaptureVideoDataOutput()
    videoOutput.alwaysDiscardsLateVideoFrames = true
    videoOutput.setSampleBufferDelegate(self, queue: videoQueue)

    guard captureSession.canAddOutput(videoOutput) else {
      captureSession.commitConfiguration()
      throw ScannerError.captureOutputFailed
    }
    captureSession.addOutput(videoOutput)

    captureSession.commitConfiguration()

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 920, height: 620),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
      backing: .buffered,
      defer: false
    )
    window.title = "Raycast QR Scanner"
    window.titleVisibility = .hidden
    window.titlebarAppearsTransparent = true
    window.isMovableByWindowBackground = true
    window.backgroundColor = .black
    window.center()
    window.delegate = self
    self.window = window

    let contentView = NSView(frame: window.contentView?.bounds ?? .zero)
    contentView.wantsLayer = true
    contentView.autoresizingMask = [.width, .height]
    window.contentView = contentView

    let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
    previewLayer.videoGravity = .resizeAspectFill
    previewLayer.frame = contentView.bounds
    contentView.layer?.addSublayer(previewLayer)

    let hoverView = TitlebarHoverView(frame: NSRect(x: 0, y: contentView.bounds.height - 72, width: contentView.bounds.width, height: 72))
    hoverView.autoresizingMask = [.width, .minYMargin]
    hoverView.onHoverChange = { [weak self] isHovered in
      self?.setTitlebarControlsVisible(isHovered)
    }
    contentView.addSubview(hoverView)

    trafficLightControls = [
      window.standardWindowButton(.closeButton),
      window.standardWindowButton(.miniaturizeButton),
      window.standardWindowButton(.zoomButton),
    ].compactMap { $0 }
    setTitlebarControlsVisible(false)

    window.makeKeyAndOrderFront(nil)
    sessionQueue.async { [weak self] in
      guard let self, !self.hasFinished else {
        return
      }
      self.captureSession.startRunning()
    }
  }

  private func setTitlebarControlsVisible(_ visible: Bool) {
    for button in trafficLightControls {
      button.isHidden = !visible
      button.alphaValue = visible ? 1 : 0
    }
  }

  private func finish(with value: String?) {
    if hasFinished {
      return
    }
    hasFinished = true

    result = value
    sessionQueue.async { [captureSession] in
      if captureSession.isRunning {
        captureSession.stopRunning()
      }
    }
    activateRaycast()

    NSApp.stop(nil)
    let event = NSEvent.otherEvent(
      with: .applicationDefined,
      location: .zero,
      modifierFlags: [],
      timestamp: 0,
      windowNumber: 0,
      context: nil,
      subtype: 0,
      data1: 0,
      data2: 0
    )
    if let event {
      NSApp.postEvent(event, atStart: true)
    }
  }

  private func activateRaycast() {
    let bundleIdentifiers = ["com.raycast.macos", "com.raycast.MacOS"]
    for bundleIdentifier in bundleIdentifiers {
      if let raycast = NSRunningApplication.runningApplications(withBundleIdentifier: bundleIdentifier).first {
        raycast.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
        break
      }
    }
  }
}

func printJSON<T: Encodable>(_ value: T) throws {
  let data = try JSONEncoder().encode(value)
  FileHandle.standardOutput.write(data)
}

func runScanner() throws -> String? {
  let app = NSApplication.shared
  let delegate = ScannerDelegate()
  // Accessory apps can present windows without creating a Dock icon.
  app.setActivationPolicy(.accessory)
  app.delegate = delegate
  app.run()

  if let startupError = delegate.startupError {
    throw startupError
  }

  return delegate.result
}

func scanQRCode() throws -> String? {
  try runScanner()
}

func main() {
  do {
    let args = Array(CommandLine.arguments.dropFirst())
    guard let command = args.first else {
      throw ScannerError.missingCommand
    }
    switch command {
    case "scanQRCode":
      let result = try scanQRCode()
      try printJSON(result)
    default:
      throw ScannerError.unknownCommand(command)
    }
  } catch {
    let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    FileHandle.standardError.write(Data(message.utf8))
    exit(1)
  }
}

main()
