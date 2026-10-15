// Draws Dig Up's icons with CoreGraphics: assets/icon.png (512 x 512, a magnifier over a mound of earth on a warm
// gradient) and the menu bar glyphs (36 x 36, black and white, plus a paused variant).
// Run: swift scripts/make-icons.swift [output folder, default: assets]

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "assets"
try? FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
let rgb = CGColorSpaceCreateDeviceRGB()

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(
        colorSpace: rgb,
        components: [
            CGFloat((hex >> 16) & 0xFF) / 255, CGFloat((hex >> 8) & 0xFF) / 255, CGFloat(hex & 0xFF) / 255, alpha,
        ])!
}

func write(_ image: CGImage, to name: String) {
    let url = URL(fileURLWithPath: output).appendingPathComponent(name)
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("cannot write \(url.path)")
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("cannot finish \(url.path)") }
    print("wrote \(url.path) (\(image.width) x \(image.height))")
}

/// A bitmap whose origin is the top left, drawn in points of `size`.
func canvas(_ size: Int, draw: (CGContext) -> Void) -> CGImage {
    let context = CGContext(
        data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: rgb,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.translateBy(x: 0, y: CGFloat(size))
    context.scaleBy(x: 1, y: -1)
    context.setAllowsAntialiasing(true)
    context.setShouldAntialias(true)
    context.interpolationQuality = .high
    draw(context)
    return context.makeImage()!
}

/// The mound of earth: a hill with a flat shoulder, clipped by the caller to the lens.
func mound(_ c: CGContext, center: CGPoint, radius: CGFloat) -> CGPath {
    let path = CGMutablePath()
    let left = center.x - radius, right = center.x + radius
    let base = center.y + radius * 0.34
    path.move(to: CGPoint(x: left, y: center.y + radius))
    path.addLine(to: CGPoint(x: left, y: base))
    path.addCurve(
        to: CGPoint(x: center.x - radius * 0.1, y: center.y + radius * 0.02),
        control1: CGPoint(x: left + radius * 0.5, y: base - radius * 0.02),
        control2: CGPoint(x: center.x - radius * 0.5, y: center.y + radius * 0.02))
    path.addCurve(
        to: CGPoint(x: right, y: base + radius * 0.1),
        control1: CGPoint(x: center.x + radius * 0.35, y: center.y + radius * 0.02),
        control2: CGPoint(x: right - radius * 0.5, y: base + radius * 0.1))
    path.addLine(to: CGPoint(x: right, y: center.y + radius))
    path.closeSubpath()
    return path
}

func sparkle(_ c: CGContext, at p: CGPoint, size s: CGFloat) {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: p.x, y: p.y - s))
    path.addQuadCurve(to: CGPoint(x: p.x + s, y: p.y), control: CGPoint(x: p.x + s * 0.12, y: p.y - s * 0.12))
    path.addQuadCurve(to: CGPoint(x: p.x, y: p.y + s), control: CGPoint(x: p.x + s * 0.12, y: p.y + s * 0.12))
    path.addQuadCurve(to: CGPoint(x: p.x - s, y: p.y), control: CGPoint(x: p.x - s * 0.12, y: p.y + s * 0.12))
    path.addQuadCurve(to: CGPoint(x: p.x, y: p.y - s), control: CGPoint(x: p.x - s * 0.12, y: p.y - s * 0.12))
    c.addPath(path)
    c.fillPath()
}

// MARK: App icon

