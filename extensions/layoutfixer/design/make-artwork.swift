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
let ink = color(0x0B0C14)
let textHigh = color(0xFFFFFF, 0.96)
let textMid = color(0xFFFFFF, 0.68)
let textLow = color(0xFFFFFF, 0.42)
let mint = color(0x34D399)

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

let cachedIconImage: NSImage = {
    let rep = makeRep(512, 512)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    drawIcon(in: NSRect(x: 0, y: 0, width: 512, height: 512))
    NSGraphicsContext.restoreGraphicsState()
    let img = NSImage(size: NSSize(width: 512, height: 512))
    img.addRepresentation(rep)
    return img
}()

// MARK: - Glass & Background

func drawWallpaper(in canvas: NSRect) {
    let k = canvas.width / 1280
    NSGradient(colors: [color(0x0E1222), color(0x131629), color(0x090A12)],
               atLocations: [0, 0.5, 1], colorSpace: .sRGB)!.draw(in: canvas, angle: -32)

    // macOS-style diagonal light folds, like the Sequoia wallpaper.
    let folds: [(CGFloat, CGFloat, CGFloat, NSColor)] = [
        (-120, 620, 420, color(0x3B5BDB, 0.26)),
        (140, 560, 380, color(0x6366F1, 0.22)),
        (460, 520, 460, color(0xFF6363, 0.28)),
        (760, 460, 420, color(0xE0365A, 0.24)),
        (260, -160, 520, color(0x8B5CF6, 0.22)),
    ]
    for (x, y, r, c) in folds {
        let oval = NSRect(x: (x - r) * k, y: (y - r * 0.7) * k, width: r * 2.2 * k, height: r * 1.5 * k)
        NSGradient(colors: [c, c.withAlphaComponent(0)])!
            .draw(in: NSBezierPath(ovalIn: oval), relativeCenterPosition: .zero)
    }

    // diagonal architectural ribbons
    for i in 0..<6 {
        let shift = CGFloat(i) * 115 * k
        let p = NSBezierPath()
        p.move(to: NSPoint(x: -140 * k + shift, y: 680 * k))
        p.curve(to: NSPoint(x: 780 * k + shift, y: -80 * k),
                controlPoint1: NSPoint(x: 220 * k + shift, y: 420 * k),
                controlPoint2: NSPoint(x: 460 * k + shift, y: 120 * k))
        p.line(to: NSPoint(x: 900 * k + shift, y: -80 * k))
        p.curve(to: NSPoint(x: -20 * k + shift, y: 680 * k),
                controlPoint1: NSPoint(x: 580 * k + shift, y: 150 * k),
                controlPoint2: NSPoint(x: 340 * k + shift, y: 450 * k))
        p.close()
        NSGradient(colors: [color(0xFFFFFF, 0.055), color(0xFFFFFF, 0.008), color(0x000000, 0.14)],
                   atLocations: [0, 0.45, 1], colorSpace: .sRGB)!.draw(in: p, angle: -42)
    }

    // Raycast coral glow behind the right window.
    NSGradient(colors: [coral.withAlphaComponent(0.32), coral.withAlphaComponent(0)])!
        .draw(in: NSBezierPath(ovalIn: NSRect(x: 610 * k, y: 80 * k, width: 660 * k, height: 500 * k)),
              relativeCenterPosition: .zero)
}

func makeBlurredWallpaper(width: Int, height: Int, radius: Double) -> NSImage {
    let rep = makeRep(width, height)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    drawWallpaper(in: NSRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()

    let ci = CIImage(bitmapImageRep: rep)!
        .clampedToExtent()
        .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: radius])
        .cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
    let ctx = CIContext(options: nil)
    let cg = ctx.createCGImage(ci, from: CGRect(x: 0, y: 0, width: width, height: height))!
    return NSImage(cgImage: cg, size: NSSize(width: width, height: height))
}

