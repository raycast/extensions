// Renders assets/icon.png and assets/icon@dark.png.
//
//   swift tools/make-icon.swift assets
//
// Drawn with CoreGraphics rather than rasterised from the SVGs: the only SVG
// renderer available here (qlmanage) flattens alpha onto white, which leaves
// opaque white corners instead of transparent ones. The SVGs in assets/ are
// kept as editable references; mirror any geometry change into this file.

import AppKit
import CoreGraphics
import Foundation

let S: CGFloat = 512        // final size
let R: CGFloat = 112        // tile corner radius
let GLYPH_SCALE: CGFloat = 1.45
let SS: CGFloat = 4         // supersampling factor; drawn at S*SS, then downsampled

let cs = CGColorSpaceCreateDeviceRGB()

func hex(_ v: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((v >> 16) & 0xff) / 255,
            green: CGFloat((v >> 8) & 0xff) / 255,
            blue: CGFloat(v & 0xff) / 255, alpha: a)
}

func roundedRect(_ r: CGRect, _ rad: CGFloat) -> CGPath {
    CGPath(roundedRect: r, cornerWidth: rad, cornerHeight: rad, transform: nil)
}

func newContext(_ side: Int) -> CGContext {
    let ctx = CGContext(data: nil, width: side, height: side, bitsPerComponent: 8,
                        bytesPerRow: 0, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setAllowsAntialiasing(true)
    ctx.setShouldAntialias(true)
    ctx.interpolationQuality = .high
    return ctx
}

func makeIcon(top: UInt32, bottom: UInt32) -> CGImage {
    let ctx = newContext(Int(S * SS))
    ctx.clear(CGRect(x: 0, y: 0, width: S * SS, height: S * SS))

    // Draw everything in 512-space; the supersample factor is just a CTM scale.
    ctx.scaleBy(x: SS, y: SS)
    // Flip so these coordinates match the SVG sources (y downwards).
    ctx.translateBy(x: 0, y: S)
    ctx.scaleBy(x: 1, y: -1)

    let full = CGRect(x: 0, y: 0, width: S, height: S)

    // Tile: base gradient plus a soft light source in the upper left. No rim
    // highlight: it washed out the top of the dark variant, leaving the white
    // glyph sitting on near-white.
    ctx.saveGState()
    ctx.addPath(roundedRect(full, R))
    ctx.clip()
    ctx.drawLinearGradient(
        CGGradient(colorsSpace: cs, colors: [hex(top), hex(bottom)] as CFArray, locations: [0, 1])!,
        start: .zero, end: CGPoint(x: 0, y: S), options: [])
    ctx.drawRadialGradient(
        CGGradient(colorsSpace: cs,
                   colors: [CGColor(gray: 1, alpha: 0.24), CGColor(gray: 1, alpha: 0)] as CFArray,
                   locations: [0, 1])!,
        startCenter: CGPoint(x: 150, y: 110), startRadius: 0,
        endCenter: CGPoint(x: 150, y: 110), endRadius: 430, options: [])
    ctx.restoreGState()

    // Glyph, lifted off the tile by a soft shadow.
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: 18), blur: 44,
                  color: CGColor(red: 0.04, green: 0.06, blue: 0.28, alpha: 0.68))
    ctx.translateBy(x: 256, y: 256)
    ctx.scaleBy(x: GLYPH_SCALE, y: GLYPH_SCALE)
    ctx.translateBy(x: -256, y: -259)

    ctx.setStrokeColor(CGColor(gray: 1, alpha: 1))
    ctx.setLineWidth(36)
    ctx.setLineCap(.round)
    for radius in [168.0, 96.0] as [CGFloat] {
        let arc = CGMutablePath()
        arc.addArc(center: CGPoint(x: 256, y: 328), radius: radius,
                   startAngle: 220 * .pi / 180, endAngle: 320 * .pi / 180, clockwise: false)
        ctx.addPath(arc)
        ctx.strokePath()
    }

    // Drive body, indicator punched through, with a faint vertical falloff so
    // it reads as a surface rather than a flat sticker.
    //
    // Wrapped in a transparency layer because the gradient has to be drawn
    // through a clip, and a clip discards everything outside the path --
    // including the shadow. The layer is composited first, then the shadow is
    // applied to the result, so the slab casts one like the arcs do.
    let body = CGMutablePath()
    body.addPath(roundedRect(CGRect(x: 136, y: 296, width: 240, height: 80), 22))
    body.addEllipse(in: CGRect(x: 173, y: 321, width: 30, height: 30))
    ctx.beginTransparencyLayer(auxiliaryInfo: nil)
    ctx.saveGState()
    ctx.addPath(body)
    ctx.clip(using: .evenOdd)
    ctx.drawLinearGradient(
        CGGradient(colorsSpace: cs, colors: [hex(0xFFFFFF), hex(0xE9EDFF)] as CFArray,
                   locations: [0, 1])!,
        start: CGPoint(x: 0, y: 296), end: CGPoint(x: 0, y: 376), options: [])
    ctx.restoreGState()
    ctx.endTransparencyLayer()
    ctx.restoreGState()

    // Downsample to the final size.
    let out = newContext(Int(S))
    out.clear(full)
    out.draw(ctx.makeImage()!, in: full)
    return out.makeImage()!
}

func write(_ image: CGImage, to url: URL) {
    let rep = NSBitmapImageRep(cgImage: image)
    rep.size = NSSize(width: S, height: S)
    try! rep.representation(using: .png, properties: [:])!.write(to: url)
    print("wrote \(url.lastPathComponent)")
}

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
write(makeIcon(top: 0x5B6CFF, bottom: 0x2D3BD4), to: dir.appendingPathComponent("icon.png"))
write(makeIcon(top: 0x8A97FF, bottom: 0x5162F5), to: dir.appendingPathComponent("icon@dark.png"))
