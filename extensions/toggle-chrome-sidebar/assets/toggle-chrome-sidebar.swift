import AppKit
import ApplicationServices

let targetTitles: Set<String> = ["expand tabs", "collapse tabs"]

func axAttribute(_ element: AXUIElement, _ attribute: String) -> String {
    var value: CFTypeRef?
    AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
    return value as? String ?? ""
}

func axChildren(_ element: AXUIElement) -> [AXUIElement] {
    var value: CFTypeRef?
    AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &value)
    return value as? [AXUIElement] ?? []
}

func isSidebarToggle(_ element: AXUIElement) -> Bool {
    let isButton = axAttribute(element, kAXRoleAttribute) == (kAXButtonRole as String)
    let matchesTitle = targetTitles.contains(axAttribute(element, kAXTitleAttribute).lowercased())
    let matchesDesc = targetTitles.contains(axAttribute(element, kAXDescriptionAttribute).lowercased())
    return isButton && (matchesTitle || matchesDesc)
}

func findButton(_ element: AXUIElement, depth: Int = 0) -> AXUIElement? {
    if depth > 10 { return nil }
    if isSidebarToggle(element) { return element }

    for child in axChildren(element) {
        if let found = findButton(child, depth: depth + 1) {
            return found
        }
    }
    return nil
}

guard let chromeApp = NSRunningApplication.runningApplications(
    withBundleIdentifier: "com.google.Chrome"
).first else {
    fputs("Chrome is not running\n", stderr)
    exit(1)
}

let appElement = AXUIElementCreateApplication(chromeApp.processIdentifier)

var windowsValue: CFTypeRef?
guard AXUIElementCopyAttributeValue(
    appElement,
    kAXWindowsAttribute as CFString,
    &windowsValue
) == .success,
let windows = windowsValue as? [AXUIElement],
let window = windows.first else {
    fputs("No Chrome windows found\n", stderr)
    exit(1)
}

guard let button = findButton(window) else {
    fputs("Sidebar toggle button not found in accessibility tree\n", stderr)
    exit(1)
}

AXUIElementPerformAction(button, kAXPressAction as CFString)
