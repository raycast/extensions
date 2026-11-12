// Shared with the Dock Cleanup menu bar app: https://github.com/alaramartin/dock-cleanup/blob/main/Sources/DockCleanup/Shared/Dock.swift

import AppKit
import ApplicationServices

/// One app icon in the Dock.
struct DockItem {
    let element: AXUIElement
    let title: String
    let url: URL
    /// Frame in Cocoa global coordinates (origin at the bottom-left of the primary screen).
    let frame: NSRect
    let isRunning: Bool

    let bundleID: String?

    var ref: AppRef { AppRef(url: url, bundleID: bundleID) }

    /// macOS won't let Finder leave the Dock.
    var isRemovable: Bool { bundleID != "com.apple.finder" }

    var icon: NSImage { NSWorkspace.shared.icon(forFile: url.path) }

    /// A square around just the icon picture, in the same coordinates as `frame`.
    /// The Dock's AX frame is taller than the icon (it includes space above it and the running dot below).
    /// The icon slot is `tilesize` points square (or smaller when the Dock is full) and sits 4pt in from the screen edge; the picture inside
    /// fills about 80% of that, so 86% frames it with a little room.
    var iconFrame: NSRect {
        // A full Dock shrinks its icons below the tilesize setting; the AX frame is then the better measure
        // (it's 2 pt wider than the icon slot).
        let slot = min(Dock.tileSize, frame.width - 2, frame.height)
        let side = (slot * 0.86).rounded()
        let edgeGap: CGFloat = 4
        let center: NSPoint
        switch Dock.orientation {
        case "left": center = NSPoint(x: frame.minX + edgeGap + slot / 2, y: frame.midY)
        case "right": center = NSPoint(x: frame.maxX - edgeGap - slot / 2, y: frame.midY)
        default: center = NSPoint(x: frame.midX, y: frame.minY + edgeGap + slot / 2)
        }
        return NSRect(x: center.x - side / 2, y: center.y - side / 2, width: side, height: side)
    }
}

/// Identifies an app across the Dock, the file system and running processes.
/// Paths alone don't work: the Dock lists Safari under /System/Volumes/Preboot/Cryptexes/…
struct AppRef: Hashable {
    let url: URL
    let bundleID: String?

    func matches(_ other: AppRef) -> Bool {
        if let a = bundleID, let b = other.bundleID { return a == b }
        return url.standardizedFileURL.resolvingSymlinksInPath().path == other.url.standardizedFileURL.resolvingSymlinksInPath().path
    }

    func matches(_ app: NSRunningApplication) -> Bool {
        guard let url = app.bundleURL else { return false }
        return matches(AppRef(url: url, bundleID: app.bundleIdentifier))
    }
}

enum Dock {
    private static var prefs: UserDefaults? { UserDefaults(suiteName: "com.apple.dock") }
    static var tileSize: CGFloat {
        let v = prefs?.double(forKey: "tilesize") ?? 0
        return v > 0 ? v : 48
    }
    static var orientation: String { prefs?.string(forKey: "orientation") ?? "bottom" }

    static var pid: pid_t? {
        NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.dock").first?.processIdentifier
    }

    /// Every app icon currently in the Dock, kept and recent, in Dock order.
    static func appItems() -> [DockItem] {
        guard let pid else { return [] }
        let app = AXUIElementCreateApplication(pid)
        let lists = children(app).filter { role($0) == kAXListRole }
        let primaryHeight = NSScreen.screens.first?.frame.height ?? 0
        var items: [DockItem] = []
        for list in lists {
            for el in children(list) where string(el, kAXSubroleAttribute) == "AXApplicationDockItem" {
                guard let url = attr(el, kAXURLAttribute) as? URL else { continue }
                var pos = CGPoint.zero, size = CGSize.zero
                if let v = attr(el, kAXPositionAttribute) { AXValueGetValue(v as! AXValue, .cgPoint, &pos) }
                if let v = attr(el, kAXSizeAttribute) { AXValueGetValue(v as! AXValue, .cgSize, &size) }
                let frame = NSRect(x: pos.x, y: primaryHeight - pos.y - size.height, width: size.width, height: size.height)
                let running = (attr(el, "AXIsApplicationRunning") as? Bool) ?? false
                items.append(DockItem(element: el, title: string(el, kAXTitleAttribute) ?? url.deletingPathExtension().lastPathComponent,
                                      url: url, frame: frame, isRunning: running, bundleID: Bundle(url: url)?.bundleIdentifier))
            }
        }
        return items
    }