let icon = canvas(512) { c in
    // The tile: a warm diagonal gradient on a continuous-corner square.
    let tile = CGPath(roundedRect: CGRect(x: 0, y: 0, width: 512, height: 512), cornerWidth: 116, cornerHeight: 116, transform: nil)
    c.saveGState()
    c.addPath(tile)
    c.clip()
    let gradient = CGGradient(
        colorsSpace: rgb, colors: [color(0xFFC247), color(0xF77B22), color(0xC8401A)] as CFArray, locations: [0, 0.55, 1])!
    c.drawLinearGradient(gradient, start: CGPoint(x: 70, y: 0), end: CGPoint(x: 460, y: 512), options: [])
    // A soft light from the top left.
    let glow = CGGradient(colorsSpace: rgb, colors: [color(0xFFFFFF, 0.32), color(0xFFFFFF, 0)] as CFArray, locations: [0, 1])!
    c.drawRadialGradient(glow, startCenter: CGPoint(x: 150, y: 110), startRadius: 0, endCenter: CGPoint(x: 150, y: 110), endRadius: 330, options: [])
    c.restoreGState()

    let lens = CGPoint(x: 212, y: 214)
    let radius: CGFloat = 118

    // The handle, a trowel's: a wooden grip with a metal ferrule, at 45 degrees.
    let angle = CGFloat.pi / 4
    let direction = CGPoint(x: cos(angle), y: sin(angle))
    func along(_ d: CGFloat) -> CGPoint { CGPoint(x: lens.x + direction.x * d, y: lens.y + direction.y * d) }
    c.saveGState()
    c.setShadow(offset: CGSize(width: 0, height: -8), blur: 18, color: color(0x5A1D05, 0.45))
    c.setLineCap(.round)
    c.setStrokeColor(color(0x4A2410))
    c.setLineWidth(58)
    c.move(to: along(radius + 34))
    c.addLine(to: along(radius + 214))
    c.strokePath()
    c.restoreGState()
    c.setLineCap(.round)
    c.setStrokeColor(color(0x7B4320))
    c.setLineWidth(40)
    c.move(to: along(radius + 50))
    c.addLine(to: along(radius + 214))
    c.strokePath()
    c.setLineCap(.butt)
    c.setStrokeColor(color(0xE9E4DC))
    c.setLineWidth(60)
    c.move(to: along(radius + 18))
    c.addLine(to: along(radius + 50))
    c.strokePath()

    // The lens: glass with earth in it, and a white rim.
    c.saveGState()
    c.setShadow(offset: CGSize(width: 0, height: -10), blur: 22, color: color(0x5A1D05, 0.4))
    c.setFillColor(color(0xFFF6E6))
    c.fillEllipse(in: CGRect(x: lens.x - radius - 16, y: lens.y - radius - 16, width: (radius + 16) * 2, height: (radius + 16) * 2))
    c.restoreGState()

    c.saveGState()
    c.addEllipse(in: CGRect(x: lens.x - radius, y: lens.y - radius, width: radius * 2, height: radius * 2))
    c.clip()
    let sky = CGGradient(colorsSpace: rgb, colors: [color(0xFFE9B8), color(0xFFD08A)] as CFArray, locations: [0, 1])!
    c.drawLinearGradient(sky, start: CGPoint(x: lens.x, y: lens.y - radius), end: CGPoint(x: lens.x, y: lens.y + radius), options: [])
    c.addPath(mound(c, center: lens, radius: radius))
    c.setFillColor(color(0x6B3515))
    c.fillPath()
    // A lighter layer of earth, and pebbles.
    c.saveGState()
    c.translateBy(x: 0, y: 30)
    c.addPath(mound(c, center: lens, radius: radius))
    c.setFillColor(color(0x8A4A1F))
    c.fillPath()
    c.restoreGState()
    c.setFillColor(color(0xE8C9A0, 0.9))
    for (dx, dy, r) in [(-52, 62, 9), (6, 78, 7), (58, 52, 8), (-14, 36, 6)] as [(CGFloat, CGFloat, CGFloat)] {
        c.fillEllipse(in: CGRect(x: lens.x + dx - r, y: lens.y + dy - r, width: r * 2, height: r * 2))
    }
    c.restoreGState()

    // The find: a sparkle over the mound.
    c.setFillColor(color(0xF2701A))
    sparkle(c, at: CGPoint(x: lens.x + 22, y: lens.y - 44), size: 38)
    c.setFillColor(color(0xFFFFFF, 0.95))
    sparkle(c, at: CGPoint(x: lens.x - 52, y: lens.y - 70), size: 14)
}
write(icon, to: "icon.png")

// MARK: Menu bar glyphs

/// A magnifier with a mound in its lens; `bars` draws a pause mark in it instead.
func glyph(_ tint: UInt32, bars: Bool) -> CGImage {
    canvas(36) { c in
        let ink = color(tint)
        let lens = CGPoint(x: 15, y: 15)
        let radius: CGFloat = 10.5
        c.setStrokeColor(ink)
        c.setFillColor(ink)
        c.setLineCap(.round)
        c.setLineWidth(3.2)
        c.strokeEllipse(in: CGRect(x: lens.x - radius, y: lens.y - radius, width: radius * 2, height: radius * 2))
        c.setLineWidth(4.4)
        c.move(to: CGPoint(x: lens.x + radius * 0.72 + 2.4, y: lens.y + radius * 0.72 + 2.4))
        c.addLine(to: CGPoint(x: 31, y: 31))
        c.strokePath()
        if bars {
            c.setLineWidth(3.2)
            c.move(to: CGPoint(x: lens.x - 3.4, y: lens.y - 4.2))
            c.addLine(to: CGPoint(x: lens.x - 3.4, y: lens.y + 4.2))
            c.move(to: CGPoint(x: lens.x + 3.4, y: lens.y - 4.2))
            c.addLine(to: CGPoint(x: lens.x + 3.4, y: lens.y + 4.2))
            c.strokePath()
        } else {
            c.saveGState()
            c.addEllipse(in: CGRect(x: lens.x - radius + 1.2, y: lens.y - radius + 1.2, width: (radius - 1.2) * 2, height: (radius - 1.2) * 2))
            c.clip()
            let hill = CGMutablePath()
            hill.move(to: CGPoint(x: lens.x - radius, y: lens.y + radius))
            hill.addLine(to: CGPoint(x: lens.x - radius, y: lens.y + 4.4))
            hill.addCurve(
                to: CGPoint(x: lens.x + 1, y: lens.y + 0.4), control1: CGPoint(x: lens.x - 6, y: lens.y + 4.4),
                control2: CGPoint(x: lens.x - 4, y: lens.y + 0.4))
            hill.addCurve(
                to: CGPoint(x: lens.x + radius, y: lens.y + 5), control1: CGPoint(x: lens.x + 5, y: lens.y + 0.4),
                control2: CGPoint(x: lens.x + 6, y: lens.y + 5))
            hill.addLine(to: CGPoint(x: lens.x + radius, y: lens.y + radius))
            hill.closeSubpath()
            c.addPath(hill)
            c.fillPath()
            c.restoreGState()
            sparkle(c, at: CGPoint(x: lens.x + 3.4, y: lens.y - 4.2), size: 3.6)
        }
    }
}

write(glyph(0x000000, bars: false), to: "menubar-icon.png")
write(glyph(0xFFFFFF, bars: false), to: "menubar-icon@dark.png")
write(glyph(0x000000, bars: true), to: "menubar-icon-paused.png")
write(glyph(0xFFFFFF, bars: true), to: "menubar-icon-paused@dark.png")
