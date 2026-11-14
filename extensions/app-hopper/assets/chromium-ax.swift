import Accessibility
import AppKit
import ApplicationServices
import Carbon
import Foundation

struct NativeWindowInput: Decodable {
  let id: Int
  let pid: Int32
  let space: Int?
  let title: String?
  let documentUrl: String?
}

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
}

func chromiumBrowserPolicy(appName: String) -> (tabClass: String, tabSearchDepth: Int) {
  // Opera's tab strip sits below extra application groups and uses its own scripting class.
  if appName == "Opera" { return ("OpTb", 24) }
  return ("CrTb", 12)
}

func roleAndSubrole(_ element: AXUIElement) -> (role: String, subrole: String) {
  let attrs: [CFString] = [kAXRoleAttribute as CFString, kAXSubroleAttribute as CFString]
  var valuesRef: CFArray?
  if AXUIElementCopyMultipleAttributeValues(element, attrs as CFArray, [], &valuesRef) == .success,
    let values = valuesRef as? [Any],
    values.count >= 2
  {
    let role = values[0] as? String ?? ""
    let subrole = values[1] as? String ?? ""
    if !role.isEmpty {
      return (role, subrole)
    }
  }
  return (stringAttr(element, kAXRoleAttribute), stringAttr(element, kAXSubroleAttribute))
}

func collectChromiumTabs(
  _ element: AXUIElement,
  depth: Int = 0,
  insideTabGroup: Bool = false,
  maxDepth: Int = 12,
  out: inout [AXUIElement]
) {
  if depth > maxDepth {
    return
  }
  let (role, subrole) = roleAndSubrole(element)
  if role == "AXWebArea" || role == "AXMenu" || role == "AXMenuBar" || role == "AXButton"
    || role == "AXStaticText" || role == "AXImage" || role == "AXTextField"
  {
    return
  }
  if subrole == "AXTabButton" || (insideTabGroup && role == "AXRadioButton") {
    out.append(element)
    return
  }
  let nowInTabGroup = insideTabGroup || role == "AXTabGroup"
  if insideTabGroup && role != "AXGroup" && role != "AXScrollArea" && role != "AXTabGroup" {
    return
  }
  if role == "AXTabGroup", let axTabs = copyAttr(element, "AXTabs") as? [AXUIElement], !axTabs.isEmpty {
    out.append(contentsOf: axTabs)
    return
  }
  if let children = copyAttr(element, kAXChildrenAttribute) as? [AXUIElement] {
    for child in children {
      collectChromiumTabs(child, depth: depth + 1, insideTabGroup: nowInTabGroup, maxDepth: maxDepth, out: &out)
    }
  }
}

func decodeCustomContentUrl(_ rawData: Any?) -> String {
  guard let data = rawData as? Data,
    let items = try? NSKeyedUnarchiver.unarchivedObject(
      ofClasses: [NSArray.self, AXCustomContent.self, NSString.self, NSAttributedString.self],
      from: data
    ) as? [AXCustomContent]
  else {
    return ""
  }
  return items.first?.value ?? ""
}

