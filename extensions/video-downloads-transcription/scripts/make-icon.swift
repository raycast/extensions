import AppKit

let size = 512
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

let background = NSBezierPath(roundedRect: NSRect(x: 18, y: 18, width: 476, height: 476), xRadius: 108, yRadius: 108)
NSColor(calibratedRed: 0.09, green: 0.12, blue: 0.21, alpha: 1).setFill()
background.fill()

let bubble = NSBezierPath(roundedRect: NSRect(x: 91, y: 159, width: 330, height: 226), xRadius: 40, yRadius: 40)
NSColor(calibratedRed: 0.26, green: 0.87, blue: 0.73, alpha: 1).setFill()
bubble.fill()
let tail = NSBezierPath()
tail.move(to: NSPoint(x: 150, y: 170))
tail.line(to: NSPoint(x: 150, y: 117))
tail.line(to: NSPoint(x: 214, y: 170))
tail.close()
tail.fill()

NSColor(calibratedRed: 0.09, green: 0.12, blue: 0.21, alpha: 1).setFill()
for width in [210.0, 154.0, 175.0] {
    let y = 319.0 - Double([210.0, 154.0, 175.0].firstIndex(of: width)!) * 49.0
    NSBezierPath(roundedRect: NSRect(x: 151, y: y, width: width, height: 20), xRadius: 10, yRadius: 10).fill()
}
image.unlockFocus()

let data = image.tiffRepresentation!
let rep = NSBitmapImageRep(data: data)!
let png = rep.representation(using: .png, properties: [:])!
try png.write(to: URL(fileURLWithPath: "assets/icon.png"))
