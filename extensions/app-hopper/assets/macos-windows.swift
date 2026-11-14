import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

@_silgen_name("CGSMainConnectionID")
func CGSMainConnectionID() -> Int32

@_silgen_name("CGSCopyManagedDisplaySpaces")
func CGSCopyManagedDisplaySpaces(_ cid: Int32) -> CFArray?

@_silgen_name("CGSCopyWindowsWithOptionsAndTags")
func CGSCopyWindowsWithOptionsAndTags(
  _ cid: Int32,
  _ owner: Int32,
  _ spaces: CFArray,
  _ options: UInt32,
  _ setTags: UnsafeMutablePointer<UInt64>,
  _ clearTags: UnsafeMutablePointer<UInt64>
) -> CFArray?

@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ wid: UnsafeMutablePointer<CGWindowID>) -> AXError

@_silgen_name("_AXUIElementCreateWithRemoteToken")
func _AXUIElementCreateWithRemoteToken(_ data: CFData) -> Unmanaged<AXUIElement>?

struct WindowFrame: Encodable {
  let x: Double
  let y: Double
  let w: Double
  let h: Double
}

struct NativeWindowOutput: Encodable {
  let id: Int
  let pid: Int32
  let app: String
  let title: String
  let space: Int
  let frame: WindowFrame
  let subrole: String?
  let documentUrl: String?
  let bundlePath: String?
  let localizedName: String?
  let hasAxReference: Bool
  let frontOrder: Int
  let isMinimized: Bool?
  let isHidden: Bool?

  enum CodingKeys: String, CodingKey {
    case id
    case pid
    case app
    case title
    case space
    case frame
    case subrole
    case documentUrl
    case bundlePath
    case localizedName
    case hasAxReference = "has-ax-reference"
    case frontOrder
    case isMinimized
    case isHidden
  }
}

struct CGWindowCandidate {
  let wid: CGWindowID
  let pid: Int32
  let app: String
  let cgTitle: String
  let space: Int
  let frame: WindowFrame
  let frontOrder: Int
}

struct AXWindowMetadata {
  let title: String
  let subrole: String
  let documentUrl: String
  let isMinimized: Bool
}

struct AppMetadata {
  let bundlePath: String?
  let localizedName: String?
  let isHidden: Bool
  let isRegular: Bool
}

struct RunningApplicationOutput: Encodable {
  let pid: Int32
  let bundlePath: String?
  let localizedName: String
  let isHidden: Bool
}

func copyAttr(_ element: AXUIElement, _ attribute: String) -> Any? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
  return error == .success ? value : nil
}

func stringAttr(_ element: AXUIElement, _ attribute: String) -> String {
  if let str = copyAttr(element, attribute) as? String {
    return str
  }
  return ""
}

func boolAttr(_ element: AXUIElement, _ attribute: String) -> Bool {
  if let flag = copyAttr(element, attribute) as? Bool {
    return flag
  }
  if let num = copyAttr(element, attribute) as? NSNumber {
    return num.intValue != 0
  }
  return false
}

func windowAttributes(_ element: AXUIElement) -> AXWindowMetadata? {
  let attrs: [CFString] = [
    kAXRoleAttribute as CFString,
    kAXSubroleAttribute as CFString,
    kAXTitleAttribute as CFString,
    kAXDocumentAttribute as CFString,
    kAXMinimizedAttribute as CFString,
  ]
  var valuesRef: CFArray?
  if AXUIElementCopyMultipleAttributeValues(element, attrs as CFArray, [], &valuesRef) == .success,
    let values = valuesRef as? [Any]
  {
    let role = values.count > 0 ? (values[0] as? String ?? "") : ""
    if !role.isEmpty && role != "AXWindow" {
      return nil
    }
    let subrole = values.count > 1 ? (values[1] as? String ?? "") : ""
    if subrole == "AXUnknown" {
      return nil
    }
    let title = values.count > 2 ? (values[2] as? String ?? "") : ""
    let documentUrl = values.count > 3 ? (values[3] as? String ?? "") : ""
    let isMinimized = values.count > 4 ? (values[4] as? NSNumber)?.boolValue ?? false : false
    return AXWindowMetadata(title: title, subrole: subrole, documentUrl: documentUrl, isMinimized: isMinimized)
  }

  guard stringAttr(element, kAXRoleAttribute) == "AXWindow" else {
    return nil
  }
  let subrole = stringAttr(element, kAXSubroleAttribute)
  if subrole == "AXUnknown" {
    return nil
  }
  return AXWindowMetadata(
    title: stringAttr(element, kAXTitleAttribute),
    subrole: subrole,
    documentUrl: stringAttr(element, kAXDocumentAttribute),
    isMinimized: boolAttr(element, kAXMinimizedAttribute)
  )
}

