import AppKit
import CoreImage
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum Orientation: String, Codable {
  case horizontal
  case vertical
}

struct CLIOptions {
  let inputPath: String?
  let inputClipboard: Bool
  let outputPath: String?
  let copyOutputToClipboard: Bool
  let overwrite: Bool
}

enum HelperError: LocalizedError {
  case missingValue(flag: String)
  case unknownArgument(String)
  case fileNotFound(String)
  case failedToLoadImage(String)
  case clipboardMissingImage
  case failedToCopyImageToClipboard
  case invalidSelection
  case failedToCreateContext
  case failedToCropSegment
  case failedToCreateDestination(String)
  case failedToWriteImage(String)

  var errorDescription: String? {
    switch self {
    case let .missingValue(flag):
      return "Missing value for \(flag)."
    case let .unknownArgument(argument):
      return "Unknown argument: \(argument)."
    case let .fileNotFound(path):
      return "File not found: \(path)."
    case let .failedToLoadImage(path):
      return "Could not load image: \(path)."
    case .clipboardMissingImage:
      return "Clipboard does not contain an image."
    case .failedToCopyImageToClipboard:
      return "Could not copy the edited image to clipboard."
    case .invalidSelection:
      return "Selection is invalid. Please select a smaller strip."
    case .failedToCreateContext:
      return "Could not allocate the bitmap context."
    case .failedToCropSegment:
      return "Failed to crop one of the image segments."
    case let .failedToCreateDestination(path):
      return "Could not create export destination at \(path)."
    case let .failedToWriteImage(path):
      return "Could not write output image to \(path)."
    }
  }
}

struct SuccessPayload: Encodable {
  let status = "success"
  let outputPath: String?
  let inputPath: String?
  let orientation: Orientation
  let removedPixels: Int
}

struct InputSource {
  let image: CGImage
  let inputURL: URL?
  let label: String
}

struct CancelledPayload: Encodable {
  let status = "cancelled"
}

let sharedCIContext = CIContext()

func croppedSegment(_ image: CIImage, rect: CGRect) -> CIImage {
  image
    .cropped(to: rect)
    .transformed(by: CGAffineTransform(translationX: -rect.minX, y: -rect.minY))
}

final class SelectionOverlayView: NSView {
  override var isFlipped: Bool { true }

  private var sourceImage: NSImage
  private var pixelSize: CGSize
  private var orientation: Orientation
  private var dragStart: CGPoint?
  private var zoomScale: CGFloat = 1.0
  private var panOffset: CGPoint = .zero
  private let minZoomScale: CGFloat = 1.0
  private let maxZoomScale: CGFloat = 12.0
  private let contentInset: CGFloat = 12.0

  var onSelectionCommitted: ((Range<Int>) -> Void)?

  private(set) var selectionRect: CGRect? {
    didSet {
      needsDisplay = true
    }
  }