func tabTitleFallback(of tab: AXUIElement) -> String {
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

func readTabInfo(_ tab: AXUIElement) -> (title: String, selected: Bool, customUrl: String) {
  let attrs: [CFString] = [
    kAXTitleAttribute as CFString,
    kAXSelectedAttribute as CFString,
    kAXValueAttribute as CFString,
    "AXCustomContent" as CFString,
  ]
  var valuesRef: CFArray?
  if AXUIElementCopyMultipleAttributeValues(tab, attrs as CFArray, [], &valuesRef) == .success,
    let values = valuesRef as? [Any],
    values.count >= 4
  {
    let rawTitle = values[0] as? String ?? ""
    let selected = boolFromAny(values[1]) || boolFromAny(values[2])
    let title = !rawTitle.isEmpty ? rawTitle : tabTitleFallback(of: tab)
    let customUrl = decodeCustomContentUrl(values[3])
    return (title, selected, customUrl)
  }

  let rawTitle = stringAttr(tab, kAXTitleAttribute)
  let title = !rawTitle.isEmpty ? rawTitle : tabTitleFallback(of: tab)
  let selected = boolAttr(tab, kAXSelectedAttribute) || boolAttr(tab, kAXValueAttribute)
  let customUrl = decodeCustomContentUrl(copyAttr(tab, "AXCustomContent"))
  return (title, selected, customUrl)
}

func fourCC(_ s: String) -> FourCharCode {
  var result: FourCharCode = 0
  for b in s.utf8 {
    result = (result << 8) | FourCharCode(b)
  }
  return result
}

func everyElement(want: FourCharCode, from container: NSAppleEventDescriptor) -> NSAppleEventDescriptor {
  let obj = NSAppleEventDescriptor.record()
  obj.setDescriptor(NSAppleEventDescriptor(typeCode: want), forKeyword: fourCC("want"))
  obj.setDescriptor(container, forKeyword: fourCC("from"))
  // Absolute-position selection uses formAbsolutePosition (indx), not typeAbsoluteOrdinal (abso).
  obj.setDescriptor(NSAppleEventDescriptor(enumCode: fourCC("indx")), forKeyword: fourCC("form"))
  var allCode = fourCC("all ")
  if let seld = NSAppleEventDescriptor(descriptorType: fourCC("abso"), bytes: &allCode, length: 4) {
    obj.setDescriptor(seld, forKeyword: fourCC("seld"))
  }
  return obj.coerce(toDescriptorType: fourCC("obj ")) ?? obj
}

func propertySpec(prop: FourCharCode, from container: NSAppleEventDescriptor) -> NSAppleEventDescriptor {
  let obj = NSAppleEventDescriptor.record()
  obj.setDescriptor(NSAppleEventDescriptor(typeCode: fourCC("prop")), forKeyword: fourCC("want"))
  obj.setDescriptor(container, forKeyword: fourCC("from"))
  obj.setDescriptor(NSAppleEventDescriptor(enumCode: fourCC("prop")), forKeyword: fourCC("form"))
  obj.setDescriptor(NSAppleEventDescriptor(typeCode: prop), forKeyword: fourCC("seld"))
  return obj.coerce(toDescriptorType: fourCC("obj ")) ?? obj
}

func queryAppleEventNestedStrings(pid: Int32, prop: FourCharCode, tabClass: FourCharCode) -> [[String]]? {
  let target = NSAppleEventDescriptor(processIdentifier: pid)
  let event = NSAppleEventDescriptor(
    eventClass: fourCC("core"),
    eventID: fourCC("getd"),
    targetDescriptor: target,
    returnID: AEReturnID(kAutoGenerateReturnID),
    transactionID: AETransactionID(kAnyTransactionID)
  )
  let allWins = everyElement(want: fourCC("cwin"), from: NSAppleEventDescriptor.null())
  let allTabs = everyElement(want: tabClass, from: allWins)
  event.setParam(propertySpec(prop: prop, from: allTabs), forKeyword: fourCC("----"))

  guard let reply = try? event.sendEvent(options: [.waitForReply, .canInteract], timeout: 2),
    let direct = reply.paramDescriptor(forKeyword: fourCC("----"))
  else {
    return nil
  }

  var result: [[String]] = []
  let winCount = direct.numberOfItems
  guard winCount > 0 else { return result }

  for i in 1...winCount {
    guard let winList = direct.atIndex(i) else { continue }
    var row: [String] = []
    let tabCount = winList.numberOfItems
    if tabCount > 0 {
      for j in 1...tabCount {
        row.append(winList.atIndex(j)?.stringValue ?? "")
      }
    } else if let single = winList.stringValue {
      row.append(single)
    }
    result.append(row)
  }
  return result
}

/// Fallback for apps that reject the hand-built AppleEvent: run the equivalent AppleScript in-process.
func fetchTabsViaAppleScript(appName: String) -> [(titles: [String], urls: [String])]? {
  guard !appName.isEmpty, !appName.contains("\""), !appName.contains("\\") else { return nil }
  let source = """
    tell application "\(appName)"
      set theTitles to title of every tab of every window
      set theUrls to URL of every tab of every window
      return {theTitles, theUrls}
    end tell
    """
  var errorInfo: NSDictionary?
  guard let script = NSAppleScript(source: source) else { return nil }
  let output = script.executeAndReturnError(&errorInfo)
  guard errorInfo == nil, output.numberOfItems == 2,
    let titleLists = output.atIndex(1), let urlLists = output.atIndex(2),
    titleLists.numberOfItems == urlLists.numberOfItems
  else {
    return nil
  }

  func strings(_ list: NSAppleEventDescriptor) -> [String] {
    if list.numberOfItems == 0 { return list.stringValue.map { [$0] } ?? [] }
    return (1...list.numberOfItems).map { list.atIndex($0)?.stringValue ?? "" }
  }

  var pairs: [(titles: [String], urls: [String])] = []
  if titleLists.numberOfItems > 0 {
    for i in 1...titleLists.numberOfItems {
      guard let t = titleLists.atIndex(i), let u = urlLists.atIndex(i) else { continue }
      let titles = strings(t)
      let urls = strings(u)
      guard titles.count == urls.count else { continue }
      pairs.append((titles: titles, urls: urls))
    }
  }
  return pairs
}

func fetchAppleEventTabUrlsByPid(pid: Int32, appName: String = "") -> [(titles: [String], urls: [String])]? {
  let tabClass = fourCC(chromiumBrowserPolicy(appName: appName).tabClass)
  guard let urlsByWin = queryAppleEventNestedStrings(pid: pid, prop: fourCC("URL "), tabClass: tabClass),
    let titlesByWin = queryAppleEventNestedStrings(pid: pid, prop: fourCC("pnam"), tabClass: tabClass),
    urlsByWin.count == titlesByWin.count
  else {
    return fetchTabsViaAppleScript(appName: appName)
  }
  var pairs: [(titles: [String], urls: [String])] = []
  for i in 0..<urlsByWin.count {
    pairs.append((titles: titlesByWin[i], urls: urlsByWin[i]))
  }
  return pairs
}

/// Match a unique AppleEvent window using titles and any URLs already known from AX.
/// A tie leaves URLs unresolved; tab counts alone do not identify a window.
func matchUrlsByTitle(
  tabTitles: [String],
  candidates: [(titles: [String], urls: [String])],
  knownUrls: [String] = []
) -> (candidateIndex: Int, urls: [String])? {
  var bestScore = 0
  var bestMatch: (candidateIndex: Int, urls: [String])?
  var tied = false

  for (candidateIndex, candidate) in candidates.enumerated() where candidate.titles.count == candidate.urls.count {
    guard knownUrls.filter({ !$0.isEmpty }).allSatisfy({ candidate.urls.contains($0) }) else { continue }
    var urls = Array(repeating: "", count: tabTitles.count)
    var score = 0
    for (index, title) in tabTitles.enumerated() where !title.isEmpty {
      let knownUrl = index < knownUrls.count ? knownUrls[index] : ""
      let matches = candidate.titles.indices.filter { i in
        let candidateTitle = candidate.titles[i]
        guard !candidateTitle.isEmpty, knownUrl.isEmpty || candidate.urls[i] == knownUrl else { return false }
        // AX titles may include pinned-tab or memory-usage suffixes.
        return title == candidateTitle || title.hasPrefix(candidateTitle + " - ")
      }
      let exactMatches = matches.filter { candidate.titles[$0] == title }
      let preferredMatches = exactMatches.isEmpty ? matches : exactMatches
      guard !preferredMatches.isEmpty else { continue }
      score += 1
      // Identical titles inside one window can also refer to different URLs.
      let possibleUrls = Set(preferredMatches.map { candidate.urls[$0] })
      if possibleUrls.count == 1, let url = possibleUrls.first { urls[index] = url }
    }
    if score > bestScore {
      bestScore = score
      bestMatch = (candidateIndex, urls)
      tied = false
    } else if score > 0 && score == bestScore {
      tied = true
    }
  }
  return tied ? nil : bestMatch
}

private let tabReferences = TabReferenceStore()

func buildWindowOutput(
  wid: CGWindowID,
  axWindow: AXUIElement?,
  fallbackTitle: String?,
  fallbackDocUrl: String?,
  space: Int?,
  tabSearchDepth: Int = 12,
  aeCandidates: inout [(titles: [String], urls: [String])]
) -> BrowserWindowOutput? {
  let winIdStr = String(wid)
  guard let axWindow = axWindow else {
    guard let fallbackTitle = fallbackTitle, !fallbackTitle.isEmpty else {
      return nil
    }
    return BrowserWindowOutput(
      id: winIdStr,
      title: fallbackTitle,
      tabs: [BrowserTabOutput(id: "\(winIdStr):0", title: fallbackTitle, url: fallbackDocUrl ?? "")],
      space: space
    )
  }

  var tabButtons: [AXUIElement] = []
  collectChromiumTabs(axWindow, maxDepth: tabSearchDepth, out: &tabButtons)

  let axWinTitle = stringAttr(axWindow, kAXTitleAttribute)
  let effectiveWinTitle = !axWinTitle.isEmpty ? axWinTitle : (fallbackTitle ?? "")
  let axDocUrl = stringAttr(axWindow, kAXDocumentAttribute)
  let effectiveDocUrl = !axDocUrl.isEmpty ? axDocUrl : (fallbackDocUrl ?? "")

  if tabButtons.isEmpty {
    let subrole = stringAttr(axWindow, kAXSubroleAttribute)
    if subrole != "AXStandardWindow" && fallbackTitle == nil {
      return nil
    }
    return BrowserWindowOutput(
      id: winIdStr,
      title: effectiveWinTitle,
      tabs: [BrowserTabOutput(id: "\(winIdStr):0", title: effectiveWinTitle, url: effectiveDocUrl)],
      space: space
    )
  }

  let tabInfos = tabButtons.map { readTabInfo($0) }

  let knownUrls = tabInfos.map { info in
    info.selected && !effectiveDocUrl.isEmpty ? effectiveDocUrl : info.customUrl
  }
  let match = matchUrlsByTitle(
    tabTitles: tabInfos.map { $0.title }, candidates: aeCandidates, knownUrls: knownUrls
  )
  // Each AppleEvent window can supply URLs to at most one AX window.
  if let match = match { aeCandidates.remove(at: match.candidateIndex) }

  var tabs: [BrowserTabOutput] = []
  var activeTitle = ""

  for (index, info) in tabInfos.enumerated() {
    if info.selected && !info.title.isEmpty {
      activeTitle = info.title
    }
    let aeUrl = match?.urls[index] ?? ""
    let url = !aeUrl.isEmpty ? aeUrl : knownUrls[index]
    tabs.append(
      BrowserTabOutput(
        id: tabReferences.register(windowId: wid, element: tabButtons[index], fallbackIndex: index),
        title: info.title,
        url: url
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

func handleList(args: [String]) throws {
  guard AXIsProcessTrusted() else {
    throw NSError(
      domain: "ChromiumAX",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Accessibility permission is required to read Chromium tabs."]
    )
  }

  let appName = args.count > 0 ? args[0] : "Google Chrome"
  let policy = chromiumBrowserPolicy(appName: appName)
  let nativeJson = args.count > 1 ? args[1] : "[]"
  let nativeWindows = (try? JSONDecoder().decode([NativeWindowInput].self, from: Data(nativeJson.utf8))) ?? []

  let pids = findBrowserPIDs(appName: appName, nativeWindows: nativeWindows)
  if pids.isEmpty {
    print("[]")
    return
  }

  var axWindowsByWid: [CGWindowID: AXUIElement] = [:]
  var aeByPid: [Int32: [(titles: [String], urls: [String])]] = [:]

  for pid in pids {
    let expected = Set(nativeWindows.filter { $0.pid == pid && $0.id > 0 }.map { CGWindowID($0.id) })
    let discovered = discoverAXWindows(pid: pid, expectedWindowIds: expected, enhancedUI: true)
    for (wid, axWin) in discovered {
      axWindowsByWid[wid] = axWin
    }
    if let aePairs = fetchAppleEventTabUrlsByPid(pid: pid, appName: appName) {
      aeByPid[pid] = aePairs
    }
  }

  var results: [BrowserWindowOutput] = []
  var handledWids = Set<CGWindowID>()

  for nWin in nativeWindows where nWin.id > 0 {
    let wid = CGWindowID(nWin.id)
    guard handledWids.insert(wid).inserted else { continue }
    let validSpace = (nWin.space ?? 0) > 0 ? nWin.space : nil
    var aeCandidates = aeByPid[nWin.pid] ?? []
    if let output = buildWindowOutput(
      wid: wid,
      axWindow: axWindowsByWid[wid],
      fallbackTitle: nWin.title,
      fallbackDocUrl: nWin.documentUrl,
      space: validSpace,
      tabSearchDepth: policy.tabSearchDepth,
      aeCandidates: &aeCandidates
    ) {
      results.append(output)
    }
    aeByPid[nWin.pid] = aeCandidates
  }

  if nativeWindows.isEmpty {
    var emptyCandidates: [(titles: [String], urls: [String])] = []
    for (wid, axWin) in axWindowsByWid.sorted(by: { $0.key < $1.key }) {
      guard handledWids.insert(wid).inserted else { continue }
      if let output = buildWindowOutput(
        wid: wid,
        axWindow: axWin,
        fallbackTitle: nil,
        fallbackDocUrl: nil,
        space: nil,
        tabSearchDepth: policy.tabSearchDepth,
        aeCandidates: &emptyCandidates
      ) {
        results.append(output)
      }
    }
  }

  let encoded = try JSONEncoder().encode(results)
  print(String(data: encoded, encoding: .utf8) ?? "[]")
}

func handleFocus(args: [String]) throws {
  guard AXIsProcessTrusted() else {
    throw NSError(
      domain: "ChromiumAX",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Accessibility permission is required to switch Chromium tabs."]
    )
  }
  guard args.count >= 4 else {
    throw NSError(
      domain: "ChromiumAX",
      code: 2,
      userInfo: [NSLocalizedDescriptionKey: "Missing arguments for focus command."]
    )
  }

  let appName = args[0]
  let policy = chromiumBrowserPolicy(appName: appName)
  let windowIdStr = args[1]
  let tabIdStr = args[2]
  guard TabReferenceStore.isRetainedID(tabIdStr) || parseTabIndex(tabIdStr) != nil else {
    throw NSError(domain: "ChromiumAX", code: 3,
      userInfo: [NSLocalizedDescriptionKey: "Invalid tab ID."])
  }
  let expectedTitle = args[3]
  let explicitPid = args.count > 4 ? Int32(args[4]) : nil

  guard let rawWid = UInt32(windowIdStr), rawWid > 0 else {
    throw NSError(domain: "ChromiumAX", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid Chromium window ID."])
  }
  let targetWid = CGWindowID(rawWid)

  let pids: [Int32]
  if let pid = explicitPid, pid > 0 {
    pids = [pid]
  } else {
    pids = findBrowserPIDs(appName: appName, nativeWindows: [])
  }

  guard !pids.isEmpty else {
    throw NSError(domain: "ChromiumAX", code: 4, userInfo: [NSLocalizedDescriptionKey: "Browser is not running"])
  }

  var foundWindow: AXUIElement?
  var ownerPid: Int32 = pids[0]

  for pid in pids {
    let discovered = discoverAXWindows(pid: pid, expectedWindowIds: [targetWid], maxElementId: 2000, enhancedUI: true)
    if let win = discovered[targetWid] {
      foundWindow = win
      ownerPid = pid
      break
    }
  }

  guard let targetWindow = foundWindow else {
    throw NSError(domain: "ChromiumAX", code: 5, userInfo: [NSLocalizedDescriptionKey: "Browser window no longer exists"])
  }

  var tabButtons: [AXUIElement] = []
  collectChromiumTabs(targetWindow, maxDepth: policy.tabSearchDepth, out: &tabButtons)

  if !tabButtons.isEmpty {
    guard let resolvedIndex = tabReferences.resolve(
      tabId: tabIdStr, windowId: targetWid, tabs: tabButtons,
      expectedTitle: expectedTitle, title: { readTabInfo($0).title }
    ) else {
      throw NSError(
        domain: "ChromiumAX", code: 6,
        userInfo: [NSLocalizedDescriptionKey: "Tab changed or list expired. Refresh the list."]
      )
    }

    let targetTab = tabButtons[resolvedIndex]
    let pressError = AXUIElementPerformAction(targetTab, kAXPressAction as CFString)
    if pressError != .success {
      throw NSError(
        domain: "ChromiumAX",
        code: 7,
        userInfo: [NSLocalizedDescriptionKey: "Failed to activate Chromium tab (AX error \(pressError.rawValue))."]
      )
    }
  } else {
    throw NSError(domain: "ChromiumAX", code: 6,
      userInfo: [NSLocalizedDescriptionKey: "Cannot access tab controls. Refresh the list."])
  }

  if boolAttr(targetWindow, kAXMinimizedAttribute) {
    _ = AXUIElementSetAttributeValue(targetWindow, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
  }

  _ = AXUIElementPerformAction(targetWindow, kAXRaiseAction as CFString)
  _ = AXUIElementSetAttributeValue(targetWindow, kAXMainAttribute as CFString, kCFBooleanTrue)
  NSRunningApplication(processIdentifier: ownerPid)?.unhide()
  if #available(macOS 14.0, *) {
    NSRunningApplication(processIdentifier: ownerPid)?.activate()
  } else {
    NSRunningApplication(processIdentifier: ownerPid)?.activate(options: [.activateIgnoringOtherApps])
  }
  print("ok")
}

@main
enum ChromiumAXHelper {
  static func main() {
    BrowserHelperRuntime.run(list: handleList, focus: handleFocus)
  }
}
