import AppKit
import ImageIO
import RaycastSwiftMacros
import UniformTypeIdentifiers

// Raycast views cannot drag things, so Add Text opens this small native editor window.
// The preview and the saved file use the same drawing code, so the text lands where you put it.

/// Opens the editor for the image at `path`. When you press ⌘↩, it saves a copy with the text in
/// `outputFolder`, puts the file on the clipboard, and returns its path. Returns nil when you cancel.
@raycast func addText(path: String, outputFolder: String) throws -> String? {
  // Raycast reads this process's output through sockets. If Raycast unloads the command, a log line
  // from AppKit (for example from an input method) would raise SIGPIPE and quit the editor.
  signal(SIGPIPE, SIG_IGN)
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  app.mainMenu = makeMainMenu()
  let editor = try Editor(url: URL(fileURLWithPath: path), outputFolder: URL(fileURLWithPath: outputFolder))
  editor.show()
  // If something else stops the run loop, keep running. Only the editor decides when it is done.
  while !editor.finished { app.run() }
  return try editor.result.get()
}

// MARK: - Text layers

struct FontChoice {
  let title: String
  let name: String
}

// Fonts that come with macOS. Chinese characters in a Latin font (for example Impact) use a
// system Chinese font automatically.
let fontChoices = [
  FontChoice(title: "Impact", name: "Impact"),
  FontChoice(title: "PingFang TC Semibold", name: "PingFangTC-Semibold"),
  FontChoice(title: "PingFang TC Regular", name: "PingFangTC-Regular"),
  FontChoice(title: "Songti TC Bold", name: "STSongti-TC-Bold"),
  FontChoice(title: "Helvetica Neue Bold", name: "HelveticaNeue-Bold"),
  FontChoice(title: "Arial Black", name: "Arial-Black"),
  FontChoice(title: "Marker Felt", name: "MarkerFelt-Wide"),
  FontChoice(title: "Chalkboard SE Bold", name: "ChalkboardSE-Bold"),
  FontChoice(title: "Comic Sans MS Bold", name: "ComicSansMS-Bold"),
].filter { NSFont(name: $0.name, size: 12) != nil }

final class TextLayer {
  var text = ""
  var fontName = fontChoices.first?.name ?? ""
  /// Font size as a fraction of the image width, so the preview and the full-size image match.
  var size: CGFloat = 0.09
  var color = NSColor.white
  var outline: NSColor? = .black
  /// The center of the text as a fraction of the image size. y = 0 is the top.
  var center: CGPoint

  init(center: CGPoint) {
    self.center = center
  }

  func copy(center: CGPoint) -> TextLayer {
    let layer = TextLayer(center: center)
    (layer.fontName, layer.size, layer.color, layer.outline) = (fontName, size, color, outline)
    return layer
  }

  // CoreText lays out the text, so the preview and the saved file wrap lines the same way.
  private func framesetter(fontSize: CGFloat) -> CTFramesetter {
    let font = NSFont(name: fontName, size: fontSize) ?? .boldSystemFont(ofSize: fontSize)
    var alignment = CTTextAlignment.center
    let paragraph = withUnsafeMutablePointer(to: &alignment) {
      CTParagraphStyleCreate([CTParagraphStyleSetting(spec: .alignment, valueSize: MemoryLayout<CTTextAlignment>.size, value: $0)], 1)
    }
    let attributes: [NSAttributedString.Key: Any] = [
      NSAttributedString.Key(kCTFontAttributeName as String): font,
      NSAttributedString.Key(kCTParagraphStyleAttributeName as String): paragraph,
      NSAttributedString.Key(kCTForegroundColorAttributeName as String): (color.usingColorSpace(.sRGB) ?? color).cgColor,
    ]
    return CTFramesetterCreateWithAttributedString(NSAttributedString(string: text.isEmpty ? " " : text, attributes: attributes))
  }