  init(cgImage: CGImage, orientation: Orientation) {
    self.sourceImage = NSImage(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
    self.pixelSize = CGSize(width: cgImage.width, height: cgImage.height)
    self.orientation = orientation
    super.init(frame: .zero)
    wantsLayer = true
    layer?.backgroundColor = NSColor.black.cgColor
  }

  func setOrientation(_ orientation: Orientation) {
    guard self.orientation != orientation else {
      return
    }

    self.orientation = orientation
    dragStart = nil
    selectionRect = nil
  }

  func setImage(_ cgImage: CGImage) {
    sourceImage = NSImage(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
    pixelSize = CGSize(width: cgImage.width, height: cgImage.height)
    dragStart = nil
    selectionRect = nil
    zoomScale = 1.0
    panOffset = .zero
    needsDisplay = true
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  private var displayedImageRect: CGRect {
    let boundsRect = bounds.insetBy(dx: contentInset, dy: contentInset)
    guard pixelSize.width > 0, pixelSize.height > 0, boundsRect.width > 0, boundsRect.height > 0 else {
      return .zero
    }

    let baseScale = min(boundsRect.width / pixelSize.width, boundsRect.height / pixelSize.height)
    let fittedSize = CGSize(width: pixelSize.width * baseScale, height: pixelSize.height * baseScale)
    let scaledSize = CGSize(width: fittedSize.width * zoomScale, height: fittedSize.height * zoomScale)
    let clampedOffset = clampedPanOffset(for: scaledSize, in: boundsRect)
    return CGRect(
      x: boundsRect.midX - scaledSize.width / 2 + clampedOffset.x,
      y: boundsRect.midY - scaledSize.height / 2 + clampedOffset.y,
      width: scaledSize.width,
      height: scaledSize.height
    )
  }

  override func layout() {
    super.layout()
    panOffset = clampedPanOffset(for: displayedImageRect.size, in: bounds.insetBy(dx: contentInset, dy: contentInset))
  }

  override func draw(_ dirtyRect: NSRect) {
    NSColor(calibratedWhite: 0.08, alpha: 1.0).setFill()
    bounds.fill()

    let imageRect = displayedImageRect
    sourceImage.draw(in: imageRect, from: .zero, operation: .copy, fraction: 1.0, respectFlipped: true, hints: nil)

    guard let selectionRect else {
      return
    }

    let maskPath = NSBezierPath(rect: imageRect)
    maskPath.append(NSBezierPath(rect: selectionRect))
    maskPath.windingRule = .evenOdd
    NSColor.black.withAlphaComponent(0.48).setFill()
    maskPath.fill()

    NSColor.systemOrange.withAlphaComponent(0.16).setFill()
    selectionRect.fill()

    let borderPath = NSBezierPath(rect: selectionRect.insetBy(dx: 0.5, dy: 0.5))
    borderPath.lineWidth = 2
    NSColor.systemOrange.setStroke()
    borderPath.stroke()
  }

  override func mouseDown(with event: NSEvent) {
    let point = convert(event.locationInWindow, from: nil)
    let imageRect = displayedImageRect
    guard imageRect.contains(point) else {
      dragStart = nil
      selectionRect = nil
      return
    }

    dragStart = point
    updateSelection(to: point)
  }

  override func mouseDragged(with event: NSEvent) {
    guard dragStart != nil else {
      return
    }
    let point = convert(event.locationInWindow, from: nil)
    updateSelection(to: point)
  }

  override func mouseUp(with event: NSEvent) {
    guard dragStart != nil else {
      return
    }
    let point = convert(event.locationInWindow, from: nil)
    updateSelection(to: point)
    dragStart = nil

    guard let selectedRange = selectedPixelRange() else {
      return
    }

    onSelectionCommitted?(selectedRange)
    selectionRect = nil
  }

  override func magnify(with event: NSEvent) {
    guard dragStart == nil else {
      return
    }
    let point = convert(event.locationInWindow, from: nil)
    adjustZoom(multiplier: 1.0 + event.magnification, anchor: point)
  }

  override func scrollWheel(with event: NSEvent) {
    guard dragStart == nil else {
      super.scrollWheel(with: event)
      return
    }

    if event.hasPreciseScrollingDeltas {
      panOffset.x -= event.scrollingDeltaX
      panOffset.y -= event.scrollingDeltaY
      panOffset = clampedPanOffset(for: displayedImageRect.size, in: bounds.insetBy(dx: contentInset, dy: contentInset))
      needsDisplay = true
      return
    }

    let step: CGFloat = event.scrollingDeltaY > 0 ? 0.9 : 1.1
    let anchor = convert(event.locationInWindow, from: nil)
    adjustZoom(multiplier: step, anchor: anchor)
  }

  func selectedPixelRange() -> Range<Int>? {
    guard let selectionRect else {
      return nil
    }

    let imageRect = displayedImageRect
    guard imageRect.width > 0, imageRect.height > 0 else {
      return nil
    }

    switch orientation {
    case .horizontal:
      // In this flipped view, Y grows downward from the top edge.
      // Keep this range top-based to match what the user sees.
      let relativeStart = (selectionRect.minY - imageRect.minY) / imageRect.height
      let relativeEnd = (selectionRect.maxY - imageRect.minY) / imageRect.height
      return toPixelRange(start: relativeStart, end: relativeEnd, maxPixels: Int(pixelSize.height))
    case .vertical:
      let relativeStart = (selectionRect.minX - imageRect.minX) / imageRect.width
      let relativeEnd = (selectionRect.maxX - imageRect.minX) / imageRect.width
      return toPixelRange(start: relativeStart, end: relativeEnd, maxPixels: Int(pixelSize.width))
    }
  }

  private func updateSelection(to point: CGPoint) {
    guard let dragStart else {
      selectionRect = nil
      return
    }

    let imageRect = displayedImageRect
    guard imageRect.width > 0, imageRect.height > 0 else {
      selectionRect = nil
      return
    }

    let start = clamp(point: dragStart, inside: imageRect)
    let current = clamp(point: point, inside: imageRect)

    switch orientation {
    case .horizontal:
      let minY = min(start.y, current.y)
      let maxY = max(start.y, current.y)
      let height = maxY - minY
      if height < 1 {
        selectionRect = nil
      } else {
        selectionRect = CGRect(x: imageRect.minX, y: minY, width: imageRect.width, height: height)
      }
    case .vertical:
      let minX = min(start.x, current.x)
      let maxX = max(start.x, current.x)
      let width = maxX - minX
      if width < 1 {
        selectionRect = nil
      } else {
        selectionRect = CGRect(x: minX, y: imageRect.minY, width: width, height: imageRect.height)
      }
    }
  }

  private func clamp(point: CGPoint, inside rect: CGRect) -> CGPoint {
    CGPoint(
      x: min(max(point.x, rect.minX), rect.maxX),
      y: min(max(point.y, rect.minY), rect.maxY)
    )
  }

  private func toPixelRange(start: CGFloat, end: CGFloat, maxPixels: Int) -> Range<Int>? {
    guard maxPixels > 1 else {
      return nil
    }

    let clampedStart = min(max(start, 0), 1)
    let clampedEnd = min(max(end, 0), 1)
    var lowerBound = Int(floor(min(clampedStart, clampedEnd) * CGFloat(maxPixels)))
    var upperBound = Int(ceil(max(clampedStart, clampedEnd) * CGFloat(maxPixels)))

    lowerBound = min(max(lowerBound, 0), maxPixels - 1)
    upperBound = min(max(upperBound, lowerBound + 1), maxPixels)

    guard upperBound > lowerBound, upperBound - lowerBound < maxPixels else {
      return nil
    }
    return lowerBound ..< upperBound
  }

  private func adjustZoom(multiplier: CGFloat, anchor: CGPoint) {
    guard multiplier.isFinite, multiplier > 0 else {
      return
    }

    let imageRectBefore = displayedImageRect
    let relativeAnchor = normalizedPoint(anchor, in: imageRectBefore)

    let newZoom = min(max(zoomScale * multiplier, minZoomScale), maxZoomScale)
    guard abs(newZoom - zoomScale) > 0.0001 else {
      return
    }

    zoomScale = newZoom

    let imageRectAfter = displayedImageRect
    let anchorAfter = CGPoint(
      x: imageRectAfter.minX + relativeAnchor.x * imageRectAfter.width,
      y: imageRectAfter.minY + relativeAnchor.y * imageRectAfter.height
    )
    panOffset.x += anchor.x - anchorAfter.x
    panOffset.y += anchor.y - anchorAfter.y
    panOffset = clampedPanOffset(for: displayedImageRect.size, in: bounds.insetBy(dx: contentInset, dy: contentInset))
    needsDisplay = true
  }

  private func normalizedPoint(_ point: CGPoint, in rect: CGRect) -> CGPoint {
    guard rect.width > 0, rect.height > 0 else {
      return CGPoint(x: 0.5, y: 0.5)
    }
    return CGPoint(
      x: min(max((point.x - rect.minX) / rect.width, 0), 1),
      y: min(max((point.y - rect.minY) / rect.height, 0), 1)
    )
  }

  private func clampedPanOffset(for imageSize: CGSize, in viewport: CGRect) -> CGPoint {
    guard viewport.width > 0, viewport.height > 0 else {
      return .zero
    }

    let maxX = max((imageSize.width - viewport.width) / 2, 0)
    let maxY = max((imageSize.height - viewport.height) / 2, 0)
    return CGPoint(
      x: min(max(panOffset.x, -maxX), maxX),
      y: min(max(panOffset.y, -maxY), maxY)
    )
  }
}

struct EditingResult {
  let image: CGImage
  let orientation: Orientation
  let removedPixels: Int
}

struct EditorState {
  let image: CGImage
  let hasAppliedCutOut: Bool
  let lastRemovedPixels: Int
  let lastAppliedOrientation: Orientation
}

final class SelectionCoordinator: NSObject, NSWindowDelegate {
  private let overlayView: SelectionOverlayView
  private let orientationControl: NSSegmentedControl
  private let infoLabel: NSTextField
  private let applyButton: NSButton
  private let window: NSWindow
  private var currentImage: CGImage
  private var finalResult: EditingResult?
  private var currentOrientation: Orientation = .horizontal
  private var hasAppliedCutOut = false
  private var lastRemovedPixels = 0
  private var lastAppliedOrientation: Orientation = .horizontal
  private var undoStack: [EditorState] = []
  private var keyMonitor: Any?

  init(cgImage: CGImage, fileName: String) {
    currentImage = cgImage
    overlayView = SelectionOverlayView(cgImage: cgImage, orientation: .horizontal)
    orientationControl = NSSegmentedControl(labels: ["Horizontal", "Vertical"], trackingMode: .selectOne, target: nil, action: nil)
    infoLabel = NSTextField(labelWithString: "")
    applyButton = NSButton(title: "Apply", target: nil, action: nil)

    window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1020, height: 740),
      styleMask: [.titled, .closable, .resizable],
      backing: .buffered,
      defer: false
    )
    window.title = "Cut Out - \(fileName)"
    window.isReleasedWhenClosed = false
    window.center()

    super.init()

    window.delegate = self

    let contentView = NSView()
    contentView.translatesAutoresizingMaskIntoConstraints = false
    window.contentView = contentView

    overlayView.translatesAutoresizingMaskIntoConstraints = false
    orientationControl.translatesAutoresizingMaskIntoConstraints = false
    orientationControl.segmentStyle = .rounded
    orientationControl.selectedSegment = 0
    orientationControl.setToolTip("Switch to horizontal cut mode (H)", forSegment: 0)
    orientationControl.setToolTip("Switch to vertical cut mode (V)", forSegment: 1)
    orientationControl.target = self
    orientationControl.action = #selector(changeOrientation)

    infoLabel.translatesAutoresizingMaskIntoConstraints = false
    infoLabel.lineBreakMode = .byWordWrapping
    infoLabel.maximumNumberOfLines = 2
    infoLabel.font = NSFont.systemFont(ofSize: 12)
    infoLabel.textColor = .secondaryLabelColor
    infoLabel.stringValue = infoText(for: currentOrientation)

    let cancelButton = NSButton(title: "Cancel", target: self, action: #selector(cancelSelection))
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.keyEquivalent = "\u{1b}"

    applyButton.translatesAutoresizingMaskIntoConstraints = false
    applyButton.target = self
    applyButton.action = #selector(finishEditing)
    applyButton.isEnabled = false
    applyButton.keyEquivalent = "\r"

    let controlsStack = NSStackView(views: [orientationControl, NSView(), cancelButton, applyButton])
    controlsStack.translatesAutoresizingMaskIntoConstraints = false
    controlsStack.orientation = .horizontal
    controlsStack.spacing = 10
    controlsStack.alignment = .centerY
    controlsStack.setHuggingPriority(.defaultLow, for: .horizontal)

    let spacer = controlsStack.arrangedSubviews[1]
    spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

    contentView.addSubview(overlayView)
    contentView.addSubview(infoLabel)
    contentView.addSubview(controlsStack)

    NSLayoutConstraint.activate([
      overlayView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 14),
      overlayView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 14),
      overlayView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -14),
      overlayView.heightAnchor.constraint(greaterThanOrEqualToConstant: 460),

      infoLabel.topAnchor.constraint(equalTo: overlayView.bottomAnchor, constant: 10),
      infoLabel.leadingAnchor.constraint(equalTo: overlayView.leadingAnchor),
      infoLabel.trailingAnchor.constraint(equalTo: overlayView.trailingAnchor),

      controlsStack.topAnchor.constraint(equalTo: infoLabel.bottomAnchor, constant: 12),
      controlsStack.leadingAnchor.constraint(equalTo: overlayView.leadingAnchor),
      controlsStack.trailingAnchor.constraint(equalTo: overlayView.trailingAnchor),
      contentView.bottomAnchor.constraint(equalTo: controlsStack.bottomAnchor, constant: 14),
    ])

