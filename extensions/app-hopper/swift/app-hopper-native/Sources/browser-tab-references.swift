import AppKit
import ApplicationServices
import Foundation

/// Keeps AX objects alive for one helper session. Titles, URLs and positions are not identities.
final class TabReferenceStore {
  private struct Reference {
    let windowId: CGWindowID
    let pid: Int32
    let launchDate: Date
    let element: AXUIElement
  }

  private let maximumReferenceCount = 8192
  private var references: [String: Reference] = [:]

  static func isRetainedID(_ tabId: String) -> Bool {
    tabId.contains(":ax:")
  }

  func register(windowId: CGWindowID, element: AXUIElement, fallbackIndex: Int) -> String {
    var pid: Int32 = 0
    guard AXUIElementGetPid(element, &pid) == .success,
      let launchDate = NSRunningApplication(processIdentifier: pid)?.launchDate
    else { return "\(windowId):\(fallbackIndex)" }

    if let existing = references.first(where: {
      $0.value.windowId == windowId && $0.value.pid == pid && $0.value.launchDate == launchDate
        && CFEqual($0.value.element, element)
    }) { return existing.key }

    // Retired references fail closed and require a fresh list.
    if references.count >= maximumReferenceCount { references.removeAll() }
    let id = "\(windowId):ax:\(UUID().uuidString.lowercased())"
    references[id] = Reference(windowId: windowId, pid: pid, launchDate: launchDate, element: element)
    return id
  }

  func resolve(
    tabId: String,
    windowId: CGWindowID,
    tabs: [AXUIElement],
    expectedTitle: String,
    title: (AXUIElement) -> String
  ) -> Int? {
    if !Self.isRetainedID(tabId) {
      return uniqueTabTitleIndex(titles: tabs.map(title), expectedTitle: expectedTitle)
    }

    guard let reference = references[tabId], reference.windowId == windowId,
      NSRunningApplication(processIdentifier: reference.pid)?.launchDate == reference.launchDate
    else { return nil }
    let matches = tabs.indices.filter { CFEqual(tabs[$0], reference.element) }
    return matches.count == 1 ? matches[0] : nil
  }
}

func parseTabIndex(_ tabId: String) -> Int? {
  if let colon = tabId.lastIndex(of: ":") {
    return Int(tabId[tabId.index(after: colon)...])
  }
  return Int(tabId)
}

/// Legacy cached rows have no retained AX object. Never trust their old position.
func uniqueTabTitleIndex(titles: [String], expectedTitle: String) -> Int? {
  guard !expectedTitle.isEmpty else { return nil }
  let matches = titles.indices.filter { titles[$0] == expectedTitle }
  return matches.count == 1 ? matches[0] : nil
}
