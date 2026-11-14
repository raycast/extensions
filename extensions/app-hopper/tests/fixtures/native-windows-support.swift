import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

struct FixtureApplication {
  let isHidden: Bool
  let activationPolicy: NSApplication.ActivationPolicy
  let bundleURL: URL? = URL(fileURLWithPath: "/Applications/Test.app")
  let localizedName: String? = "Test"
  init?(processIdentifier: Int32) {
    isHidden = [30, 60].contains(processIdentifier)
    activationPolicy = processIdentifier == 80 ? .accessory : .regular
  }
}
func CGSMainConnectionID() -> Int32 { 1 }
func buildWindowSpaceMap(cid: Int32) -> [CGWindowID: Int] { [11: 1, 17: 2, 18: 1, 19: 1, 20: 2] }
func fixtureWindowInfo(_ options: CGWindowListOption, _ relative: CGWindowID) -> Any? {
  return (10...28).map { id -> [String: Any] in
    let pid: Int
    switch id {
    case 12: pid = 30
    case 17, 28: pid = 40
    case 20, 21: pid = 50
    case 22, 24: pid = 90
    case 23: pid = 60
    case 25, 26: pid = 70
    case 27: pid = 80
    default: pid = 20
    }
    return [kCGWindowNumber as String: id,
     kCGWindowOwnerPID as String: pid,
     kCGWindowOwnerName as String: "Test",
     kCGWindowLayer as String: 0,
     kCGWindowAlpha as String: id == 18 ? 0.0 : 1.0,
     kCGWindowBounds as String: ["X": 0.0, "Y": 0.0, "Width": id == 19 ? 20.0 : 800.0, "Height": 600.0]]
  }
}
func AXIsProcessTrusted() -> Bool { true }
func discoverAXWindowElements(pid: Int32, expectedWindowIds: Set<CGWindowID>) -> [CGWindowID: CGWindowID] {
  Dictionary(uniqueKeysWithValues: expectedWindowIds.filter { ![16, 17, 20, 25, 26, 27, 28].contains($0) }.map { ($0, $0) })
}
func windowAttributes(_ wid: CGWindowID) -> AXWindowMetadata? {
  AXWindowMetadata(title: "Window \\(wid)",
    subrole: wid == 15 ? "AXFloatingWindow" : ([22, 23, 24].contains(wid) ? "AXDialog" : "AXStandardWindow"),
    documentUrl: "", isMinimized: [10, 15, 22].contains(wid))
}
