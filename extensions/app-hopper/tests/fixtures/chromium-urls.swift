import Foundation

typealias CGWindowID = UInt32
final class AXUIElement {
  let title: String
  let url: String
  let selected: Bool
  let tabs: [AXUIElement]
  init(_ title: String, url: String = "", selected: Bool = false, tabs: [AXUIElement] = []) {
    self.title = title
    self.url = url
    self.selected = selected
    self.tabs = tabs
  }
}
let kAXTitleAttribute = "title", kAXDocumentAttribute = "url", kAXSubroleAttribute = "subrole"
func stringAttr(_ element: AXUIElement, _ attribute: String) -> String {
  if attribute == kAXTitleAttribute { return element.title }
  if attribute == kAXDocumentAttribute { return element.url }
  return "AXStandardWindow"
}
func collectChromiumTabs(_ window: AXUIElement, maxDepth: Int = 12, out: inout [AXUIElement]) { out = window.tabs }
func readTabInfo(_ tab: AXUIElement) -> (title: String, selected: Bool, customUrl: String) {
  (tab.title, tab.selected, tab.url)
}
class TabReferenceStore {
  func register(windowId: CGWindowID, element: AXUIElement, fallbackIndex: Int) -> String {
    "\(windowId):\(fallbackIndex)"
  }
}