  /// The text rectangle in a top-left coordinate space of the given canvas size.
  func frame(in canvas: CGSize) -> CGRect {
    let size = CTFramesetterSuggestFrameSizeWithConstraints(
      framesetter(fontSize: self.size * canvas.width), CFRange(), nil,
      CGSize(width: canvas.width * 0.94, height: .greatestFiniteMagnitude), nil)
    let width = ceil(size.width) + 1, height = ceil(size.height)
    // Keep the text inside the image, so a long top caption grows down instead of off the edge.
    // The margin leaves room for the outline.
    let margin = self.size * canvas.width * 0.08
    let x = min(max(center.x * canvas.width - width / 2, margin), max(canvas.width - width - margin, margin))
    let y = min(max(center.y * canvas.height - height / 2, margin), max(canvas.height - height - margin, margin))
    return CGRect(x: x, y: y, width: width, height: height)
  }

  /// Draws into the current graphics context, which must be flipped (y = 0 at the top).
  func draw(in canvas: CGSize) {
    guard !text.isEmpty, let context = NSGraphicsContext.current?.cgContext else { return }
    let rect = frame(in: canvas)
    let fontSize = size * canvas.width
    let frame = CTFramesetterCreateFrame(
      framesetter(fontSize: fontSize), CFRange(), CGPath(rect: CGRect(origin: .zero, size: rect.size), transform: nil), nil)
    context.saveGState()
    // CoreText draws with y going up, so flip back inside the text rectangle.
    context.translateBy(x: rect.minX, y: rect.maxY)
    context.scaleBy(x: 1, y: -1)
    if let outline {
      // CoreText's own stroke is too thin to show around a fill, so stroke the glyph shapes.
      // The fill covers the inner half of the stroke, so 8% of the font size shows outside.
      context.addPath(glyphPath(frame))
      context.setLineWidth(fontSize * 0.16)
      context.setLineJoin(.round)
      context.setStrokeColor((outline.usingColorSpace(.sRGB) ?? outline).cgColor)
      context.strokePath()
    }
    CTFrameDraw(frame, context)
    context.restoreGState()
  }

  private func glyphPath(_ frame: CTFrame) -> CGPath {
    let path = CGMutablePath()
    let lines = CTFrameGetLines(frame) as! [CTLine]
    var origins = [CGPoint](repeating: .zero, count: lines.count)
    CTFrameGetLineOrigins(frame, CFRange(), &origins)
    for (line, origin) in zip(lines, origins) {
      for run in CTLineGetGlyphRuns(line) as! [CTRun] {
        // Each run has its own font. Chinese text in a Latin font uses a fallback font.
        let font = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName] as! CTFont
        let count = CTRunGetGlyphCount(run)
        var glyphs = [CGGlyph](repeating: 0, count: count)
        var positions = [CGPoint](repeating: .zero, count: count)
        CTRunGetGlyphs(run, CFRange(), &glyphs)
        CTRunGetPositions(run, CFRange(), &positions)
        for (glyph, position) in zip(glyphs, positions) {
          guard let shape = CTFontCreatePathForGlyph(font, glyph, nil) else { continue }
          path.addPath(shape, transform: CGAffineTransform(translationX: origin.x + position.x, y: origin.y + position.y))
        }
      }
    }
    return path
  }
}

// MARK: - Saving

enum TextError: LocalizedError {
  case unreadable

  var errorDescription: String? { "Could not read this image" }
}

/// Draws the text on every frame. GIFs keep their frames, frame delays, and loop count.
func render(source url: URL, layers: [TextLayer], to folder: URL) throws -> URL {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), CGImageSourceGetCount(source) > 0 else {
    throw TextError.unreadable
  }
  let isGIF = (CGImageSourceGetType(source) as String?) == UTType.gif.identifier
  let frames = isGIF ? CGImageSourceGetCount(source) : 1
  let type = isGIF ? UTType.gif : UTType.png

  try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
  removeOldFiles(in: folder)
  let name = "\(url.deletingPathExtension().lastPathComponent)-text-\(Int(Date().timeIntervalSince1970))"
  let target = folder.appendingPathComponent(name).appendingPathExtension(type.preferredFilenameExtension ?? "png")
  guard let destination = CGImageDestinationCreateWithURL(target as CFURL, type.identifier as CFString, frames, nil) else {
    throw TextError.unreadable
  }
  if isGIF, let properties = CGImageSourceCopyProperties(source, nil) {
    CGImageDestinationSetProperties(destination, properties)
  }
  for index in 0..<frames {
    guard let image = isGIF ? CGImageSourceCreateImageAtIndex(source, index, nil) : uprightImage(from: source) else {
      throw TextError.unreadable
    }
    var properties: [CFString: Any] = [:]
    if isGIF,
      let frame = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any],
      let gif = frame[kCGImagePropertyGIFDictionary] as? [CFString: Any]
    {
      properties[kCGImagePropertyGIFDictionary] = gif.filter {
        $0.key == kCGImagePropertyGIFDelayTime || $0.key == kCGImagePropertyGIFUnclampedDelayTime
      }
    }
    CGImageDestinationAddImage(destination, try draw(layers, on: image), properties as CFDictionary)
  }
  guard CGImageDestinationFinalize(destination) else { throw TextError.unreadable }
  return target
}