    overlayView.onSelectionCommitted = { [weak self] range in
      self?.applyCutOut(using: range)
    }
  }

  func runModal() -> EditingResult? {
    keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
      guard let self else {
        return event
      }

      if event.modifierFlags.intersection(.deviceIndependentFlagsMask).contains(.command),
         event.charactersIgnoringModifiers?.lowercased() == "z"
      {
        self.undoLastCutOut()
        return nil
      }

      let key = event.charactersIgnoringModifiers?.lowercased()
      switch key {
      case "h":
        self.setOrientation(.horizontal)
        return nil
      case "v":
        self.setOrientation(.vertical)
        return nil
      default:
        return event
      }
    }

    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    let response = NSApp.runModal(for: window)
    window.orderOut(nil)
    removeKeyMonitor()

    guard response == .OK else {
      return nil
    }
    return finalResult
  }

  @objc private func finishEditing() {
    guard hasAppliedCutOut else {
      NSSound.beep()
      return
    }

    finalResult = EditingResult(image: currentImage, orientation: lastAppliedOrientation, removedPixels: lastRemovedPixels)
    NSApp.stopModal(withCode: .OK)
  }

  @objc private func cancelSelection() {
    NSApp.stopModal(withCode: .cancel)
  }

  func windowWillClose(_ notification: Notification) {
    removeKeyMonitor()
    NSApp.stopModal(withCode: .cancel)
  }

  @objc private func changeOrientation() {
    let orientation: Orientation = orientationControl.selectedSegment == 1 ? .vertical : .horizontal
    setOrientation(orientation)
  }

  private func infoText(for orientation: Orientation) -> String {
    switch orientation {
    case .horizontal:
      return "Drag to remove a horizontal strip. Pinch or use mouse wheel to zoom, two-finger scroll to pan. Press Cmd+Z to undo, Enter to save, or Escape to cancel."
    case .vertical:
      return "Drag to remove a vertical strip. Pinch or use mouse wheel to zoom, two-finger scroll to pan. Press Cmd+Z to undo, Enter to save, or Escape to cancel."
    }
  }

  private func setOrientation(_ orientation: Orientation) {
    currentOrientation = orientation
    orientationControl.selectedSegment = orientation == .horizontal ? 0 : 1
    overlayView.setOrientation(currentOrientation)
    infoLabel.stringValue = infoText(for: currentOrientation)
  }

  private func applyCutOut(using range: Range<Int>) {
    do {
      let previousState = EditorState(
        image: currentImage,
        hasAppliedCutOut: hasAppliedCutOut,
        lastRemovedPixels: lastRemovedPixels,
        lastAppliedOrientation: lastAppliedOrientation
      )
      currentImage = try removeSection(from: currentImage, orientation: currentOrientation, pixelRange: range)
      undoStack.append(previousState)
      overlayView.setImage(currentImage)
      hasAppliedCutOut = true
      lastRemovedPixels = range.count
      lastAppliedOrientation = currentOrientation
      applyButton.isEnabled = true
      infoLabel.stringValue = "Removed \(range.count) px (\(currentOrientation.rawValue)). Continue selecting, then click Apply to save."
    } catch {
      NSSound.beep()
      infoLabel.stringValue = error.localizedDescription
    }
  }

  private func undoLastCutOut() {
    guard let previousState = undoStack.popLast() else {
      NSSound.beep()
      return
    }

    currentImage = previousState.image
    hasAppliedCutOut = previousState.hasAppliedCutOut
    lastRemovedPixels = previousState.lastRemovedPixels
    lastAppliedOrientation = previousState.lastAppliedOrientation
    overlayView.setImage(currentImage)
    applyButton.isEnabled = hasAppliedCutOut

    if hasAppliedCutOut {
      infoLabel.stringValue = "Undo complete. Last cut is now \(lastRemovedPixels) px (\(lastAppliedOrientation.rawValue))."
    } else {
      infoLabel.stringValue = infoText(for: currentOrientation)
    }
  }

  private func removeKeyMonitor() {
    if let keyMonitor {
      NSEvent.removeMonitor(keyMonitor)
      self.keyMonitor = nil
    }
  }
}