func windowId(of element: AXUIElement) -> CGWindowID {
  var wid: CGWindowID = 0
  if _AXUIElementGetWindow(element, &wid) == .success {
    return wid
  }
  return 0
}

func buildWindowSpaceMap(cid: Int32) -> [CGWindowID: Int] {
  var widToSpace: [CGWindowID: Int] = [:]
  guard let displays = CGSCopyManagedDisplaySpaces(cid) as? [[String: Any]] else {
    return widToSpace
  }
  var spaceIndex = 0
  for display in displays {
    guard let spaces = display["Spaces"] as? [[String: Any]] else { continue }
    for space in spaces {
      spaceIndex += 1
      let spaceId = (space["id64"] as? Int) ?? (space["ManagedSpaceID"] as? Int) ?? 0
      guard spaceId > 0 else { continue }
      var setTags: UInt64 = 0
      var clearTags: UInt64 = 0
      let wids =
        CGSCopyWindowsWithOptionsAndTags(cid, 0, [spaceId] as CFArray, 0x2, &setTags, &clearTags) as? [Int] ?? []
      for rawWid in wids where rawWid > 0 {
        let wid = CGWindowID(rawWid)
        if widToSpace[wid] == nil {
          widToSpace[wid] = spaceIndex
        }
      }
    }
  }
  return widToSpace
}

func discoverAXWindowElements(
  pid: Int32,
  expectedWindowIds: Set<CGWindowID>,
  maxElementId: UInt64 = 250,
  verifyRoleForDirectCandidates: Bool = false
) -> [CGWindowID: AXUIElement] {
  var found: [CGWindowID: AXUIElement] = [:]

  let app = AXUIElementCreateApplication(pid)
  AXUIElementSetMessagingTimeout(app, 0.25)

  if let wins = copyAttr(app, kAXWindowsAttribute) as? [AXUIElement] {
    for win in wins {
      let wid = windowId(of: win)
      guard wid > 0, found[wid] == nil else { continue }
      if verifyRoleForDirectCandidates && stringAttr(win, kAXRoleAttribute) != "AXWindow" {
        continue
      }
      found[wid] = win
    }
  }

  if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
    return found
  }

  for attr in [kAXMainWindowAttribute, kAXFocusedWindowAttribute] {
    if let rawWin = copyAttr(app, attr) {
      let win = rawWin as! AXUIElement
      let wid = windowId(of: win)
      guard wid > 0, found[wid] == nil else { continue }
      if verifyRoleForDirectCandidates && stringAttr(win, kAXRoleAttribute) != "AXWindow" {
        continue
      }
      found[wid] = win
    }
  }

  if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
    return found
  }

  var remoteToken = Data(count: 20)
  remoteToken.replaceSubrange(0..<4, with: withUnsafeBytes(of: pid) { Data($0) })
  remoteToken.replaceSubrange(4..<8, with: withUnsafeBytes(of: Int32(0)) { Data($0) })
  remoteToken.replaceSubrange(8..<12, with: withUnsafeBytes(of: Int32(0x636f636f)) { Data($0) })

  for elementId: UInt64 in 1...maxElementId {
    remoteToken.replaceSubrange(12..<20, with: withUnsafeBytes(of: elementId) { Data($0) })
    guard let element = _AXUIElementCreateWithRemoteToken(remoteToken as CFData)?.takeRetainedValue() else {
      continue
    }
    let wid = windowId(of: element)
    guard wid > 0, found[wid] == nil else { continue }
    if !expectedWindowIds.isEmpty && !expectedWindowIds.contains(wid) {
      continue
    }
    AXUIElementSetMessagingTimeout(element, 0.15)
    guard stringAttr(element, kAXRoleAttribute) == "AXWindow" else {
      continue
    }
    found[wid] = element
    if !expectedWindowIds.isEmpty && expectedWindowIds.isSubset(of: Set(found.keys)) {
      break
    }
  }

  return found
}

