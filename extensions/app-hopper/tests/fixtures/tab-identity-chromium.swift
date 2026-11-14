func readTabInfo(_ tab: AXUIElement) -> (title: String, selected: Bool, customUrl: String) {
  (pageTitle, tab === first, "https://example.com/same")
}
func collectChromiumTabs(_ window: AXUIElement, maxDepth: Int = 12, out: inout [AXUIElement]) { out = currentTabs }
func makeWindowOutput() -> BrowserWindowOutput {
  var candidates: [(titles: [String], urls: [String])] = []
  return buildWindowOutput(
    wid: 10, axWindow: window, fallbackTitle: nil, fallbackDocUrl: nil, space: nil, aeCandidates: &candidates
  )!
}
