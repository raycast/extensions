var reorderedURLs = false
var customTabURLs = false

func readTabInfo(_ tab: AXUIElement) -> (title: String, selected: Bool, customUrl: String) {
  if reorderedURLs {
    return (tab === first ? "A" : "B", false, customTabURLs ? "https://ax.example" : "")
  }
  return (pageTitle, tab === first, "https://example.com/same")
}
func urlAttr(_ element: AXUIElement, _ attr: String) -> String { "https://example.com/same" }
func inspectWebKitWindow(_ window: AXUIElement, collectUrl: Bool = true) -> WindowAXInspection {
  WindowAXInspection(tabButtons: currentTabs)
}
func matchAECandidate(
  wid: CGWindowID, tabCount: Int, effectiveDocUrl: String, effectiveWinTitle: String,
  onlyWindowForPid: Bool = false, aeCandidates: inout [AEWindowCandidate]
) -> AEWindowCandidate? {
  reorderedURLs ? AEWindowCandidate(windowId: 10, titles: ["B", "A"], urls: ["https://b.example", "https://a.example"]) : nil
}
func fetchAppleEventWindowsByPid(pid: Int32, appName: String = "") -> [AEWindowCandidate]? { [] }
func selectTabViaAppleEvent(pid: Int32, wid: CGWindowID, tabIndex: Int) -> Bool {
  aeSelections += 1
  return true
}
func makeWindowOutput() -> BrowserWindowOutput {
  var candidates: [AEWindowCandidate] = []
  return buildWindowOutput(
    wid: 10, axWindow: window, fallbackTitle: nil, fallbackDocUrl: nil, space: nil, aeCandidates: &candidates
  )!
}

func assertNonBrowserDialogIsExcluded() {
  currentTabs = []
  windowSubrole = "AXDialog"
  var candidates: [AEWindowCandidate] = []
  precondition(buildWindowOutput(
    wid: 10, axWindow: window, fallbackTitle: "Preferences", fallbackDocUrl: nil,
    space: nil, aeCandidates: &candidates
  ) == nil, "A preferences dialog must not become a fake browser window")
}

func assertWebKitURLsFollowTabs() {
  currentTabs = [first, second]
  windowSubrole = "AXStandardWindow"
  reorderedURLs = true
  let output = makeWindowOutput()
  precondition(output.tabs.map { $0.url } == ["https://a.example", "https://b.example"])
  customTabURLs = true
  precondition(makeWindowOutput().tabs.allSatisfy { $0.url == "https://ax.example" })
}
