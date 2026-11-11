import CoreGraphics
import Foundation

@main
struct WindowIdentityTests {
  static func main() {
    func window(_ number: Int, pid: Int, layer: Int = 0, alpha: Double = 1,
                size: CGSize = CGSize(width: 800, height: 600)) -> [String: Any] {
      [kCGWindowNumber as String: number, kCGWindowOwnerPID as String: pid,
       kCGWindowLayer as String: layer, kCGWindowAlpha as String: alpha,
       kCGWindowBounds as String: CGRect(origin: .zero, size: size).dictionaryRepresentation]
    }
    let list = [
      window(1, pid: 99),                                   // Another app in front
      window(2, pid: 4123, layer: 25),                      // Menu bar extra, not a document window
      window(3, pid: 4123, alpha: 0),                       // Invisible
      window(4, pid: 4123, size: CGSize(width: 20, height: 20)), // Helper surface
      window(5, pid: 4123),                                 // Focused window
      window(6, pid: 4123),                                 // Behind it
    ]
    assert(frontWindowID(in: list, processID: 4123) == 5, "Must pick the frontmost normal window of the app")
    assert(frontWindowID(in: list, processID: 99) == 1)
    assert(frontWindowID(in: list, processID: 7) == nil, "An app without windows has no target")
    assert(frontWindowID(in: [[:]], processID: 4123) == nil, "Malformed entries are skipped")
    print("Native identity checks passed: frontmost normal window picked; other apps, layers, and helpers skipped.")
  }
}
