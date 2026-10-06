import Foundation

enum CustomRegexError: LocalizedError {
  case invalidPattern
  case timedOut
  case matchingFailed

  var errorDescription: String? {
    switch self {
    case .invalidPattern:
      return "Invalid Custom Regex. Check the pattern in extension preferences."
    case .timedOut:
      return "Custom Regex took too long. Simplify the pattern in extension preferences."
    case .matchingFailed:
      return "Custom Regex could not be evaluated. Check the pattern in extension preferences."
    }
  }
}

struct CustomRegex {
  private let expression: NSRegularExpression
  // A shared budget for all OCR lines, excluding time spent on OCR itself.
  private var remainingTime: TimeInterval = 0.1

  init(pattern: String) throws {
    do {
      expression = try NSRegularExpression(pattern: pattern)
    } catch {
      throw CustomRegexError.invalidPattern
    }
  }

  mutating func matches(_ text: String) throws -> Bool {
    let start = ProcessInfo.processInfo.systemUptime
    let budget = remainingTime
    var matched = false
    var failure: CustomRegexError?
    expression.enumerateMatches(
      in: text, options: [.reportProgress, .reportCompletion], range: NSRange(text.startIndex..., in: text)
    ) { result, flags, stop in
      if ProcessInfo.processInfo.systemUptime - start >= budget {
        failure = .timedOut
        stop.pointee = true
      } else if flags.contains(.internalError) {
        failure = .matchingFailed
        stop.pointee = true
      } else if let result, result.range.length > 0 {
        matched = true
        stop.pointee = true
      }
    }
    remainingTime -= ProcessInfo.processInfo.systemUptime - start
    if let failure { throw failure }
    if remainingTime <= 0 { throw CustomRegexError.timedOut }
    return matched
  }
}
