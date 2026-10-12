import AppKit
import ApplicationServices
import Foundation

struct Result: Codable {
    let status: String
    var title: String? = nil
    var windows: [String]? = nil
    var code: Int32? = nil
}

func finish(_ result: Result) -> Never {
    let data = try! JSONEncoder().encode(result)
    print(String(decoding: data, as: UTF8.self))
    exit(0)
}

func value(_ element: AXUIElement, _ name: CFString) -> (AXError, CFTypeRef?) {
    var result: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(element, name, &result)
    return (error, result)
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else { finish(Result(status: "error")) }
let wantsAgents = arguments.count > 2 && arguments[2] == "agents"
let appURL = URL(fileURLWithPath: arguments[1]).standardizedFileURL
// NSWorkspace does not use System Events and does not launch a quit application.
guard let app = NSWorkspace.shared.runningApplications.first(where: {
    $0.bundleURL?.standardizedFileURL == appURL && !$0.isTerminated
}) else { finish(Result(status: "stopped")) }

guard AXIsProcessTrusted() else { finish(Result(status: "permission")) }
let root = AXUIElementCreateApplication(app.processIdentifier)
AXUIElementSetMessagingTimeout(root, 0.4)
let (error, rawWindows) = value(root, kAXWindowsAttribute as CFString)
guard error == .success, let windows = rawWindows as? [AXUIElement] else {
    finish(Result(status: "busy", code: error.rawValue))
}

var titles: [String] = []
var targetWindow: AXUIElement?
var targetWindowTitle: String?
for window in windows {
    AXUIElementSetMessagingTimeout(window, 0.4)
    let (roleError, subrole) = value(window, kAXSubroleAttribute as CFString)
    guard roleError == .success else { finish(Result(status: "busy", code: roleError.rawValue)) }
    guard subrole as? String == kAXStandardWindowSubrole else { continue }
    let (titleError, rawTitle) = value(window, kAXTitleAttribute as CFString)
    guard titleError == .success else { finish(Result(status: "busy", code: titleError.rawValue)) }
    let title = rawTitle as? String ?? ""
    titles.append(title)
    let isAgents = title.contains("Cursor Agents") || title.hasPrefix("Agents") || title.contains(" - Agents")
    let isDevTools = title.hasPrefix("Developer Tools") || title.hasPrefix("DevTools")
    if !title.isEmpty && (wantsAgents ? isAgents : !isAgents) && !isDevTools && targetWindow == nil {
        targetWindow = window
        targetWindowTitle = title
    }
}

if arguments.count > 2 && arguments[2] == "inspect" {
    let (_, focused) = value(root, kAXFocusedWindowAttribute as CFString)
    var focusedTitle: String?
    if let focused, CFGetTypeID(focused) == AXUIElementGetTypeID() {
        let window = focused as! AXUIElement
        focusedTitle = value(window, kAXTitleAttribute as CFString).1 as? String
    }
    finish(Result(status: "inspect", title: focusedTitle, windows: titles))
}

guard let targetWindow else { finish(Result(status: "missing", windows: titles)) }
let (_, minimized) = value(targetWindow, kAXMinimizedAttribute as CFString)
if minimized as? Bool == true {
    let result = AXUIElementSetAttributeValue(targetWindow, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
    guard result == .success else { finish(Result(status: "busy", code: result.rawValue)) }
}
app.activate(options: [])
let mainResult = AXUIElementSetAttributeValue(targetWindow, kAXMainAttribute as CFString, kCFBooleanTrue)
guard mainResult == .success else { finish(Result(status: "busy", code: mainResult.rawValue)) }
let raiseResult = AXUIElementPerformAction(targetWindow, kAXRaiseAction as CFString)
guard raiseResult == .success else { finish(Result(status: "busy", code: raiseResult.rawValue)) }
finish(Result(status: "focused", title: targetWindowTitle, windows: titles))