func parseCLIOptions() throws -> CLIOptions {
  var inputPath: String?
  var inputClipboard = false
  var outputPath: String?
  var copyOutputToClipboard = false
  var overwrite = false

  var index = 1
  while index < CommandLine.arguments.count {
    let argument = CommandLine.arguments[index]
    switch argument {
    case "--input":
      index += 1
      guard index < CommandLine.arguments.count else {
        throw HelperError.missingValue(flag: "--input")
      }
      inputPath = CommandLine.arguments[index]
    case "--output":
      index += 1
      guard index < CommandLine.arguments.count else {
        throw HelperError.missingValue(flag: "--output")
      }
      outputPath = CommandLine.arguments[index]
    case "--input-clipboard":
      inputClipboard = true
    case "--copy-output-to-clipboard":
      copyOutputToClipboard = true
    case "--overwrite":
      overwrite = true
    case "--help":
      printUsage()
      exit(EXIT_SUCCESS)
    default:
      throw HelperError.unknownArgument(argument)
    }
    index += 1
  }

  return CLIOptions(
    inputPath: inputPath,
    inputClipboard: inputClipboard,
    outputPath: outputPath,
    copyOutputToClipboard: copyOutputToClipboard,
    overwrite: overwrite
  )
}

func printUsage() {
  let usage = """
  Usage:
    CutOutHelper [--input /path/to/image | --input-clipboard] [--output /path/to/export] [--overwrite] [--copy-output-to-clipboard]

  Behavior:
    - If no input flag is provided, an image picker is shown.
    - If --overwrite is used, the source file is replaced (unless --output is also provided).
    - If --output is omitted and overwrite is false, a sibling file with -cutout suffix is created.
    - If --input-clipboard is used without output flags, the result stays in memory.
  """
  print(usage)
}

