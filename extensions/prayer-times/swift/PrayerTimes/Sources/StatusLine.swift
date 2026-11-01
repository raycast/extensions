import Foundation

// A prayer reminder's notes, top to bottom:
//   ظہر starts 11:57 · Jamaat 13:30 · Ends 16:03      (planned by the extension)
//   prayer-status: jamaat                              (only when a status is set)
//   prayer-times://2026-10-18/dhuhr                    (the key, always last)
// Status values: jamaat, ontime, late, missed, madeup. Whoever sets a status (this extension on a Raycast
// mark, the Unify bridge on a phone or Google mark) writes the line together with isCompleted and
// completionDate; everyone else keeps the line exactly as it is.

let statusPrefix = "prayer-status:"

private func lines(_ notes: String?) -> [Substring] {
  (notes ?? "").split(separator: "\n", omittingEmptySubsequences: false)
}

private func isStatusLine(_ line: Substring) -> Bool {
  line.trimmingCharacters(in: .whitespaces).lowercased().hasPrefix(statusPrefix)
}

/// The status line as written, or nil.
func statusLine(in notes: String?) -> String? {
  lines(notes).last(where: isStatusLine).map(String.init)
}

/// The status value, trimmed and lowercased; nil without a line. Unknown values are left to the reader.
func statusValue(in notes: String?) -> String? {
  guard let line = statusLine(in: notes) else { return nil }
  let value = line.trimmingCharacters(in: .whitespaces).dropFirst(statusPrefix.count)
  return value.trimmingCharacters(in: .whitespaces).lowercased()
}

/// Notes without any status line: what the extension planned, for comparing with a new plan.
func withoutStatus(_ notes: String?) -> String {
  lines(notes).filter { !isStatusLine($0) }.joined(separator: "\n")
}

/// `notes` with `line` as its status line (nil removes it), placed right above the key line.
func withStatusLine(_ notes: String?, _ line: String?) -> String {
  let kept = withoutStatus(notes)
  var rest = kept.isEmpty ? [] : lines(kept).map(String.init)
  guard let line else { return rest.joined(separator: "\n") }
  let at = rest.lastIndex(where: { $0.contains("prayer-times://") }) ?? rest.count
  rest.insert(line, at: at)
  return rest.joined(separator: "\n")
}

/// `notes` with the status set to `value` (nil removes the line).
func withStatus(_ notes: String?, _ value: String?) -> String {
  withStatusLine(notes, value.map { "\(statusPrefix) \($0)" })
}
