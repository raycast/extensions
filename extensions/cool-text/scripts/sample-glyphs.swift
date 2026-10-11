import AppKit

let width = 12
let height = 24
let font = NSFont(name: "Menlo-Regular", size: 20)!
var entries: [[String: Any]] = []
for value in 32...126 {
    let character = String(UnicodeScalar(value)!)
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: width * 4, bitsPerPixel: 32)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    (character as NSString).draw(at: NSPoint(x: 0, y: 0), withAttributes: [.font: font, .foregroundColor: NSColor.black])
    NSGraphicsContext.restoreGraphicsState()
    var vector: [Double] = []
    for row in 0..<3 {
        for col in 0..<2 {
            var sum = 0.0
            for y in (row * height / 3)..<((row + 1) * height / 3) {
                for x in (col * width / 2)..<((col + 1) * width / 2) {
                    sum += Double(bitmap.bitmapData![y * bitmap.bytesPerRow + x * 4 + 3]) / 255.0
                }
            }
            vector.append(sum / Double(width * height / 6))
        }
    }
    entries.append(["character": character, "shape": vector])
}
let data = try JSONSerialization.data(withJSONObject: entries, options: [.sortedKeys])
try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