func promptForImageURL() -> URL? {
  let panel = NSOpenPanel()
  panel.canChooseFiles = true
  panel.canChooseDirectories = false
  panel.allowsMultipleSelection = false
  panel.title = "Select an Image"
  panel.prompt = "Open"
  panel.allowedContentTypes = [.image]
  panel.directoryURL = URL(fileURLWithPath: NSHomeDirectory())

  NSApp.activate(ignoringOtherApps: true)
  return panel.runModal() == .OK ? panel.url : nil
}

func loadCGImage(from inputURL: URL) throws -> CGImage {
  guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil) else {
    throw HelperError.failedToLoadImage(inputURL.path)
  }

  guard let rawImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw HelperError.failedToLoadImage(inputURL.path)
  }

  let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
  let orientationRaw = properties?[kCGImagePropertyOrientation] as? UInt32 ?? 1
  let orientation = CGImagePropertyOrientation(rawValue: orientationRaw) ?? .up

  let ciImage = CIImage(cgImage: rawImage).oriented(orientation)
  guard let normalizedImage = sharedCIContext.createCGImage(ciImage, from: ciImage.extent) else {
    throw HelperError.failedToCreateContext
  }

  return normalizedImage
}

func loadCGImageFromClipboard() throws -> CGImage {
  guard let image = NSImage(pasteboard: NSPasteboard.general) else {
    throw HelperError.clipboardMissingImage
  }

  var proposedRect = CGRect(origin: .zero, size: image.size)
  if let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) {
    return cgImage
  }

  guard
    let tiffData = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiffData),
    let cgImage = bitmap.cgImage
  else {
    throw HelperError.failedToLoadImage("clipboard")
  }

  return cgImage
}