/// Draws an Apple/Raycast frosted-glass surface with specular top rim and inner glow.
func glassCard(_ r: NSRect, radius: CGFloat, blur: NSImage, canvas: NSRect, tint: NSColor,
               scale k: CGFloat, shadowStrength: CGFloat = 0.55) {
    let path = rounded(r, radius)
    shadow(color(0x000000, shadowStrength), blur: 48 * k, y: -22 * k) {
        color(0x0F111A, 0.5).setFill()
        path.fill()
    }
    clipped(path) {
        blur.draw(in: canvas)
        tint.setFill()
        r.fill()
        // Top-left glass sheen.
        NSGradient(colors: [color(0xFFFFFF, 0.16), color(0xFFFFFF, 0.03), color(0xFFFFFF, 0)],
                   atLocations: [0, 0.38, 1], colorSpace: .sRGB)!.draw(in: r, angle: -70)
    }
    // Outer dark hairline + inner bright specular border.
    color(0x000000, 0.45).setStroke()
    let outer = rounded(r.insetBy(dx: -0.5 * k, dy: -0.5 * k), radius + 0.5 * k)
    outer.lineWidth = 1 * k
    outer.stroke()

    let inner = r.insetBy(dx: 0.75 * k, dy: 0.75 * k)
    let innerPath = rounded(inner, max(1, radius - 0.75 * k))
    NSGraphicsContext.saveGraphicsState()
    innerPath.lineWidth = 1.4 * k
    color(0xFFFFFF, 0.22).setStroke()
    innerPath.stroke()
    NSGraphicsContext.restoreGraphicsState()

    // Extra bright top edge, like macOS dark glass windows.
    clipped(rounded(NSRect(x: r.minX, y: r.maxY - radius, width: r.width, height: radius), radius)) {
        color(0xFFFFFF, 0.28).setStroke()
        innerPath.lineWidth = 1.6 * k
        innerPath.stroke()
    }
}

func keycapBadge(_ label: String, right x: CGFloat, centerY y: CGFloat, scale k: CGFloat) -> CGFloat {
    let str = text(label, font(13 * k, .semibold), color(0xFFFFFF, 0.72))
    let b = size(str)
    let w = max(24 * k, b.width + 13 * k)
    let h = 23 * k
    let r = NSRect(x: x - w, y: y - h / 2, width: w, height: h)
    color(0xFFFFFF, 0.08).setFill()
    rounded(r, 6 * k).fill()
    color(0xFFFFFF, 0.14).setStroke()
    let rim = rounded(r.insetBy(dx: 0.5 * k, dy: 0.5 * k), 6 * k)
    rim.lineWidth = 1 * k
    rim.stroke()
    draw(str, centerX: r.midX, centerY: y)
    return r.minX
}

func keycapGroup(_ keys: [String], right x: CGFloat, centerY y: CGFloat, scale k: CGFloat) -> CGFloat {
    var cur = x
    for key in keys.reversed() {
        cur = keycapBadge(key, right: cur, centerY: y, scale: k) - 4 * k
    }
    return cur
}

func glassPill(_ label: String, x: CGFloat, centerY y: CGFloat, blur: NSImage, canvas: NSRect,
               scale k: CGFloat, dot: NSColor? = nil) -> CGFloat {
    let hasPersian = label.unicodeScalars.contains { (0x0600...0x06FF).contains($0.value) }
    let str = text(label, hasPersian ? persianFont(18 * k, bold: true) : font(18 * k, .medium), textHigh)
    let b = size(str)
    let dotSpace = dot != nil ? 18 * k : 0
    let r = NSRect(x: x, y: y - 21 * k, width: b.width + 34 * k + dotSpace, height: 42 * k)
    glassCard(r, radius: 21 * k, blur: blur, canvas: canvas, tint: color(0x171A26, 0.62),
              scale: k, shadowStrength: 0.25)
    var tx = x + 17 * k
    if let d = dot {
        d.setFill()
        NSBezierPath(ovalIn: NSRect(x: tx, y: y - 4.5 * k, width: 9 * k, height: 9 * k)).fill()
        tx += 16 * k
    }
    draw(str, x: tx, centerY: y)
    return r.maxX
}

