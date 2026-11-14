import AppKit
let image = NSImage(size: NSSize(width: 512, height: 512))
image.lockFocus()
let background = NSBezierPath(roundedRect: NSRect(x: 8, y: 8, width: 496, height: 496), xRadius: 106, yRadius: 106)
NSGradient(starting: NSColor(calibratedRed: 0.04, green: 0.42, blue: 0.98, alpha: 1), ending: NSColor(calibratedRed: 0.04, green: 0.17, blue: 0.55, alpha: 1))!.draw(in: background, angle: 65)
NSColor.white.withAlphaComponent(0.30).setStroke()
let back = NSBezierPath(roundedRect: NSRect(x: 103, y: 126, width: 276, height: 222), xRadius: 27, yRadius: 27)
back.lineWidth = 15
back.stroke()
NSColor.white.withAlphaComponent(0.58).setStroke()
let middle = NSBezierPath(roundedRect: NSRect(x: 119, y: 143, width: 276, height: 222), xRadius: 27, yRadius: 27)
middle.lineWidth = 15
middle.stroke()
let front = NSBezierPath(roundedRect: NSRect(x: 135, y: 160, width: 276, height: 222), xRadius: 27, yRadius: 27)
NSColor(calibratedRed: 0.05, green: 0.27, blue: 0.72, alpha: 1).setFill()
front.fill()
NSColor.white.setStroke()
for (x,y,dx,dy) in [(165.0,352.0,55.0,-45.0),(381.0,352.0,-55.0,-45.0),(165.0,190.0,55.0,45.0),(381.0,190.0,-55.0,45.0)] {
 let corner=NSBezierPath()
 corner.move(to:NSPoint(x:x+dx,y:y));corner.line(to:NSPoint(x:x,y:y));corner.line(to:NSPoint(x:x,y:y+dy))
 corner.lineWidth=14;corner.lineCapStyle = .round;corner.lineJoinStyle = .round;corner.stroke()
}
NSColor(calibratedRed:0.65,green:0.97,blue:0.32,alpha:1).setFill()
NSBezierPath(ovalIn:NSRect(x:337,y:102,width:108,height:108)).fill()
NSColor(calibratedRed:0.03,green:0.17,blue:0.27,alpha:1).setStroke()
let check=NSBezierPath();check.move(to:NSPoint(x:364,y:156));check.line(to:NSPoint(x:384,y:136));check.line(to:NSPoint(x:417,y:178));check.lineWidth=12;check.lineCapStyle = .round;check.lineJoinStyle = .round;check.stroke()
image.unlockFocus()
let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:512,pixelsHigh:512,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
image.draw(in:NSRect(x:0,y:0,width:512,height:512))
NSGraphicsContext.restoreGraphicsState()
let png=rep.representation(using:.png,properties:[:])!
try png.write(to:URL(fileURLWithPath:"assets/icon.png"))