func resolveInputSource(options: CLIOptions) throws -> InputSource? {
  if options.inputClipboard {
    return InputSource(image: try loadCGImageFromClipboard(), inputURL: nil, label: "Clipboard Image")
  }

  if let inputPath = options.inputPath {
    let expandedPath = (inputPath as NSString).expandingTildeInPath
    let url = URL(fileURLWithPath: expandedPath)
    guard FileManager.default.fileExists(atPath: url.path) else {
      throw HelperError.fileNotFound(url.path)
    }
    return InputSource(image: try loadCGImage(from: url), inputURL: url, label: url.lastPathComponent)
  }

  guard let pickedURL = promptForImageURL() else {
    return nil
  }
  return InputSource(image: try loadCGImage(from: pickedURL), inputURL: pickedURL, label: pickedURL.lastPathComponent)
}

func removeHorizontalSection(from image: CGImage, rangeFromTop: Range<Int>) throws -> CGImage {
  let width = image.width
  let height = image.height

  // UI selection is top-based. Convert to the bottom-based coordinate system used by CG/CI.
  let removeBottomY = height - rangeFromTop.upperBound
  let removeTopY = height - rangeFromTop.lowerBound
  let bottomHeight = removeBottomY
  let topHeight = height - removeTopY
  let outputHeight = topHeight + bottomHeight

  guard outputHeight > 0 else {
    throw HelperError.invalidSelection
  }

  let sourceCI = CIImage(cgImage: image)
  let outputRect = CGRect(x: 0, y: 0, width: width, height: outputHeight)
  var composed = CIImage(color: .clear).cropped(to: outputRect)

  if bottomHeight > 0 {
    let bottomRect = CGRect(x: 0, y: 0, width: width, height: bottomHeight)
    let bottomSegment = croppedSegment(sourceCI, rect: bottomRect)
    composed = bottomSegment.composited(over: composed)
  }

  if topHeight > 0 {
    let topRect = CGRect(x: 0, y: removeTopY, width: width, height: topHeight)
    let topSegment = croppedSegment(sourceCI, rect: topRect)
      .transformed(by: CGAffineTransform(translationX: 0, y: CGFloat(bottomHeight)))
    composed = topSegment.composited(over: composed)
  }

  guard let outputImage = sharedCIContext.createCGImage(composed.cropped(to: outputRect), from: outputRect) else {
    throw HelperError.failedToCreateContext
  }

  return outputImage
}

