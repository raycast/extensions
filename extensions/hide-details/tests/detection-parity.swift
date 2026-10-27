import Foundation

// Prints Swift's classification for each stdin line so the Windows TypeScript port can be compared.
let email = try! NSRegularExpression(pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", options: [.caseInsensitive])
var results: [[String: Bool]] = []
while let text = readLine() {
  let compact = text.filter { !$0.isWhitespace }
  let numeric = numericDetections(text)
  results.append([
    "email": email.firstMatch(in: compact, range: NSRange(compact.startIndex..., in: compact)) != nil,
    "secret": secretExpression.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil,
    "ip": numeric.hasIP, "card": numeric.hasCard, "phone": numeric.hasPhone,
  ])
}
print(String(data: try JSONSerialization.data(withJSONObject: results, options: [.sortedKeys]), encoding: .utf8)!)
