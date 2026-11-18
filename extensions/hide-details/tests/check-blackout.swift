import AppKit

struct Box: Decodable {
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}
struct Hit: Decodable { let box: Box }
struct Report: Decodable { let hits: [Hit] }
let output = NSBitmapImageRep(data: try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))!
let report = try JSONDecoder().decode(Report.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2])))
precondition(!report.hits.isEmpty, "Expected detections for pixel coverage")
var pixels = 0
for hit in report.hits {
  let rect = CGRect(x: hit.box.x, y: hit.box.y, width: hit.box.width, height: hit.box.height).integral
  for y in max(0, Int(rect.minY))..<min(output.pixelsHigh, Int(rect.maxY)) {
    for x in max(0, Int(rect.minX))..<min(output.pixelsWide, Int(rect.maxX)) {
      let color = output.colorAt(x: x, y: y)!.usingColorSpace(.deviceRGB)!
      precondition(color.redComponent < 0.01 && color.greenComponent < 0.01 && color.blueComponent < 0.01 && color.alphaComponent > 0.99, "Mask must be opaque black")
      pixels += 1
    }
  }
}
precondition(pixels > 0, "Expected nonempty masks")
print("Verified \(pixels) opaque masked pixels")
