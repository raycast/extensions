import AppKit

func createCompositeImage(
    backgroundPath: String,
    overlayPath: String,
    outputPath: String,
    backgroundColorHex: String,
    canvasWidth: Int,
    canvasHeight: Int
) throws {
    let size = NSSize(width: canvasWidth, height: canvasHeight)
    let canvas = NSImage(size: size)

    canvas.lockFocus()

    // Draw background
    if !backgroundPath.isEmpty, let bgImage = NSImage(contentsOfFile: backgroundPath) {
        let sourceRect = aspectFillRect(imageSize: bgImage.size, targetSize: size)
        bgImage.draw(in: NSRect(origin: .zero, size: size), from: sourceRect, operation: .copy, fraction: 1.0)
    } else {
        let color = colorFromHex(backgroundColorHex) ?? NSColor.darkGray
        color.setFill()
        NSBezierPath.fill(NSRect(origin: .zero, size: size))
    }

    // Draw overlay icon in bottom-right, scaled to ~18% of canvas width
    if let overlay = NSImage(contentsOfFile: overlayPath) {
        let scale = CGFloat(canvasWidth) * 0.18 / overlay.size.width
        let overlaySize = NSSize(
            width: overlay.size.width * scale,
            height: overlay.size.height * scale
        )
        let padding: CGFloat = 12
        let origin = NSPoint(
            x: CGFloat(canvasWidth) - overlaySize.width - padding,
            y: padding
        )

        overlay.draw(in: NSRect(origin: origin, size: overlaySize), from: .zero, operation: .sourceOver, fraction: 1.0)
    }

    canvas.unlockFocus()

    guard let tiffData = canvas.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiffData),
          let pngData = bitmap.representation(using: .png, properties: [:]) else {
        throw AppearanceManagerError.compositeImageFailed
    }
    try pngData.write(to: URL(fileURLWithPath: outputPath))
}

/// Computes the source rect for "aspect fill" cropping.
private func aspectFillRect(imageSize: NSSize, targetSize: NSSize) -> NSRect {
    let widthRatio = imageSize.width / targetSize.width
    let heightRatio = imageSize.height / targetSize.height
    let scale = min(widthRatio, heightRatio)

    let cropSize = NSSize(width: targetSize.width * scale, height: targetSize.height * scale)
    let origin = NSPoint(
        x: (imageSize.width - cropSize.width) / 2,
        y: (imageSize.height - cropSize.height) / 2
    )
    return NSRect(origin: origin, size: cropSize)
}

/// Parses a hex color string like "#1a1a2e" into an NSColor.
private func colorFromHex(_ hex: String) -> NSColor? {
    var hexStr = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if hexStr.hasPrefix("#") { hexStr.removeFirst() }
    guard hexStr.count == 6, let value = UInt64(hexStr, radix: 16) else { return nil }
    return NSColor(
        red: CGFloat((value >> 16) & 0xFF) / 255.0,
        green: CGFloat((value >> 8) & 0xFF) / 255.0,
        blue: CGFloat(value & 0xFF) / 255.0,
        alpha: 1.0
    )
}
