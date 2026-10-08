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
  // Each OCR line gets its own matching budget.
  private let matchingBudget: TimeInterval = 0.1

  init(pattern: String) throws {
    do {
      expression = try NSRegularExpression(pattern: pattern)
    } catch {
      throw CustomRegexError.invalidPattern
    }
  }

  func matches(_ text: String) throws -> Bool {
    let start = ProcessInfo.processInfo.systemUptime
    var matched = false
    var failure: CustomRegexError?
    expression.enumerateMatches(
      in: text, options: [.reportProgress, .reportCompletion], range: NSRange(text.startIndex..., in: text)
    ) { result, flags, stop in
      if flags.contains(.internalError) {
        failure = .matchingFailed
        stop.pointee = true
      } else if let result, result.range.length > 0 {
        matched = true
        stop.pointee = true
      } else if !flags.contains(.completed), ProcessInfo.processInfo.systemUptime - start >= matchingBudget {
        failure = .timedOut
        stop.pointee = true
      }
    }
    if let failure { throw failure }
    return matched
  }
}