    /// Removes the app's Dock icon through the icon's own Options menu.
    /// The Options submenu's items are readable before it opens, so it's never opened: only the main
    /// menu shows, for a moment.
    /// Returns false when the icon is gone already or the menu item couldn't be found.
    @discardableResult
    static func removeViaMenu(_ app: AppRef) -> Bool {
        guard let item = appItems().first(where: { $0.ref.matches(app) }) else { return false }
        AXUIElementPerformAction(item.element, kAXShowMenuAction as CFString)
        guard let menu = waitFor({ children(item.element).first { role($0) == kAXMenuRole } }) else { return false }
        func close() { AXUIElementPerformAction(menu, kAXCancelAction as CFString) }

        guard let options = children(menu).first(where: { string($0, kAXTitleAttribute) == "Options" }) else { close(); return false }
        func findRemove() -> AXUIElement? {
            children(options).first { role($0) == kAXMenuRole }.flatMap { sub in
                children(sub).first { string($0, kAXTitleAttribute) == "Remove from Dock" }
            }
        }
        var remove = findRemove()
        if remove == nil {
            // Not readable yet: open the submenu after all.
            AXUIElementPerformAction(options, kAXPressAction as CFString)
            remove = waitFor(findRemove)
        }
        guard let remove else { close(); return false }
        AXUIElementPerformAction(remove, kAXPressAction as CFString)
        return true
    }

    /// Takes the apps out of the Dock's saved kept and recent apps and restarts the Dock.
    /// Used only when the menu route fails, since the restart makes the Dock blink.
    static func removeViaPreferences(_ apps: [AppRef]) {
        let domain = "com.apple.dock" as CFString
        var changed = false
        for key in ["persistent-apps", "recent-apps"] {
            guard let tiles = CFPreferencesCopyAppValue(key as CFString, domain) as? [[String: Any]] else { continue }
            let kept = tiles.filter { tile in
                guard let data = tile["tile-data"] as? [String: Any],
                      let file = data["file-data"] as? [String: Any],
                      let s = file["_CFURLString"] as? String,
                      let u = s.hasPrefix("file://") ? URL(string: s) : URL(fileURLWithPath: s) else { return true }
                let tileApp = AppRef(url: u, bundleID: data["bundle-identifier"] as? String)
                return !apps.contains { $0.matches(tileApp) }
            }
            if kept.count != tiles.count {
                CFPreferencesSetAppValue(key as CFString, kept as CFArray, domain)
                changed = true
            }
        }
        guard changed else { return }
        CFPreferencesAppSynchronize(domain)
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/killall")
        p.arguments = ["Dock"]
        try? p.run()
        p.waitUntilExit()
    }

    // MARK: - AX helpers

    static func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
        var v: AnyObject?
        return AXUIElementCopyAttributeValue(el, name as CFString, &v) == .success ? v : nil
    }
    static func string(_ el: AXUIElement, _ name: String) -> String? { attr(el, name) as? String }
    static func role(_ el: AXUIElement) -> String? { string(el, kAXRoleAttribute) }
    static func children(_ el: AXUIElement) -> [AXUIElement] { attr(el, kAXChildrenAttribute) as? [AXUIElement] ?? [] }

    /// Polls `get` for up to a second. Menus take a moment to appear in the AX tree.
    private static func waitFor<T>(_ get: () -> T?) -> T? {
        for _ in 0..<200 {
            if let v = get() { return v }
            usleep(5_000)
        }
        return nil
    }
}
