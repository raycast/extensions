import Foundation
import CoreFoundation

typealias CGWindowID = UInt32
final class Element: NSObject {
  let role: String
  let subrole: String
  let title: String
  let key: String
  var children: [Element]
  init(_ role: String, subrole: String = "", title: String = "", key: String = "", children: [Element] = []) {
    self.role = role; self.subrole = subrole; self.title = title; self.key = key; self.children = children
  }
}
typealias AXUIElement = Element
enum AXError: Int { case success = 0 }
let kAXChildrenAttribute = "AXChildren", kAXTitleAttribute = "AXTitle", kAXDocumentAttribute = "AXDocument"
let kAXSubroleAttribute = "AXSubrole", kAXMinimizedAttribute = "AXMinimized", kAXPressAction = "AXPress"
let kAXRaiseAction = "AXRaise", kAXMainAttribute = "AXMain"
let operaTabs = [
  Element("AXRadioButton", subrole: "AXTabButton", title: "Start", key: "start"),
  Element("AXRadioButton", subrole: "AXTabButton", title: "Same", key: "target"),
  Element("AXRadioButton", subrole: "AXTabButton", title: "Same", key: "other"),
]
let tabGroup = Element("AXTabGroup", children: operaTabs)
let window: Element = {
  // Opera 140 exposes its tab group at depth 14 and tabs at depth 15.
  var content = tabGroup
  for _ in 0..<13 { content = Element("AXGroup", children: [content]) }
  let page = Element("AXWebArea", children: [Element("AXRadioButton", subrole: "AXTabButton", key: "page-control")])
  return Element("AXWindow", subrole: "AXStandardWindow", title: "Same", children: [content, page])
}()
var pressed: [String] = []

func AXIsProcessTrusted() -> Bool { true }
func roleAndSubrole(_ element: Element) -> (String, String) { (element.role, element.subrole) }
func copyAttr(_ element: Element, _ attr: String) -> Any? { attr == kAXChildrenAttribute ? element.children : nil }
func stringAttr(_ element: Element, _ attr: String) -> String {
  if attr == kAXTitleAttribute { return element.title }
  return attr == kAXSubroleAttribute ? element.subrole : ""
}
func boolAttr(_ element: Element, _ attr: String) -> Bool { false }
func readTabInfo(_ element: Element) -> (title: String, selected: Bool, customUrl: String) {
  (element.title, element === operaTabs[2], "")
}
func findBrowserPIDs(appName: String, nativeWindows: [NativeWindowInput]) -> [Int32] { [20] }
func discoverAXWindows(pid: Int32, expectedWindowIds: Set<CGWindowID>, maxElementId: UInt64 = 500, enhancedUI: Bool = false) -> [CGWindowID: Element] { [10: window] }
func fetchAppleEventTabUrlsByPid(pid: Int32, appName: String = "") -> [(titles: [String], urls: [String])]? { nil }
func AXUIElementGetPid(_ element: Element, _ pid: UnsafeMutablePointer<Int32>) -> AXError { pid.pointee = 20; return .success }
func AXUIElementPerformAction(_ element: Element, _ action: CFString) -> AXError {
  if action as String == kAXPressAction { pressed.append(element.key) }
  return .success
}
func AXUIElementSetAttributeValue(_ element: Element, _ attr: CFString, _ value: CFTypeRef) -> AXError { .success }
struct NSRunningApplication {
  let launchDate: Date? = Date(timeIntervalSince1970: 1)
  init?(processIdentifier: Int32) {}
  func unhide() {}
  func activate() {}
  func activate(options: ActivationOptions) {}
  struct ActivationOptions: OptionSet {
    let rawValue: Int
    static let activateIgnoringOtherApps = ActivationOptions(rawValue: 1)
  }
}
