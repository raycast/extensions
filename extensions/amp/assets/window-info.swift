import AppKit
import CoreGraphics
import Foundation

let excludedBundleIDs: Set<String> = [
  "com.raycast.macos",
  "com.raycast-x.macos",
  "com.apple.controlcenter",
  "com.apple.dock",
  "com.apple.notificationcenterui",
  "com.apple.systemuiserver",
]

let excludedOwners: Set<String> = [
  "Control Center",
  "Dock",
  "Notification Center",
  "Raycast",
  "Raycast Beta",
  "SystemUIServer",
  "Window Server",
]

let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
  fputs("Unable to read the macOS window list.\n", stderr)
  exit(1)
}

for window in windows {
  guard
    let layer = window[kCGWindowLayer as String] as? NSNumber,
    layer.intValue == 0,
    let number = window[kCGWindowNumber as String] as? NSNumber,
    let owner = window[kCGWindowOwnerName as String] as? String,
    let pidNumber = window[kCGWindowOwnerPID as String] as? NSNumber,
    let boundsDictionary = window[kCGWindowBounds as String] as? [String: Any],
    let bounds = CGRect(dictionaryRepresentation: boundsDictionary as CFDictionary),
    bounds.width >= 120,
    bounds.height >= 80,
    !excludedOwners.contains(owner)
  else {
    continue
  }

  let title = (window[kCGWindowName as String] as? String) ?? ""
  if title == "Computer Use" || title == "Computer Use Controls" {
    continue
  }

  let pid = pid_t(pidNumber.int32Value)
  let application = NSRunningApplication(processIdentifier: pid)
  let bundleID = application?.bundleIdentifier
  if let bundleID, excludedBundleIDs.contains(bundleID) {
    continue
  }
  if bundleID == "com.openai.codex" && bounds.width < 600 && bounds.height < 600 {
    continue
  }

  let alpha = (window[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
  if alpha <= 0 {
    continue
  }

  let result: [String: Any] = [
    "id": number.stringValue,
    "owner": owner,
    "title": title,
    "pid": pidNumber.intValue,
    "bundleId": bundleID ?? "",
    "applicationPath": application?.bundleURL?.path ?? "",
    "bounds": [
      "x": bounds.origin.x,
      "y": bounds.origin.y,
      "width": bounds.width,
      "height": bounds.height,
    ],
  ]
  let data = try JSONSerialization.data(withJSONObject: result)
  print(String(data: data, encoding: .utf8)!)
  exit(0)
}

fputs("No capturable window was found behind Raycast.\n", stderr)
exit(2)
