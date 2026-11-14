import AppKit
import Foundation

struct Candidate { let windowId: Int?; let titles: [String] }
var current = [Candidate(windowId: 10, titles: ["First", "Second"])]
var succeeds = true
var selected: Int? = nil

func fetchAppleEventWindowsByPid(pid: Int32, appName: String) -> [Candidate]? { current }
func selectTabViaAppleEvent(pid: Int32, wid: CGWindowID, tabIndex: Int) -> Bool {
  selected = tabIndex
  return succeeds
}
func focus(_ title: String) throws {
  try focusTabViaAppleEvent(pid: 20, windowId: 10, appName: "Test Browser", expectedTitle: title)
}

precondition(uniqueTabTitleIndex(titles: ["Same", "Same"], expectedTitle: "Same") == nil)
precondition(uniqueTabTitleIndex(titles: ["Other", "Target"], expectedTitle: "Target") == 1)
precondition(uniqueTabTitleIndex(titles: ["Target", "Other"], expectedTitle: "Target") == 0)
precondition(uniqueTabTitleIndex(titles: ["Other"], expectedTitle: "Target") == nil)
precondition(uniqueTabTitleIndex(titles: [""], expectedTitle: "") == nil)

try focus("First")
precondition(selected == 0)
succeeds = false
do { try focus("Second"); fatalError("Ignored selection failure") } catch {}
selected = nil
current = [Candidate(windowId: 99, titles: ["First"])]
do { try focus("First"); fatalError("Accepted wrong window") } catch {}
precondition(selected == nil)
