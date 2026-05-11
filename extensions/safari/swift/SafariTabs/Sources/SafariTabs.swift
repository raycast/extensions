import Foundation
import RaycastSwiftMacros
import ScriptingBridge

// MARK: - ScriptingBridge Protocols for Safari

@objc protocol SafariApplication {
  @objc optional var windows: SBElementArray { get }
}

@objc protocol SafariWindow {
  @objc optional var tabs: SBElementArray { get }
  @objc optional var id: Int { get }
}

@objc protocol SafariTab {
  @objc optional var name: String { get }
  @objc optional var URL: String { get }
  @objc optional var index: Int { get }
}

extension SBApplication: SafariApplication {}
extension SBObject: SafariWindow, SafariTab {}

struct LocalTab: Codable {
  let uuid: String
  let title: String
  let url: String
  let window_id: Int
  let index: Int
  let is_local: Bool
}

// MARK: - Raycast Functions

@raycast func getLocalTabs(appName: String) -> [LocalTab] {
  let bundleIdentifier: String
  switch appName {
  case "Safari Technology Preview":
    bundleIdentifier = "com.apple.SafariTechnologyPreview"
  default:
    bundleIdentifier = "com.apple.Safari"
  }

  guard let safari = SBApplication(bundleIdentifier: bundleIdentifier) as? SafariApplication else {
    return []
  }

  var tabs: [LocalTab] = []

  guard let windows = safari.windows else {
    return []
  }

  for window in windows {
    guard let safariWindow = window as? SafariWindow,
          let windowId = safariWindow.id,
          let windowTabs = safariWindow.tabs else {
      continue
    }

    var tabIndex = 1
    for tab in windowTabs {
      guard let safariTab = tab as? SafariTab else {
        continue
      }

      let tabTitle = safariTab.name ?? ""
      let tabUrl = safariTab.URL ?? ""

      tabs.append(LocalTab(
        uuid: "\(windowId)-\(tabIndex)",
        title: tabTitle,
        url: tabUrl,
        window_id: windowId,
        index: tabIndex,
        is_local: true
      ))

      tabIndex += 1
    }
  }

  return tabs
}