func handleList() throws {
  let cid = CGSMainConnectionID()
  let widToSpace = buildWindowSpaceMap(cid: cid)
  let rawWindows =
    CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []

  var candidates: [CGWindowCandidate] = []
  var pidToWids: [Int32: Set<CGWindowID>] = [:]

  for (frontOrder, entry) in rawWindows.enumerated() {
    let layer = entry[kCGWindowLayer as String] as? Int ?? -1
    guard layer == 0 else { continue }

    let alpha = entry[kCGWindowAlpha as String] as? Double ?? 1.0
    guard alpha > 0 else { continue }

    let bounds = entry[kCGWindowBounds as String] as? [String: Double] ?? [:]
    let width = bounds["Width"] ?? 0
    let height = bounds["Height"] ?? 0
    guard width >= 50 && height >= 50 else { continue }

    let rawWid = entry[kCGWindowNumber as String] as? Int ?? 0
    let rawPid = entry[kCGWindowOwnerPID as String] as? Int ?? 0
    guard rawWid > 0 && rawPid > 0 else { continue }

    let wid = CGWindowID(rawWid)
    let pid = Int32(rawPid)
    // Minimized windows and windows of hidden apps may belong to no Space.
    // Keep them for Accessibility validation before deciding whether to emit them.
    let spaceIndex = widToSpace[wid] ?? 0
    let appName = entry[kCGWindowOwnerName as String] as? String ?? ""
    let cgTitle = entry[kCGWindowName as String] as? String ?? ""

    let candidate = CGWindowCandidate(
      wid: wid,
      pid: pid,
      app: appName,
      cgTitle: cgTitle,
      space: spaceIndex,
      frame: WindowFrame(
        x: bounds["X"] ?? 0,
        y: bounds["Y"] ?? 0,
        w: width,
        h: height
      ),
      frontOrder: frontOrder
    )
    candidates.append(candidate)
    pidToWids[pid, default: []].insert(wid)
  }

  var appMetaByPid: [Int32: AppMetadata] = [:]
  for pid in pidToWids.keys {
    if let runningApp = NSRunningApplication(processIdentifier: pid) {
      appMetaByPid[pid] = AppMetadata(
        bundlePath: runningApp.bundleURL?.path,
        localizedName: runningApp.localizedName,
        isHidden: runningApp.isHidden,
        isRegular: runningApp.activationPolicy == .regular
      )
    }
  }

  let pidEntries = Array(pidToWids)
  var axMetadataByWid: [CGWindowID: AXWindowMetadata] = [:]
  let lock = NSLock()

  if AXIsProcessTrusted() {
    DispatchQueue.concurrentPerform(iterations: pidEntries.count) { index in
      let (pid, wids) = pidEntries[index]
      let discovered = discoverAXWindowElements(pid: pid, expectedWindowIds: wids)
      var localMeta: [CGWindowID: AXWindowMetadata] = [:]

      for (wid, axWin) in discovered {
        if let meta = windowAttributes(axWin) {
          localMeta[wid] = meta
        }
      }

      lock.lock()
      for (wid, meta) in localMeta {
        axMetadataByWid[wid] = meta
      }
      lock.unlock()
    }
  }

  // Reject off-space utility windows before deciding whether a process needs the CG fallback.
  let pidsWithSpace = Set(candidates.filter { $0.space > 0 }.map { $0.pid })
  let eligibleCandidates = candidates.filter { candidate in
    if candidate.space > 0 { return true }
    if let meta = axMetadataByWid[candidate.wid] {
      return ["AXStandardWindow", "AXDialog", "AXSystemDialog"].contains(meta.subrole)
        && (meta.isMinimized || appMetaByPid[candidate.pid]?.isHidden == true)
    }
    // Regular apps can keep their UI off-space without exposing any AX windows.
    // Retain the regular app's CG records for the existing AX/reopen fallback.
    return appMetaByPid[candidate.pid]?.isRegular == true && !pidsWithSpace.contains(candidate.pid)
  }

  var pidsWithAX = Set<Int32>()
  for candidate in eligibleCandidates where axMetadataByWid[candidate.wid] != nil {
    pidsWithAX.insert(candidate.pid)
  }

  var outputs: [NativeWindowOutput] = []
  for candidate in eligibleCandidates {
    let appMeta = appMetaByPid[candidate.pid]
    if let meta = axMetadataByWid[candidate.wid] {
      outputs.append(
        NativeWindowOutput(
          id: Int(candidate.wid),
          pid: candidate.pid,
          app: candidate.app,
          title: !meta.title.isEmpty ? meta.title : candidate.cgTitle,
          space: candidate.space,
          frame: candidate.frame,
          subrole: meta.subrole.isEmpty ? nil : meta.subrole,
          documentUrl: meta.documentUrl.isEmpty ? nil : meta.documentUrl,
          bundlePath: appMeta?.bundlePath,
          localizedName: appMeta?.localizedName,
          hasAxReference: true,
          frontOrder: candidate.frontOrder,
          isMinimized: meta.isMinimized,
          isHidden: appMeta?.isHidden
        )
      )
    } else if !pidsWithAX.contains(candidate.pid) {
      outputs.append(
        NativeWindowOutput(
          id: Int(candidate.wid),
          pid: candidate.pid,
          app: candidate.app,
          title: candidate.cgTitle,
          space: candidate.space,
          frame: candidate.frame,
          subrole: nil,
          documentUrl: nil,
          bundlePath: appMeta?.bundlePath,
          localizedName: appMeta?.localizedName,
          hasAxReference: false,
          frontOrder: candidate.frontOrder,
          isMinimized: nil,
          isHidden: appMeta?.isHidden
        )
      )
    }
  }

  let encoded = try JSONEncoder().encode(outputs)
  print(String(data: encoded, encoding: .utf8) ?? "[]")
}