// MARK: - Cover

struct CommandRow {
    let title: String
    let badge: String?
    let keys: [String]
    let selected: Bool
}

let commandRows: [CommandRow] = [
    CommandRow(title: "Fix Selected Text", badge: "Command", keys: ["⌃", "⌥", "F"], selected: true),
    CommandRow(title: "Undo Last Fix", badge: "Command", keys: ["⌃", "⌥", "Z"], selected: false),
    CommandRow(title: "Check Spelling", badge: "Command", keys: ["⌃", "⌥", "S"], selected: false),
    CommandRow(title: "Finglish to Persian", badge: "salam → سلام", keys: ["⌃", "⌥", "P"], selected: false),
    CommandRow(title: "Persian Tools", badge: "۱۲۵ · ۱۴۰۵/۰۸/۰۶", keys: ["⌃", "⌥", "T"], selected: false),
    CommandRow(title: "AI Writing Tools", badge: "Raycast AI", keys: ["⌃", "⌥", "A"], selected: false),
]

func drawSmallExtIcon(in r: NSRect, scale k: CGFloat) {
    cachedIconImage.draw(in: r.insetBy(dx: -2 * k, dy: -2 * k))
}

func drawCover(in canvas: NSRect) {
    let k = canvas.width / 1280
    drawWallpaper(in: canvas)
    let blur = makeBlurredWallpaper(width: Int(canvas.width), height: Int(canvas.height), radius: Double(28 * k))

    // Left column: icon, Raycast badge, title, tagline, glassy transformation card, pills.
    let left = 72 * k

    // Top badge: Raycast Extension
    let badgeRect = NSRect(x: left, y: 522 * k, width: 218 * k, height: 36 * k)
    glassCard(badgeRect, radius: 18 * k, blur: blur, canvas: canvas, tint: color(0x181B28, 0.65),
              scale: k, shadowStrength: 0.22)
    coral.setFill()
    NSBezierPath(ovalIn: NSRect(x: badgeRect.minX + 14 * k, y: badgeRect.midY - 4.5 * k, width: 9 * k, height: 9 * k)).fill()
    draw(text("Raycast Extension · macOS", font(14 * k, .semibold), textMid),
         x: badgeRect.minX + 30 * k, centerY: badgeRect.midY)

    // App icon + Title
    let iconSide = 108 * k
    cachedIconImage.draw(in: NSRect(x: left - 8 * k, y: 392 * k, width: iconSide, height: iconSide))
    draw(text("LayoutFixer", font(66 * k, .heavy), textHigh, kern: -1.6 * k),
         x: left + iconSide + 6 * k, centerY: 462 * k)
    draw(text("English ⇄ Persian, in one hotkey.", font(24 * k, .medium), coral),
         x: left + iconSide + 8 * k, centerY: 418 * k)

    draw(text("Retype text from the wrong keyboard layout, fix spelling,", font(20 * k, .regular), textMid),
         x: left, centerY: 356 * k)
    draw(text("convert Finglish, and clean up Persian half-spaces.", font(20 * k, .regular), textMid),
         x: left, centerY: 326 * k)

    // Glassy before → after showcase card.
    let transCard = NSRect(x: left, y: 152 * k, width: 496 * k, height: 140 * k)
    glassCard(transCard, radius: 22 * k, blur: blur, canvas: canvas, tint: color(0x141724, 0.66),
              scale: k, shadowStrength: 0.4)

    // Row 1: Persian layout -> English
    let row1Y = transCard.maxY - 42 * k
    draw(text("صشدف فخ لقشذ", persianFont(20 * k), color(0xFFFFFF, 0.56)),
         x: transCard.minX + 22 * k, centerY: row1Y)
    let arrow1X = transCard.minX + 168 * k
    draw(text("→", font(20 * k, .bold), coral), x: arrow1X, centerY: row1Y)
    draw(text("want to grab", font(20 * k, .semibold), textHigh),
         x: arrow1X + 26 * k, centerY: row1Y)
    _ = keycapGroup(["⌃", "⌥", "F"], right: transCard.maxX - 18 * k, centerY: row1Y, scale: k)

    // Divider
    color(0xFFFFFF, 0.08).setFill()
    NSRect(x: transCard.minX + 20 * k, y: transCard.midY - 0.5 * k, width: transCard.width - 40 * k, height: 1 * k).fill()

    // Row 2: English layout -> Persian
    let row2Y = transCard.minY + 42 * k
    draw(text("sghl o,fd?", font(21 * k, .medium, mono: true), color(0xFFFFFF, 0.52)),
         x: transCard.minX + 22 * k, centerY: row2Y)
    draw(text("→", font(20 * k, .bold), mint), x: arrow1X, centerY: row2Y)
    draw(text("سلام خوبی؟", persianFont(22 * k, bold: true), textHigh),
         x: arrow1X + 28 * k, centerY: row2Y)

    let pillRect = NSRect(x: transCard.maxX - 96 * k, y: row2Y - 12 * k, width: 78 * k, height: 24 * k)
    mint.withAlphaComponent(0.16).setFill()
    rounded(pillRect, 12 * k).fill()
    draw(text("→ فارسی", persianFont(13 * k, bold: true), mint), centerX: pillRect.midX, centerY: row2Y)

    // Feature pills at bottom left
    var px = left
    let pillY = 92 * k
    px = glassPill("Smart Detection", x: px, centerY: pillY, blur: blur, canvas: canvas, scale: k, dot: coral) + 10 * k
    px = glassPill("Finglish", x: px, centerY: pillY, blur: blur, canvas: canvas, scale: k) + 10 * k
    _ = glassPill("نیم‌فاصله", x: px, centerY: pillY, blur: blur, canvas: canvas, scale: k)

    // Right: Authentic Raycast frosted-glass window.
    let win = NSRect(x: 612 * k, y: 62 * k, width: 598 * k, height: 516 * k)
    glassCard(win, radius: 20 * k, blur: blur, canvas: canvas, tint: color(0x161822, 0.72),
              scale: k, shadowStrength: 0.65)

    // Raycast top search bar
    let searchY = win.maxY - 38 * k
    // Back button pill
    let backRect = NSRect(x: win.minX + 20 * k, y: searchY - 13 * k, width: 26 * k, height: 26 * k)
    color(0xFFFFFF, 0.08).setFill()
    rounded(backRect, 7 * k).fill()
    draw(text("‹", font(18 * k, .semibold), textMid), centerX: backRect.midX, centerY: searchY + 1 * k)

    draw(text("layoutfixer", font(20 * k, .regular), textHigh), x: backRect.maxX + 14 * k, centerY: searchY)
    coral.setFill()
    NSRect(x: backRect.maxX + 114 * k, y: searchY - 11 * k, width: 2 * k, height: 22 * k).fill()

    // Right side "Ask AI" pill like real Raycast
    let aiPill = NSRect(x: win.maxX - 102 * k, y: searchY - 13 * k, width: 82 * k, height: 26 * k)
    color(0xFFFFFF, 0.06).setFill()
    rounded(aiPill, 7 * k).fill()
    color(0xFFFFFF, 0.12).setStroke()
    rounded(aiPill.insetBy(dx: 0.5 * k, dy: 0.5 * k), 7 * k).stroke()
    draw(text("Quick AI  ⇥", font(12 * k, .medium), textMid), centerX: aiPill.midX, centerY: searchY)

    // Search bar divider
    color(0xFFFFFF, 0.09).setFill()
    NSRect(x: win.minX, y: win.maxY - 74 * k, width: win.width, height: 1 * k).fill()

    // Section header
    draw(text("LayoutFixer", font(13 * k, .semibold), textLow), x: win.minX + 24 * k, centerY: win.maxY - 96 * k)

    let rowH = 52 * k
    var rowTop = win.maxY - 112 * k
    for row in commandRows {
        let r = NSRect(x: win.minX + 12 * k, y: rowTop - rowH, width: win.width - 24 * k, height: rowH)
        if row.selected {
            color(0xFFFFFF, 0.11).setFill()
            rounded(r, 11 * k).fill()
            color(0xFFFFFF, 0.14).setStroke()
            let selRim = rounded(r.insetBy(dx: 0.5 * k, dy: 0.5 * k), 11 * k)
            selRim.lineWidth = 1 * k
            selRim.stroke()
        }

        let iconRect = NSRect(x: r.minX + 12 * k, y: r.midY - 14 * k, width: 28 * k, height: 28 * k)
        drawSmallExtIcon(in: iconRect, scale: k)

        let titleRect = draw(text(row.title, font(16.5 * k, .medium), textHigh),
                             x: iconRect.maxX + 12 * k, centerY: r.midY)
        if let badge = row.badge {
            let isFa = badge.unicodeScalars.contains { (0x0600...0x06FF).contains($0.value) }
            draw(text(badge, isFa ? persianFont(14 * k) : font(14 * k, .regular), textLow),
                 x: titleRect.maxX + 10 * k, centerY: r.midY)
        }
        _ = keycapGroup(row.keys, right: r.maxX - 12 * k, centerY: r.midY, scale: k)
        rowTop -= rowH + 4 * k
    }

    // Raycast bottom action bar (glassy footer pill + extension badge)
    color(0xFFFFFF, 0.08).setFill()
    NSRect(x: win.minX, y: win.minY + 52 * k, width: win.width, height: 1 * k).fill()

    let footerY = win.minY + 26 * k
    let leftPill = NSRect(x: win.minX + 16 * k, y: footerY - 15 * k, width: 148 * k, height: 30 * k)
    color(0xFFFFFF, 0.07).setFill()
    rounded(leftPill, 15 * k).fill()
    drawSmallExtIcon(in: NSRect(x: leftPill.minX + 7 * k, y: footerY - 10 * k, width: 20 * k, height: 20 * k), scale: k)
    draw(text("LayoutFixer", font(13 * k, .medium), textMid), x: leftPill.minX + 33 * k, centerY: footerY)

    // Right action pill: Run Command ↵  |  Actions ⌘ K
    let actionPill = NSRect(x: win.maxX - 270 * k, y: footerY - 16 * k, width: 254 * k, height: 32 * k)
    color(0xFFFFFF, 0.07).setFill()
    rounded(actionPill, 16 * k).fill()
    color(0xFFFFFF, 0.12).setStroke()
    rounded(actionPill.insetBy(dx: 0.5 * k, dy: 0.5 * k), 16 * k).stroke()

    draw(text("Fix Selected Text", font(13 * k, .semibold), textHigh),
         x: actionPill.minX + 14 * k, centerY: footerY)
    _ = keycapBadge("↵", right: actionPill.minX + 154 * k, centerY: footerY, scale: k)
    color(0xFFFFFF, 0.12).setFill()
    NSRect(x: actionPill.minX + 164 * k, y: footerY - 8 * k, width: 1 * k, height: 16 * k).fill()
    draw(text("Actions", font(12.5 * k, .medium), textMid), x: actionPill.minX + 174 * k, centerY: footerY)
    _ = keycapBadge("⌘K", right: actionPill.maxX - 10 * k, centerY: footerY, scale: k)
}

// MARK: - Output

render(512, 512, to: "assets/extension-icon.png") { drawIcon(in: $0) }
render(1024, 1024, to: "media/icon.png") { drawIcon(in: $0) }
render(2560, 1280, to: "media/cover.png") { drawCover(in: $0) }
render(1280, 640, to: "media/social-preview.png") { drawCover(in: $0) }
