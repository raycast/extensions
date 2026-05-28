#!/usr/bin/env swift
import AppKit

// Generates 2000×1250 Raycast-store screenshots.
//
// Pipeline:
//   1. Trim the uniform border by detecting the corner colour, then nudge an
//      extra few pixels inward to strip Raycast's translucent edge.
//   2. Black canvas.
//   3. Multi-coloured radial glow (teal + purple + pink) behind the window,
//      blended additively so colours bloom together and fade to black.
//   4. Composite the Raycast window at its NATIVE size, centred, with rounded
//      corners and a soft drop shadow.
//
// Usage:
//   swift scripts/make-screenshots.swift \
//     <out-1.png>=<src-1.png> <out-2.png>=<src-2.png> ...

guard CommandLine.arguments.count > 1 else {
    FileHandle.standardError.write(Data("usage: make-screenshots.swift <out>=<src> [<out>=<src> ...]\n".utf8))
    exit(2)
}

let canvasW: CGFloat = 2000
let canvasH: CGFloat = 1250

/// How many extra pixels to trim past the auto-detected border. Strips
/// Raycast's translucent outer rim that picks up the desktop wallpaper.
let extraInsetPx = 12

struct FastBitmap {
    let buf: [UInt8]
    let width: Int
    let height: Int

    init?(_ rep: NSBitmapImageRep) {
        let w = rep.pixelsWide
        let h = rep.pixelsHigh
        let bpr = w * 4
        var buf = [UInt8](repeating: 0, count: bpr * h)
        let ok = buf.withUnsafeMutableBufferPointer { ptr -> Bool in
            guard let cs = CGColorSpace(name: CGColorSpace.sRGB),
                  let cg = rep.cgImage,
                  let ctx = CGContext(
                    data: ptr.baseAddress,
                    width: w, height: h,
                    bitsPerComponent: 8, bytesPerRow: bpr,
                    space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                  )
            else { return false }
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
            return true
        }
        guard ok else { return nil }
        self.buf = buf
        self.width = w
        self.height = h
    }

    /// (r, g, b) for the pixel at (x, y) with origin TOP-LEFT.
    @inline(__always)
    func rgb(_ x: Int, _ y: Int) -> (Double, Double, Double) {
        let row = height - 1 - y
        let o = row * width * 4 + x * 4
        return (
            Double(buf[o]) / 255.0,
            Double(buf[o + 1]) / 255.0,
            Double(buf[o + 2]) / 255.0
        )
    }
}

func trimUniformBorder(_ bmp: FastBitmap, extraInset: Int) -> NSRect {
    let w = bmp.width
    let h = bmp.height

    let corners = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    var rs = 0.0, gs = 0.0, bs = 0.0
    for (x, y) in corners {
        let (r, g, b) = bmp.rgb(x, y)
        rs += r; gs += g; bs += b
    }
    let refR = rs / 4, refG = gs / 4, refB = bs / 4

    @inline(__always)
    func differs(_ x: Int, _ y: Int) -> Bool {
        let (r, g, b) = bmp.rgb(x, y)
        return abs(r - refR) + abs(g - refG) + abs(b - refB) > 0.10
    }

    func rowHasContent(_ y: Int) -> Bool {
        var hits = 0
        for x in 0..<w {
            if differs(x, y) {
                hits += 1
                if hits >= 24 { return true }
            } else {
                hits = 0
            }
        }
        return false
    }
    func colHasContent(_ x: Int) -> Bool {
        var hits = 0
        for y in 0..<h {
            if differs(x, y) {
                hits += 1
                if hits >= 24 { return true }
            } else {
                hits = 0
            }
        }
        return false
    }

    var top = 0
    for y in 0..<h { if rowHasContent(y) { top = y; break } }
    var bottom = h - 1
    for y in stride(from: h - 1, through: 0, by: -1) { if rowHasContent(y) { bottom = y; break } }
    var left = 0
    for x in 0..<w { if colHasContent(x) { left = x; break } }
    var right = w - 1
    for x in stride(from: w - 1, through: 0, by: -1) { if colHasContent(x) { right = x; break } }

    // Push everything inward by extraInset to bite past Raycast's translucent rim.
    let l = min(left + extraInset, w / 2 - 50)
    let r = max(right - extraInset, w / 2 + 50)
    let t = min(top + extraInset, h / 2 - 50)
    let b = max(bottom - extraInset, h / 2 + 50)
    return NSRect(x: l, y: t, width: r - l + 1, height: b - t + 1)
}

func radialGlow(_ ctx: NSGraphicsContext, centre: CGPoint, radius: CGFloat, colour: NSColor) {
    let gradient = NSGradient(
        colors: [colour, NSColor(white: 0, alpha: 0)],
        atLocations: [0.0, 1.0],
        colorSpace: NSColorSpace.sRGB
    )!
    let rect = NSRect(
        x: centre.x - radius,
        y: centre.y - radius,
        width: radius * 2,
        height: radius * 2
    )
    gradient.draw(in: rect, relativeCenterPosition: .zero)
}