func removeVerticalSection(from image: CGImage, rangeFromLeft: Range<Int>) throws -> CGImage {
  let width = image.width
  let height = image.height
  let leftWidth = rangeFromLeft.lowerBound
  let rightWidth = width - rangeFromLeft.upperBound
  let outputWidth = leftWidth + rightWidth

  guard outputWidth > 0 else {
    throw HelperError.invalidSelection
  }

  let sourceCI = CIImage(cgImage: image)
  let outputRect = CGRect(x: 0, y: 0, width: outputWidth, height: height)
  var composed = CIImage(color: .clear).cropped(to: outputRect)

  if leftWidth > 0 {
    let leftRect = CGRect(x: 0, y: 0, width: leftWidth, height: height)
    let leftSegment = croppedSegment(sourceCI, rect: leftRect)
    composed = leftSegment.composited(over: composed)
  }

  if rightWidth > 0 {
    let rightRect = CGRect(x: rangeFromLeft.upperBound, y: 0, width: rightWidth, height: height)
    let rightSegment = croppedSegment(sourceCI, rect: rightRect)
      .transformed(by: CGAffineTransform(translationX: CGFloat(leftWidth), y: 0))
    composed = rightSegment.composited(over: composed)
  }

  guard let outputImage = sharedCIContext.createCGImage(composed.cropped(to: outputRect), from: outputRect) else {
    throw HelperError.failedToCreateContext
  }

  return outputImage
}

