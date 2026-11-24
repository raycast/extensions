import AppKit
import ApplicationServices

/// Reads and changes other apps' windows through the Accessibility API.
enum WindowMover {
    struct WindowInfo {
        let id: CGWindowID
        let pid: pid_t
        let layer: Int
        let bounds: CGRect  // CG coordinates (top-left origin), same as AX
    }

    private static let enhancedUI = "AXEnhancedUserInterface" as CFString

    static func isTrusted(prompt: Bool) -> Bool {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        return AXIsProcessTrustedWithOptions([key: prompt] as CFDictionary)
    }

    static func focusedWindow(pid: pid_t) -> AXUIElement? {
        let app = AXUIElementCreateApplication(pid)
        return element(app, kAXFocusedWindowAttribute) ?? element(app, kAXMainWindowAttribute)
    }

    static func windows(pid: pid_t) -> [AXUIElement] {
        var value: CFTypeRef?
        let app = AXUIElementCreateApplication(pid)
        guard AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &value) == .success else {
            return []
        }
        return value as? [AXUIElement] ?? []
    }

    static func window(pid: pid_t, id: CGWindowID) -> AXUIElement? {
        windows(pid: pid).first { windowID(of: $0) == id }
    }

    /// A document/app window on the normal window layer. Excludes panels, alerts and launchers such
    /// as the Raycast search bar. Some apps report their main window as a dialog (the Raycast AI Chat
    /// is `AXDialog`); those count when they can be minimized, which real alerts can't.
    static func isNormalWindow(_ window: AXUIElement) -> Bool {
        switch string(window, kAXSubroleAttribute) {
        case kAXStandardWindowSubrole: break
        case kAXDialogSubrole where element(window, kAXMinimizeButtonAttribute) != nil: break
        default: return false
        }
        guard let id = windowID(of: window), let layer = layer(of: id) else { return true }
        return layer == 0
    }

    static func frame(of window: AXUIElement) -> CGRect? {
        var origin = CGPoint.zero
        var size = CGSize.zero
        guard let position = axValue(window, kAXPositionAttribute),
              let extent = axValue(window, kAXSizeAttribute),
              AXValueGetValue(position, .cgPoint, &origin),
              AXValueGetValue(extent, .cgSize, &size) else { return nil }
        return CGRect(origin: origin, size: size)
    }

    static func isFullScreen(_ window: AXUIElement) -> Bool {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(window, "AXFullScreen" as CFString, &value) == .success else {
            return false
        }
        return value as? Bool ?? false
    }

    static func setFrame(_ frame: CGRect, of window: AXUIElement, pid: pid_t) {
        // Apps with AXEnhancedUserInterface on (Chrome, Electron and others turn it on when an
        // assistive app is around) animate every AX change and often land on the wrong size.
        let app = AXUIElementCreateApplication(pid)
        var enhanced: CFTypeRef?
        let wasEnhanced = AXUIElementCopyAttributeValue(app, enhancedUI, &enhanced) == .success
            && enhanced as? Bool == true
        if wasEnhanced { AXUIElementSetAttributeValue(app, enhancedUI, kCFBooleanFalse) }
        defer { if wasEnhanced { AXUIElementSetAttributeValue(app, enhancedUI, kCFBooleanTrue) } }

        // Size, position, size: a move can be refused while the old size doesn't fit, and some
        // apps clamp the size to the screen the window was on before the move.
        var size = frame.size
        var origin = frame.origin
        guard let sizeValue = AXValueCreate(.cgSize, &size),
              let originValue = AXValueCreate(.cgPoint, &origin) else { return }
        AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, sizeValue)
        AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, originValue)
        AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, sizeValue)
    }

    /// Puts the window on top of the windows of all inactive apps, without activating its app.
    static func raiseWithoutActivating(_ window: AXUIElement) {
        AXUIElementPerformAction(window, kAXRaiseAction as CFString)
    }

    /// Activates through AX: `NSRunningApplication.activate` is refused for background callers
    /// since macOS 14's cooperative activation.
    static func raise(_ window: AXUIElement, pid: pid_t) {
        let app = AXUIElementCreateApplication(pid)
        AXUIElementSetAttributeValue(app, kAXFrontmostAttribute as CFString, kCFBooleanTrue)
        AXUIElementPerformAction(window, kAXRaiseAction as CFString)
    }

    // MARK: Window server

    /// On-screen windows, front to back. Skips invisible and tiny helper windows.
    static func onScreenWindows() -> [WindowInfo] {
        let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
        let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []
        return list.compactMap { info in
            guard let id = info[kCGWindowNumber as String] as? CGWindowID,
                  let pid = info[kCGWindowOwnerPID as String] as? pid_t,
                  let layer = info[kCGWindowLayer as String] as? Int,
                  let boundsDict = info[kCGWindowBounds as String] as? NSDictionary,
                  let bounds = CGRect(dictionaryRepresentation: boundsDict as CFDictionary),
                  (info[kCGWindowAlpha as String] as? Double ?? 1) > 0,
                  bounds.width > 50, bounds.height > 50 else { return nil }
            return WindowInfo(id: id, pid: pid, layer: layer, bounds: bounds)
        }
    }

    static func layer(of id: CGWindowID) -> Int? {
        let list = CGWindowListCopyWindowInfo(.optionIncludingWindow, id) as? [[String: Any]]
        return list?.first?[kCGWindowLayer as String] as? Int
    }

    private typealias GetWindowFunction = @convention(c) (AXUIElement, UnsafeMutablePointer<CGWindowID>) -> AXError

    /// `_AXUIElementGetWindow` is private but has been stable for over a decade (Rectangle, yabai and
    /// AltTab rely on it). Looked up at runtime so a future macOS without it falls back to frame matching.
    private static let getWindow: GetWindowFunction? = {
        let path = "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
        guard let handle = dlopen(path, RTLD_LAZY), let symbol = dlsym(handle, "_AXUIElementGetWindow") else {
            return nil
        }
        return unsafeBitCast(symbol, to: GetWindowFunction.self)
    }()

    static func windowID(of window: AXUIElement) -> CGWindowID? {
        var id: CGWindowID = 0
        if let getWindow, getWindow(window, &id) == .success, id != 0 { return id }

        var pid: pid_t = 0
        guard AXUIElementGetPid(window, &pid) == .success, let frame = frame(of: window) else { return nil }
        return onScreenWindows().first { $0.pid == pid && $0.layer == 0 && $0.bounds == frame }?.id
    }

    // MARK: AX helpers

    private static func element(_ parent: AXUIElement, _ attribute: String) -> AXUIElement? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(parent, attribute as CFString, &value) == .success,
              let value, CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
        return (value as! AXUIElement)
    }

    private static func axValue(_ parent: AXUIElement, _ attribute: String) -> AXValue? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(parent, attribute as CFString, &value) == .success,
              let value, CFGetTypeID(value) == AXValueGetTypeID() else { return nil }
        return (value as! AXValue)
    }

    private static func string(_ parent: AXUIElement, _ attribute: String) -> String? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(parent, attribute as CFString, &value) == .success else { return nil }
        return value as? String
    }
}

