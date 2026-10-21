import AppKit
import Foundation
import UniformTypeIdentifiers

enum BridgeError: Error, LocalizedError {
  case usage
  case noImage
  case couldNotEncodeImage
  case invalidBackground(String)
  case failed(String)

  var errorDescription: String? {
    switch self {
    case .usage:
      return "Usage: native-bridge read-clipboard-image <output.png> | choose-background | compose-text <background> <text-file> <output.png> | compose-screenshot <background> <screenshot> <output.png> | import-photos <image> | share-image <image> | reveal-in-finder <image>"
    case .noImage:
      return "The clipboard does not contain an image. Copy a screenshot or image, then try again."
    case .couldNotEncodeImage:
      return "Could not convert the clipboard image to PNG."
    case .invalidBackground(let message):
      return message
    case .failed(let message):
      return message
    }
  }
}

let canvasSize = CGSize(width: 1024, height: 1024)

func validateBackground(_ url: URL) throws {
  let values = try url.resourceValues(forKeys: [.fileSizeKey])
  if let fileSize = values.fileSize, fileSize > 20 * 1024 * 1024 {
    throw BridgeError.invalidBackground("Background images must be 20 MB or smaller.")
  }
  guard let image = NSImage(contentsOf: url) else {
    throw BridgeError.invalidBackground("Could not read this image. Choose a PNG, JPG, or HEIC file.")
  }
  var proposedRect = CGRect(origin: .zero, size: image.size)
  guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    throw BridgeError.invalidBackground("Could not read this image. Choose a PNG, JPG, or HEIC file.")
  }
  guard cgImage.width >= 1024, cgImage.height >= 1024 else {
    throw BridgeError.invalidBackground("Background images must be at least 1024 × 1024 pixels.")
  }
}

func chooseBackground() throws {
  let panel = NSOpenPanel()
  panel.title = "Choose a Background Image"
  panel.message = "PNG, JPG, or HEIC · At least 1024 × 1024 pixels · Up to 20 MB. Non-square images are center-cropped."
  panel.allowedContentTypes = [.png, .jpeg, .heic]
  panel.allowsOtherFileTypes = false
  panel.allowsMultipleSelection = false
  panel.canChooseDirectories = false
  panel.canChooseFiles = true
  guard panel.runModal() == .OK, let url = panel.url else {
    print("")
    return
  }
  try validateBackground(url)
  print(url.path)
}

func loadImage(_ path: String) throws -> NSImage {
  guard let image = NSImage(contentsOfFile: path) else {
    throw BridgeError.failed("Could not read the background or foreground image.")
  }
  return image
}

func drawCover(_ image: NSImage, in rect: NSRect) {
  let size = image.size
  let scale = max(rect.width / size.width, rect.height / size.height)
  let drawSize = NSSize(width: size.width * scale, height: size.height * scale)
  let drawRect = NSRect(
    x: rect.midX - drawSize.width / 2,
    y: rect.midY - drawSize.height / 2,
    width: drawSize.width,
    height: drawSize.height
  )
  image.draw(in: drawRect, from: .zero, operation: .copy, fraction: 1)
}

func renderCanvas(_ outputPath: String, draw: () -> Void) throws {
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize.width),
    pixelsHigh: Int(canvasSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    throw BridgeError.couldNotEncodeImage
  }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  context.imageInterpolation = .high
  draw()
  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()
  guard let data = bitmap.representation(using: .png, properties: [:]) else {
    throw BridgeError.couldNotEncodeImage
  }
  try data.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
}

