// Store-contained copy of Sources/FastNav/MenuCommand.swift.
// Keep both copies in sync when changing accessibility behavior.
import ApplicationServices
import Foundation

enum CommandSource: Equatable {
    case menu
    case interface(role: String)

    var storageKey: String {
        switch self {
        case .menu:
            return "menu"
        case .interface(let role):
            return "interface:\(role)"
        }
    }

    var iconName: String {
        switch self {
        case .menu:
            return "command"
        case .interface(let role):
            switch role {
            case kAXButtonRole, kAXCheckBoxRole, kAXRadioButtonRole:
                return "cursorarrow.click"
            case "AXLink":
                return "link"
            case kAXTextFieldRole, kAXTextAreaRole:
                return "text.cursor"
            case kAXTabGroupRole:
                return "square.on.square"
            case kAXRowRole, kAXCellRole, kAXListRole, kAXOutlineRole, kAXTableRole:
                return "list.bullet.rectangle"
            default:
                return "rectangle.and.hand.point.up.left"
            }
        }
    }
}

struct MenuCommand: Identifiable {
    let id = UUID()
    let pid: pid_t
    let appName: String
    let bundleIdentifier: String?
    let title: String
    let menuPath: [String]
    let shortcut: String?
    let isEnabled: Bool
    let element: AXUIElement
    let order: Int
    let source: CommandSource
    let action: String

    var breadcrumb: String {
        menuPath.joined(separator: " › ")
    }

    var usageKey: String {
        [bundleIdentifier ?? String(pid), source.storageKey, breadcrumb, title].joined(separator: "|")
    }

    /// Keeps the initial palette centered on the selected application instead
    /// of letting the system-wide Apple menu win solely because it is first in
    /// every macOS menu bar. Search relevance still dominates once a query is
    /// entered.
    func focusedApplicationBonus(hasQuery: Bool) -> Double {
        guard !isAppleSystemMenuCommand else { return 0 }
        return hasQuery ? 8 : 40
    }

    private var isAppleSystemMenuCommand: Bool {
        guard case .menu = source, let rootMenu = menuPath.first else { return false }
        return rootMenu.caseInsensitiveCompare("Apple") == .orderedSame || rootMenu == ""
    }

    func hasSameIdentity(as other: MenuCommand) -> Bool {
        bundleIdentifier == other.bundleIdentifier &&
        title == other.title &&
        menuPath == other.menuPath &&
        shortcut == other.shortcut &&
        source == other.source
    }
}