/// AX and CGWindow use a top-left origin on the primary screen; AppKit uses bottom-left.
enum ScreenGeometry {
    private static var primaryHeight: CGFloat { NSScreen.screens.first?.frame.height ?? 0 }

    static func toCocoa(_ rect: CGRect) -> CGRect {
        CGRect(x: rect.minX, y: primaryHeight - rect.maxY, width: rect.width, height: rect.height)
    }

    static func toAX(_ rect: CGRect) -> CGRect {
        CGRect(x: rect.minX, y: primaryHeight - rect.maxY, width: rect.width, height: rect.height)
    }

    static func screen(containing axRect: CGRect) -> NSScreen {
        let rect = toCocoa(axRect)
        func overlap(_ screen: NSScreen) -> CGFloat {
            let shared = screen.frame.intersection(rect)
            return shared.isNull ? 0 : shared.width * shared.height
        }
        let best = NSScreen.screens.max { overlap($0) < overlap($1) }
        return best.flatMap { overlap($0) > 0 ? $0 : nil } ?? NSScreen.main ?? NSScreen.screens[0]
    }

    /// Centered frame in AX coordinates. Claims the menu bar strip, which is hidden during a session.
    /// Keeps clear of the Dock (the side and bottom insets of visibleFrame) unless it is hidden
    /// for the session too (`dockHidden`), then the whole screen is used.
    static func centeredFrame(on screen: NSScreen, fraction: Double, dockHidden: Bool = false) -> CGRect {
        let full = screen.frame
        let visible = dockHidden ? full : screen.visibleFrame
        let usable = CGRect(x: visible.minX, y: visible.minY,
                            width: visible.width, height: full.maxY - visible.minY)
        let size = CGSize(width: (usable.width * fraction).rounded(),
                          height: (usable.height * fraction).rounded())
        let origin = CGPoint(x: (usable.midX - size.width / 2).rounded(),
                             y: (usable.midY - size.height / 2).rounded())
        return toAX(CGRect(origin: origin, size: size))
    }
}