func removeSection(from image: CGImage, orientation: Orientation, pixelRange: Range<Int>) throws -> CGImage {
  switch orientation {
  case .horizontal:
    return try removeHorizontalSection(from: image, rangeFromTop: pixelRange)
  case .vertical:
    return try removeVerticalSection(from: image, rangeFromLeft: pixelRange)
  }
}

func makeDefaultOutputURL(inputURL: URL) -> URL {
  let directory = inputURL.deletingLastPathComponent()
  let basename = inputURL.deletingPathExtension().lastPathComponent
  let extensionName = inputURL.pathExtension.isEmpty ? "png" : inputURL.pathExtension

  var candidate = directory
    .appendingPathComponent("\(basename)-cutout")
    .appendingPathExtension(extensionName)

  var suffix = 2
  while FileManager.default.fileExists(atPath: candidate.path) {
    candidate = directory
      .appendingPathComponent("\(basename)-cutout-\(suffix)")
      .appendingPathExtension(extensionName)
    suffix += 1
  }

  return candidate
}

func resolveOutputURL(options: CLIOptions, inputURL: URL?) -> URL? {
  if let outputPath = options.outputPath {
    let expandedPath = (outputPath as NSString).expandingTildeInPath
    return URL(fileURLWithPath: expandedPath)
  }

  if options.overwrite, let inputURL {
    return inputURL
  }

  guard let inputURL else {
    return nil
  }

  return makeDefaultOutputURL(inputURL: inputURL)
}

func destinationType(for outputURL: URL) -> UTType {
  if let type = UTType(filenameExtension: outputURL.pathExtension), type.conforms(to: .image) {
    return type
  }
  return .png
}

func writeImage(_ image: CGImage, to outputURL: URL) throws {
  let fileManager = FileManager.default
  let outputDirectory = outputURL.deletingLastPathComponent()
  try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

  let type = destinationType(for: outputURL)
  guard let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    type.identifier as CFString,
    1,
    nil
  ) else {
    throw HelperError.failedToCreateDestination(outputURL.path)
  }

  var properties: [CFString: Any] = [:]
  if type.conforms(to: .jpeg) {
    properties[kCGImageDestinationLossyCompressionQuality] = 0.95
  }

  CGImageDestinationAddImage(destination, image, properties as CFDictionary)
  guard CGImageDestinationFinalize(destination) else {
    throw HelperError.failedToWriteImage(outputURL.path)
  }
}

func copyImageToClipboard(_ image: CGImage) throws {
  let nsImage = NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))
  let pasteboard = NSPasteboard.general
  pasteboard.clearContents()

  guard pasteboard.writeObjects([nsImage]) else {
    throw HelperError.failedToCopyImageToClipboard
  }
}

func emitPayload<T: Encodable>(_ payload: T) {
  let encoder = JSONEncoder()
  guard let data = try? encoder.encode(payload), let text = String(data: data, encoding: .utf8) else {
    return
  }
  print(text)
}

do {
  let options = try parseCLIOptions()

  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)

  guard let inputSource = try resolveInputSource(options: options) else {
    emitPayload(CancelledPayload())
    exit(EXIT_SUCCESS)
  }

  let selectionCoordinator = SelectionCoordinator(cgImage: inputSource.image, fileName: inputSource.label)

  guard let editingResult = selectionCoordinator.runModal() else {
    emitPayload(CancelledPayload())
    exit(EXIT_SUCCESS)
  }

  let outputURL = resolveOutputURL(options: options, inputURL: inputSource.inputURL)
  if let outputURL {
    try writeImage(editingResult.image, to: outputURL)
  }

  if options.copyOutputToClipboard {
    try copyImageToClipboard(editingResult.image)
  }

  emitPayload(
    SuccessPayload(
      outputPath: outputURL?.path,
      inputPath: inputSource.inputURL?.path,
      orientation: editingResult.orientation,
      removedPixels: editingResult.removedPixels
    )
  )
  exit(EXIT_SUCCESS)
} catch {
  fputs("CutOutHelper error: \(error.localizedDescription)\n", stderr)
  exit(EXIT_FAILURE)
}
