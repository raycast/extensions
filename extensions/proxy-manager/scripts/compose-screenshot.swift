import AppKit
import CoreGraphics
import Foundation

// Composes a Raycast extension window capture onto the 2000×1250 canvas the Store
// asks for, with a consistent background and a soft shadow.
//
// usage: swift scripts/compose-screenshot.swift <window.png> <out.png>

let arguments = CommandLine.arguments
guard arguments.count >= 3 else {
    FileHandle.standardError.write(Data("usage: compose-screenshot.swift <window.png> <out.png>\n".utf8))
    exit(2)
}

let sourcePath = arguments[1]
let outputPath = arguments[2]

let canvasWidth = 2000
let canvasHeight = 1250

guard let source = NSImage(contentsOfFile: sourcePath),
      let window = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write(Data("could not read \(sourcePath)\n".utf8))
    exit(1)
}

guard let context = CGContext(
    data: nil, width: canvasWidth, height: canvasHeight, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    FileHandle.standardError.write(Data("could not create the canvas\n".utf8))
    exit(1)
}

func colour(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(
        srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
        green: CGFloat((hex >> 8) & 0xFF) / 255,
        blue: CGFloat(hex & 0xFF) / 255,
        alpha: alpha
    )
}

// Background: a deep neutral gradient so the light window reads at a glance.
let background = CGGradient(
    colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
    colors: [colour(0x1B1E24), colour(0x0C0D10)] as CFArray,
    locations: [0, 1]
)!
context.drawLinearGradient(
    background,
    start: CGPoint(x: 0, y: canvasHeight),
    end: CGPoint(x: 0, y: 0),
    options: []
)

// A faint glow behind the window keeps the composition from looking pasted on.
let glow = CGGradient(
    colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
    colors: [colour(0x3A4150, 0.55), colour(0x3A4150, 0)] as CFArray,
    locations: [0, 1]
)!
context.drawRadialGradient(
    glow,
    startCenter: CGPoint(x: canvasWidth / 2, y: canvasHeight / 2),
    startRadius: 0,
    endCenter: CGPoint(x: canvasWidth / 2, y: canvasHeight / 2),
    endRadius: 780,
    options: []
)

// Rounded corners to match the window's own clip.
let windowRect = CGRect(
    x: CGFloat(canvasWidth - window.width) / 2,
    y: CGFloat(canvasHeight - window.height) / 2,
    width: CGFloat(window.width),
    height: CGFloat(window.height)
)
let clip = CGPath(
    roundedRect: windowRect,
    cornerWidth: 22,
    cornerHeight: 22,
    transform: nil
)

context.saveGState()
context.setShadow(
    offset: CGSize(width: 0, height: -20),
    blur: 46,
    color: colour(0x000000, 0.55)
)
context.addPath(clip)
context.setFillColor(colour(0x000000, 0.55))
context.fillPath()
context.restoreGState()

context.saveGState()
context.addPath(clip)
context.clip()
context.draw(window, in: windowRect)
context.restoreGState()

guard let composed = context.makeImage(),
      let data = NSBitmapImageRep(cgImage: composed).representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("could not encode \(outputPath)\n".utf8))
    exit(1)
}
try data.write(to: URL(fileURLWithPath: outputPath))
print("wrote \(outputPath) (\(canvasWidth)×\(canvasHeight))")
