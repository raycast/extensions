// Store-contained copy of Sources/FastNav/AccessibilityMenuReader.swift.
// Keep both copies in sync when changing accessibility behavior.
import AppKit
import ApplicationServices
import Carbon.HIToolbox
import Foundation

enum AccessibilityMenuError: LocalizedError {
    case permissionRequired
    case menuUnavailable(String)
    case interfaceElementUnavailable(String)
    case commandDisabled(String)
    case actionFailed(AXError)

    var errorDescription: String? {
        switch self {
        case .permissionRequired:
            return "FastNav needs Accessibility access to read and run menu commands."
        case .menuUnavailable(let appName):
            return "No accessible menu was found for \(appName)."
        case .interfaceElementUnavailable(let title):
            return "The interface element “\(title)” is no longer available."
        case .commandDisabled(let title):
            return "The command “\(title)” is no longer available."
        case .actionFailed(let error):
            return "The command could not be run (Accessibility error \(error.rawValue))."
        }
    }
}

final class AccessibilityMenuReader: @unchecked Sendable {
    var isTrusted: Bool {
        AXIsProcessTrusted()
    }

    @discardableResult
    func requestAccess() -> Bool {
        let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    func commands(for application: NSRunningApplication) throws -> [MenuCommand] {
        guard isTrusted else { throw AccessibilityMenuError.permissionRequired }

        let appName = application.localizedName ?? "Application"
        let applicationElement = AXUIElementCreateApplication(application.processIdentifier)
        guard let menuBar = elementAttribute(applicationElement, kAXMenuBarAttribute) else {
            throw AccessibilityMenuError.menuUnavailable(appName)
        }

        var commands: [MenuCommand] = []
        var order = 0
        walk(
            menuBar,
            path: [],
            application: application,
            appName: appName,
            order: &order,
            output: &commands
        )
        return commands
    }

    func perform(_ command: MenuCommand) throws {
        let result = AXUIElementPerformAction(command.element, command.action as CFString)
        // macOS can return cannotComplete after an action was already delivered.
        // Retrying could execute a destructive command twice, so treat it as uncertain success.
        if result == .cannotComplete { return }
        guard result == .success else {
            throw AccessibilityMenuError.actionFailed(result)
        }
    }

    func resolveAndPerform(_ command: MenuCommand, in application: NSRunningApplication) throws {
        let refreshedCommands = try commands(for: application)
        guard let refreshed = refreshedCommands.first(where: { $0.hasSameIdentity(as: command) }) else {
            throw AccessibilityMenuError.menuUnavailable(application.localizedName ?? command.appName)
        }
        guard refreshed.isEnabled else {
            throw AccessibilityMenuError.commandDisabled(refreshed.title)
        }
        try perform(refreshed)
    }

    private func walk(
        _ element: AXUIElement,
        path: [String],
        application: NSRunningApplication,
        appName: String,
        order: inout Int,
        output: inout [MenuCommand]
    ) {
        let role = stringAttribute(element, kAXRoleAttribute) ?? ""
        let title = cleanTitle(stringAttribute(element, kAXTitleAttribute) ?? "")
        let children = elementArrayAttribute(element, kAXChildrenAttribute)

        if role == kAXMenuItemRole {
            let containsSubmenu = children.contains {
                stringAttribute($0, kAXRoleAttribute) == kAXMenuRole
            }

            if !title.isEmpty && !containsSubmenu {
                output.append(
                    MenuCommand(
                        pid: application.processIdentifier,
                        appName: appName,
                        bundleIdentifier: application.bundleIdentifier,
                        title: title,
                        menuPath: path,
                        shortcut: shortcutText(for: element),
                        isEnabled: boolAttribute(element, kAXEnabledAttribute) ?? true,
                        element: element,
                        order: order,
                        source: .menu,
                        action: kAXPressAction,
                        isWebBacked: false
                    )
                )
                order += 1
            }

            let childPath = title.isEmpty ? path : path + [title]
            for child in children {
                walk(
                    child,
                    path: childPath,
                    application: application,
                    appName: appName,
                    order: &order,
                    output: &output
                )
            }
            return
        }

        let childPath: [String]
        if role == kAXMenuBarItemRole, !title.isEmpty {
            childPath = path + [title]
        } else {
            childPath = path
        }

        for child in children {
            walk(
                child,
                path: childPath,
                application: application,
                appName: appName,
                order: &order,
                output: &output
            )
        }
    }

    private func shortcutText(for element: AXUIElement) -> String? {
        let commandCharacter = cleanShortcutCharacter(
            stringAttribute(element, kAXMenuItemCmdCharAttribute) ?? ""
        )
        let virtualKey = numberAttribute(element, kAXMenuItemCmdVirtualKeyAttribute)?.intValue
        let glyph = numberAttribute(element, kAXMenuItemCmdGlyphAttribute)?.intValue

        guard let key = commandCharacter.nilIfEmpty
            ?? virtualKey.flatMap(keyName(for:))
            ?? glyph.flatMap(glyphName(for:)) else {
            return nil
        }

        let modifiers = numberAttribute(element, kAXMenuItemCmdModifiersAttribute)?.uint32Value ?? 0
        var result = ""
        // AXMenuItemModifiers is not imported into Swift by current SDKs.
        if modifiers & (1 << 2) != 0 { result += "⌃" }
        if modifiers & (1 << 1) != 0 { result += "⌥" }
        if modifiers & (1 << 0) != 0 { result += "⇧" }
        if modifiers & (1 << 3) == 0 { result += "⌘" }
        result += key
        return result
    }

    private func keyName(for keyCode: Int) -> String? {
        let namedKeys: [Int: String] = [
            Int(kVK_Return): "↩",
            Int(kVK_Tab): "⇥",
            Int(kVK_Space): "Space",
            Int(kVK_Delete): "⌫",
            Int(kVK_ForwardDelete): "⌦",
            Int(kVK_Escape): "⎋",
            Int(kVK_Home): "↖",
            Int(kVK_End): "↘",
            Int(kVK_PageUp): "⇞",
            Int(kVK_PageDown): "⇟",
            Int(kVK_LeftArrow): "←",
            Int(kVK_RightArrow): "→",
            Int(kVK_UpArrow): "↑",
            Int(kVK_DownArrow): "↓",
            Int(kVK_F1): "F1", Int(kVK_F2): "F2", Int(kVK_F3): "F3", Int(kVK_F4): "F4",
            Int(kVK_F5): "F5", Int(kVK_F6): "F6", Int(kVK_F7): "F7", Int(kVK_F8): "F8",
            Int(kVK_F9): "F9", Int(kVK_F10): "F10", Int(kVK_F11): "F11", Int(kVK_F12): "F12",
            Int(kVK_F13): "F13", Int(kVK_F14): "F14", Int(kVK_F15): "F15", Int(kVK_F16): "F16",
            Int(kVK_F17): "F17", Int(kVK_F18): "F18", Int(kVK_F19): "F19", Int(kVK_F20): "F20"
        ]
        return namedKeys[keyCode]
    }

    private func glyphName(for glyph: Int) -> String? {
        let glyphs: [Int: String] = [
            Int(kMenuTabRightGlyph): "⇥",
            Int(kMenuTabLeftGlyph): "⇤",
            Int(kMenuEnterGlyph): "⌤",
            Int(kMenuSpaceGlyph): "Space",
            Int(kMenuDeleteRightGlyph): "⌦",
            Int(kMenuReturnGlyph): "↩",
            Int(kMenuReturnR2LGlyph): "↩",
            Int(kMenuNonmarkingReturnGlyph): "↩",
            Int(kMenuDeleteLeftGlyph): "⌫",
            Int(kMenuLeftArrowDashedGlyph): "⇠",
            Int(kMenuUpArrowDashedGlyph): "⇡",
            Int(kMenuRightArrowDashedGlyph): "⇢",
            Int(kMenuEscapeGlyph): "⎋",
            Int(kMenuClearGlyph): "⌧",
            Int(kMenuPageUpGlyph): "⇞",
            Int(kMenuLeftArrowGlyph): "←",
            Int(kMenuRightArrowGlyph): "→",
            Int(kMenuNorthwestArrowGlyph): "↖",
            Int(kMenuHelpGlyph): "?",
            Int(kMenuUpArrowGlyph): "↑",
            Int(kMenuSoutheastArrowGlyph): "↘",
            Int(kMenuDownArrowGlyph): "↓",
            Int(kMenuPageDownGlyph): "⇟",
            Int(kMenuF1Glyph): "F1", Int(kMenuF2Glyph): "F2", Int(kMenuF3Glyph): "F3",
            Int(kMenuF4Glyph): "F4", Int(kMenuF5Glyph): "F5", Int(kMenuF6Glyph): "F6",
            Int(kMenuF7Glyph): "F7", Int(kMenuF8Glyph): "F8", Int(kMenuF9Glyph): "F9",
            Int(kMenuF10Glyph): "F10", Int(kMenuF11Glyph): "F11", Int(kMenuF12Glyph): "F12",
            Int(kMenuF13Glyph): "F13", Int(kMenuF14Glyph): "F14", Int(kMenuF15Glyph): "F15",
            Int(kMenuF16Glyph): "F16", Int(kMenuF17Glyph): "F17", Int(kMenuF18Glyph): "F18",
            Int(kMenuF19Glyph): "F19"
        ]
        return glyphs[glyph]
    }

    private func cleanTitle(_ title: String) -> String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func cleanShortcutCharacter(_ character: String) -> String {
        let value = character.trimmingCharacters(in: .newlines)
        let controlCharacters: [String: String] = [
            "\r": "↩", "\t": "⇥", "\u{8}": "⌫", "\u{7f}": "⌫",
            "\u{1b}": "⎋", "\u{3}": "⌤"
        ]
        if let visible = controlCharacters[value] { return visible }
        if value == " " { return "Space" }
        return value.count == 1 ? value.uppercased() : value
    }

    private func rawAttribute(_ element: AXUIElement, _ attribute: String) -> AnyObject? {
        for attempt in 0..<3 {
            var value: CFTypeRef?
            let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
            if result == .success { return value }
            guard result == .cannotComplete, attempt < 2 else { return nil }
            Thread.sleep(forTimeInterval: 0.008)
        }
        return nil
    }

    private func stringAttribute(_ element: AXUIElement, _ attribute: String) -> String? {
        rawAttribute(element, attribute) as? String
    }

    private func boolAttribute(_ element: AXUIElement, _ attribute: String) -> Bool? {
        rawAttribute(element, attribute) as? Bool
    }

    private func numberAttribute(_ element: AXUIElement, _ attribute: String) -> NSNumber? {
        rawAttribute(element, attribute) as? NSNumber
    }

    private func elementAttribute(_ element: AXUIElement, _ attribute: String) -> AXUIElement? {
        guard let value = rawAttribute(element, attribute),
              CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
        return (value as! AXUIElement)
    }

    private func elementArrayAttribute(_ element: AXUIElement, _ attribute: String) -> [AXUIElement] {
        rawAttribute(element, attribute) as? [AXUIElement] ?? []
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