func drawTextOverlay(backgroundPath: String, textPath: String, outputPath: String) throws {
  let background = try loadImage(backgroundPath)
  let text = try String(contentsOfFile: textPath, encoding: .utf8)
  let maxTextSize = CGSize(width: 720, height: 730)
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center
  paragraph.lineSpacing = 9
  paragraph.lineBreakMode = .byWordWrapping

  var chosenText: NSAttributedString?
  var measured = CGRect.zero
  for fontSize in stride(from: 56, through: 22, by: -2) {
    let font = NSFont(name: "PingFangSC-Semibold", size: CGFloat(fontSize))
      ?? NSFont.systemFont(ofSize: CGFloat(fontSize), weight: .semibold)
    let candidate = NSAttributedString(
      string: text,
      attributes: [
        .font: font,
        .foregroundColor: NSColor(calibratedWhite: 0.12, alpha: 1),
        .paragraphStyle: paragraph,
      ]
    )
    let bounds = candidate.boundingRect(
      with: maxTextSize,
      options: [.usesLineFragmentOrigin, .usesFontLeading]
    ).integral
    if bounds.height <= maxTextSize.height {
      chosenText = candidate
      measured = bounds
      break
    }
  }
  guard let chosenText else {
    throw BridgeError.invalidBackground("The selected text is too long to fit clearly in a square image. Select less text and try again.")
  }

  try renderCanvas(outputPath) {
    drawCover(background, in: NSRect(origin: .zero, size: canvasSize))
    let textRect = NSRect(
      x: (canvasSize.width - maxTextSize.width) / 2,
      y: (canvasSize.height - measured.height) / 2,
      width: maxTextSize.width,
      height: measured.height + 4
    )
    chosenText.draw(
      with: textRect,
      options: [.usesLineFragmentOrigin, .usesFontLeading]
    )
  }
}

func drawScreenshotOverlay(backgroundPath: String, screenshotPath: String, outputPath: String) throws {
  let background = try loadImage(backgroundPath)
  let screenshot = try loadImage(screenshotPath)
  let imageSize = screenshot.size
  let maxImageSize = CGSize(width: 790, height: 790)
  let scale = min(maxImageSize.width / imageSize.width, maxImageSize.height / imageSize.height)
  let fittedImageSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
  let cardPadding: CGFloat = 26
  let card = NSRect(
    x: (canvasSize.width - fittedImageSize.width - cardPadding * 2) / 2,
    y: (canvasSize.height - fittedImageSize.height - cardPadding * 2) / 2,
    width: fittedImageSize.width + cardPadding * 2,
    height: fittedImageSize.height + cardPadding * 2
  )
  let imageRect = NSRect(
    x: card.minX + cardPadding,
    y: card.minY + cardPadding,
    width: fittedImageSize.width,
    height: fittedImageSize.height
  )

  try renderCanvas(outputPath) {
    drawCover(background, in: NSRect(origin: .zero, size: canvasSize))
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.32)
    shadow.shadowBlurRadius = 32
    shadow.shadowOffset = NSSize(width: 0, height: -12)
    shadow.set()
    screenshot.draw(in: imageRect, from: .zero, operation: .sourceOver, fraction: 1)
    NSShadow().set()
  }
}

func writeClipboardImage(to outputPath: String) throws {
  let pasteboard = NSPasteboard.general
  let imageTypes: [NSPasteboard.PasteboardType] = [.png, .tiff, NSPasteboard.PasteboardType("public.jpeg")]

  guard let type = imageTypes.first(where: { pasteboard.data(forType: $0) != nil }),
        let data = pasteboard.data(forType: type),
        let image = NSImage(data: data),
        let tiff = image.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let png = bitmap.representation(using: .png, properties: [:]) else {
    throw BridgeError.noImage
  }

  let url = URL(fileURLWithPath: outputPath)
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try png.write(to: url, options: .atomic)
}

func importIntoPhotos(_ imagePath: String) throws {
  let imageURL = URL(fileURLWithPath: imagePath).standardizedFileURL
  guard FileManager.default.fileExists(atPath: imageURL.path) else {
    throw BridgeError.failed("The generated image file could not be found.")
  }

  let escapedPath = imageURL.path.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
  let source = "tell application id \"com.apple.Photos\" to import POSIX file \"\(escapedPath)\""
  guard let script = NSAppleScript(source: source) else {
    throw BridgeError.failed("Could not create the Photos import request.")
  }

  var errorInfo: NSDictionary?
  script.executeAndReturnError(&errorInfo)
  if let errorInfo {
    throw BridgeError.failed(errorInfo[NSAppleScript.errorMessage] as? String ?? "Photos could not import the image.")
  }
}