for arg in CommandLine.arguments.dropFirst() {
    let parts = arg.split(separator: "=", maxSplits: 1).map(String.init)
    guard parts.count == 2 else {
        FileHandle.standardError.write(Data("bad arg: \(arg)\n".utf8))
        continue
    }
    let outPath = parts[0]
    let srcPath = parts[1]

    guard let srcData = try? Data(contentsOf: URL(fileURLWithPath: srcPath)),
          let srcRep = NSBitmapImageRep(data: srcData) else {
        FileHandle.standardError.write(Data("could not read \(srcPath)\n".utf8))
        continue
    }
    let srcW = srcRep.pixelsWide
    let srcH = srcRep.pixelsHigh

    guard let bmp = FastBitmap(srcRep) else {
        FileHandle.standardError.write(Data("could not access bitmap data for \(srcPath)\n".utf8))
        continue
    }

    let cropPx = trimUniformBorder(bmp, extraInset: extraInsetPx)
    let cropFlipped = NSRect(
        x: cropPx.minX,
        y: CGFloat(srcH) - cropPx.maxY,
        width: cropPx.width,
        height: cropPx.height
    )

    // Build the canvas.
    guard let outRep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: Int(canvasW), pixelsHigh: Int(canvasH),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 32
    ) else { fatalError("rep") }
    outRep.size = NSSize(width: canvasW, height: canvasH)

    guard let ctx = NSGraphicsContext(bitmapImageRep: outRep) else { fatalError("ctx") }
    let prev = NSGraphicsContext.current
    NSGraphicsContext.current = ctx
    ctx.imageInterpolation = .high

    // Black canvas.
    NSColor.black.setFill()
    NSRect(x: 0, y: 0, width: canvasW, height: canvasH).fill()

    // Window draw rect: native pixel size, centred. (Source screenshots are
    // already at the size Raycast renders to — no upscale.)
    let drawW = cropPx.width
    let drawH = cropPx.height
    let drawRect = NSRect(
        x: (canvasW - drawW) / 2,
        y: (canvasH - drawH) / 2,
        width: drawW,
        height: drawH
    )

    // Multi-coloured radial glow behind the window, using additive blending so
    // overlapping colours bloom. Each glow extends well past the window edges,
    // fading to transparent at the radius — the surrounding black canvas shows
    // through cleanly.
    NSGraphicsContext.saveGraphicsState()
    ctx.compositingOperation = .plusLighter

    let glowR = max(drawRect.width, drawRect.height) * 1.1
    radialGlow(
        ctx,
        centre: CGPoint(x: drawRect.minX + drawRect.width * 0.25, y: drawRect.maxY - drawRect.height * 0.15),
        radius: glowR,
        colour: NSColor(red: 0.20, green: 0.70, blue: 0.95, alpha: 0.85) // bright cyan
    )
    radialGlow(
        ctx,
        centre: CGPoint(x: drawRect.maxX - drawRect.width * 0.15, y: drawRect.minY + drawRect.height * 0.20),
        radius: glowR,
        colour: NSColor(red: 0.95, green: 0.30, blue: 0.65, alpha: 0.85) // hot pink
    )
    radialGlow(
        ctx,
        centre: CGPoint(x: drawRect.midX, y: drawRect.midY),
        radius: glowR * 0.85,
        colour: NSColor(red: 0.50, green: 0.30, blue: 0.95, alpha: 0.70) // electric purple
    )

    NSGraphicsContext.restoreGraphicsState()

    // Crop the Raycast window into a fresh image at the crop size, native pixels.
    let cropped = NSImage(size: NSSize(width: cropPx.width, height: cropPx.height))
    cropped.lockFocus()
    NSGraphicsContext.current?.imageInterpolation = .none // 1:1 pixels
    let srcImg = NSImage(size: NSSize(width: srcW, height: srcH))
    srcImg.addRepresentation(srcRep)
    srcImg.draw(
        in: NSRect(origin: .zero, size: cropped.size),
        from: cropFlipped,
        operation: .copy,
        fraction: 1.0
    )
    cropped.unlockFocus()

    // Draw the window with rounded corners + soft drop shadow.
    NSGraphicsContext.current = ctx
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor(white: 0, alpha: 0.7)
    shadow.shadowOffset = NSSize(width: 0, height: -18)
    shadow.shadowBlurRadius = 70
    shadow.set()
    NSBezierPath(roundedRect: drawRect, xRadius: 22, yRadius: 22).addClip()
    cropped.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()

    NSGraphicsContext.current = prev

    guard let png = outRep.representation(using: .png, properties: [:]) else {
        fatalError("png encode")
    }
    let outURL = URL(fileURLWithPath: outPath)
    try? FileManager.default.createDirectory(
        at: outURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try png.write(to: outURL)
    print("✓ \(outPath) — \(Int(cropPx.width))×\(Int(cropPx.height)) window at native size on \(Int(canvasW))×\(Int(canvasH)) canvas")
}
