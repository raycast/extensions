let output = makeWindowOutput()
precondition(output.tabs.count == 2)
let targetID = output.tabs[1].id

// Identity survives reordering and navigation, even with identical titles and URLs.
currentTabs = [second, first]
pageTitle = "Navigated"
try handleFocus(args: ["Test Browser", "10", targetID, "Same", "20", "https://example.com/same"])
precondition(pressed == ["second"], "Selected the wrong identical tab after reorder")
pressed = []

// Failure to press the AX object must not fall back to a positional Apple Event.
pressSucceeds = false
do {
  try handleFocus(args: ["Test Browser", "10", targetID, "Same", "20"])
  fatalError("Ignored AX press failure")
} catch {}
precondition(aeSelections == 0, "Fell back to a positional Apple Event for a live AX reference")
pressSucceeds = true

// An existing token cannot target a different window or a replacement tab.
do {
  try handleFocus(args: ["Test Browser", "99", targetID, "Same", "20"])
  fatalError("Accepted wrong window")
} catch {}
currentTabs = [Element("replacement"), first]
do {
  try handleFocus(args: ["Test Browser", "10", targetID, "Same", "20"])
  fatalError("Accepted a closed tab reference")
} catch {}
precondition(pressed.isEmpty)

// Missing controls must report failure, rather than only bringing the window forward.
currentTabs = []
do {
  try handleFocus(args: ["Test Browser", "10", targetID, "Same", "20"])
  fatalError("Reported success with no tab controls")
} catch {}
precondition(pressed.isEmpty)