final class ShareView: NSView {
  private let imageURL: URL
  private var picker: NSSharingServicePicker?

  init(imageURL: URL) {
    self.imageURL = imageURL
    super.init(frame: NSRect(x: 0, y: 0, width: 480, height: 380))
    wantsLayer = true
    layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor

    let imageView = NSImageView(frame: NSRect(x: 40, y: 76, width: 400, height: 270))
    imageView.image = NSImage(contentsOf: imageURL)
    imageView.imageScaling = .scaleProportionallyUpOrDown
    addSubview(imageView)

    let button = NSButton(title: "Share…", target: self, action: #selector(showSharePicker(_:)))
    button.bezelStyle = .rounded
    button.frame = NSRect(x: 190, y: 24, width: 100, height: 32)
    addSubview(button)
  }

  required init?(coder: NSCoder) {
    nil
  }

  @objc private func showSharePicker(_ sender: NSButton) {
    let picker = NSSharingServicePicker(items: [imageURL])
    self.picker = picker
    picker.show(relativeTo: sender.bounds, of: sender, preferredEdge: .minY)
  }
}

func shareImage(_ imagePath: String) throws {
  let imageURL = URL(fileURLWithPath: imagePath).standardizedFileURL
  guard FileManager.default.fileExists(atPath: imageURL.path) else {
    throw BridgeError.failed("The generated image file could not be found.")
  }

  let app = NSApplication.shared
  app.setActivationPolicy(.regular)
  let window = NSWindow(
    contentRect: NSRect(x: 0, y: 0, width: 480, height: 380),
    styleMask: [.titled, .closable, .miniaturizable],
    backing: .buffered,
    defer: false
  )
  window.title = "Share Image"
  window.center()
  window.contentView = ShareView(imageURL: imageURL)
  window.makeKeyAndOrderFront(nil)
  app.activate(ignoringOtherApps: true)
  app.run()
}

func revealInFinder(_ imagePath: String) throws {
  let imageURL = URL(fileURLWithPath: imagePath).standardizedFileURL
  guard FileManager.default.fileExists(atPath: imageURL.path) else {
    throw BridgeError.failed("The generated image file could not be found.")
  }
  NSWorkspace.shared.activateFileViewerSelecting([imageURL])
}

do {
  let arguments = Array(CommandLine.arguments.dropFirst())
  guard let command = arguments.first else { throw BridgeError.usage }
  switch command {
  case "read-clipboard-image":
    guard arguments.count == 2 else { throw BridgeError.usage }
    try writeClipboardImage(to: arguments[1])
    print(arguments[1])
  case "choose-background":
    guard arguments.count == 1 else { throw BridgeError.usage }
    try chooseBackground()
  case "compose-text":
    guard arguments.count == 4 else { throw BridgeError.usage }
    try drawTextOverlay(backgroundPath: arguments[1], textPath: arguments[2], outputPath: arguments[3])
    print(arguments[3])
  case "compose-screenshot":
    guard arguments.count == 4 else { throw BridgeError.usage }
    try drawScreenshotOverlay(backgroundPath: arguments[1], screenshotPath: arguments[2], outputPath: arguments[3])
    print(arguments[3])
  case "import-photos":
    guard arguments.count == 2 else { throw BridgeError.usage }
    try importIntoPhotos(arguments[1])
    print("Imported into Photos")
  case "share-image":
    guard arguments.count == 2 else { throw BridgeError.usage }
    try shareImage(arguments[1])
  case "reveal-in-finder":
    guard arguments.count == 2 else { throw BridgeError.usage }
    try revealInFinder(arguments[1])
  default:
    throw BridgeError.usage
  }
} catch {
  FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
  exit(1)
}