// Photos (for example JPEGs from a phone) can store their rotation instead of rotated pixels. The editor
// shows them upright, so apply that rotation at full size before the text goes on.
private func uprightImage(from source: CGImageSource) -> CGImage? {
  let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
  let width = properties?[kCGImagePropertyPixelWidth] as? Int ?? 0
  let height = properties?[kCGImagePropertyPixelHeight] as? Int ?? 0
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: max(width, height),
  ]
  return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
}

private func draw(_ layers: [TextLayer], on image: CGImage) throws -> CGImage {
  let size = CGSize(width: image.width, height: image.height)
  guard
    let context = CGContext(
      data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else { throw TextError.unreadable }
  context.draw(image, in: CGRect(origin: .zero, size: size))
  context.translateBy(x: 0, y: size.height)
  context.scaleBy(x: 1, y: -1)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
  layers.forEach { $0.draw(in: size) }
  NSGraphicsContext.restoreGraphicsState()
  guard let result = context.makeImage() else { throw TextError.unreadable }
  return result
}

// Old copies are not needed after you paste them. Keep one week, so recent clipboard history still works.
private func removeOldFiles(in folder: URL) {
  let files = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
  for file in files {
    let date = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantFuture
    if date < Date().addingTimeInterval(-7 * 24 * 3600) { try? FileManager.default.removeItem(at: file) }
  }
}

// MARK: - Canvas

/// Shows the text over the image. Drag text to move it. Double-click an empty area to add text there.
final class Canvas: NSView {
  var layers: [TextLayer] = []
  var selected: TextLayer?
  var onSelect: (TextLayer?) -> Void = { _ in }
  var onAdd: (CGPoint) -> Void = { _ in }
  var onDelete: () -> Void = {}
  private var dragOffset = CGPoint.zero
  /// The text that the current mouse drag moves. Nil when the drag started on empty space.
  private var dragged: TextLayer?

  override var isFlipped: Bool { true }
  override var acceptsFirstResponder: Bool { true }

  override func draw(_ dirtyRect: NSRect) {
    layers.forEach { $0.draw(in: bounds.size) }
    guard let selected else { return }
    let rect = box(for: selected)
    if selected.text.isEmpty {
      NSColor.black.withAlphaComponent(0.5).setFill()
      NSBezierPath(roundedRect: rect, xRadius: 4, yRadius: 4).fill()
      let size = Canvas.hint.size()
      Canvas.hint.draw(at: CGPoint(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2))
    }
    let path = NSBezierPath(roundedRect: rect, xRadius: 4, yRadius: 4)
    path.lineWidth = 2
    path.setLineDash([5, 3], count: 2, phase: 0)
    NSColor.controlAccentColor.setStroke()
    path.stroke()
  }

  private static let hint = NSAttributedString(
    string: "Type your text", attributes: [.font: NSFont.systemFont(ofSize: 13), .foregroundColor: NSColor.white])

  // The area that shows the selection and that you can drag. Empty text gets a box big enough for the hint.
  private func box(for layer: TextLayer) -> CGRect {
    let frame = layer.frame(in: bounds.size)
    guard layer.text.isEmpty else { return frame.insetBy(dx: -6, dy: -4) }
    let size = Canvas.hint.size()
    return CGRect(x: frame.midX - size.width / 2 - 12, y: frame.midY - size.height / 2 - 8, width: size.width + 24, height: size.height + 16)
  }

  private func layer(at point: CGPoint) -> TextLayer? {
    layers.last { box(for: $0).insetBy(dx: -4, dy: -4).contains(point) }
  }

  override func mouseDown(with event: NSEvent) {
    let point = convert(event.locationInWindow, from: nil)
    window?.makeFirstResponder(self)
    dragged = layer(at: point)
    guard let hit = dragged else {
      if event.clickCount == 2 { onAdd(CGPoint(x: point.x / bounds.width, y: point.y / bounds.height)) }
      return
    }
    let center = CGPoint(x: hit.center.x * bounds.width, y: hit.center.y * bounds.height)
    dragOffset = CGPoint(x: point.x - center.x, y: point.y - center.y)
    onSelect(hit)
    NSCursor.closedHand.set()
  }

  override func mouseDragged(with event: NSEvent) {
    guard let selected = dragged else { return }
    let point = convert(event.locationInWindow, from: nil)
    selected.center = CGPoint(
      x: min(max((point.x - dragOffset.x) / bounds.width, 0), 1),
      y: min(max((point.y - dragOffset.y) / bounds.height, 0), 1))
    // Store where the text really is, so dragging back from an edge moves it at once.
    let frame = selected.frame(in: bounds.size)
    selected.center = CGPoint(x: frame.midX / bounds.width, y: frame.midY / bounds.height)
    needsDisplay = true
  }

  override func mouseUp(with event: NSEvent) {
    dragged = nil
    window?.invalidateCursorRects(for: self)
  }

  override func resetCursorRects() {
    layers.forEach { addCursorRect(box(for: $0).insetBy(dx: -4, dy: -4), cursor: .openHand) }
  }

  // Arrow keys move the selected text (Shift moves farther). Delete removes it.
  override func keyDown(with event: NSEvent) {
    guard let selected else { return super.keyDown(with: event) }
    let step: CGFloat = event.modifierFlags.contains(.shift) ? 0.05 : 0.01
    switch event.specialKey {
    case .leftArrow?: selected.center.x = max(selected.center.x - step, 0)
    case .rightArrow?: selected.center.x = min(selected.center.x + step, 1)
    case .upArrow?: selected.center.y = max(selected.center.y - step, 0)
    case .downArrow?: selected.center.y = min(selected.center.y + step, 1)
    case .delete?, .deleteForward?: return onDelete()
    default: return super.keyDown(with: event)
    }
    needsDisplay = true
    window?.invalidateCursorRects(for: self)
  }
}

// MARK: - Editor window

final class Editor: NSObject, NSWindowDelegate, NSTextFieldDelegate {
  private(set) var result: Result<String?, Error> = .success(nil)
  private let url: URL
  private let outputFolder: URL
  private let window: NSWindow
  private let canvas = Canvas()
  private let textField = NSTextField()
  private let fontPopup = NSPopUpButton()
  private let sizeSlider = NSSlider(value: 0.09, minValue: 0.03, maxValue: 0.3, target: nil, action: nil)
  private let colorWell = NSColorWell(style: .minimal)
  private let outlineCheckbox = NSButton(checkboxWithTitle: "Outline", target: nil, action: nil)
  private let outlineWell = NSColorWell(style: .minimal)
  private(set) var finished = false

  init(url: URL, outputFolder: URL) throws {
    guard let image = NSImage(contentsOf: url), let rep = image.representations.first, rep.pixelsWide > 0 else {
      throw TextError.unreadable
    }
    self.url = url
    self.outputFolder = outputFolder
    // Fit the image in about 760 × 520 points. Small memes are scaled up so the text is easy to place.
    let pixels = CGSize(width: rep.pixelsWide, height: rep.pixelsHigh)
    let scale = min(760 / pixels.width, 520 / pixels.height, 3)
    let display = CGSize(width: round(pixels.width * scale), height: round(pixels.height * scale))
    window = NSWindow(contentRect: .zero, styleMask: [.titled, .closable], backing: .buffered, defer: false)
    super.init()

    let imageView = NSImageView()
    imageView.image = image
    imageView.animates = true
    imageView.imageScaling = .scaleAxesIndependently
    let stage = NSView()
    for view in [imageView, canvas] {
      view.translatesAutoresizingMaskIntoConstraints = false
      stage.addSubview(view)
      NSLayoutConstraint.activate([
        view.leadingAnchor.constraint(equalTo: stage.leadingAnchor),
        view.trailingAnchor.constraint(equalTo: stage.trailingAnchor),
        view.topAnchor.constraint(equalTo: stage.topAnchor),
        view.bottomAnchor.constraint(equalTo: stage.bottomAnchor),
      ])
    }
    stage.translatesAutoresizingMaskIntoConstraints = false
    stage.widthAnchor.constraint(equalToConstant: display.width).isActive = true
    stage.heightAnchor.constraint(equalToConstant: display.height).isActive = true

    textField.placeholderString = "Type text (English or 中文). ⌥↩ adds a new line."
    textField.font = .systemFont(ofSize: 15)
    textField.delegate = self
    textField.cell?.wraps = true
    textField.cell?.isScrollable = false
    textField.usesSingleLineMode = false
    textField.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true

    fontPopup.addItems(withTitles: fontChoices.map(\.title))
    for (item, choice) in zip(fontPopup.itemArray, fontChoices) {
      item.attributedTitle = NSAttributedString(
        string: choice.title, attributes: [.font: NSFont(name: choice.name, size: 13) ?? .systemFont(ofSize: 13)])
    }
    sizeSlider.isContinuous = true
    sizeSlider.widthAnchor.constraint(equalToConstant: 120).isActive = true
    colorWell.color = .white
    outlineWell.color = .black
    outlineCheckbox.state = .on
    for control in [fontPopup, sizeSlider, colorWell, outlineCheckbox, outlineWell] as [NSControl] {
      control.target = self
      control.action = #selector(styleChanged)
    }

    let addButton = NSButton(title: "Add Text", target: self, action: #selector(addTextClicked))
    addButton.image = NSImage(systemSymbolName: "plus", accessibilityDescription: nil)
    addButton.imagePosition = .imageLeading
    let deleteButton = NSButton(title: "Delete", target: self, action: #selector(deleteLayer))
    let cancelButton = NSButton(title: "Cancel", target: self, action: #selector(cancel))
    cancelButton.keyEquivalent = "\u{1b}"
    let copyButton = NSButton(title: "Copy to Clipboard  ⌘↩", target: self, action: #selector(save))
    copyButton.keyEquivalent = "\r"
    copyButton.keyEquivalentModifierMask = .command
    copyButton.bezelColor = .controlAccentColor

    let hint = NSTextField(labelWithString: "Drag text to move it. Double-click the image to add more text.")
    hint.textColor = .secondaryLabelColor
    hint.font = .systemFont(ofSize: 12)

    let styleRow = NSStackView(views: [
      fontPopup, NSTextField(labelWithString: "Size"), sizeSlider, NSTextField(labelWithString: "Color"), colorWell,
      outlineCheckbox, outlineWell, NSView(), addButton, deleteButton,
    ])
    let bottomRow = NSStackView(views: [hint, NSView(), cancelButton, copyButton])
    let content = NSStackView(views: [textField, styleRow, stage, bottomRow])
    content.orientation = .vertical
    content.spacing = 12
    content.edgeInsets = NSEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
    for row in [textField, styleRow, bottomRow] {
      row.widthAnchor.constraint(equalTo: content.widthAnchor, constant: -32).isActive = true
    }
    content.widthAnchor.constraint(greaterThanOrEqualToConstant: 680).isActive = true

    canvas.onSelect = { [weak self] in self?.select($0) }
    canvas.onAdd = { [weak self] in self?.addLayer(at: $0) }
    canvas.onDelete = { [weak self] in self?.deleteLayer() }

    window.title = "Add Text"
    window.contentView = content
    window.delegate = self
    window.isReleasedWhenClosed = false
    window.level = .floating
    window.setContentSize(content.fittingSize)
    window.center()
    addLayer(at: CGPoint(x: 0.5, y: 0.12))
  }

  func show() {
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    window.makeFirstResponder(textField)
  }

  // MARK: Layers

  private func select(_ layer: TextLayer?) {
    canvas.selected = layer
    canvas.needsDisplay = true
    guard let layer else { return }
    textField.stringValue = layer.text
    fontPopup.selectItem(at: fontChoices.firstIndex { $0.name == layer.fontName } ?? 0)
    sizeSlider.doubleValue = layer.size
    colorWell.color = layer.color
    outlineCheckbox.state = layer.outline == nil ? .off : .on
    outlineWell.color = layer.outline ?? outlineWell.color
    outlineWell.isEnabled = layer.outline != nil
  }

  private func addLayer(at center: CGPoint) {
    // A new text box copies the style of the selected one, so a top and bottom caption match.
    let layer = canvas.selected?.copy(center: center) ?? TextLayer(center: center)
    canvas.layers.append(layer)
    select(layer)
    window.invalidateCursorRects(for: canvas)
    window.makeFirstResponder(textField)
  }

  @objc private func addTextClicked() {
    // The first extra text goes to the bottom, like a classic meme. Later ones go in the middle.
    addLayer(at: CGPoint(x: 0.5, y: canvas.layers.count == 1 ? 0.88 : 0.5))
  }

  @objc private func deleteLayer() {
    guard let selected = canvas.selected else { return }
    canvas.layers.removeAll { $0 === selected }
    canvas.selected = nil
    select(canvas.layers.last)
    if canvas.layers.isEmpty { addLayer(at: CGPoint(x: 0.5, y: 0.12)) }
    window.invalidateCursorRects(for: canvas)
  }

  func controlTextDidChange(_ notification: Notification) {
    canvas.selected?.text = textField.stringValue
    canvas.needsDisplay = true
    window.invalidateCursorRects(for: canvas)
  }

  @objc private func styleChanged() {
    guard let layer = canvas.selected else { return }
    layer.fontName = fontChoices[max(fontPopup.indexOfSelectedItem, 0)].name
    layer.size = sizeSlider.doubleValue
    layer.color = colorWell.color
    layer.outline = outlineCheckbox.state == .on ? outlineWell.color : nil
    outlineWell.isEnabled = layer.outline != nil
    canvas.needsDisplay = true
    window.invalidateCursorRects(for: canvas)
  }

  // MARK: Finish

  @objc private func save() {
    // Commit text that is still being typed with an input method (for example Chinese Zhuyin).
    if let editor = textField.currentEditor() as? NSTextView, editor.hasMarkedText() { editor.unmarkText() }
    canvas.selected?.text = textField.stringValue
    let layers = canvas.layers.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    guard !layers.isEmpty else {
      NSSound.beep()
      window.makeFirstResponder(textField)
      return
    }
    result = Result<String?, Error> {
      let target = try render(source: url, layers: layers, to: outputFolder)
      NSPasteboard.general.clearContents()
      NSPasteboard.general.writeObjects([target as NSURL])
      return target.path
    }
    finish()
  }

  @objc private func cancel() {
    finish()
  }

  func windowWillClose(_ notification: Notification) {
    finish()
  }

  private func finish() {
    guard !finished else { return }
    finished = true
    window.orderOut(nil)
    NSApp.stop(nil)
    // stop() takes effect after the next event, so send one.
    NSApp.postEvent(
      NSEvent.otherEvent(
        with: .applicationDefined, location: .zero, modifierFlags: [], timestamp: 0, windowNumber: 0, context: nil,
        subtype: 0, data1: 0, data2: 0)!, atStart: true)
  }
}

// Without a main menu, ⌘C, ⌘V, ⌘A, and ⌘Z do not work in the text field.
func makeMainMenu() -> NSMenu {
  let menu = NSMenu()
  let appItem = NSMenuItem()
  appItem.submenu = NSMenu()
  appItem.submenu?.addItem(withTitle: "Quit", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "q")
  let editItem = NSMenuItem()
  let edit = NSMenu(title: "Edit")
  edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
  edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
  edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
  edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
  edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
  edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
  editItem.submenu = edit
  menu.addItem(appItem)
  menu.addItem(editItem)
  return menu
}

