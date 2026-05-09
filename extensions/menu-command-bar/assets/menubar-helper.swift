// Menu Command Bar — AX helper v01
// Walks the frontmost app's menu bar via the Accessibility API and either
// lists all menu items as JSON or invokes a specific item by path.
//
// Usage:
//   menubar-helper list
//   menubar-helper invoke <bundleId> <base64-json-path>
//
// The path is a base64-encoded JSON array of strings, e.g. ["File","Export","PDF…"].

import AppKit
import ApplicationServices
import Foundation

// MARK: - AX helpers

func axAttr(_ element: AXUIElement, _ attr: String) -> AnyObject? {
    var value: AnyObject?
    let result = AXUIElementCopyAttributeValue(element, attr as CFString, &value)
    return result == .success ? value : nil
}

func axChildren(_ element: AXUIElement) -> [AXUIElement] {
    (axAttr(element, kAXChildrenAttribute) as? [AXUIElement]) ?? []
}

func axTitle(_ element: AXUIElement) -> String {
    (axAttr(element, kAXTitleAttribute) as? String) ?? ""
}

func axRole(_ element: AXUIElement) -> String {
    (axAttr(element, kAXRoleAttribute) as? String) ?? ""
}

func axEnabled(_ element: AXUIElement) -> Bool {
    (axAttr(element, kAXEnabledAttribute) as? Bool) ?? false
}

// MARK: - Shortcut formatting

// kAXMenuItemCmdModifiersAttribute bitmask:
//   no flag       => Command
//   1 (kMenuShift)
//   2 (kMenuOption)
//   4 (kMenuControl)
//   8 (kMenuNoCommand) => no command modifier
func formatShortcut(_ element: AXUIElement) -> String {
    let cmdChar = axAttr(element, "AXMenuItemCmdChar") as? String ?? ""
    let cmdGlyph = axAttr(element, "AXMenuItemCmdGlyph") as? Int ?? -1
    let cmdVirtualKey = axAttr(element, "AXMenuItemCmdVirtualKey") as? Int ?? -1
    let modifiers = axAttr(element, "AXMenuItemCmdModifiers") as? Int ?? 0

    // Determine the key character/label
    var keyLabel = ""
    if !cmdChar.isEmpty {
        keyLabel = cmdChar
    } else if cmdVirtualKey >= 0 {
        keyLabel = virtualKeyName(cmdVirtualKey)
    } else if cmdGlyph >= 0 {
        keyLabel = glyphName(cmdGlyph)
    }

    if keyLabel.isEmpty { return "" }

    let noCommand = (modifiers & 8) != 0
    let shift = (modifiers & 1) != 0
    let option = (modifiers & 2) != 0
    let control = (modifiers & 4) != 0

    var s = ""
    if control { s += "⌃" }
    if option { s += "⌥" }
    if shift { s += "⇧" }
    if !noCommand { s += "⌘" }
    s += keyLabel.uppercased()
    return s
}

func virtualKeyName(_ code: Int) -> String {
    // Common virtual keycodes (from HIToolbox/Events.h)
    switch code {
    case 0x24: return "↩"   // return
    case 0x4C: return "⌤"   // enter
    case 0x30: return "⇥"   // tab
    case 0x31: return "␣"   // space
    case 0x33: return "⌫"   // delete
    case 0x35: return "⎋"   // escape
    case 0x75: return "⌦"   // forward delete
    case 0x73: return "↖"   // home
    case 0x77: return "↘"   // end
    case 0x74: return "⇞"   // page up
    case 0x79: return "⇟"   // page down
    case 0x7B: return "←"
    case 0x7C: return "→"
    case 0x7D: return "↓"
    case 0x7E: return "↑"
    case 0x7A: return "F1"
    case 0x78: return "F2"
    case 0x63: return "F3"
    case 0x76: return "F4"
    case 0x60: return "F5"
    case 0x61: return "F6"
    case 0x62: return "F7"
    case 0x64: return "F8"
    case 0x65: return "F9"
    case 0x6D: return "F10"
    case 0x67: return "F11"
    case 0x6F: return "F12"
    case 0x69: return "F13"
    case 0x6B: return "F14"
    case 0x71: return "F15"
    default: return ""
    }
}

func glyphName(_ glyph: Int) -> String {
    // A handful of common Carbon menu glyphs. Empty string = unknown.
    switch glyph {
    case 2: return "⇥"
    case 3: return "⇤"
    case 4: return "␣"
    case 5: return "⌫"
    case 6: return "↩"
    case 7: return "⇪"
    case 9: return "⇧"
    case 10: return "⌃"
    case 11: return "⌥"
    case 23: return "⌦"
    case 24: return "↖"
    case 25: return "⇞"
    case 26: return "↘"
    case 27: return "⇟"
    case 28: return "⎋"
    case 100: return "←"
    case 101: return "→"
    case 106: return "↑"
    case 107: return "↓"
    default: return ""
    }
}

// MARK: - Tree walking

struct MenuItem {
    let path: [String]
    let shortcut: String
    let enabled: Bool
}

func collectMenuItems(_ menu: AXUIElement, prefix: [String], into out: inout [MenuItem]) {
    for child in axChildren(menu) {
        let role = axRole(child)
        if role == kAXMenuItemRole as String || role == "AXMenuBarItem" {
            let title = axTitle(child)
            if title.isEmpty { continue }
            let newPath = prefix + [title]
            // Skip the top-level Apple menu (title is empty already, but be defensive).
            let kids = axChildren(child)
            // A menu item with a submenu has one child of role AXMenu.
            if let submenu = kids.first(where: { axRole($0) == kAXMenuRole as String }) {
                collectMenuItems(submenu, prefix: newPath, into: &out)
            } else {
                let enabled = axEnabled(child)
                let shortcut = formatShortcut(child)
                out.append(MenuItem(path: newPath, shortcut: shortcut, enabled: enabled))
            }
        } else if role == kAXMenuRole as String {
            collectMenuItems(child, prefix: prefix, into: &out)
        }
    }
}

