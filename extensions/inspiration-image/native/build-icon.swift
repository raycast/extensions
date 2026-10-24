import AppKit
import Foundation

let cachePath = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().appendingPathComponent(".swift-module-cache", isDirectory: true)
try? FileManager.default.createDirectory(at: cachePath, withIntermediateDirectories: true)

let output = CommandLine.arguments.dropFirst().first ?? "assets/extension-icon.png"
let size = 512
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

let bounds = NSRect(x: 0, y: 0, width: size, height: size)
let background = NSBezierPath(roundedRect: bounds.insetBy(dx: 12, dy: 12), xRadius: 110, yRadius: 110)
let gradient = NSGradient(colors: [NSColor(calibratedRed: 0.30, green: 0.20, blue: 0.86, alpha: 1), NSColor(calibratedRed: 0.02, green: 0.68, blue: 0.80, alpha: 1)])!
gradient.draw(in: background, angle: -35)

let glow = NSBezierPath(ovalIn: NSRect(x: 280, y: 270, width: 145, height: 145))
NSColor(calibratedRed: 1, green: 0.80, blue: 0.35, alpha: 0.95).setFill()
glow.fill()

let landscape = NSBezierPath()
landscape.move(to: NSPoint(x: 48, y: 95))
landscape.curve(to: NSPoint(x: 464, y: 95), controlPoint1: NSPoint(x: 164, y: 240), controlPoint2: NSPoint(x: 305, y: 35))
landscape.line(to: NSPoint(x: 464, y: 48))
landscape.line(to: NSPoint(x: 48, y: 48))
landscape.close()
NSColor(calibratedRed: 0.10, green: 0.78, blue: 0.69, alpha: 1).setFill()
landscape.fill()

let foreground = NSBezierPath()
foreground.move(to: NSPoint(x: 48, y: 55))
foreground.curve(to: NSPoint(x: 464, y: 55), controlPoint1: NSPoint(x: 195, y: 175), controlPoint2: NSPoint(x: 328, y: 120))
foreground.line(to: NSPoint(x: 464, y: 48))
foreground.line(to: NSPoint(x: 48, y: 48))
foreground.close()
NSColor(calibratedRed: 0.07, green: 0.35, blue: 0.60, alpha: 1).setFill()
foreground.fill()

let sparkle = NSBezierPath()
sparkle.move(to: NSPoint(x: 170, y: 390))
sparkle.line(to: NSPoint(x: 183, y: 356))
sparkle.line(to: NSPoint(x: 196, y: 390))
sparkle.line(to: NSPoint(x: 230, y: 403))
sparkle.line(to: NSPoint(x: 196, y: 416))
sparkle.line(to: NSPoint(x: 183, y: 450))
sparkle.line(to: NSPoint(x: 170, y: 416))
sparkle.line(to: NSPoint(x: 136, y: 403))
sparkle.close()
NSColor.white.setFill()
sparkle.fill()

image.unlockFocus()
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Could not render extension icon")
}
try png.write(to: URL(fileURLWithPath: output), options: .atomic)
