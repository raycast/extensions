import AppKit
import ApplicationServices
import Foundation

enum FirefoxHelper {
  struct BrowserTabOutput: Encodable {
    let id: String
    let title: String
    let url: String
  }

  struct BrowserWindowOutput: Encodable {
    let id: String
    let title: String
    let tabs: [BrowserTabOutput]
    let space: Int?
    var tabListUnavailable = false
  }

  struct WindowAXContent {
    var tabButtons: [AXUIElement] = []
    var urlBarValue: String = ""
  }

  static func roleAndDomId(_ element: AXUIElement) -> (role: String, domId: String) {
    let attrs: [CFString] = [kAXRoleAttribute as CFString, "AXDOMIdentifier" as CFString]
    var valuesRef: CFArray?
    if AXUIElementCopyMultipleAttributeValues(element, attrs as CFArray, [], &valuesRef) == .success,
      let values = valuesRef as? [Any],
      values.count >= 2
    {
      let role = values[0] as? String ?? ""
      let domId = values[1] as? String ?? ""
      if !role.isEmpty {
        return (role, domId)
      }
    }
    return (stringAttr(element, kAXRoleAttribute), stringAttr(element, "AXDOMIdentifier"))
  }

  static func inspectBrowserWindow(_ window: AXUIElement) -> WindowAXContent {
    var content = WindowAXContent()
    var foundTabGroup = false
    var foundUrlBar = false

    func walk(_ element: AXUIElement, depth: Int) {
      if depth > 8 || (foundTabGroup && foundUrlBar) {
        return
      }
      let (role, domId) = roleAndDomId(element)
      if role == "AXMenu" || role == "AXMenuBar" || role == "AXWebArea" || role == "AXButton" || role == "AXStaticText"
        || role == "AXImage"
      {
        return
      }
      if domId == "tabbrowser-tabpanels" {
        return
      }

      if !foundTabGroup && role == "AXTabGroup" && domId == "tabbrowser-tabs" {
        if let axTabs = copyAttr(element, "AXTabs") as? [AXUIElement], !axTabs.isEmpty {
          content.tabButtons = axTabs
        } else if let children = copyAttr(element, kAXChildrenAttribute) as? [AXUIElement] {
          content.tabButtons = children.filter {
            stringAttr($0, kAXSubroleAttribute) == "AXTabButton" || stringAttr($0, kAXRoleAttribute) == "AXRadioButton"
          }
        }
        foundTabGroup = true
        return
      }

      if !foundUrlBar && domId == "urlbar-input" {
        content.urlBarValue = stringAttr(element, kAXValueAttribute)
        foundUrlBar = true
        return
      }

      if let children = copyAttr(element, kAXChildrenAttribute) as? [AXUIElement] {
        for child in children {
          walk(child, depth: depth + 1)
          if foundTabGroup && foundUrlBar {
            break
          }
        }
      }
    }

    walk(window, depth: 0)
    return content
  }

  static func tabTitleFallback(of tab: AXUIElement) -> String {
    if let children = copyAttr(tab, kAXChildrenAttribute) as? [AXUIElement] {
      for child in children where stringAttr(child, kAXRoleAttribute) == "AXStaticText" {
        let value = stringAttr(child, kAXValueAttribute)
        if !value.isEmpty {
          return value
        }
        let childTitle = stringAttr(child, kAXTitleAttribute)
        if !childTitle.isEmpty {
          return childTitle
        }
      }
    }
    return ""
  }

  static func tabTitle(of tab: AXUIElement) -> String {
    let title = stringAttr(tab, kAXTitleAttribute)
    if !title.isEmpty {
      return title
    }
    return tabTitleFallback(of: tab)
  }

  static func isTabSelected(_ tab: AXUIElement) -> Bool {
    return boolAttr(tab, kAXSelectedAttribute) || boolAttr(tab, kAXValueAttribute)
  }