func frontmostApp() -> NSRunningApplication? {
    NSWorkspace.shared.frontmostApplication
}

func menuBar(for app: NSRunningApplication) -> AXUIElement? {
    let appEl = AXUIElementCreateApplication(app.processIdentifier)
    return axAttr(appEl, kAXMenuBarAttribute) as! AXUIElement?
}

// MARK: - Commands

func cmdList() -> Int32 {
    guard let app = frontmostApp() else {
        FileHandle.standardError.write("no frontmost app\n".data(using: .utf8)!)
        return 2
    }
    guard let mb = menuBar(for: app) else {
        FileHandle.standardError.write("no menu bar (accessibility permission?)\n".data(using: .utf8)!)
        return 3
    }

    var items: [MenuItem] = []
    // Skip the leading Apple menu (first menu bar item).
    let topLevel = axChildren(mb)
    for (idx, item) in topLevel.enumerated() {
        if idx == 0 { continue } // Apple menu
        let title = axTitle(item)
        if title.isEmpty { continue }
        let kids = axChildren(item)
        if let submenu = kids.first(where: { axRole($0) == kAXMenuRole as String }) {
            collectMenuItems(submenu, prefix: [title], into: &items)
        }
    }

    let json: [String: Any] = [
        "appName": app.localizedName ?? "",
        "bundleId": app.bundleIdentifier ?? "",
        "items": items.map { mi -> [String: Any] in
            [
                "path": mi.path,
                "shortcut": mi.shortcut,
                "enabled": mi.enabled,
            ]
        },
    ]

    let data = try! JSONSerialization.data(withJSONObject: json, options: [])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write("\n".data(using: .utf8)!)
    return 0
}

func findMenuItem(in menu: AXUIElement, path: [String]) -> AXUIElement? {
    guard let head = path.first else { return nil }
    let tail = Array(path.dropFirst())
    for child in axChildren(menu) {
        let role = axRole(child)
        if role == kAXMenuItemRole as String || role == "AXMenuBarItem" {
            if axTitle(child) == head {
                if tail.isEmpty {
                    return child
                }
                let kids = axChildren(child)
                if let submenu = kids.first(where: { axRole($0) == kAXMenuRole as String }) {
                    if let found = findMenuItem(in: submenu, path: tail) {
                        return found
                    }
                }
            }
        } else if role == kAXMenuRole as String {
            if let found = findMenuItem(in: child, path: path) {
                return found
            }
        }
    }
    return nil
}

func cmdInvoke(bundleId: String, path: [String]) -> Int32 {
    // Locate the app by bundleId among running apps; fall back to frontmost if it matches.
    let candidates = NSWorkspace.shared.runningApplications.filter { $0.bundleIdentifier == bundleId }
    guard let app = candidates.first ?? frontmostApp() else {
        FileHandle.standardError.write("app not running\n".data(using: .utf8)!)
        return 2
    }

    // Activate first so dynamic menus rebuild with the right context.
    app.activate(options: [])
    // Small delay to let activation settle.
    usleep(80_000)

    guard let mb = menuBar(for: app) else {
        FileHandle.standardError.write("no menu bar\n".data(using: .utf8)!)
        return 3
    }

    // Top-level menu items live under the menu bar; skip the Apple menu.
    let topLevel = axChildren(mb)
    var menuItem: AXUIElement?
    for (idx, item) in topLevel.enumerated() {
        if idx == 0 { continue }
        if axTitle(item) == path.first {
            if path.count == 1 {
                menuItem = item
            } else {
                let kids = axChildren(item)
                if let submenu = kids.first(where: { axRole($0) == kAXMenuRole as String }) {
                    menuItem = findMenuItem(in: submenu, path: Array(path.dropFirst()))
                }
            }
            break
        }
    }

    guard let target = menuItem else {
        FileHandle.standardError.write("menu item not found: \(path.joined(separator: " > "))\n".data(using: .utf8)!)
        return 4
    }

    let result = AXUIElementPerformAction(target, kAXPressAction as CFString)
    if result != .success {
        FileHandle.standardError.write("press action failed: \(result.rawValue)\n".data(using: .utf8)!)
        return 5
    }
    return 0
}

// MARK: - Entry point

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: menubar-helper list | invoke <bundleId> <base64-json-path>\n".data(using: .utf8)!)
    exit(1)
}

switch args[1] {
case "list":
    exit(cmdList())
case "invoke":
    guard args.count >= 4 else {
        FileHandle.standardError.write("usage: menubar-helper invoke <bundleId> <base64-json-path>\n".data(using: .utf8)!)
        exit(1)
    }
    let bundleId = args[2]
    guard let pathData = Data(base64Encoded: args[3]),
          let pathArr = try? JSONSerialization.jsonObject(with: pathData) as? [String]
    else {
        FileHandle.standardError.write("bad path encoding\n".data(using: .utf8)!)
        exit(1)
    }
    exit(cmdInvoke(bundleId: bundleId, path: pathArr))
default:
    FileHandle.standardError.write("unknown subcommand: \(args[1])\n".data(using: .utf8)!)
    exit(1)
}
