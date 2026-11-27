// Draws the LayoutFixer for Raycast artwork.
// Usage (from the repo root): swift design/make-artwork.swift
// Writes:
//   assets/extension-icon.png   512x512   Raycast extension icon
//   media/icon.png              1024x1024 icon for the README
//   media/cover.png             2560x1280 README hero
//   media/social-preview.png    1280x640  GitHub social preview

import AppKit
import CoreImage

// MARK: - Helpers

func color(_ hex: UInt32, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat(hex >> 16 & 0xFF) / 255, green: CGFloat(hex >> 8 & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: a)
}

func rounded(_ r: NSRect, _ radius: CGFloat) -> NSBezierPath {
    NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius)
}

func font(_ size: CGFloat, _ weight: NSFont.Weight = .regular, mono: Bool = false) -> NSFont {
    mono ? .monospacedSystemFont(ofSize: size, weight: weight) : .systemFont(ofSize: size, weight: weight)
}

func persianFont(_ size: CGFloat, bold: Bool = false) -> NSFont {
    for name in bold ? ["SFArabic-Bold", "SFArabic-Semibold"] : ["SFArabic-Medium", "SFArabic-Regular"] {
        if let f = NSFont(name: name, size: size) { return f }
    }
    return font(size, bold ? .bold : .regular)
}

func text(_ s: String, _ f: NSFont, _ c: NSColor, kern: CGFloat = 0) -> NSAttributedString {
    NSAttributedString(string: s, attributes: [.font: f, .foregroundColor: c, .kern: kern])
}

/// Draws text centered on its actual glyph bounding box so Latin, Persian, and symbols sit on the exact same optical center.
@discardableResult
func draw(_ s: NSAttributedString, x: CGFloat, centerY y: CGFloat) -> NSRect {
    let b = s.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
    s.draw(at: NSPoint(x: x - b.minX, y: y - b.midY))
    return NSRect(x: x, y: y - b.height / 2, width: b.width, height: b.height)
}

@discardableResult
func draw(_ s: NSAttributedString, right x: CGFloat, centerY y: CGFloat) -> NSRect {
    let b = s.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
    return draw(s, x: x - b.width, centerY: y)
}

@discardableResult
func draw(_ s: NSAttributedString, centerX x: CGFloat, centerY y: CGFloat) -> NSRect {
    let b = s.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
    return draw(s, x: x - b.width / 2, centerY: y)
}

func shadow(_ c: NSColor, blur: CGFloat, y: CGFloat, _ body: () -> Void) {
    NSGraphicsContext.saveGraphicsState()
    let s = NSShadow()
    s.shadowColor = c
    s.shadowBlurRadius = blur
    s.shadowOffset = NSSize(width: 0, height: y)
    s.set()
    body()
    NSGraphicsContext.restoreGraphicsState()
}

func clipped(_ path: NSBezierPath, _ body: () -> Void) {
    NSGraphicsContext.saveGraphicsState()
    path.addClip()
    body()
    NSGraphicsContext.restoreGraphicsState()
}

func makeRep(_ width: Int, _ height: Int) -> NSBitmapImageRep {
    NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
                     samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                     bytesPerRow: 0, bitsPerPixel: 0)!
}