  static func readTabInfo(_ tab: AXUIElement) -> (title: String, selected: Bool) {
    let attrs: [CFString] = [
      kAXTitleAttribute as CFString,
      kAXSelectedAttribute as CFString,
      kAXValueAttribute as CFString,
    ]
    var valuesRef: CFArray?
    if AXUIElementCopyMultipleAttributeValues(tab, attrs as CFArray, [], &valuesRef) == .success,
      let values = valuesRef as? [Any],
      values.count >= 3
    {
      let rawTitle = values[0] as? String ?? ""
      let selected = boolFromAny(values[1]) || boolFromAny(values[2])
      let title = !rawTitle.isEmpty ? rawTitle : tabTitleFallback(of: tab)
      return (title, selected)
    }
    return (tabTitle(of: tab), isTabSelected(tab))
  }

  private static let tabReferences = TabReferenceStore()

  static func buildWindowOutput(
    wid: CGWindowID,
    axWindow: AXUIElement?,
    fallbackTitle: String?,
    space: Int?
  ) -> BrowserWindowOutput? {
    let winIdStr = String(wid)
    guard let axWindow = axWindow else {
      guard let fallbackTitle = fallbackTitle, !fallbackTitle.isEmpty else {
        return nil
      }
      return BrowserWindowOutput(
        id: winIdStr,
        title: fallbackTitle,
        tabs: [],
        space: space,
        tabListUnavailable: true
      )
    }

    let content = inspectBrowserWindow(axWindow)
    let axWinTitle = stringAttr(axWindow, kAXTitleAttribute)
    let effectiveWinTitle = !axWinTitle.isEmpty ? axWinTitle : (fallbackTitle ?? "")

    if content.tabButtons.isEmpty {
      let subrole = stringAttr(axWindow, kAXSubroleAttribute)
      if subrole != "AXStandardWindow" && fallbackTitle == nil {
        return nil
      }
      return BrowserWindowOutput(
        id: winIdStr,
        title: effectiveWinTitle,
        tabs: [],
        space: space,
        tabListUnavailable: true
      )
    }

    var tabs: [BrowserTabOutput] = []
    var activeTitle = ""

    for (index, tabButton) in content.tabButtons.enumerated() {
      let (title, selected) = readTabInfo(tabButton)
      if selected && !title.isEmpty {
        activeTitle = title
      }
      tabs.append(
        BrowserTabOutput(
          id: tabReferences.register(windowId: wid, element: tabButton, fallbackIndex: index),
          title: title,
          url: selected ? content.urlBarValue : ""
        )
      )
    }

    let finalTitle = !activeTitle.isEmpty ? activeTitle : effectiveWinTitle
    return BrowserWindowOutput(
      id: winIdStr,
      title: finalTitle,
      tabs: tabs,
      space: space
    )
  }

  static func handleList(args: [String]) throws {
    guard AXIsProcessTrusted() else {
      throw NSError(
        domain: "FirefoxAX",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Accessibility permission is required to read Firefox tabs."]
      )
    }

    let appName = args.count > 0 ? args[0] : "Firefox"
    let nativeJson = args.count > 1 ? args[1] : "[]"
    let nativeWindows = (try? JSONDecoder().decode([NativeWindowInput].self, from: Data(nativeJson.utf8))) ?? []

    let pids = findBrowserPIDs(appName: appName, nativeWindows: nativeWindows)
    if pids.isEmpty {
      print("[]")
      return
    }

    var axWindowsByWid: [CGWindowID: AXUIElement] = [:]
    for pid in pids {
      let expected = Set(nativeWindows.filter { $0.pid == pid && $0.id > 0 }.map { CGWindowID($0.id) })
      let discovered = discoverAXWindows(pid: pid, expectedWindowIds: expected, maxElementId: 5000)
      for (wid, axWin) in discovered {
        axWindowsByWid[wid] = axWin
      }
    }

    var results: [BrowserWindowOutput] = []
    var handledWids = Set<CGWindowID>()

    for nWin in nativeWindows where nWin.id > 0 {
      let wid = CGWindowID(nWin.id)
      guard handledWids.insert(wid).inserted else { continue }
      let validSpace = (nWin.space ?? 0) > 0 ? nWin.space : nil
      if let output = buildWindowOutput(
        wid: wid,
        axWindow: axWindowsByWid[wid],
        fallbackTitle: nWin.title,
        space: validSpace
      ) {
        results.append(output)
      }
    }

    if nativeWindows.isEmpty {
      for (wid, axWin) in axWindowsByWid.sorted(by: { $0.key < $1.key }) {
        guard handledWids.insert(wid).inserted else { continue }
        if let output = buildWindowOutput(wid: wid, axWindow: axWin, fallbackTitle: nil, space: nil) {
          results.append(output)
        }
      }
    }

    let encoded = try JSONEncoder().encode(results)
    print(String(data: encoded, encoding: .utf8) ?? "[]")
  }

