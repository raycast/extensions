// Draws the LayoutFixer for Raycast artwork.
// Usage (from the repo root): swift design/make-artwork.swift
// Writes:
//   assets/extension-icon.png   512x512   Raycast extension icon
//   media/icon.png              1024x1024 icon for the README
//   media/cover.png             2560x1280 README hero
//   media/social-preview.png    1280x640  GitHub social preview

import AppKit

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
    for name in bold ? ["SFArabic-Bold", "SFArabic-Semibold"] : ["SFArabic-Regular", "SFArabic-Medium"] {
        if let f = NSFont(name: name, size: size) { return f }
    }
    return font(size, bold ? .bold : .regular)
}

func text(_ s: String, _ f: NSFont, _ c: NSColor, kern: CGFloat = 0) -> NSAttributedString {
    NSAttributedString(string: s, attributes: [.font: f, .foregroundColor: c, .kern: kern])
}

func size(_ s: NSAttributedString) -> NSRect {
    s.boundingRect(with: .zero, options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
}

/// Draws text with its visual left edge at x and its glyphs vertically centred on y.
@discardableResult
func draw(_ s: NSAttributedString, x: CGFloat, centerY y: CGFloat) -> NSRect {
    let b = size(s)
    s.draw(at: NSPoint(x: x - b.minX, y: y - b.midY))
    return NSRect(x: x, y: y - b.height / 2, width: b.width, height: b.height)
}

@discardableResult
func draw(_ s: NSAttributedString, right x: CGFloat, centerY y: CGFloat) -> NSRect {
    draw(s, x: x - size(s).width, centerY: y)
}

@discardableResult
func draw(_ s: NSAttributedString, centerX x: CGFloat, centerY y: CGFloat) -> NSRect {
    draw(s, x: x - size(s).width / 2, centerY: y)
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

func render(_ width: Int, _ height: Int, to path: String, _ body: (NSRect) -> Void) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
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
let ink = color(0x14121A)
let panel = color(0x1E1B24)
let panelLine = color(0xFFFFFF, 0.08)
let textHigh = color(0xFFFFFF, 0.94)
let textMid = color(0xFFFFFF, 0.62)
let textLow = color(0xFFFFFF, 0.38)
let mint = color(0x5EEAD4)

// MARK: - Icon

/// A key cap: rounded square with a darker base edge, tilted by `angle` degrees around its centre.
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

/// A curved swap arrow between the two keys.
func swapArrow(from a: NSPoint, to b: NSPoint, bend: CGFloat, width: CGFloat, color c: NSColor) {
    let mid = NSPoint(x: (a.x + b.x) / 2 + bend, y: (a.y + b.y) / 2 + bend)
    let p = NSBezierPath()
    p.move(to: a)
    p.curve(to: b, controlPoint1: mid, controlPoint2: mid)
    p.lineWidth = width
    p.lineCapStyle = .round
    c.setStroke()
    p.stroke()
    // Arrow head pointing along the end of the curve.
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
    // macOS-style tile with a margin, like Big Sur app icons.
    let tile = canvas.insetBy(dx: s * 0.098, dy: s * 0.098)
    let tilePath = rounded(tile, tile.width * 0.225)
    shadow(color(0x000000, 0.3), blur: s * 0.03, y: -s * 0.012) {
        coral.setFill()
        tilePath.fill()
    }
    clipped(tilePath) {
        NSGradient(colors: [color(0xFF7A6B), coralDeep, plum], atLocations: [0, 0.55, 1],
                   colorSpace: .sRGB)!.draw(in: tile, angle: -60)
        // Soft highlight in the top-left corner.
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

    // Swap arrows in the free corners.
    let w = s * 0.032
    swapArrow(from: NSPoint(x: tile.minX + tile.width * 0.64, y: tile.minY + tile.height * 0.87),
              to: NSPoint(x: tile.minX + tile.width * 0.87, y: tile.minY + tile.height * 0.64),
              bend: s * 0.05, width: w, color: color(0xFFFFFF))
    swapArrow(from: NSPoint(x: tile.minX + tile.width * 0.36, y: tile.minY + tile.height * 0.13),
              to: NSPoint(x: tile.minX + tile.width * 0.13, y: tile.minY + tile.height * 0.36),
              bend: -s * 0.05, width: w, color: color(0xFFFFFF))
}

// MARK: - Cover

struct Row {
    let title: String
    let subtitle: String
    let tint: NSColor
    let glyph: String
    let hotkey: String?
}

let rows: [Row] = [
    Row(title: "Fix Selected Text", subtitle: "LayoutFixer", tint: coral, glyph: "⇄", hotkey: "⌃ ⌥ F"),
    Row(title: "Check Spelling", subtitle: "LayoutFixer", tint: color(0xF5A524), glyph: "✓", hotkey: "⌃ ⌥ S"),
    Row(title: "Finglish to Persian", subtitle: "salam → سلام", tint: color(0x8B5CF6), glyph: "Aa", hotkey: "⌃ ⌥ P"),
    Row(title: "Persian Tools", subtitle: "۱۲۵ · ۱۴۰۵/۰۸/۰۶", tint: color(0x22C55E), glyph: "#", hotkey: "⌃ ⌥ T"),
    Row(title: "AI Writing Tools", subtitle: "Formal · Casual · Translate", tint: color(0x3B82F6), glyph: "✦", hotkey: "⌃ ⌥ A"),
]

func chip(_ label: String, x: CGFloat, centerY y: CGFloat, scale k: CGFloat, persian: Bool = false) -> CGFloat {
    let str = text(label, persian ? persianFont(22 * k) : font(22 * k, .medium), textHigh)
    let b = size(str)
    let r = NSRect(x: x, y: y - 24 * k, width: b.width + 36 * k, height: 48 * k)
    color(0xFFFFFF, 0.07).setFill()
    rounded(r, 24 * k).fill()
    panelLine.setStroke()
    let border = rounded(r.insetBy(dx: 0.5, dy: 0.5), 24 * k)
    border.lineWidth = 1.5 * k
    border.stroke()
    draw(str, x: x + 18 * k, centerY: y)
    return r.maxX
}

func drawCover(in canvas: NSRect) {
    let k = canvas.width / 1280

    // Background: near-black with coral and plum glows.
    ink.setFill()
    canvas.fill()
    NSGradient(colors: [coral.withAlphaComponent(0.42), coral.withAlphaComponent(0)])!
        .draw(in: NSBezierPath(ovalIn: NSRect(x: 620 * k, y: 120 * k, width: 900 * k, height: 700 * k)),
              relativeCenterPosition: .zero)
    NSGradient(colors: [plum.withAlphaComponent(0.55), plum.withAlphaComponent(0)])!
        .draw(in: NSBezierPath(ovalIn: NSRect(x: -260 * k, y: -320 * k, width: 900 * k, height: 760 * k)),
              relativeCenterPosition: .zero)

    // Left column: icon, name, tagline, before/after, chips.
    let left = 84 * k
    let iconSide = 132 * k
    let iconImage = NSImage(size: NSSize(width: 1024, height: 1024))
    iconImage.addRepresentation({
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024, bitsPerSample: 8,
                                   samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                   bytesPerRow: 0, bitsPerPixel: 0)!
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
        drawIcon(in: NSRect(x: 0, y: 0, width: 1024, height: 1024))
        NSGraphicsContext.restoreGraphicsState()
        return rep
    }())
    iconImage.draw(in: NSRect(x: left - iconSide * 0.1, y: 452 * k, width: iconSide, height: iconSide))

    draw(text("LayoutFixer", font(76 * k, .heavy), textHigh, kern: -1.5 * k), x: left, centerY: 400 * k)
    draw(text("for Raycast", font(40 * k, .semibold), coral), x: left + 2 * k, centerY: 340 * k)
    draw(text("Wrong keyboard layout? One hotkey.", font(27 * k, .medium), textMid), x: left + 2 * k, centerY: 284 * k)

    // Before → after.
    let card = NSRect(x: left, y: 164 * k, width: 470 * k, height: 78 * k)
    color(0xFFFFFF, 0.06).setFill()
    rounded(card, 18 * k).fill()
    let before = text("صشدف فخ لقشذ", persianFont(28 * k), textMid)
    let arrow = text("→", font(28 * k, .semibold), coral)
    let after = text("want to grab", font(28 * k, .semibold, mono: false), textHigh)
    var x = card.minX + 26 * k
    x = draw(before, x: x, centerY: card.midY).maxX + 18 * k
    x = draw(arrow, x: x, centerY: card.midY).maxX + 18 * k
    draw(after, x: x, centerY: card.midY)

    var cx = left
    cx = chip("English ⇄ فارسی", x: cx, centerY: 106 * k, scale: k) + 12 * k
    cx = chip("Spelling", x: cx, centerY: 106 * k, scale: k) + 12 * k
    _ = chip("Open source", x: cx, centerY: 106 * k, scale: k)

    // Right: a Raycast-style command window.
    let win = NSRect(x: 650 * k, y: 70 * k, width: 560 * k, height: 500 * k)
    shadow(color(0x000000, 0.6), blur: 60 * k, y: -24 * k) {
        panel.setFill()
        rounded(win, 22 * k).fill()
    }
    panelLine.setStroke()
    let outline = rounded(win.insetBy(dx: 0.75, dy: 0.75), 22 * k)
    outline.lineWidth = 1.5 * k
    outline.stroke()

    // Search bar.
    let searchY = win.maxY - 50 * k
    draw(text("fix", font(26 * k, .regular), textHigh), x: win.minX + 30 * k, centerY: searchY)
    coral.setFill()
    NSRect(x: win.minX + 72 * k, y: searchY - 15 * k, width: 2.5 * k, height: 30 * k).fill()
    draw(text("LayoutFixer", font(17 * k, .medium), textLow), right: win.maxX - 30 * k, centerY: searchY)
    panelLine.setFill()
    NSRect(x: win.minX, y: win.maxY - 100 * k, width: win.width, height: 1.5 * k).fill()

    draw(text("Commands", font(15 * k, .semibold), textLow), x: win.minX + 30 * k, centerY: win.maxY - 126 * k)

    let rowH = 54 * k
    var rowTop = win.maxY - 146 * k
    for (i, row) in rows.enumerated() {
        let r = NSRect(x: win.minX + 12 * k, y: rowTop - rowH, width: win.width - 24 * k, height: rowH)
        if i == 0 {
            color(0xFFFFFF, 0.09).setFill()
            rounded(r, 12 * k).fill()
        }
        let iconRect = NSRect(x: r.minX + 16 * k, y: r.midY - 15 * k, width: 30 * k, height: 30 * k)
        row.tint.setFill()
        rounded(iconRect, 8 * k).fill()
        draw(text(row.glyph, font(16 * k, .bold), color(0xFFFFFF)), centerX: iconRect.midX, centerY: iconRect.midY)
        let titleRect = draw(text(row.title, font(20 * k, .medium), textHigh), x: iconRect.maxX + 16 * k, centerY: r.midY)
        let persianSubtitle = row.subtitle.unicodeScalars.contains { (0x0600...0x06FF).contains($0.value) }
        draw(text(row.subtitle, persianSubtitle ? persianFont(17 * k) : font(17 * k), textLow),
             x: titleRect.maxX + 12 * k, centerY: r.midY)
        if let hotkey = row.hotkey {
            draw(text(hotkey, font(16 * k, .medium), textLow), right: r.maxX - 16 * k, centerY: r.midY)
        }
        rowTop -= rowH + 2 * k
    }

    // Action bar.
    panelLine.setFill()
    NSRect(x: win.minX, y: win.minY + 50 * k, width: win.width, height: 1.5 * k).fill()
    draw(text("Fix Selected Text", font(16 * k, .medium), textMid), right: win.maxX - 86 * k, centerY: win.minY + 25 * k)
    draw(text("↵", font(17 * k, .semibold), textLow), right: win.maxX - 30 * k, centerY: win.minY + 25 * k)
    coral.setFill()
    NSBezierPath(ovalIn: NSRect(x: win.minX + 26 * k, y: win.minY + 17 * k, width: 16 * k, height: 16 * k)).fill()
    draw(text("Done: want to grab lunch today", font(16 * k, .medium), textMid), x: win.minX + 52 * k,
         centerY: win.minY + 25 * k)
}

// MARK: - Output

render(512, 512, to: "assets/extension-icon.png") { drawIcon(in: $0) }
render(1024, 1024, to: "media/icon.png") { drawIcon(in: $0) }
render(2560, 1280, to: "media/cover.png") { drawCover(in: $0) }
render(1280, 640, to: "media/social-preview.png") { drawCover(in: $0) }
