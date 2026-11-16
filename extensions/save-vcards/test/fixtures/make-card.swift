// Renders test/fixtures/card.png, the invented business card used by the OCR tests:
//   swift test/fixtures/make-card.swift test/fixtures/card.png
import AppKit

let size = NSSize(width: 1050, height: 600)
let img = NSImage(size: size)
img.lockFocus()
NSColor(white: 0.97, alpha: 1).setFill()
NSRect(origin: .zero, size: size).fill()
func draw(_ s: String, _ y: CGFloat, _ font: NSFont, _ color: NSColor = .black) {
    (s as NSString).draw(at: NSPoint(x: 70, y: y), withAttributes: [.font: font, .foregroundColor: color])
}
draw("DI Julia Steiner, MSc", 470, .boldSystemFont(ofSize: 46))
draw("Leiterin Digitalisierung", 420, .systemFont(ofSize: 30), .darkGray)
draw("Donauwerk Energie GmbH", 330, .systemFont(ofSize: 32))
draw("Wagramer Straße 19, 1220 Wien", 270, .systemFont(ofSize: 26))
draw("T +43 1 9876 543   M +43 699 1234 5678", 220, .systemFont(ofSize: 26))
draw("julia.steiner@donauwerk.at  ·  donauwerk.at", 170, .systemFont(ofSize: 26))
img.unlockFocus()
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