func render(_ width: Int, _ height: Int, to path: String, _ body: (NSRect) -> Void) {
    let rep = makeRep(width, height)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    body(NSRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()
    let url = URL(fileURLWithPath: path)
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try! rep.representation(using: .png, properties: [:])!.write(to: url)
    print("wrote \(path)")
}

// MARK: - Palette

let coral = color(0xFF6363)
let coralDeep = color(0xE0365A)
let plum = color(0x6E1F5C)
let textHigh = color(0xFFFFFF, 0.96)
let textMid = color(0xFFFFFF, 0.62)
let textLow = color(0xFFFFFF, 0.36)

// MARK: - Icon

func keyCap(center: NSPoint, side: CGFloat, angle: CGFloat, face: NSColor, edge: NSColor, label: NSAttributedString) {
    NSGraphicsContext.saveGraphicsState()
    let t = NSAffineTransform()
    t.translateX(by: center.x, yBy: center.y)
    t.rotate(byDegrees: angle)
    t.concat()
    let r = NSRect(x: -side / 2, y: -side / 2, width: side, height: side)
    let radius = side * 0.22
    shadow(color(0x000000, 0.35), blur: side * 0.12, y: -side * 0.05) {
        edge.setFill()
        rounded(r.offsetBy(dx: 0, dy: -side * 0.07), radius).fill()
    }
    face.setFill()
    rounded(r, radius).fill()
    color(0xFFFFFF, 0.25).setStroke()
    let rim = rounded(r.insetBy(dx: side * 0.01, dy: side * 0.01), radius)
    rim.lineWidth = side * 0.012
    rim.stroke()
    draw(label, centerX: 0, centerY: side * 0.02)
    NSGraphicsContext.restoreGraphicsState()
}

func swapArrow(from a: NSPoint, to b: NSPoint, bend: CGFloat, width: CGFloat, color c: NSColor) {
    let mid = NSPoint(x: (a.x + b.x) / 2 + bend, y: (a.y + b.y) / 2 + bend)
    let p = NSBezierPath()
    p.move(to: a)
    p.curve(to: b, controlPoint1: mid, controlPoint2: mid)
    p.lineWidth = width
    p.lineCapStyle = .round
    c.setStroke()
    p.stroke()
    let angle = atan2(b.y - mid.y, b.x - mid.x)
    let head = width * 2.6
    let h = NSBezierPath()
    h.move(to: NSPoint(x: b.x - head * cos(angle - 0.55), y: b.y - head * sin(angle - 0.55)))
    h.line(to: b)
    h.line(to: NSPoint(x: b.x - head * cos(angle + 0.55), y: b.y - head * sin(angle + 0.55)))
    h.lineWidth = width
    h.lineCapStyle = .round
    h.lineJoinStyle = .round
    h.stroke()
}

func drawIcon(in canvas: NSRect) {
    let s = canvas.width
    let tile = canvas.insetBy(dx: s * 0.098, dy: s * 0.098)
    let tilePath = rounded(tile, tile.width * 0.225)
    shadow(color(0x000000, 0.3), blur: s * 0.03, y: -s * 0.012) {
        coral.setFill()
        tilePath.fill()
    }
    clipped(tilePath) {
        NSGradient(colors: [color(0xFF7A6B), coralDeep, plum], atLocations: [0, 0.55, 1],
                   colorSpace: .sRGB)!.draw(in: tile, angle: -60)
        NSGradient(colors: [color(0xFFFFFF, 0.28), color(0xFFFFFF, 0)])!
            .draw(in: NSBezierPath(ovalIn: NSRect(x: tile.minX - s * 0.2, y: tile.midY, width: s * 0.8, height: s * 0.7)),
                  relativeCenterPosition: .zero)
    }

    let side = s * 0.36
    let back = NSPoint(x: tile.minX + tile.width * 0.34, y: tile.minY + tile.height * 0.64)
    let front = NSPoint(x: tile.minX + tile.width * 0.64, y: tile.minY + tile.height * 0.36)
    keyCap(center: back, side: side, angle: 9, face: color(0x2A1E33), edge: color(0x120C17),
           label: text("A", font(side * 0.5, .heavy), color(0xFFFFFF)))
    keyCap(center: front, side: side, angle: -7, face: color(0xFFFFFF), edge: color(0xD9CFD6),
           label: text("ش", persianFont(side * 0.5, bold: true), coralDeep))

    let w = s * 0.032
    swapArrow(from: NSPoint(x: tile.minX + tile.width * 0.64, y: tile.minY + tile.height * 0.87),
              to: NSPoint(x: tile.minX + tile.width * 0.87, y: tile.minY + tile.height * 0.64),
              bend: s * 0.05, width: w, color: color(0xFFFFFF))
    swapArrow(from: NSPoint(x: tile.minX + tile.width * 0.36, y: tile.minY + tile.height * 0.13),
              to: NSPoint(x: tile.minX + tile.width * 0.13, y: tile.minY + tile.height * 0.36),
              bend: -s * 0.05, width: w, color: color(0xFFFFFF))
}

let cachedIcon: NSImage = {
    let rep = makeRep(512, 512)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    drawIcon(in: NSRect(x: 0, y: 0, width: 512, height: 512))
    NSGraphicsContext.restoreGraphicsState()
    let img = NSImage(size: NSSize(width: 512, height: 512))
    img.addRepresentation(rep)
    return img
}()

// MARK: - Cover: Exact Raycast Window Capture look

func drawKeycap(_ label: String, right x: CGFloat, centerY y: CGFloat, scale k: CGFloat) -> CGFloat {
    let str = text(label, font(13 * k, .medium), color(0xFFFFFF, 0.72))
    let b = str.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
    let w = max(25 * k, ceil(b.width) + 14 * k)
    let h = 24 * k
    let r = NSRect(x: x - w, y: y - h / 2, width: w, height: h)
    color(0xFFFFFF, 0.08).setFill()
    rounded(r, 6 * k).fill()
    color(0xFFFFFF, 0.14).setStroke()
    let border = rounded(r.insetBy(dx: 0.5 * k, dy: 0.5 * k), 6 * k)
    border.lineWidth = 1 * k
    border.stroke()
    draw(str, centerX: r.midX, centerY: y)
    return r.minX
}

func drawArrowPill(centerX cx: CGFloat, centerY cy: CGFloat, scale k: CGFloat) {
    let w = 44 * k
    let h = 28 * k
    let r = NSRect(x: cx - w / 2, y: cy - h / 2, width: w, height: h)
    coral.withAlphaComponent(0.16).setFill()
    rounded(r, 14 * k).fill()
    coral.withAlphaComponent(0.38).setStroke()
    let rim = rounded(r.insetBy(dx: 0.5 * k, dy: 0.5 * k), 14 * k)
    rim.lineWidth = 1 * k
    rim.stroke()

    let p = NSBezierPath()
    let halfLen = 7 * k
    let head = 4.5 * k
    p.move(to: NSPoint(x: cx - halfLen, y: cy))
    p.line(to: NSPoint(x: cx + halfLen, y: cy))
    p.move(to: NSPoint(x: cx + halfLen - head, y: cy + head))
    p.line(to: NSPoint(x: cx + halfLen, y: cy))
    p.line(to: NSPoint(x: cx + halfLen - head, y: cy - head))
    p.lineWidth = 2 * k
    p.lineCapStyle = .round
    p.lineJoinStyle = .round
    coral.setStroke()
    p.stroke()
}

func drawCover(in canvas: NSRect) {
    let k = canvas.width / 1280

    // 1. Use the real macOS Window Capture image as the base, so the wallpaper and window shadow are 100% genuine.
    if let shot = NSImage(contentsOfFile: "metadata/layoutfixer-1.png") {
        // Center-crop 2000x1250 (16:10) into 2:1 while keeping the Raycast window centered.
        let srcH: CGFloat = 1000
        let srcRect = NSRect(x: 0, y: (1250 - srcH) / 2, width: 2000, height: srcH)
        shot.draw(in: canvas, from: srcRect, operation: .copy, fraction: 1.0)
    }

    // 2. Replace the interior of the captured Raycast window with a clean, ultra-minimal 3-row showcase.
    // In the 2000x1250 capture cropped to y=[125..1125], the window (250..1750, 151..1099) maps to:
    let win = NSRect(x: 160 * k, y: 16.6 * k, width: 960 * k, height: 606.7 * k)
    let winRadius = 16 * k
    let winPath = rounded(win, winRadius)

    clipped(winPath) {
        // Authentic Raycast dark frosted slate surface.
        NSGradient(colors: [color(0x282E3D), color(0x222736)], atLocations: [0, 1], colorSpace: .sRGB)!
            .draw(in: win, angle: -90)
        NSGradient(colors: [color(0xFFFFFF, 0.06), color(0xFFFFFF, 0)], atLocations: [0, 1], colorSpace: .sRGB)!
            .draw(in: NSRect(x: win.minX, y: win.maxY - 120 * k, width: win.width, height: 120 * k), angle: -90)
    }

    // Window inner specular border
    color(0xFFFFFF, 0.16).setStroke()
    let innerRim = rounded(win.insetBy(dx: 0.75 * k, dy: 0.75 * k), winRadius - 0.75 * k)
    innerRim.lineWidth = 1.2 * k
    innerRim.stroke()

    // 3. Top search/title bar
    let topH = 74 * k
    let topY = win.maxY - topH / 2
    color(0xFFFFFF, 0.08).setFill()
    NSRect(x: win.minX, y: win.maxY - topH, width: win.width, height: 1 * k).fill()

    let iconRect = NSRect(x: win.minX + 28 * k, y: topY - 22 * k, width: 44 * k, height: 44 * k)
    cachedIcon.draw(in: iconRect)

    let nameFrame = draw(text("LayoutFixer", font(22 * k, .semibold), textHigh, kern: -0.3 * k),
                         x: iconRect.maxX + 12 * k, centerY: topY)
    draw(text("English ⇄ Persian for Raycast", font(17 * k, .regular), textLow),
         x: nameFrame.maxX + 14 * k, centerY: topY)

    var hx = win.maxX - 28 * k
    hx = drawKeycap("F", right: hx, centerY: topY, scale: k) - 5 * k
    hx = drawKeycap("⌥", right: hx, centerY: topY, scale: k) - 5 * k
    _ = drawKeycap("⌃", right: hx, centerY: topY, scale: k)

    // 4. Three symmetric conversion cards — mistyped on the left of the arrow, fixed on the right.
    let footerH = 62 * k
    let bodyBottom = win.minY + footerH
    let bodyH = win.height - topH - footerH
    let rowH = 112 * k
    let rowGap = 18 * k
    let totalRowsH = rowH * 3 + rowGap * 2
    let firstRowTop = bodyBottom + (bodyH + totalRowsH) / 2

    let items: [(wrong: String, wrongFa: Bool, right: String, rightFa: Bool)] = [
        ("صشدف فخ لقشذ معدزا", true, "want to grab lunch", false),
        ("sghl o,fd?", false, "سلام خوبی؟", true),
        ("salam mikham beram", false, "سلام می‌خوام برم", true),
    ]

    let centerX = win.midX
    let gapFromCenter = 48 * k

    for (idx, item) in items.enumerated() {
        let rY = firstRowTop - CGFloat(idx) * (rowH + rowGap) - rowH
        let rowRect = NSRect(x: win.minX + 28 * k, y: rY, width: win.width - 56 * k, height: rowH)
        let selected = idx == 0

        color(0xFFFFFF, selected ? 0.08 : 0.035).setFill()
        rounded(rowRect, 14 * k).fill()
        color(0xFFFFFF, selected ? 0.15 : 0.07).setStroke()
        let rb = rounded(rowRect.insetBy(dx: 0.5 * k, dy: 0.5 * k), 14 * k)
        rb.lineWidth = 1 * k
        rb.stroke()

        let cy = rowRect.midY

        // Left of center: mistyped text (right-aligned to centerX - gapFromCenter)
        let wrongFont = item.wrongFa ? persianFont(25 * k) : font(24 * k, .medium, mono: true)
        draw(text(item.wrong, wrongFont, textMid), right: centerX - gapFromCenter, centerY: cy)

        // Center: arrow pill
        drawArrowPill(centerX: centerX, centerY: cy, scale: k)

        // Right of center: fixed text (left-aligned to centerX + gapFromCenter)
        let rightFont = item.rightFa ? persianFont(27 * k, bold: true) : font(26 * k, .semibold)
        draw(text(item.right, rightFont, textHigh), x: centerX + gapFromCenter, centerY: cy)
    }

    // 5. Bottom footer bar (authentic Raycast floating pills)
    let footY = win.minY + footerH / 2
    let leftPill = NSRect(x: win.minX + 24 * k, y: footY - 18 * k, width: 156 * k, height: 36 * k)
    color(0xFFFFFF, 0.07).setFill()
    rounded(leftPill, 18 * k).fill()
    color(0xFFFFFF, 0.12).setStroke()
    rounded(leftPill.insetBy(dx: 0.5 * k, dy: 0.5 * k), 18 * k).stroke()
    cachedIcon.draw(in: NSRect(x: leftPill.minX + 10 * k, y: footY - 11 * k, width: 22 * k, height: 22 * k))
    draw(text("LayoutFixer", font(13.5 * k, .medium), textMid), x: leftPill.minX + 38 * k, centerY: footY)

    let rightPill = NSRect(x: win.maxX - 278 * k, y: footY - 18 * k, width: 254 * k, height: 36 * k)
    color(0xFFFFFF, 0.07).setFill()
    rounded(rightPill, 18 * k).fill()
    color(0xFFFFFF, 0.12).setStroke()
    rounded(rightPill.insetBy(dx: 0.5 * k, dy: 0.5 * k), 18 * k).stroke()
    draw(text("Fix Selected Text", font(13.5 * k, .semibold), textHigh), x: rightPill.minX + 16 * k, centerY: footY)
    _ = drawKeycap("↵", right: rightPill.minX + 158 * k, centerY: footY, scale: k)
    draw(text("Actions", font(13 * k, .medium), textMid), x: rightPill.minX + 170 * k, centerY: footY)
    _ = drawKeycap("⌘K", right: rightPill.maxX - 10 * k, centerY: footY, scale: k)
}

// MARK: - Output

render(512, 512, to: "assets/extension-icon.png") { drawIcon(in: $0) }
render(1024, 1024, to: "media/icon.png") { drawIcon(in: $0) }
render(2560, 1280, to: "media/cover.png") { drawCover(in: $0) }
render(1280, 640, to: "media/social-preview.png") { drawCover(in: $0) }
