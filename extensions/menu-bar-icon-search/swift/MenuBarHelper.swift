import AppKit
import ApplicationServices
import Foundation

private struct Item: Codable {
    let pid: Int32
    let index: Int
    let itemCount: Int
    let appName: String
    let title: String
    let bundlePath: String?
    let identifier: String?
    let role: String?
    let isSystemItem: Bool
    let frame: [Double]?
}

private struct Scan: Codable {
    let trusted: Bool
    let items: [Item]
}

private struct Reply: Codable {
    let ok: Bool
    let error: String?
}

private enum MenuBar {
    private typealias Entry = (Item, AXUIElement, CGRect?)

    static func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        var value: CFTypeRef?
        return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
    }

    static func string(_ element: AXUIElement, _ name: String) -> String? {
        guard let raw = attribute(element, name) as? String else { return nil }
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }

    static func frame(_ element: AXUIElement) -> CGRect? {
        guard let position = attribute(element, kAXPositionAttribute as String),
              let size = attribute(element, kAXSizeAttribute as String),
              CFGetTypeID(position) == AXValueGetTypeID(),
              CFGetTypeID(size) == AXValueGetTypeID() else { return nil }
        var point = CGPoint.zero
        var dimensions = CGSize.zero
        guard AXValueGetValue(position as! AXValue, .cgPoint, &point),
              AXValueGetValue(size as! AXValue, .cgSize, &dimensions) else { return nil }
        return CGRect(origin: point, size: dimensions)
    }

    private static func entries(for app: NSRunningApplication) -> [Entry] {
        let axApp = AXUIElementCreateApplication(app.processIdentifier)
        AXUIElementSetMessagingTimeout(axApp, 0.25)
        guard let bar = attribute(axApp, kAXExtrasMenuBarAttribute as String),
              let children = attribute(bar as! AXUIElement, kAXChildrenAttribute as String) as? [AXUIElement] else { return [] }
        let appName = app.localizedName ?? app.bundleIdentifier ?? "PID \(app.processIdentifier)"
        let isSystemHost = app.bundleIdentifier == "com.apple.MenuBarAgent"
        return children.enumerated().map { index, element in
            let itemElement: AXUIElement
            if isSystemHost,
               let hosted = attribute(element, kAXChildrenAttribute as String) as? [AXUIElement],
               let menuItem = hosted.first(where: { string($0, kAXRoleAttribute as String) == kAXMenuBarItemRole as String }) {
                itemElement = menuItem
            } else {
                itemElement = element
            }
            AXUIElementSetMessagingTimeout(itemElement, 0.25)
            let title = string(itemElement, kAXTitleAttribute as String)
                ?? string(itemElement, kAXDescriptionAttribute as String)
                ?? string(itemElement, kAXHelpAttribute as String)
                ?? appName
            let box = frame(itemElement)
            let item = Item(pid: app.processIdentifier, index: index, itemCount: children.count,
                            appName: isSystemHost ? title : appName,
                            title: title, bundlePath: app.bundleURL?.path,
                            identifier: string(itemElement, kAXIdentifierAttribute as String),
                            role: string(itemElement, kAXRoleAttribute as String),
                            isSystemItem: isSystemHost,
                            frame: box.map { [Double($0.minX), Double($0.minY),
                                               Double($0.width), Double($0.height)] })
            return (item, itemElement, box)
        }
    }

    static func scan() -> Scan {
        let trusted = AXIsProcessTrustedWithOptions(
            [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        )
        guard trusted else { return Scan(trusted: false, items: []) }
        let apps = NSWorkspace.shared.runningApplications.filter { $0.processIdentifier > 0 }
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 5
        queue.qualityOfService = .userInitiated
        let group = DispatchGroup()
        let lock = NSLock()
        var found: [Entry] = []
        for app in apps {
            group.enter()
            queue.addOperation {
                defer { group.leave() }
                let entries = entries(for: app)
                lock.lock()
                found.append(contentsOf: entries)
                lock.unlock()
            }
        }
        _ = group.wait(timeout: .now() + 10)
        lock.lock()
        let snapshot = found
        lock.unlock()

        // AX sometimes exposes the same physical item twice (for example on
        // multiple displays). Keep separate items with distinct positions.
        var seen: [Entry] = []
        for entry in snapshot.sorted(by: {
            let a = "\($0.0.appName) \($0.0.title)"
            let b = "\($1.0.appName) \($1.0.title)"
            return a.localizedStandardCompare(b) == .orderedAscending
        }) {
            let duplicate = seen.contains { other in
                guard other.0.pid == entry.0.pid else { return false }
                if CFEqual(other.1, entry.1) { return true }
                if let leftID = other.0.identifier, let rightID = entry.0.identifier,
                   leftID != rightID { return false }
                guard other.0.title == entry.0.title else { return false }
                if let left = other.2, let right = entry.2,
                   left.width > 0, left.height > 0,
                   right.width > 0, right.height > 0 { return left == right }
                if let identifier = entry.0.identifier,
                   identifier == other.0.identifier { return true }
                return false
            }
            if !duplicate { seen.append(entry) }
        }
        return Scan(trusted: true, items: seen.map(\.0))
    }

    private static func matchingEntry(in entries: [Entry], index: Int, title: String,
                                      identifier: String, role: String, itemCount: Int,
                                      allowDynamicTitle: Bool) -> Entry? {
        if !identifier.isEmpty {
            if let match = entries.first(where: { $0.0.index == index && $0.0.identifier == identifier }) {
                return match
            }
            let matches = entries.filter { $0.0.identifier == identifier }
            return matches.count == 1 ? matches[0] : nil
        }
        let titleMatches = entries.filter { $0.0.title == title }
        if let match = titleMatches.first(where: { $0.0.index == index }) {
            return match
        }
        if titleMatches.count == 1 { return titleMatches[0] }
        // A changing title is safe to ignore only when this app owns a single item.
        guard allowDynamicTitle, !role.isEmpty,
              itemCount == 1, entries.count == 1,
              let match = entries.first, match.0.index == index,
              match.0.role == role else { return nil }
        return match
    }

    static func press(pid: Int32, index: Int, title: String, identifier: String,
                      role: String, itemCount: Int, bundlePath: String) -> Reply {
        guard AXIsProcessTrusted() else {
            return Reply(ok: false, error: "Grant Accessibility access to Raycast or the helper.")
        }
        guard let app = NSWorkspace.shared.runningApplications.first(where: { $0.processIdentifier == pid }) else {
            return Reply(ok: false, error: "The app is no longer running.")
        }
        guard bundlePath.isEmpty || app.bundleURL?.path == bundlePath else {
            return Reply(ok: false, error: "The app changed. Refresh the list.")
        }
        let match = matchingEntry(in: entries(for: app), index: index, title: title,
                                  identifier: identifier, role: role, itemCount: itemCount,
                                  allowDynamicTitle: !bundlePath.isEmpty)
        guard let (_, element, _) = match else {
            return Reply(ok: false, error: "The menu bar item changed. Refresh the list.")
        }
        AXUIElementSetMessagingTimeout(element, 0.35)
        let result = AXUIElementPerformAction(element, kAXPressAction as CFString)
        guard result == .success || result == .cannotComplete else {
            return Reply(ok: false, error: "AXPress failed (\(result.rawValue)).")
        }
        return Reply(ok: true, error: nil)
    }

}

func output<T: Encodable>(_ value: T) {
    let data = (try? JSONEncoder().encode(value)) ?? Data("{}".utf8)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

let args = Array(CommandLine.arguments.dropFirst())
switch args.first {
case "scan": output(MenuBar.scan())
case "press" where args.count == 8:
    if let pid = Int32(args[1]), let index = Int(args[2]), let itemCount = Int(args[6]) {
        output(MenuBar.press(pid: pid, index: index, title: args[3], identifier: args[4],
                             role: args[5], itemCount: itemCount, bundlePath: args[7]))
    } else { output(Reply(ok: false, error: "Invalid arguments.")) }
default: output(Reply(ok: false, error: "Invalid command."))
}
