import AppKit
import Foundation

struct BrowserProcessIdentity: Codable, Equatable {
  let pid: Int32
  let launchedAt: Double

  var json: [String: Any] { ["pid": Int(pid), "launchedAt": launchedAt] }
}

func browserProcessIdentity(_ pid: Int32) -> BrowserProcessIdentity? {
  guard pid > 0, let app = AppKit.NSRunningApplication(processIdentifier: pid), !app.isTerminated,
    ["app.zen-browser.zen", "org.mozilla.firefox"].contains(app.bundleIdentifier ?? ""),
    let launched = app.launchDate else { return nil }
  return BrowserProcessIdentity(pid: pid, launchedAt: launched.timeIntervalSince1970)
}