func handleApplications() throws {
  let applications = NSWorkspace.shared.runningApplications
    .filter { $0.activationPolicy == .regular && !$0.isTerminated }
    .map { app in
      RunningApplicationOutput(
        pid: app.processIdentifier,
        bundlePath: app.bundleURL?.path,
        localizedName: app.localizedName ?? app.bundleURL?.deletingPathExtension().lastPathComponent ?? "Application",
        isHidden: app.isHidden
      )
    }
  let data = try JSONEncoder().encode(applications)
  print(String(decoding: data, as: UTF8.self))
}

func resolveOwnerPid(for targetWid: CGWindowID, explicitPid: Int32?) -> Int32? {
  if let pid = explicitPid, pid > 0 {
    return pid
  }
  let rawWindows =
    CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
  for entry in rawWindows {
    let wid = entry[kCGWindowNumber as String] as? Int ?? 0
    if CGWindowID(wid) == targetWid {
      let pid = entry[kCGWindowOwnerPID as String] as? Int ?? 0
      if pid > 0 {
        return Int32(pid)
      }
    }
  }
  return nil
}

func handleFocus(args: [String]) throws {
  guard AXIsProcessTrusted() else {
    throw NSError(
      domain: "MacOSWindows",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Accessibility permission is required to focus windows."]
    )
  }
  guard let firstArg = args.first, let rawWid = UInt32(firstArg), rawWid > 0 else {
    throw NSError(
      domain: "MacOSWindows",
      code: 2,
      userInfo: [NSLocalizedDescriptionKey: "Invalid window ID."]
    )
  }

  let targetWid = CGWindowID(rawWid)
  let explicitPid = args.count > 1 ? Int32(args[1]) : nil

  guard let ownerPid = resolveOwnerPid(for: targetWid, explicitPid: explicitPid) else {
    throw NSError(
      domain: "MacOSWindows",
      code: 3,
      userInfo: [NSLocalizedDescriptionKey: "Window no longer exists."]
    )
  }

  let discovered = discoverAXWindowElements(
    pid: ownerPid,
    expectedWindowIds: [targetWid],
    maxElementId: 2000,
    verifyRoleForDirectCandidates: true
  )
  guard let targetWindow = discovered[targetWid] else {
    throw NSError(
      domain: "MacOSWindows",
      code: 4,
      userInfo: [NSLocalizedDescriptionKey: "No Accessibility reference for this window. Refresh the list."]
    )
  }

  if boolAttr(targetWindow, kAXMinimizedAttribute) {
    _ = AXUIElementSetAttributeValue(targetWindow, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
  }

  _ = AXUIElementPerformAction(targetWindow, kAXRaiseAction as CFString)
  _ = AXUIElementSetAttributeValue(targetWindow, kAXMainAttribute as CFString, kCFBooleanTrue)
  _ = AXUIElementSetAttributeValue(targetWindow, kAXFocusedAttribute as CFString, kCFBooleanTrue)

  NSRunningApplication(processIdentifier: ownerPid)?.unhide()
  if #available(macOS 14.0, *) {
    NSRunningApplication(processIdentifier: ownerPid)?.activate()
  } else {
    NSRunningApplication(processIdentifier: ownerPid)?.activate(options: [.activateIgnoringOtherApps])
  }
  print("ok")
}

do {
  let args = Array(CommandLine.arguments.dropFirst())
  guard let command = args.first else {
    throw NSError(domain: "MacOSWindows", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing command"])
  }
  let rest = Array(args.dropFirst())
  switch command {
  case "list":
    try handleList()
  case "applications":
    try handleApplications()
  case "focus":
    try handleFocus(args: rest)
  default:
    throw NSError(domain: "MacOSWindows", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown command: \(command)"])
  }
} catch {
  fputs((error as NSError).localizedDescription + "\n", stderr)
  exit(1)
}
