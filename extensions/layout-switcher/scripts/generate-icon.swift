// Generates the Raycast extension icon from the Claude Design handoff
// "Raycast Icon Final" (variant B): the keys Q (QWERTY) and Й (ЙЦУКЕН) with a
// bidirectional swap arrow between them, on a full-bleed graphite squircle.
// One focal lockup so it stays legible at ~40px (Raycast command list).
// Language-neutral: ЙЦУКЕН is shared by RU/UK/BE.
//
// Output (512×512, transparent corners):
//   assets/extension-icon.png  — single icon used for both light and dark UI
//
// Needs JetBrains Mono ExtraBold (weight 800) for the glyphs (OFL, open source):
//   curl -sL -o /tmp/jbm-extrabold.ttf \
//     https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-ExtraBold.ttf
//
// Run:  swift scripts/generate-icon.swift [path-to-JetBrainsMono-ExtraBold.ttf]
import AppKit
import CoreText
import Foundation

let fontPath = CommandLine.arguments.dropFirst().first ?? "/tmp/jbm-extrabold.ttf"
CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: fontPath) as CFURL, .process, nil)

func rgb(_ r: Int, _ g: Int, _ b: Int, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: a)
}

// Approved graphite palette + bright-teal accent (high contrast so the arrows
// survive at small sizes).
let gradTL = rgb(90, 95, 102)  // #5A5F66
let gradBR = rgb(60, 64, 70)  // #3C4046
let inkColor = rgb(242, 242, 241)  // #F2F2F1  — Q and Й
let arrowColor = rgb(169, 221, 210)  // #A9DDD2 — swap arrows

func drawGlyph(_ glyph: String, _ color: NSColor, centerX: CGFloat, centerY: CGFloat) {
  let cg = NSGraphicsContext.current!.cgContext
  let font = NSFont(name: "JetBrainsMono-ExtraBold", size: 168)!
  let s = NSAttributedString(string: glyph, attributes: [.font: font, .foregroundColor: color])
  let line = CTLineCreateWithAttributedString(s)
  let advance = CTLineGetTypographicBounds(line, nil, nil, nil)
  // Center on character advance (horizontal) and cap-height (vertical).
  cg.saveGState()
  cg.translateBy(x: centerX - CGFloat(advance) / 2, y: centerY - font.capHeight / 2)
  cg.textPosition = .zero
  CTLineDraw(line, cg)
  cg.restoreGState()
}

// Bidirectional swap glyph, drawn from the design's exact SVG paths
// (viewBox 0 0 24 24): top → right, bottom ← left — single-barb, offset.
//   top:    M3 9  h13  l-4 -4
//   bottom: M21 15 h-13 l4 4
// The 24-unit box is centered at (cx,cy) and scaled by `s`. Thick, round caps.
func drawSwapArrows(cx: CGFloat, cy: CGFloat) {
  let cg = NSGraphicsContext.current!.cgContext
  let s: CGFloat = 5.5  // viewBox-unit → px
  func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
    CGPoint(x: cx + (x - 12) * s, y: cy - (y - 12) * s)  // y flipped (SVG y-down → CG y-up)
  }
  cg.saveGState()
  cg.setStrokeColor(arrowColor.cgColor)
  cg.setLineWidth(15)
  cg.setLineCap(.round)
  cg.setLineJoin(.round)
  let path = CGMutablePath()
  path.move(to: p(3, 9)); path.addLine(to: p(16, 9)); path.addLine(to: p(12, 5))
  path.move(to: p(21, 15)); path.addLine(to: p(8, 15)); path.addLine(to: p(12, 19))
  cg.addPath(path)
  cg.strokePath()
  cg.restoreGState()
}

let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: 512, pixelsHigh: 512, bitsPerSample: 8, samplesPerPixel: 4,
  hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let cg = NSGraphicsContext.current!.cgContext

// Full-bleed squircle, radius 118, transparent corners.
let sq = NSBezierPath(
  roundedRect: NSRect(x: 0, y: 0, width: 512, height: 512), xRadius: 118, yRadius: 118)
cg.saveGState()
sq.addClip()
let grad = CGGradient(
  colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [gradTL.cgColor, gradBR.cgColor] as CFArray,
  locations: [0, 1])!
// ~140° gradient: top-left → bottom-right
cg.drawLinearGradient(
  grad, start: CGPoint(x: 70, y: 442), end: CGPoint(x: 442, y: 70),
  options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
cg.restoreGState()

drawGlyph("Q", inkColor, centerX: 148, centerY: 256)
drawGlyph("Й", inkColor, centerX: 364, centerY: 256)
drawSwapArrows(cx: 256, cy: 256)

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(
  to: URL(fileURLWithPath: "assets/extension-icon.png"))
print("Wrote assets/extension-icon.png")
