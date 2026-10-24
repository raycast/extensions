// Renders assets/icon.png: xcrun swift scripts/icon.swift assets/icon.png
import AppKit
let size = 512.0
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
NSColor(red: 0.93, green: 0.27, blue: 0.33, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: size, height: size), xRadius: 110, yRadius: 110).fill()
NSColor.white.setFill()
NSBezierPath(ovalIn: NSRect(x: 196, y: 274, width: 120, height: 120)).fill()
let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 170, weight: .heavy), .foregroundColor: NSColor.white]
let text = "GIF" as NSString
let w = text.size(withAttributes: attrs).width
text.draw(at: NSPoint(x: (size - w) / 2, y: 34), withAttributes: attrs)
image.unlockFocus()
let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
