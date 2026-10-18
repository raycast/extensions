// Self-test for swift/PrayerTimes/Sources/StatusLine.swift, compiled with it by src/lib/status-line.test.ts.
import Foundation
var failures = 0
func check(_ name: String, _ ok: Bool) {
  if !ok {
    print("FAIL", name)
    failures += 1
  }
}

let human = "ظہر starts 11:57 · Jamaat 13:30 · Ends 16:03"
let marker = "prayer-times://2026-10-18/dhuhr"
let planned = "\(human)\n\(marker)"
let marked = "\(human)\nprayer-status: jamaat\n\(marker)"

check("writes the line second to last", withStatus(planned, "jamaat") == marked)
check("replaces an existing line", withStatus(marked, "late") == "\(human)\nprayer-status: late\n\(marker)")
check("unmark removes the line", withStatus(marked, nil) == planned)
check("reads the value", statusValue(in: marked) == "jamaat")
check("reads a value written loosely", statusValue(in: "\(human)\n  Prayer-Status:   OnTime \n\(marker)") == "ontime")
check("no line, no value", statusValue(in: planned) == nil && statusValue(in: nil) == nil)
check("without the line, the notes are the plan", withoutStatus(marked) == planned)

// A sync compares only the planned lines and keeps the line exactly as written.
let newPlan = "ظہر starts 11:57 · Jamaat 13:45 · Ends 16:03\n\(marker)"
check("an unchanged plan isn't an update", withoutStatus(marked) == planned)
check("a changed plan keeps the status line",
  withStatusLine(newPlan, statusLine(in: marked)) == "ظہر starts 11:57 · Jamaat 13:45 · Ends 16:03\nprayer-status: jamaat\n\(marker)")
check("a line written by another tool is kept as written",
  withStatusLine(newPlan, statusLine(in: "\(human)\nprayer-status:madeup\n\(marker)")).contains("\nprayer-status:madeup\n"))
check("a plan without a line stays without one", withStatusLine(newPlan, statusLine(in: planned)) == newPlan)
check("notes without a key get the line at the end", withStatus("x", "late") == "x\nprayer-status: late")
check("empty notes", withStatus(nil, "late") == "prayer-status: late" && withStatus(nil, nil) == "")

print(failures == 0 ? "OK" : "\(failures) failed")
if failures > 0 { exit(1) }
