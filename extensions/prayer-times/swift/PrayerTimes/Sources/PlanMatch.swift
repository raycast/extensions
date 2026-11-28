import Foundation

// Whether a prayer reminder already matches the plan. The two Macs work out times up to a minute apart, and
// iCloud merges two notes written at once into one doubled note, so near-equal plans must not be rewritten.

/// Times this close to the plan count as matching.
let toleranceMinutes = 2

private let clockPattern = try! NSRegularExpression(pattern: "\\b(\\d{1,2}):(\\d{2})\\b")

/// The text with each `HH:MM` replaced by `#`, and those times as minutes after midnight, in order.
private func clockShape(_ text: String) -> (shape: String, minutes: [Int]) {
  let range = NSRange(text.startIndex..., in: text)
  let minutes = clockPattern.matches(in: text, range: range).compactMap { match -> Int? in
    guard let h = Range(match.range(at: 1), in: text), let m = Range(match.range(at: 2), in: text) else { return nil }
    // formatTime follows the system locale, so the digits may be Arabic-Indic (٠٥:٣٠), which Int() can't read.
    let number = { (digits: Substring) in digits.reduce(0) { $0 * 10 + ($1.wholeNumberValue ?? 0) } }
    return number(text[h]) * 60 + number(text[m])
  }
  return (clockPattern.stringByReplacingMatches(in: text, range: range, withTemplate: "#"), minutes)
}

private func minutesApart(_ a: Int, _ b: Int) -> Int {
  let d = abs(a - b) % 1440
  return min(d, 1440 - d)  // 23:59 and 00:01 are 2 minutes apart
}

/// The notes match the plan: the same text and key line, each time within the tolerance. The status line,
/// which the plan doesn't have, is ignored.
func notesMatchPlan(_ notes: String?, _ planned: String) -> Bool {
  let current = clockShape(withoutStatus(notes))
  let plan = clockShape(planned)
  return current.shape == plan.shape && current.minutes.count == plan.minutes.count
    && zip(current.minutes, plan.minutes).allSatisfy { minutesApart($0, $1) <= toleranceMinutes }
}

/// Notes holding more than one key: two writes merged by iCloud. The hub repairs them; writing here too would
/// merge again.
func hasDoubledKey(_ notes: String?) -> Bool {
  (notes ?? "").components(separatedBy: "prayer-times://").count > 2
}

/// The instants are within the tolerance of each other.
func timesMatch(_ a: Date?, _ b: Date) -> Bool {
  guard let a else { return false }
  return abs(a.timeIntervalSince(b)) <= Double(toleranceMinutes * 60)
}

/// The same number of alarms, each within the tolerance of the planned one.
func alarmsMatch(_ current: [Date], _ planned: [Date]) -> Bool {
  current.count == planned.count && zip(current.sorted(), planned.sorted()).allSatisfy { timesMatch($0, $1) }
}
