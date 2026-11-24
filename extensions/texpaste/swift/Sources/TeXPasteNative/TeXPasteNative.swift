import AppKit
import RaycastSwiftMacros

enum TeXPasteError: Error, CustomStringConvertible {
  case invalidSVG
  case encodingFailed(String)
  case unknownFormat(String)

  var description: String {
    switch self {
    case .invalidSVG: "Could not load the rendered SVG"
    case .encodingFailed(let what): "Could not create \(what)"
    case .unknownFormat(let f): "Unknown format \(f)"
    }
  }
}

// MARK: - Rendering

private func loadImage(_ svg: String) throws -> NSImage {
  guard let data = svg.data(using: .utf8), let image = NSImage(data: data), image.size.width > 0 else {
    throw TeXPasteError.invalidSVG
  }
  return image
}

/// Vector PDF of the SVG, page size = the SVG's size in points.
private func makePDF(_ image: NSImage) throws -> Data {
  let data = NSMutableData()
  var box = CGRect(origin: .zero, size: image.size)
  guard let consumer = CGDataConsumer(data: data as CFMutableData),
    let ctx = CGContext(consumer: consumer, mediaBox: &box, nil)
  else { throw TeXPasteError.encodingFailed("PDF") }
  ctx.beginPDFPage(nil)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
  image.draw(in: box)
  NSGraphicsContext.restoreGraphicsState()
  ctx.endPDFPage()
  ctx.closePDF()
  return data as Data
}

/// Transparent PNG at `scale` pixels per point (the point size is kept in the PNG's metadata).
private func makePNG(_ image: NSImage, scale: Double) throws -> Data {
  let size = image.size
  let s = CGFloat(max(0.1, scale))
  guard
    let rep = NSBitmapImageRep(
      bitmapDataPlanes: nil, pixelsWide: Int(ceil(size.width * s)), pixelsHigh: Int(ceil(size.height * s)),
      bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
      colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)
  else { throw TeXPasteError.encodingFailed("PNG") }
  rep.size = size
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  image.draw(in: NSRect(origin: .zero, size: size))
  NSGraphicsContext.restoreGraphicsState()
  guard let png = rep.representation(using: .png, properties: [:]) else { throw TeXPasteError.encodingFailed("PNG") }
  return png
}

/// Puts the equation on the general pasteboard as a native PDF, PNG or SVG.
@raycast func copyEquation(svg: String, format: String, pngScale: Double) throws {
  let pb = NSPasteboard.general
  switch format {
  case "pdf":
    let pdf = try makePDF(try loadImage(svg))
    pb.clearContents()
    pb.setData(pdf, forType: .pdf)
    pb.setData(pdf, forType: NSPasteboard.PasteboardType("com.adobe.pdf"))
  case "png":
    let png = try makePNG(try loadImage(svg), scale: pngScale)
    pb.clearContents()
    pb.setData(png, forType: .png)
  case "svg":
    pb.clearContents()
    pb.setData(Data(svg.utf8), forType: NSPasteboard.PasteboardType("public.svg-image"))
    pb.setString(svg, forType: .string)  // Figma, Illustrator and editors take SVG as text
  default:
    throw TeXPasteError.unknownFormat(format)
  }
}

/// Writes a PNG of the SVG to `path` (used for the live preview).
@raycast func writePNG(svg: String, scale: Double, path: String) throws {
  let png = try makePNG(try loadImage(svg), scale: scale)
  try png.write(to: URL(fileURLWithPath: path))
}

// MARK: - Color picking

private func hexString(_ color: NSColor) -> String? {
  guard let c = color.usingColorSpace(.sRGB) else { return nil }
  let v = [c.redComponent, c.greenComponent, c.blueComponent].map { Int(round(max(0, min(1, $0)) * 255)) }
  return String(format: "#%02X%02X%02X", v[0], v[1], v[2])
}

/// Eyedropper: returns the picked pixel as #RRGGBB, or nil if cancelled.
@raycast func sampleScreenColor() async -> String? {
  guard let color = await NSColorSampler().sample() else { return nil }
  return hexString(color)
}

@MainActor
private final class PanelPicker: NSObject {
  private var continuation: CheckedContinuation<String?, Never>?
  private var observer: NSObjectProtocol?

  func pick(current: String) async -> String? {
    await withCheckedContinuation { cont in
      continuation = cont
      NSApplication.shared.setActivationPolicy(.accessory)
      let panel = NSColorPanel.shared
      panel.showsAlpha = false
      panel.title = "Equation Color"
      if current.count == 7, let v = Int(current.dropFirst(), radix: 16) {
        panel.color = NSColor(
          srgbRed: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255,
          blue: CGFloat(v & 255) / 255, alpha: 1)
      }
      let button = NSButton(title: "Use This Color", target: self, action: #selector(use))
      button.bezelStyle = .rounded
      button.keyEquivalent = "\r"
      button.frame = NSRect(x: 40, y: 8, width: 140, height: 28)
      let box = NSView(frame: NSRect(x: 0, y: 0, width: 220, height: 44))
      box.addSubview(button)
      panel.accessoryView = box
      observer = NotificationCenter.default.addObserver(
        forName: NSWindow.willCloseNotification, object: panel, queue: .main
      ) { [weak self] _ in
        MainActor.assumeIsolated { self?.finish(nil) }
      }
      NSApplication.shared.activate(ignoringOtherApps: true)
      panel.makeKeyAndOrderFront(nil)
    }
  }

  @objc private func use() {
    finish(hexString(NSColorPanel.shared.color))
    NSColorPanel.shared.orderOut(nil)
  }

  private func finish(_ hex: String?) {
    if let observer { NotificationCenter.default.removeObserver(observer) }
    observer = nil
    continuation?.resume(returning: hex)
    continuation = nil
  }
}

/// macOS color panel with a "Use This Color" button. Returns #RRGGBB, or nil if the panel was closed.
@raycast func pickColorWithPanel(current: String) async -> String? {
  let picker = await PanelPicker()
  return await picker.pick(current: current)
}
