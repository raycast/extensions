import Foundation

/// Share one deadline across URL queries, browser processes and script fallbacks.
struct BrowserQueryBudget {
  private let deadline: TimeInterval

  init(seconds: TimeInterval = 2) {
    deadline = ProcessInfo.processInfo.systemUptime + seconds
  }

  var remainingTime: TimeInterval {
    max(0, deadline - ProcessInfo.processInfo.systemUptime)
  }

  func appleScriptSource(appName: String, statements: [String], result: String) -> String? {
    guard remainingTime >= 1 else { return nil }
    let commands = statements.map { statement in
      """
      with timeout of (my remainingSeconds(\(deadline))) seconds
        \(statement)
      end timeout
      """
    }.joined(separator: "\n")
    return """
      use framework "Foundation"
      use scripting additions
      on remainingSeconds(queryDeadline)
        set uptime to (current application's NSProcessInfo's processInfo()'s systemUptime()) as real
        set secondsLeft to round (queryDeadline - uptime) rounding down
        if secondsLeft < 1 then error "Browser query timed out" number -1712
        return secondsLeft
      end remainingSeconds
      tell application "\(appName)"
        \(commands)
        return \(result)
      end tell
      """
  }
}