  static func handleFocus(args: [String]) throws {
    guard AXIsProcessTrusted() else {
      throw NSError(
        domain: "FirefoxAX",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Accessibility permission is required to switch Firefox tabs."]
      )
    }
    guard args.count >= 4 else {
      throw NSError(
        domain: "FirefoxAX",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Missing arguments for focus command."]
      )
    }

    let appName = args[0]
    let windowIdStr = args[1]
    let tabIdStr = args[2]
    let expectedTitle = args[3]
    let explicitPid = args.count > 4 ? Int32(args[4]) : nil

    guard let rawWid = UInt32(windowIdStr), rawWid > 0 else {
      throw NSError(domain: "FirefoxAX", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid Firefox window ID."])
    }
    let targetWid = CGWindowID(rawWid)

    let pids: [Int32]
    if let pid = explicitPid, pid > 0 {
      pids = [pid]
    } else {
      pids = findBrowserPIDs(appName: appName, nativeWindows: [])
    }

    guard !pids.isEmpty else {
      throw NSError(domain: "FirefoxAX", code: 4, userInfo: [NSLocalizedDescriptionKey: "Browser is not running"])
    }

    var foundWindow: AXUIElement?
    var ownerPid: Int32 = pids[0]

    for pid in pids {
      let discovered = discoverAXWindows(pid: pid, expectedWindowIds: [targetWid], maxElementId: 5000)
      if let win = discovered[targetWid] {
        foundWindow = win
        ownerPid = pid
        break
      }
    }

    guard let targetWindow = foundWindow else {
      throw NSError(domain: "FirefoxAX", code: 5, userInfo: [NSLocalizedDescriptionKey: "Browser window no longer exists"])
    }

    let content = inspectBrowserWindow(targetWindow)
    if !content.tabButtons.isEmpty {
      guard let resolvedIndex = tabReferences.resolve(
        tabId: tabIdStr, windowId: targetWid, tabs: content.tabButtons,
        expectedTitle: expectedTitle, title: tabTitle
      ) else {
        throw NSError(domain: "FirefoxAX", code: 6,
          userInfo: [NSLocalizedDescriptionKey: "Tab changed or list expired. Refresh the list."])
      }

      let targetTab = content.tabButtons[resolvedIndex]
      let pressError = AXUIElementPerformAction(targetTab, kAXPressAction as CFString)
      if pressError != .success {
        throw NSError(
          domain: "FirefoxAX",
          code: 7,
          userInfo: [NSLocalizedDescriptionKey: "Failed to activate Firefox tab (AX error \(pressError.rawValue))."]
        )
      }
    } else {
      throw NSError(domain: "FirefoxAX", code: 6,
        userInfo: [NSLocalizedDescriptionKey: "Cannot access tab controls. Refresh the list."])
    }

    try focusWindow(targetWindow, pid: ownerPid, windowId: targetWid, unhide: false)
    print("ok")
  }
}
