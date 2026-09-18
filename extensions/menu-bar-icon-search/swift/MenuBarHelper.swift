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

    static func entries(for app: NSRunningApplication) -> [(Item, AXUIElement, CGRect?)] {
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
        let lock = NSLock()
        var found: [(Item, AXUIElement, CGRect?)] = []
        for app in apps {
            queue.addOperation {
                let entries = entries(for: app)
                lock.lock()
                found.append(contentsOf: entries)
                lock.unlock()
            }
        }
        queue.waitUntilAllOperationsAreFinished()

        // AX sometimes exposes the same physical item twice (for example on
        // multiple displays). Keep separate items with distinct positions.
        var seen: [(Item, AXUIElement, CGRect?)] = []
        for entry in found.sorted(by: {
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

    static func press(pid: Int32, index: Int, title: String, identifier: String,
                      role: String, itemCount: Int) -> Reply {
        let originalCursor = CGEvent(source: nil)?.location
        guard AXIsProcessTrusted() else {
            return Reply(ok: false, error: "Grant Accessibility access to Raycast or the helper.")
        }
        guard let app = NSWorkspace.shared.runningApplications.first(where: { $0.processIdentifier == pid }) else {
            return Reply(ok: false, error: "The app is no longer running.")
        }
        let entries = entries(for: app)
        let match = (!identifier.isEmpty ? entries.first(where: {
            $0.0.index == index && $0.0.identifier == identifier
        }) : nil)
            ?? (!identifier.isEmpty ? entries.first(where: { $0.0.identifier == identifier }) : nil)
            ?? entries.first(where: { $0.0.index == index && $0.0.title == title })
            ?? entries.first(where: { $0.0.title == title })
            ?? entries.first(where: {
                $0.0.index == index && (role.isEmpty || $0.0.role == role)
                    && (entries.count == itemCount || entries.count == 1)
            })
        guard let (_, element, box) = match else {
            return Reply(ok: false, error: "The menu bar item changed. Refresh the list.")
        }
        if !isHostedInMenuBar(pid: pid), !(app.bundleIdentifier ?? "").hasPrefix("com.apple.") {
            return revealPressAndRestore(app: app, pid: pid, index: index, title: title,
                                         identifier: identifier, role: role, itemCount: itemCount,
                                         originalCursor: originalCursor)
        }
        if let box, isVisibleMenuBarFrame(box), isHostedInMenuBar(pid: pid) {
            return clickVisibleItem(at: CGPoint(x: box.midX, y: box.midY), originalCursor: originalCursor)
        }
        AXUIElementSetMessagingTimeout(element, 0.35)
        let result = AXUIElementPerformAction(element, kAXPressAction as CFString)
        if result == .success || result == .cannotComplete {
            restoreCursor(originalCursor)
            return Reply(ok: true, error: nil)
        }
        guard result == .actionUnsupported, let box,
              box.width > 0, box.height > 0 else {
            return Reply(ok: false, error: "AXPress failed (\(result.rawValue)).")
        }
        let point = CGPoint(x: box.midX, y: box.midY)
        guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown,
                                 mouseCursorPosition: point, mouseButton: .left),
              let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp,
                               mouseCursorPosition: point, mouseButton: .left) else {
            return Reply(ok: false, error: "Could not create the click event.")
        }
        down.post(tap: .cghidEventTap)
        up.post(tap: .cghidEventTap)
        restoreCursor(originalCursor)
        return Reply(ok: true, error: nil)
    }

    private static func axChildren(_ element: AXUIElement) -> [AXUIElement] {
        attribute(element, kAXChildrenAttribute as String) as? [AXUIElement] ?? []
    }

    private static func isHostedInMenuBar(pid: Int32) -> Bool {
        for agent in NSWorkspace.shared.runningApplications where agent.bundleIdentifier == "com.apple.MenuBarAgent" {
            let root = AXUIElementCreateApplication(agent.processIdentifier)
            AXUIElementSetMessagingTimeout(root, 0.2)
            var visited = 0
            func walk(_ element: AXUIElement, _ depth: Int) -> Bool {
                guard depth < 10, visited < 700 else { return false }
                visited += 1
                var owner: pid_t = 0
                AXUIElementGetPid(element, &owner)
                if owner == pid, string(element, kAXRoleAttribute as String) == kAXButtonRole as String,
                   let box = frame(element), isVisibleMenuBarFrame(box) { return true }
                return axChildren(element).contains { walk($0, depth + 1) }
            }
            if walk(root, 0) { return true }
        }
        return false
    }

    private static func settingsSwitch(named appName: String) -> AXUIElement? {
        for settings in NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences") {
            let root = AXUIElementCreateApplication(settings.processIdentifier)
            AXUIElementSetMessagingTimeout(root, 0.3)
            var visited = 0
            func walk(_ element: AXUIElement, _ depth: Int) -> AXUIElement? {
                guard depth < 25, visited < 1200 else { return nil }
                visited += 1
                let children = axChildren(element)
                for (index, child) in children.enumerated() where index + 1 < children.count {
                    if string(child, kAXValueAttribute as String) == appName,
                       string(children[index + 1], kAXRoleAttribute as String) == kAXCheckBoxRole as String {
                        return children[index + 1]
                    }
                }
                for child in children {
                    if let found = walk(child, depth + 1) { return found }
                }
                return nil
            }
            if let found = walk(root, 0) { return found }
        }
        return nil
    }

    private static func allowed(_ toggle: AXUIElement) -> Bool? {
        (attribute(toggle, kAXValueAttribute as String) as? NSNumber)?.boolValue
    }

    private static func settingsHasVisibleWindow() -> Bool {
        let pids = Set(NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences")
            .map { Int($0.processIdentifier) })
        let windows = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] ?? []
        return windows.contains { window in
            guard let pid = window[kCGWindowOwnerPID as String] as? Int,
                  let layer = window[kCGWindowLayer as String] as? Int,
                  let bounds = window[kCGWindowBounds as String] as? [String: Any],
                  let rect = CGRect(dictionaryRepresentation: bounds as CFDictionary) else { return false }
            return pids.contains(pid) && layer == 0 && rect.width > 200
        }
    }

    private static func revealPressAndRestore(app: NSRunningApplication, pid: Int32, index: Int,
                                              title: String, identifier: String, role: String,
                                              itemCount: Int, originalCursor: CGPoint?) -> Reply {
        let appName = app.localizedName ?? app.bundleIdentifier ?? ""
        guard !appName.isEmpty else { return Reply(ok: false, error: "Could not identify the application.") }
        let settingsWasOpen = settingsHasVisibleWindow()
        defer {
            if !settingsWasOpen {
                _ = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences").first?.hide()
            }
        }
        if settingsSwitch(named: appName) == nil {
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            task.arguments = ["-g", "x-apple.systempreferences:com.apple.ControlCenter-Settings.extension"]
            do { try task.run() }
            catch { return Reply(ok: false, error: "Could not open Menu Bar settings: \(error.localizedDescription)") }
        }
        var toggle: AXUIElement?
        for _ in 0..<100 {
            _ = RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.02))
            toggle = settingsSwitch(named: appName)
            if toggle != nil { break }
            usleep(100_000)
        }
        guard let toggle, let wasAllowed = allowed(toggle) else {
            return Reply(ok: false, error: "Could not access this app's Menu Bar setting.")
        }
        guard !wasAllowed else {
            return Reply(ok: false, error: "The icon is not in the visible menu bar.")
        }
        guard AXUIElementPerformAction(toggle, kAXPressAction as CFString) == .success else {
            return Reply(ok: false, error: "Could not reveal the menu bar icon.")
        }
        defer { restoreHiddenState(named: appName, originalToggle: toggle) }
        var appeared = false
        for _ in 0..<30 {
            if isHostedInMenuBar(pid: pid) { appeared = true; break }
            usleep(100_000)
        }
        guard appeared else { return Reply(ok: false, error: "The icon did not appear in the menu bar.") }
        usleep(400_000)
        let oldWindows = Set(presentedWindows(for: pid, appName: appName).map(\.0))
        let fresh = entries(for: app)
        let target = fresh.first { $0.0.index == index && (identifier.isEmpty || $0.0.identifier == identifier) }
            ?? fresh.first { $0.0.title == title }
        guard let (_, element, box) = target else {
            return Reply(ok: false, error: "The revealed item could not be found.")
        }
        guard let box, isVisibleMenuBarFrame(box) else {
            return Reply(ok: false, error: "The revealed icon has no visible position.")
        }
        let pressed = AXUIElementPerformAction(element, kAXPressAction as CFString)
        restoreCursor(originalCursor)
        guard pressed == .success || pressed == .cannotComplete else {
            return Reply(ok: false, error: "Could not open the revealed icon (\(pressed.rawValue)).")
        }
        var popupID: UInt32?
        for _ in 0..<20 {
            popupID = presentedWindows(for: pid, appName: appName)
                .first { !oldWindows.contains($0.0) }?.0
            if popupID != nil { break }
            usleep(100_000)
        }
        if let popupID {
            while presentedWindows(for: pid, appName: appName).contains(where: { $0.0 == popupID }) {
                usleep(150_000)
            }
        }
        return Reply(ok: true, error: nil)
    }

    private static func restoreHiddenState(named appName: String, originalToggle: AXUIElement) {
        for _ in 0..<3 {
            let toggle = settingsSwitch(named: appName) ?? originalToggle
            if allowed(toggle) == false { return }
            if allowed(toggle) == true {
                _ = AXUIElementPerformAction(toggle, kAXPressAction as CFString)
            }
            usleep(150_000)
        }
    }

    private static func presentedWindows(for pid: Int32, appName: String) -> [(UInt32, CGRect)] {
        let windows = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] ?? []
        return windows.compactMap { window in
            let ownerPID = window[kCGWindowOwnerPID as String] as? Int
            let ownerName = window[kCGWindowOwnerName as String] as? String
            guard ownerPID == Int(pid) || ownerName == appName else { return nil }
            guard let number = window[kCGWindowNumber as String] as? UInt32,
                  let layer = window[kCGWindowLayer as String] as? Int, layer >= 0,
                  let bounds = window[kCGWindowBounds as String] as? [String: Any],
                  let box = CGRect(dictionaryRepresentation: bounds as CFDictionary),
                  box.width > 80, box.height > 80 else { return nil }
            return (number, box)
        }
    }

    private static func isVisibleMenuBarFrame(_ box: CGRect) -> Bool {
        guard box.width > 0, box.height > 0 else { return false }
        var displays = [CGDirectDisplayID](repeating: 0, count: 16)
        var count: UInt32 = 0
        guard CGGetActiveDisplayList(UInt32(displays.count), &displays, &count) == .success else { return false }
        let center = CGPoint(x: box.midX, y: box.midY)
        return displays.prefix(Int(count)).contains { display in
            let screen = CGDisplayBounds(display)
            return screen.contains(center) && center.y < screen.minY + 70
        }
    }

    private static func restoreCursor(_ originalCursor: CGPoint?) {
        guard let originalCursor else { return }
        // Let the menu receive the press before moving the pointer back.
        usleep(80_000)
        CGWarpMouseCursorPosition(originalCursor)
    }

    private static func clickVisibleItem(at point: CGPoint, originalCursor: CGPoint?) -> Reply {
        guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown,
                                 mouseCursorPosition: point, mouseButton: .left),
              let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp,
                               mouseCursorPosition: point, mouseButton: .left) else {
            return Reply(ok: false, error: "Could not create the click event.")
        }
        CGWarpMouseCursorPosition(point)
        usleep(10_000)
        down.post(tap: .cghidEventTap)
        up.post(tap: .cghidEventTap)
        restoreCursor(originalCursor)
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
case "press" where args.count == 7:
    if let pid = Int32(args[1]), let index = Int(args[2]), let itemCount = Int(args[6]) {
        output(MenuBar.press(pid: pid, index: index, title: args[3], identifier: args[4],
                             role: args[5], itemCount: itemCount))
    } else { output(Reply(ok: false, error: "Invalid arguments.")) }
default: output(Reply(ok: false, error: "Invalid command."))
}
