import Foundation

func check(_ pattern: String, _ text: String, matches expected: Bool) throws {
  let regex = try CustomRegex(pattern: pattern)
  let actual = try regex.matches(text)
  precondition(actual == expected, "Unexpected result for \(pattern)")
}

try check(#"\bINV-\d{4,6}\b"#, "Invoice INV-12345", matches: true)
try check(#"\bINV-\d{4,6}\b"#, "Invoice INV-12", matches: false)
try check(#"(?i)client|confidential"#, "CLIENT report", matches: true)
try check(#"/Users/[^/]+/"#, "/Users/Alex Smith/Projects", matches: true)
try check(#"^a b$"#, "a b", matches: true)
try check(#"^ab$"#, "a b", matches: false)
try check(#"🙂\s+\d+"#, "é 🙂 123", matches: true)
try check(#"^"#, "Any text", matches: false)
try check(#"\d*"#, "abc123", matches: true)
try check(#"no-match"#, "Any text", matches: false)

do {
  _ = try CustomRegex(pattern: "[")
  preconditionFailure("An invalid pattern must fail validation")
} catch CustomRegexError.invalidPattern {
  // Expected.
}

let simple = try CustomRegex(pattern: #"\bINV-\d{4,6}\b"#)
var matchingTime: TimeInterval = 0
var lineCount = 0
while matchingTime < 0.15 {
  let expected = lineCount.isMultiple(of: 2)
  let text = expected ? "Invoice INV-12345" : "No invoice here"
  let start = ProcessInfo.processInfo.systemUptime
  let actual = try simple.matches(text)
  matchingTime += ProcessInfo.processInfo.systemUptime - start
  precondition(actual == expected, "A simple regex must keep working across OCR lines")
  lineCount += 1
}

let expensive = try CustomRegex(pattern: #"^(a+)+$"#)
do {
  _ = try expensive.matches(String(repeating: "a", count: 10_000) + "!")
  preconditionFailure("A pathological pattern must stop within its matching budget")
} catch CustomRegexError.timedOut {
  // Expected.
}
let recovered = try expensive.matches("a")
precondition(recovered, "A new OCR line must have a fresh matching budget after a timeout")
print("Custom regex matching, validation, and timeout checks passed.")
