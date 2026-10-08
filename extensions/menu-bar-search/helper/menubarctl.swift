import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

struct Frame: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct Point: Codable {
    let x: Double
    let y: Double
}

struct MenuBarItem: Codable {
    let id: String
    let title: String?
    let category: String
    let openStrategy: String
    let isObscured: Bool
    let ownerPid: pid_t
    let bundleId: String?
    let processName: String?
    let appPath: String?
    let iconPath: String?
    let frame: Frame?
    let actions: [String]
    let source: String
}

struct HelperError: Codable, Error {
    let code: String
    let message: String
    let recoverySuggestion: String?
}

struct PermissionStatus: Codable {
    let accessibilityTrusted: Bool
    let message: String
}

struct DebugSnapshotPayload: Codable {
    let id: String
    let title: String?
    let category: String
    let openStrategy: String
    let processName: String?
    let bundleId: String?
    let appPath: String?
    let ownerPid: pid_t
    let frame: Frame?
    let center: Point?
    let clickPoint: Point?
    let isObscured: Bool
    let actions: [String]
    let labels: [String]
}

struct OpenAttemptTrace: Codable {
    let method: String
    let detail: String
    let attempted: Bool
    let succeeded: Bool
}

struct OpenTrace: Codable {
    let ok: Bool
    let message: String?
    let hint: ElementHint?
    let matchedItem: MenuBarItem?
    let clickPoint: Point?
    let isObscured: Bool?
    let attempts: [OpenAttemptTrace]
}

struct ElementHint: Codable {
    let ownerPid: pid_t?
    let bundleId: String?
    let processName: String?
    let title: String?
    let category: String?
    let source: String?
    let frame: Frame?
}

struct HintMatch<Element> {
    let element: Element
    let item: MenuBarItem
    let score: Int
    let frameDistance: Double
}

struct MenuBarElementSnapshot {
    let labels: [String?]
    let frame: Frame?
    let center: CGPoint?
    let actions: [String]
    let hasScreenPosition: Bool
    let isObscured: Bool
}

enum CoordinateClickMode: Equatable {
    case robust
    case singlePosted
}

enum Command: String {
    case list
    case open
    case debug
    case permissions
    case selftest
    case lastOpenTrace = "last-open-trace"
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]

do {
    let arguments = CommandLine.arguments.dropFirst()
    guard let commandName = arguments.first, let command = Command(rawValue: commandName) else {
        throw HelperError(
            code: "usage",
            message: "Usage: menubarctl list | open <id> | debug <id> | permissions",
            recoverySuggestion: nil
        )
    }

    switch command {
    case .list:
        try requireAccessibility()
        try printJSON(MenuBarCatalog.scanItems())
    case .open:
        try requireAccessibility()
        guard arguments.count >= 2 else {
            throw HelperError(code: "missing_id", message: "Usage: menubarctl open <id>", recoverySuggestion: nil)
        }
        let id = arguments[arguments.index(after: arguments.startIndex)]
        let hint = parseElementHint(arguments.dropFirst(2).first)
        try printJSON(try MenuOpening.open(id: String(id), hint: hint))
    case .debug:
        try requireAccessibility()
        guard arguments.count >= 2 else {
            throw HelperError(code: "missing_id", message: "Usage: menubarctl debug <id>", recoverySuggestion: nil)
        }
        let id = arguments[arguments.index(after: arguments.startIndex)]
        let hint = parseElementHint(arguments.dropFirst(2).first)
        try printJSON(DebugSnapshot.capture(id: String(id), hint: hint))
    case .permissions:
        let trusted = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeRetainedValue() as String: false] as CFDictionary)
        try printJSON(PermissionStatus(
            accessibilityTrusted: trusted,
            message: trusted ? "Accessibility permission is granted." : "Accessibility permission is not granted."
        ))
    case .selftest:
        try SelfTest.run()
        try printJSON(["ok": true])
    case .lastOpenTrace:
        try printJSON(readLastOpenTrace())
    }
} catch let error as HelperError {
    printError(error)
    exit(1)
} catch {
    printError(HelperError(code: "unexpected_error", message: String(describing: error), recoverySuggestion: nil))
    exit(1)
}

func requireAccessibility() throws {
    let trusted = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeRetainedValue() as String: true] as CFDictionary)
    guard trusted else {
        throw HelperError(
            code: "accessibility_permission_required",
            message: "Accessibility permission is required",
            recoverySuggestion: "Grant Accessibility permission to Raycast, then reload this command."
        )
    }
}

enum MenuBarCatalog {
    static func scanItems() -> [MenuBarItem] {
        let runningApps = NSWorkspace.shared.runningApplications
            .filter { $0.processIdentifier > 0 }
            .sorted { appSortKey($0) < appSortKey($1) }

        var results: [MenuBarItem] = []
        var seenFingerprints = Set<String>()

        for app in runningApps {
            let appElement = AXUIElementCreateApplication(app.processIdentifier)
            for source in menuBarSources(for: appElement, app: app) {
                let candidates = menuBarItems(in: source.element)
                for (index, element) in candidates.enumerated() {
                    guard isLikelyMenuBarItem(element) else { continue }
                    let snapshot = menuBarElementSnapshot(element)

                    let item = makeMenuBarItem(
                        element: element,
                        app: app,
                        source: source.name,
                        sourceIndex: index,
                        snapshot: snapshot
                    )

                    guard !shouldFilterMenuBarItem(app: app, item: item, snapshot: snapshot) else { continue }
                    let fingerprint = menuBarItemFingerprint(item)
                    guard !seenFingerprints.contains(fingerprint) else { continue }
                    seenFingerprints.insert(fingerprint)
                    results.append(item)
                }
            }
        }

        return results.sorted { left, right in
            if left.frame?.y != right.frame?.y {
                return (left.frame?.y ?? 0) < (right.frame?.y ?? 0)
            }
            return (left.frame?.x ?? 0) < (right.frame?.x ?? 0)
        }
    }
}

enum MenuOpening {
    static func open(id: String, hint: ElementHint?) throws -> OpenTrace {
        guard let target = findElement(id: id, hint: hint) else {
            let trace = OpenTrace(
                ok: false,
                message: "Menu bar item is no longer available",
                hint: hint,
                matchedItem: nil,
                clickPoint: nil,
                isObscured: nil,
                attempts: []
            )
            writeLastOpenTrace(trace)
            throw HelperError(
                code: "item_not_found",
                message: "Menu bar item is no longer available",
                recoverySuggestion: "Refresh the list and try again."
            )
        }

        let isObscured = isElementObscured(target.element)
        let clickPoint = clickablePoint(of: target.element).map { Point(x: $0.x, y: $0.y) }
        let policy = OpenPolicy(
            item: target.item,
            element: target.element,
            isObscured: isObscured,
            clickPoint: clickPoint
        )
        var attempts: [OpenAttemptTrace] = []

        if policy.prefersAccessibility {
            let axAttempt = performAccessibilityOpen(
                target.element,
                ownerPid: target.item.ownerPid,
                preferShowMenu: true,
                trustSuccessfulActionResult: policy.trustSuccessfulAccessibilityResult,
                trustAttemptedActionResult: policy.trustAttemptedAccessibilityAction
            )
            attempts.append(OpenAttemptTrace(
                method: "accessibility",
                detail: axAttempt.detail,
                attempted: axAttempt.attempted,
                succeeded: axAttempt.succeeded
            ))
            if axAttempt.succeeded {
                return finishOpenTrace(ok: true, message: nil, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
            }

            if policy.shouldTryCoordinateFallbackAfterAccessibility {
                let clickAttempt = clickElement(target.element, mode: policy.coordinateClickMode)
                attempts.append(OpenAttemptTrace(
                    method: "click",
                    detail: clickAttempt.detail,
                    attempted: clickAttempt.attempted,
                    succeeded: clickAttempt.succeeded
                ))
                if clickAttempt.succeeded {
                    return finishOpenTrace(ok: true, message: nil, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
                }
            }

            if let semanticAttempt = performSemanticOpen(target.item) {
                attempts.append(OpenAttemptTrace(
                    method: semanticAttempt.method,
                    detail: semanticAttempt.detail,
                    attempted: semanticAttempt.attempted,
                    succeeded: semanticAttempt.succeeded
                ))
                if semanticAttempt.succeeded {
                    return finishOpenTrace(ok: true, message: nil, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
                }
            }
        } else if policy.shouldTryCoordinateFirst {
            let clickAttempt = clickElement(target.element, mode: policy.coordinateClickMode)
            attempts.append(OpenAttemptTrace(
                method: "click",
                detail: clickAttempt.detail,
                attempted: clickAttempt.attempted,
                succeeded: clickAttempt.succeeded
            ))
            if clickAttempt.succeeded {
                return finishOpenTrace(ok: true, message: nil, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
            }

        }

        if policy.shouldTryAccessibilityFallback {
            let fallbackAXAttempt = performAccessibilityOpen(target.element, ownerPid: target.item.ownerPid)
            attempts.append(OpenAttemptTrace(
                method: "accessibility",
                detail: fallbackAXAttempt.detail,
                attempted: fallbackAXAttempt.attempted,
                succeeded: fallbackAXAttempt.succeeded
            ))
            if fallbackAXAttempt.succeeded {
                return finishOpenTrace(ok: true, message: nil, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
            }
        }

        let message = policy.failureMessage
        _ = finishOpenTrace(ok: false, message: message, hint: hint, target: target.item, clickPoint: clickPoint, isObscured: isObscured, attempts: attempts)
        throw HelperError(
            code: "open_failed",
            message: "Unable to open menu bar item",
            recoverySuggestion: message
        )
    }
}

struct OpenPolicy {
    let prefersAccessibility: Bool
    let shouldTryCoordinateFirst: Bool
    let shouldTryCoordinateFallbackAfterAccessibility: Bool
    let shouldTryAccessibilityFallback: Bool
    let coordinateClickMode: CoordinateClickMode
    let trustSuccessfulAccessibilityResult: Bool
    let trustAttemptedAccessibilityAction: Bool
    let failureMessage: String

    init(item: MenuBarItem, element: AXUIElement, isObscured: Bool, clickPoint: Point?) {
        let center = centerPoint(of: element)
        let isInObscuredArea = center.map(isInObscuredMenuBarArea) ?? false

        prefersAccessibility = Self.prefersAccessibility(
            category: item.category,
            isInObscuredMenuBarArea: isInObscuredArea
        )
        shouldTryCoordinateFirst = !prefersAccessibility && !isObscured
        shouldTryCoordinateFallbackAfterAccessibility =
            prefersAccessibility &&
            !isObscured &&
            Self.allowsCoordinateFallbackAfterAccessibility(item: item)
        shouldTryAccessibilityFallback = !prefersAccessibility
        coordinateClickMode = Self.coordinateClickMode(item: item)
        trustSuccessfulAccessibilityResult = Self.trustsSuccessfulAccessibilityResult(
            item: item,
            isObscured: isObscured,
            clickPoint: clickPoint
        )
        trustAttemptedAccessibilityAction = Self.trustsAttemptedAccessibilityAction(
            isObscured: isObscured,
            clickPoint: clickPoint
        )
        failureMessage = Self.failureMessage(isObscured: isObscured, prefersAccessibility: prefersAccessibility)
    }

    static func prefersAccessibility(category: String, isInObscuredMenuBarArea: Bool) -> Bool {
        category.hasPrefix("system:") || isInObscuredMenuBarArea
    }

    static func allowsCoordinateFallbackAfterAccessibility(item: MenuBarItem) -> Bool {
        item.category == "app:generic" ||
            item.category.hasPrefix("input:") ||
            isControlCenterSystemItem(item)
    }

    static func coordinateClickMode(item: MenuBarItem) -> CoordinateClickMode {
        if item.category.hasPrefix("input:") || isControlCenterSystemItem(item) {
            return .singlePosted
        }

        return .robust
    }

    static func isControlCenterSystemItem(_ item: MenuBarItem) -> Bool {
        guard item.category.hasPrefix("system:") else {
            return false
        }

        return item.bundleId == "com.apple.controlcenter" || normalizedText(item.processName) == "Control Center"
    }

    static func trustsSuccessfulAccessibilityResult(item: MenuBarItem, isObscured: Bool, clickPoint: Point?) -> Bool {
        isControlCenterSystemItem(item) || (isObscured && clickPoint == nil)
    }

    static func trustsAttemptedAccessibilityAction(isObscured: Bool, clickPoint: Point?) -> Bool {
        isObscured && clickPoint == nil
    }

    static func failureMessage(isObscured: Bool, prefersAccessibility: Bool) -> String {
        if isObscured {
            return "The item appears to be behind the camera housing, and macOS did not report a successful Accessibility open action."
        }

        if prefersAccessibility {
            return "The item accepted an Accessibility action, but did not open a visible menu or panel."
        }

        return "The item did not accept coordinate click or Accessibility actions."
    }
}

func finishOpenTrace(
    ok: Bool,
    message: String?,
    hint: ElementHint?,
    target: MenuBarItem,
    clickPoint: Point?,
    isObscured: Bool,
    attempts: [OpenAttemptTrace]
) -> OpenTrace {
    let trace = OpenTrace(
        ok: ok,
        message: message,
        hint: hint,
        matchedItem: target,
        clickPoint: clickPoint,
        isObscured: isObscured,
        attempts: attempts
    )
    writeLastOpenTrace(trace)
    return trace
}

enum DebugSnapshot {
    static func capture(id: String, hint: ElementHint?) throws -> DebugSnapshotPayload {
    guard let target = findElement(id: id, hint: hint) else {
        throw HelperError(
            code: "item_not_found",
            message: "Menu bar item is no longer available",
            recoverySuggestion: "Refresh the list and try again."
        )
    }

    let frame = frame(of: target.element)
    let center = centerPoint(of: target.element)
    let clickPoint = clickablePoint(of: target.element)

    return DebugSnapshotPayload(
        id: target.item.id,
        title: target.item.title,
        category: target.item.category,
        openStrategy: target.item.openStrategy,
        processName: target.item.processName,
        bundleId: target.item.bundleId,
        appPath: target.item.appPath,
        ownerPid: target.item.ownerPid,
        frame: frame,
        center: center.map { Point(x: $0.x, y: $0.y) },
        clickPoint: clickPoint.map { Point(x: $0.x, y: $0.y) },
        isObscured: isElementObscured(target.element),
        actions: actions(of: target.element),
        labels: menuBarItemLabelCandidates(target.element).compactMap { normalizedText($0) }
    )
    }
}

func performAccessibilityOpen(
    _ element: AXUIElement,
    ownerPid: pid_t,
    preferShowMenu: Bool = false,
    trustSuccessfulActionResult: Bool = false,
    trustAttemptedActionResult: Bool = false
) -> (attempted: Bool, succeeded: Bool, detail: String) {
    AXUIElementSetAttributeValue(element, kAXFocusedAttribute as CFString, kCFBooleanTrue)

    let supportedActions = Set(actions(of: element))
    let preferredActions = preferShowMenu
        ? [
            kAXShowMenuAction as String,
            kAXPressAction as String,
            kAXPickAction as String,
            kAXShowDefaultUIAction as String
        ]
        : [
            kAXPressAction as String,
            kAXShowMenuAction as String,
            kAXPickAction as String,
            kAXShowDefaultUIAction as String
        ]
    let actionsToTry = supportedActions.isEmpty
        ? preferredActions
        : preferredActions.filter { supportedActions.contains($0) }

    guard !actionsToTry.isEmpty else {
        return (false, false, "no supported actions")
    }

    var attempted = false
    var details: [String] = []
    for action in actionsToTry {
        attempted = true
        let windowFingerprintsBefore = visibleWindowFingerprints(ownerPid: ownerPid)
        let result = AXUIElementPerformAction(element, action as CFString)
        usleep(220_000)
        let openedUI = didOpenMenuBarUI(
            element: element,
            ownerPid: ownerPid,
            windowFingerprintsBefore: windowFingerprintsBefore
        )
        details.append("\(action):\(result.rawValue),uiOpen=\(openedUI)")

        if openedUI {
            return (true, true, details.joined(separator: ","))
        }

        if result == .success && trustSuccessfulActionResult {
            details.append("trustedResult=true")
            return (true, true, details.joined(separator: ","))
        }

        if trustAttemptedActionResult {
            details.append("trustedAttempt=true")
            return (true, true, details.joined(separator: ","))
        }
    }

    return (attempted, false, details.joined(separator: ","))
}

func didOpenMenuBarUI(element: AXUIElement, ownerPid: pid_t, windowFingerprintsBefore: Set<String>) -> Bool {
    if let observationPoint = clickablePoint(of: element) ?? centerPoint(of: element), isMenuOpenNear(observationPoint) {
        return true
    }

    let windowFingerprintsAfter = visibleWindowFingerprints(ownerPid: ownerPid)
    return !windowFingerprintsAfter.subtracting(windowFingerprintsBefore).isEmpty
}

func visibleWindowFingerprints(ownerPid: pid_t) -> Set<String> {
    let appElement = AXUIElementCreateApplication(ownerPid)
    let windows: [AXUIElement] = attribute(appElement, kAXWindowsAttribute) ?? []

    return Set(windows.map(windowFingerprint))
}

func windowFingerprint(_ element: AXUIElement) -> String {
    let role: String = attribute(element, kAXRoleAttribute) ?? "-"
    let subrole: String = attribute(element, kAXSubroleAttribute) ?? "-"
    let title: String = attribute(element, kAXTitleAttribute) ?? "-"
    let frame = frame(of: element).map(frameIDComponent) ?? "no-frame"

    return "\(role)|\(subrole)|\(title)|\(frame)"
}

func performSemanticOpen(_ item: MenuBarItem) -> (method: String, attempted: Bool, succeeded: Bool, detail: String)? {
    switch item.category {
    case "system:spotlight":
        return openURLSemanticItem(urlString: "spotlight://apps", method: "semantic-url")
    default:
        return nil
    }
}

func openURLSemanticItem(urlString: String, method: String) -> (method: String, attempted: Bool, succeeded: Bool, detail: String) {
    guard let url = URL(string: urlString) else {
        return (method, true, false, "invalid-url:\(urlString)")
    }

    let succeeded = NSWorkspace.shared.open(url)
    return (method, true, succeeded, urlString)
}

func menuOpenStrategy(category: String, center: CGPoint?, isObscured: Bool) -> String {
    let isInObscuredArea = center.map(isInObscuredMenuBarArea) ?? false

    if OpenPolicy.prefersAccessibility(category: category, isInObscuredMenuBarArea: isInObscuredArea) {
        return "ax"
    }

    if isObscured {
        return "ax"
    }

    return "click"
}

func clickElement(_ element: AXUIElement, mode: CoordinateClickMode = .robust) -> (attempted: Bool, succeeded: Bool, detail: String) {
    guard let clickPoint = clickablePoint(of: element) else {
        return (false, false, "no click point")
    }

    let robustVariants: [(label: String, sourceState: CGEventSourceStateID, tap: CGEventTapLocation, warp: Bool)] = [
        ("hid", .hidSystemState, .cghidEventTap, false),
        ("hid-warp", .hidSystemState, .cghidEventTap, true),
        ("combined", .combinedSessionState, .cghidEventTap, true),
        ("session", .hidSystemState, .cgSessionEventTap, true)
    ]
    let variants: [(label: String, sourceState: CGEventSourceStateID, tap: CGEventTapLocation, warp: Bool)] = {
        switch mode {
        case .robust:
            return robustVariants
        case .singlePosted:
            return [("hid-warp", .hidSystemState, .cghidEventTap, true)]
        }
    }()
    var details: [String] = []

    for variant in variants {
        let posted = postMouseClick(
            at: clickPoint,
            sourceState: variant.sourceState,
            tap: variant.tap,
            warp: variant.warp
        )
        usleep(180_000)
        let openedMenu = isMenuOpenNear(clickPoint)
        details.append("\(variant.label):posted=\(posted),menuOpen=\(openedMenu)")

        if openedMenu || (mode == .singlePosted && posted) {
            return (true, true, "\(clickPoint.x),\(clickPoint.y); " + details.joined(separator: "; "))
        }
    }

    return (true, false, "\(clickPoint.x),\(clickPoint.y); " + details.joined(separator: "; "))
}

func postMouseClick(
    at clickPoint: CGPoint,
    sourceState: CGEventSourceStateID,
    tap: CGEventTapLocation,
    warp: Bool
) -> Bool {
    if warp {
        CGWarpMouseCursorPosition(clickPoint)
        usleep(90_000)
    }

    let source = CGEventSource(stateID: sourceState)
    source?.localEventsSuppressionInterval = 0
    let move = CGEvent(mouseEventSource: source, mouseType: .mouseMoved, mouseCursorPosition: clickPoint, mouseButton: .left)
    let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: clickPoint, mouseButton: .left)
    let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: clickPoint, mouseButton: .left)

    guard let move, let down, let up else {
        return false
    }

    down.setIntegerValueField(.mouseEventClickState, value: 1)
    up.setIntegerValueField(.mouseEventClickState, value: 1)

    move.post(tap: tap)
    usleep(120_000)
    down.post(tap: tap)
    usleep(80_000)
    up.post(tap: tap)

    return true
}

func isElementObscured(_ element: AXUIElement) -> Bool {
    isElementObscured(frame: frame(of: element), center: centerPoint(of: element))
}

func isElementObscured(frame: Frame?, center: CGPoint?) -> Bool {
    guard let frame, let center else {
        return false
    }

    return isInObscuredMenuBarArea(center) && visibleTopAreaClickPoint(forAccessibilityFrame: frame) == nil
}

func clickablePoint(of element: AXUIElement) -> CGPoint? {
    guard let frame = frame(of: element), let center = centerPoint(of: element) else {
        return nil
    }

    guard isInObscuredMenuBarArea(center) else {
        return center
    }

    return visibleTopAreaClickPoint(forAccessibilityFrame: frame)
}

func isMenuOpenNear(_ clickPoint: CGPoint) -> Bool {
    let sampleOffsets: [CGFloat] = [34, 56, 84, 120]
    let sampleXOffsets: [CGFloat] = [0, -80, 80]

    for yOffset in sampleOffsets {
        for xOffset in sampleXOffsets {
            let point = CGPoint(x: clickPoint.x + xOffset, y: clickPoint.y + yOffset)
            if let element = elementAtPosition(point), isMenuElementOrDescendant(element) {
                return true
            }
        }
    }

    return false
}

func elementAtPosition(_ point: CGPoint) -> AXUIElement? {
    let systemWide = AXUIElementCreateSystemWide()
    var element: AXUIElement?
    let result = AXUIElementCopyElementAtPosition(systemWide, Float(point.x), Float(point.y), &element)
    guard result == .success else {
        return nil
    }

    return element
}

func isMenuElementOrDescendant(_ element: AXUIElement) -> Bool {
    var current: AXUIElement? = element

    for _ in 0..<4 {
        guard let candidate = current else {
            return false
        }

        if let role: String = attribute(candidate, kAXRoleAttribute) {
            if role == (kAXMenuRole as String) || role == (kAXMenuItemRole as String) {
                return true
            }
        }

        current = attribute(candidate, kAXParentAttribute)
    }

    return false
}

func isInObscuredMenuBarArea(_ point: CGPoint) -> Bool {
    guard
        #available(macOS 12.0, *),
        let screen = screenContainingAccessibilityPoint(point),
        screen.safeAreaInsets.top > 0
    else {
        return false
    }

    let appKitPoint = appKitPoint(fromAccessibilityPoint: point, in: screen)
    let isInUnobscuredTopArea = (screen.auxiliaryTopLeftArea?.contains(appKitPoint) ?? false) ||
        (screen.auxiliaryTopRightArea?.contains(appKitPoint) ?? false)

    return isNearTopEdge(appKitPoint, of: screen) && !isInUnobscuredTopArea
}

func visibleTopAreaClickPoint(forAccessibilityFrame frame: Frame) -> CGPoint? {
    guard
        #available(macOS 12.0, *),
        let screen = screenContainingAccessibilityPoint(CGPoint(x: frame.x + frame.width / 2, y: frame.y + frame.height / 2))
    else {
        return nil
    }

    let itemRect = appKitRect(fromAccessibilityFrame: frame, in: screen)
    let candidates = [screen.auxiliaryTopLeftArea, screen.auxiliaryTopRightArea]
        .compactMap { $0 }
        .map { itemRect.intersection($0) }
        .filter { !$0.isNull && !$0.isEmpty }
        .sorted { $0.width * $0.height > $1.width * $1.height }

    guard let visibleRect = candidates.first else {
        return nil
    }

    return accessibilityPoint(fromAppKitPoint: CGPoint(x: visibleRect.midX, y: visibleRect.midY), in: screen)
}

func screenContainingAccessibilityPoint(_ point: CGPoint) -> NSScreen? {
    NSScreen.screens.first { screen in
        accessibilityFrame(for: screen).contains(point)
    }
}

func accessibilityFrame(for screen: NSScreen) -> CGRect {
    guard let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID else {
        return screen.frame
    }

    return CGDisplayBounds(displayID)
}

func appKitPoint(fromAccessibilityPoint point: CGPoint, in screen: NSScreen) -> CGPoint {
    let accessibilityFrame = accessibilityFrame(for: screen)
    let distanceFromTop = point.y - accessibilityFrame.minY
    return CGPoint(x: point.x, y: screen.frame.maxY - distanceFromTop)
}

func appKitRect(fromAccessibilityFrame frame: Frame, in screen: NSScreen) -> CGRect {
    let topLeft = appKitPoint(fromAccessibilityPoint: CGPoint(x: frame.x, y: frame.y), in: screen)
    return CGRect(x: topLeft.x, y: topLeft.y - frame.height, width: frame.width, height: frame.height)
}

func accessibilityPoint(fromAppKitPoint point: CGPoint, in screen: NSScreen) -> CGPoint {
    let accessibilityFrame = accessibilityFrame(for: screen)
    let distanceFromTop = screen.frame.maxY - point.y
    return CGPoint(x: point.x, y: accessibilityFrame.minY + distanceFromTop)
}

func isNearTopEdge(_ point: CGPoint, of screen: NSScreen) -> Bool {
    if #available(macOS 12.0, *) {
        let topInset = max(screen.safeAreaInsets.top, 1)
        return point.y >= screen.frame.maxY - topInset - 2
    }

    return false
}

enum SelfTest {
    static func run() throws {
        try resolvesMovedItemAcrossSourceChange()
        try resolvesSemanticItemAfterLargeFrameShift()
        try opensVisibleInputItemsWithCoordinateClick()
        try keepsSystemItemsAccessibilityFirst()
        try fallsBackToSingleClickForVisibleControlCenterItems()
        try keepsSpotlightOffCoordinateFallback()
        try includesScreenPositionedItemsEvenWithoutClickPoint()
        try sanitizesIconCacheKeys()
        try requiresBundleIdentifierForIconCache()
        try distinguishesIconCacheKeyCollisions()
        try keepsIconCacheKeysDeterministic()
        try computesFrameCenters()
        try trustsControlCenterAccessibilitySuccess()
        try trustsAccessibilitySuccessWhenOpenCannotBeObserved()
        try rejectsMissingSemanticItemInsteadOfOpeningNearbySystemItem()
        try rejectsMissingTitledItemInsteadOfOpeningNearbySameOwnerItem()
        try rejectsGenericInputCategoryWithoutTitleAsIdentity()
        try resolvesGenericSameOwnerItemWhenFrameIsClear()
        try rejectsAmbiguousGenericSameOwnerItems()
    }

    private static func resolvesMovedItemAcrossSourceChange() throws {
        let hint = hintFixture(
            title: "Docker Desktop",
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 640, y: 0, width: 24, height: 24)
        )
        let movedDocker = itemFixture(
            title: "Docker Desktop",
            category: "app:generic",
            source: "menuBar",
            frame: Frame(x: 500, y: 0, width: 24, height: 24)
        )
        let otherItem = itemFixture(
            title: "Other Status",
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 640, y: 0, width: 24, height: 24)
        )

        let resolved = resolveHintMatch([
            match("docker", item: movedDocker, hint: hint),
            match("other", item: otherItem, hint: hint)
        ], hint: hint)

        try assert(resolved?.element == "docker", "dynamic_source_change")
    }

    private static func resolvesSemanticItemAfterLargeFrameShift() throws {
        let hint = hintFixture(
            title: "Wi-Fi",
            category: "system:wifi",
            source: "menuBar",
            frame: Frame(x: 900, y: 0, width: 24, height: 24),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )
        let wifi = itemFixture(
            title: "Wi-Fi",
            category: "system:wifi",
            source: "menuBar",
            frame: Frame(x: 760, y: 0, width: 24, height: 24),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )
        let sound = itemFixture(
            title: "Sound",
            category: "system:sound",
            source: "menuBar",
            frame: Frame(x: 900, y: 0, width: 24, height: 24),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )

        let resolved = resolveHintMatch([
            match("wifi", item: wifi, hint: hint),
            match("sound", item: sound, hint: hint)
        ], hint: hint)

        try assert(resolved?.element == "wifi", "semantic_large_frame_shift")
    }

    private static func opensVisibleInputItemsWithCoordinateClick() throws {
        let inputItem = itemFixture(
            title: "微信输入法",
            category: "input:generic",
            source: "extras",
            frame: Frame(x: 945, y: 4.5, width: 46, height: 24),
            bundleId: "com.apple.TextInputMenuAgent",
            processName: "TextInputMenuAgent"
        )

        try assert(
            !OpenPolicy.prefersAccessibility(category: inputItem.category, isInObscuredMenuBarArea: false),
            "input_not_ax_first"
        )
        try assert(
            OpenPolicy.coordinateClickMode(item: inputItem) == .singlePosted,
            "input_single_click_mode"
        )
    }

    private static func keepsSystemItemsAccessibilityFirst() throws {
        let spotlight = itemFixture(
            title: "Spotlight",
            category: "system:spotlight",
            source: "extras",
            frame: Frame(x: 1324, y: 4.5, width: 34, height: 24),
            bundleId: "com.apple.Spotlight",
            processName: "Spotlight"
        )

        try assert(
            OpenPolicy.prefersAccessibility(category: spotlight.category, isInObscuredMenuBarArea: false),
            "system_ax_first"
        )
        try assert(
            OpenPolicy.coordinateClickMode(item: spotlight) == .robust,
            "system_no_input_click_mode"
        )
    }

    private static func fallsBackToSingleClickForVisibleControlCenterItems() throws {
        let clock = itemFixture(
            title: "Clock",
            category: "system:clock",
            source: "extras",
            frame: Frame(x: 1407, y: 5.5, width: 98.5, height: 22),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )

        try assert(
            OpenPolicy.allowsCoordinateFallbackAfterAccessibility(item: clock),
            "control_center_system_click_fallback"
        )
        try assert(
            OpenPolicy.coordinateClickMode(item: clock) == .singlePosted,
            "control_center_system_single_click"
        )
    }

    private static func trustsControlCenterAccessibilitySuccess() throws {
        let clock = itemFixture(
            title: "Clock",
            category: "system:clock",
            source: "extras",
            frame: Frame(x: 1407, y: 5.5, width: 98.5, height: 22),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )

        try assert(
            OpenPolicy.trustsSuccessfulAccessibilityResult(item: clock, isObscured: false, clickPoint: Point(x: 1456.25, y: 16.5)),
            "control_center_trusts_ax_success"
        )
    }

    private static func keepsSpotlightOffCoordinateFallback() throws {
        let spotlight = itemFixture(
            title: "Spotlight",
            category: "system:spotlight",
            source: "extras",
            frame: Frame(x: 1324, y: 4.5, width: 34, height: 24),
            bundleId: "com.apple.Spotlight",
            processName: "Spotlight"
        )

        try assert(
            !OpenPolicy.allowsCoordinateFallbackAfterAccessibility(item: spotlight),
            "spotlight_no_coordinate_fallback"
        )
    }

    private static func includesScreenPositionedItemsEvenWithoutClickPoint() throws {
        try assert(shouldIncludeMenuBarItemInCatalog(hasScreenPosition: true), "catalog_includes_screen_positioned")
        try assert(!shouldIncludeMenuBarItemInCatalog(hasScreenPosition: false), "catalog_excludes_no_screen_position")
    }

    private static func sanitizesIconCacheKeys() throws {
        try assert(sanitizedIconCacheKey("com.electron.dockerdesktop") == "com-electron-dockerdesktop", "icon_key_bundle_id")
        try assert(sanitizedIconCacheKey("") == "unknown", "icon_key_empty")
    }

    private static func requiresBundleIdentifierForIconCache() throws {
        try assert(iconCacheKey(bundleIdentifier: nil) == nil, "icon_key_requires_bundle_id")
        try assert(iconCacheKey(bundleIdentifier: "") == nil, "icon_key_rejects_empty_bundle_id")
    }

    private static func distinguishesIconCacheKeyCollisions() throws {
        let dashed = iconCacheKey(bundleIdentifier: "com.foo-bar")
        let dotted = iconCacheKey(bundleIdentifier: "com.foo.bar")
        try assert(dashed != nil && dotted != nil && dashed != dotted, "icon_key_distinguishes_sanitized_collision")
    }

    private static func keepsIconCacheKeysDeterministic() throws {
        let bundleIdentifier = "com.electron.dockerdesktop"
        try assert(
            iconCacheKey(bundleIdentifier: bundleIdentifier) == iconCacheKey(bundleIdentifier: bundleIdentifier),
            "icon_key_deterministic"
        )
        try assert(iconCacheKey(bundleIdentifier: "a") == "a-af63dc4c8601ec8c", "icon_key_stable_fnv1a")
    }

    private static func computesFrameCenters() throws {
        let center = centerPoint(of: Frame(x: -100, y: 5.5, width: 47, height: 24))
        try assert(center == CGPoint(x: -76.5, y: 17.5), "frame_center_fractional_negative_coordinates")
        try assert(centerPoint(of: Frame(x: 0, y: 0, width: 0, height: 0)) == .zero, "frame_center_zero_size")
    }

    private static func trustsAccessibilitySuccessWhenOpenCannotBeObserved() throws {
        let docker = itemFixture(
            title: "status menu",
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 794, y: 4.5, width: 47, height: 24),
            bundleId: "com.electron.dockerdesktop",
            processName: "Docker Desktop"
        )

        try assert(
            OpenPolicy.trustsSuccessfulAccessibilityResult(item: docker, isObscured: true, clickPoint: nil),
            "trust_obscured_without_click_point"
        )
        try assert(
            OpenPolicy.trustsAttemptedAccessibilityAction(isObscured: true, clickPoint: nil),
            "trust_obscured_attempt_without_click_point"
        )
        try assert(
            !OpenPolicy.trustsSuccessfulAccessibilityResult(item: docker, isObscured: false, clickPoint: nil),
            "do_not_trust_visible_without_click_point"
        )
        try assert(
            !OpenPolicy.trustsAttemptedAccessibilityAction(isObscured: false, clickPoint: nil),
            "do_not_trust_visible_attempt_without_click_point"
        )
        try assert(
            !OpenPolicy.trustsSuccessfulAccessibilityResult(item: docker, isObscured: true, clickPoint: Point(x: 10, y: 10)),
            "do_not_trust_obscured_with_click_point"
        )
        try assert(
            !OpenPolicy.trustsAttemptedAccessibilityAction(isObscured: true, clickPoint: Point(x: 10, y: 10)),
            "do_not_trust_obscured_attempt_with_click_point"
        )
    }

    private static func rejectsMissingSemanticItemInsteadOfOpeningNearbySystemItem() throws {
        let hint = hintFixture(
            title: "AirDrop",
            category: "system:airdrop",
            source: "extras",
            frame: Frame(x: 1103, y: 5.5, width: 17.5, height: 22),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )
        let nowPlaying = itemFixture(
            title: "Now Playing",
            category: "system:now-playing",
            source: "extras",
            frame: Frame(x: 1104, y: 5.5, width: 16.5, height: 22),
            bundleId: "com.apple.controlcenter",
            processName: "Control Center"
        )

        let resolved = resolveHintMatch([
            match("nowPlaying", item: nowPlaying, hint: hint)
        ], hint: hint)

        try assert(resolved == nil, "missing_semantic_rejected")
    }

    private static func rejectsMissingTitledItemInsteadOfOpeningNearbySameOwnerItem() throws {
        let hint = hintFixture(
            title: "VPN",
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 500, y: 0, width: 24, height: 24)
        )
        let other = itemFixture(
            title: "Sync",
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 504, y: 0, width: 24, height: 24)
        )

        let resolved = resolveHintMatch([
            match("other", item: other, hint: hint)
        ], hint: hint)

        try assert(resolved == nil, "missing_titled_rejected")
    }

    private static func rejectsGenericInputCategoryWithoutTitleAsIdentity() throws {
        let hint = hintFixture(
            title: nil,
            category: "input:generic",
            source: "extras",
            frame: Frame(x: 500, y: 0, width: 24, height: 24),
            bundleId: "com.apple.TextInputMenuAgent",
            processName: "TextInputMenuAgent"
        )
        let otherInput = itemFixture(
            title: nil,
            category: "input:generic",
            source: "extras",
            frame: Frame(x: 504, y: 0, width: 24, height: 24),
            bundleId: "com.apple.TextInputMenuAgent",
            processName: "TextInputMenuAgent"
        )

        let resolved = resolveHintMatch([
            match("otherInput", item: otherInput, hint: hint)
        ], hint: hint)

        try assert(resolved == nil, "generic_input_without_title_rejected")
    }

    private static func resolvesGenericSameOwnerItemWhenFrameIsClear() throws {
        let hint = hintFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 500, y: 0, width: 24, height: 24)
        )
        let target = itemFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 504, y: 0, width: 24, height: 24)
        )
        let other = itemFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 620, y: 0, width: 24, height: 24)
        )

        let resolved = resolveHintMatch([
            match("target", item: target, hint: hint),
            match("other", item: other, hint: hint)
        ], hint: hint)

        try assert(resolved?.element == "target", "generic_clear_frame")
    }

    private static func rejectsAmbiguousGenericSameOwnerItems() throws {
        let hint = hintFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 500, y: 0, width: 24, height: 24)
        )
        let first = itemFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 496, y: 0, width: 24, height: 24)
        )
        let second = itemFixture(
            title: nil,
            category: "app:generic",
            source: "extras",
            frame: Frame(x: 504, y: 0, width: 24, height: 24)
        )

        let resolved = resolveHintMatch([
            match("first", item: first, hint: hint),
            match("second", item: second, hint: hint)
        ], hint: hint)

        try assert(resolved == nil, "ambiguous_generic_same_owner")
    }

    private static func match(
        _ element: String,
        item: MenuBarItem,
        hint: ElementHint
    ) -> HintMatch<String> {
        HintMatch(
            element: element,
            item: item,
            score: hintMatchScore(item: item, source: item.source, hint: hint),
            frameDistance: hintFrameDistance(item: item, hint: hint)
        )
    }

    private static func hintFixture(
        title: String?,
        category: String,
        source: String,
        frame: Frame,
        bundleId: String = "com.example.status",
        processName: String = "Example Status"
    ) -> ElementHint {
        ElementHint(
            ownerPid: 100,
            bundleId: bundleId,
            processName: processName,
            title: title,
            category: category,
            source: source,
            frame: frame
        )
    }

    private static func itemFixture(
        title: String?,
        category: String,
        source: String,
        frame: Frame,
        bundleId: String = "com.example.status",
        processName: String = "Example Status"
    ) -> MenuBarItem {
        MenuBarItem(
            id: "\(bundleId)|\(source)|\(title ?? "-")|\(frameIDComponent(frame))",
            title: title,
            category: category,
            openStrategy: "click",
            isObscured: false,
            ownerPid: 100,
            bundleId: bundleId,
            processName: processName,
            appPath: nil,
            iconPath: nil,
            frame: frame,
            actions: [],
            source: source
        )
    }

    private static func assert(_ condition: Bool, _ name: String) throws {
        guard condition else {
            throw HelperError(
                code: "selftest_failed",
                message: "Self-test failed: \(name)",
                recoverySuggestion: nil
            )
        }
    }
}

func findElement(id: String, hint: ElementHint? = nil) -> (element: AXUIElement, item: MenuBarItem)? {
    var apps = NSWorkspace.shared.runningApplications
        .filter { $0.processIdentifier > 0 }

    if let hint {
        apps.sort { left, right in
            let leftPriority = appHintPriority(left, hint: hint)
            let rightPriority = appHintPriority(right, hint: hint)
            if leftPriority != rightPriority {
                return leftPriority > rightPriority
            }
            return appSortKey(left) < appSortKey(right)
        }
    } else {
        apps.sort { appSortKey($0) < appSortKey($1) }
    }

    var hintMatches: [HintMatch<AXUIElement>] = []

    for app in apps {
        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        for source in menuBarSources(for: appElement, app: app) {
            for (index, element) in menuBarItems(in: source.element).enumerated() where isLikelyMenuBarItem(element) {
                let snapshot = menuBarElementSnapshot(element)
                let item = makeMenuBarItem(element: element, app: app, source: source.name, sourceIndex: index, snapshot: snapshot)
                guard !shouldFilterMenuBarItem(app: app, item: item, snapshot: snapshot) else { continue }
                let hintScore = hint.map { hintMatchScore(item: item, source: source.name, hint: $0) } ?? 0
                if item.id == id {
                    if let hint {
                        if isAcceptableHintMatch(item: item, score: hintScore, hint: hint) {
                            return (element, item)
                        }
                    } else {
                        return (element, item)
                    }
                }

                if let hint {
                    if isSameOwner(item: item, hint: hint) {
                        hintMatches.append(HintMatch(
                            element: element,
                            item: item,
                            score: hintScore,
                            frameDistance: hintFrameDistance(item: item, hint: hint)
                        ))
                    }
                }
            }
        }
    }

    if let hint, let resolved = resolveHintMatch(hintMatches, hint: hint) {
        return (resolved.element, resolved.item)
    }

    return nil
}

func activateOwnerApp(_ item: MenuBarItem) -> Bool {
    guard let app = NSRunningApplication(processIdentifier: item.ownerPid) else {
        return false
    }

    return app.activate()
}

func menuBarSources(for appElement: AXUIElement, app: NSRunningApplication) -> [(name: String, element: AXUIElement)] {
    var sources: [(name: String, element: AXUIElement)] = []

    if let extrasMenuBar: AXUIElement = attribute(appElement, kAXExtrasMenuBarAttribute) {
        sources.append(("extras", extrasMenuBar))
    }

    if shouldScanStandardMenuBar(app) {
        if let menuBar: AXUIElement = attribute(appElement, kAXMenuBarAttribute) {
            sources.append(("menuBar", menuBar))
        }
    }

    return sources
}

func menuBarItems(in element: AXUIElement) -> [AXUIElement] {
    var found: [AXUIElement] = []
    var queue: [AXUIElement] = children(of: element)

    while !queue.isEmpty {
        let current = queue.removeFirst()
        if isLikelyMenuBarItem(current) {
            found.append(current)
            continue
        }
        queue.append(contentsOf: children(of: current))
    }

    return found
}

func menuBarElementSnapshot(_ element: AXUIElement) -> MenuBarElementSnapshot {
    let itemFrame = frame(of: element)
    let itemCenter = itemFrame.map { centerPoint(of: $0) }
    let hasScreenPosition = itemCenter.map { screenContainingAccessibilityPoint($0) != nil } ?? false
    let itemIsObscured = isElementObscured(frame: itemFrame, center: itemCenter)

    return MenuBarElementSnapshot(
        labels: menuBarItemLabelCandidates(element),
        frame: itemFrame,
        center: itemCenter,
        actions: actions(of: element),
        hasScreenPosition: hasScreenPosition,
        isObscured: itemIsObscured
    )
}

func makeMenuBarItem(
    element: AXUIElement,
    app: NSRunningApplication,
    source: String,
    sourceIndex: Int,
    snapshot: MenuBarElementSnapshot
) -> MenuBarItem {
    let labels = snapshot.labels
    let category = SemanticCategory.classify(labels: labels, app: app)
    let title = menuBarItemTitle(labels: labels, app: app, category: category)
    let frame = snapshot.frame
    let appPath = app.bundleURL?.path ?? app.executableURL?.path
    let id = stableID(
        app: app,
        source: source,
        sourceIndex: sourceIndex,
        title: title,
        frame: frame
    )

    return MenuBarItem(
        id: id,
        title: title,
        category: category,
        openStrategy: menuOpenStrategy(category: category, center: snapshot.center, isObscured: snapshot.isObscured),
        isObscured: snapshot.isObscured,
        ownerPid: app.processIdentifier,
        bundleId: app.bundleIdentifier,
        processName: app.localizedName,
        appPath: appPath,
        iconPath: appPath == nil ? iconPath(for: app) : nil,
        frame: frame,
        actions: snapshot.actions,
        source: source
    )
}

func shouldScanStandardMenuBar(_ app: NSRunningApplication) -> Bool {
    let bundleIdentifier = app.bundleIdentifier ?? ""
    let processName = app.localizedName ?? ""
    let paths = [app.bundleURL?.path, app.executableURL?.path].compactMap { $0 }

    if bundleIdentifier == "com.apple.controlcenter" || bundleIdentifier == "com.apple.systemuiserver" {
        return true
    }

    if processName == "TextInputMenuAgent" || processName == "SystemUIServer" || processName == "Control Center" {
        return true
    }

    return paths.contains { path in
        path.contains("/ControlCenter.app/") ||
            path.contains("/TextInputMenuAgent") ||
            path.contains("/SystemUIServer")
    }
}

func shouldFilterMenuBarItem(app: NSRunningApplication, item: MenuBarItem, snapshot: MenuBarElementSnapshot) -> Bool {
    guard isCatalogMenuBarItem(snapshot) else {
        return true
    }

    guard isControlCenterApp(app) else {
        return false
    }

    return item.category == "system:control-center"
}

func isCatalogMenuBarItem(_ snapshot: MenuBarElementSnapshot) -> Bool {
    shouldIncludeMenuBarItemInCatalog(hasScreenPosition: snapshot.hasScreenPosition)
}

func shouldIncludeMenuBarItemInCatalog(hasScreenPosition: Bool) -> Bool {
    hasScreenPosition
}

func menuBarItemTitle(labels: [String?], app: NSRunningApplication, category: String) -> String? {
    if let semanticTitle = SemanticCategory.title(for: category) {
        return semanticTitle
    }

    return labels
        .compactMap { normalizedText($0) }
        .first { !isGenericOwnerTitle($0, app: app) }
}

func menuBarItemLabelCandidates(_ element: AXUIElement) -> [String?] {
    [
        attribute(element, kAXTitleAttribute),
        attribute(element, kAXDescriptionAttribute),
        attribute(element, kAXHelpAttribute),
        attribute(element, kAXValueAttribute),
        attribute(element, "AXIdentifier"),
        attribute(element, "AXLabel"),
        attribute(element, "AXValueDescription"),
        attribute(element, kAXRoleDescriptionAttribute),
        attribute(element, kAXSubroleAttribute)
    ]
}

func isGenericOwnerTitle(_ title: String, app: NSRunningApplication) -> Bool {
    let lowercased = title.lowercased()
    let owner = (app.localizedName ?? "").lowercased()

    if !owner.isEmpty && lowercased == owner {
        return true
    }

    return lowercased == "control center" ||
        lowercased == "control centre" ||
        title == "控制中心" ||
        lowercased == "menu extra" ||
        lowercased == "menu bar item"
}

func isControlCenterApp(_ app: NSRunningApplication) -> Bool {
    if app.bundleIdentifier == "com.apple.controlcenter" {
        return true
    }

    if app.localizedName == "Control Center" {
        return true
    }

    let paths = [app.bundleURL?.path, app.executableURL?.path].compactMap { $0 }
    return paths.contains { $0.contains("/ControlCenter.app/") }
}

enum SemanticCategory {
    static func classify(labels: [String?], app: NSRunningApplication) -> String {
        let labelText = labelSearchText(labels)

        if labelText == "abc" || labelText.contains(" abc ") {
            return "input:abc"
        }

        if isInputMenuOwner(app) ||
            labelText.contains("input") ||
            labelText.contains("keyboard") ||
            labelText.contains("textinput") ||
            labelText.contains("输入") ||
            labelText.contains("拼音") ||
            labelText.contains("五笔")
        {
            return "input:generic"
        }

        if labelText.contains("airdrop") {
            return "system:airdrop"
        }

        if labelText.contains("bluetooth") {
            return "system:bluetooth"
        }

        if labelText.contains("wi-fi") || labelText.contains("wifi") || labelText.contains("airport") {
            return "system:wifi"
        }

        if labelText.contains("volume") || labelText.contains("sound") || labelText.contains("audio") {
            return "system:sound"
        }

        if labelText.contains("battery") || labelText.contains("power") {
            return "system:battery"
        }

        if labelText.contains("clock") {
            return "system:clock"
        }

        if labelText.contains("focus") || labelText.contains("do not disturb") || labelText.contains("dnd") {
            return "system:focus"
        }

        if labelText.contains("screen mirroring") || labelText.contains("screenmirroring") || labelText.contains("display") {
            return "system:screen-mirroring"
        }

        if labelText.contains("now playing") || labelText.contains("nowplaying") {
            return "system:now-playing"
        }

        if labelText.contains("stage manager") || labelText.contains("stagemanager") {
            return "system:stage-manager"
        }

        if labelText.contains("spotlight") {
            return "system:spotlight"
        }

        if labelText.contains("siri") {
            return "system:siri"
        }

        if labelText.contains("vpn") {
            return "system:vpn"
        }

        if labelText.contains("accessibility") {
            return "system:accessibility"
        }

        if labelText.contains("control center") || labelText.contains("control centre") || labelText.contains("控制中心") {
            return "system:control-center"
        }

        return "app:generic"
    }

    static func title(for category: String) -> String? {
        switch category {
        case "input:abc":
            return "ABC"
        case "input:generic":
            return nil
        case "system:airdrop":
            return "AirDrop"
        case "system:bluetooth":
            return "Bluetooth"
        case "system:wifi":
            return "Wi-Fi"
        case "system:sound":
            return "Sound"
        case "system:battery":
            return "Battery"
        case "system:clock":
            return "Clock"
        case "system:focus":
            return "Focus"
        case "system:screen-mirroring":
            return "Screen Mirroring"
        case "system:now-playing":
            return "Now Playing"
        case "system:stage-manager":
            return "Stage Manager"
        case "system:spotlight":
            return "Spotlight"
        case "system:siri":
            return "Siri"
        case "system:vpn":
            return "VPN"
        case "system:accessibility":
            return "Accessibility Shortcuts"
        case "system:control-center":
            return "Control Center"
        default:
            return nil
        }
    }
}

func labelSearchText(_ labels: [String?]) -> String {
    labels
        .compactMap { normalizedText($0)?.lowercased() }
        .joined(separator: " ")
}

func isInputMenuOwner(_ app: NSRunningApplication) -> Bool {
    app.localizedName == "TextInputMenuAgent" ||
        app.bundleIdentifier?.contains("TextInput") == true ||
        app.bundleURL?.path.contains("/TextInputMenuAgent") == true ||
        app.executableURL?.path.contains("/TextInputMenuAgent") == true
}

func menuBarItemFingerprint(_ item: MenuBarItem) -> String {
    let owner = item.bundleId ?? item.processName ?? "pid-\(item.ownerPid)"
    let title = normalizedIDComponent(item.title)
    let frame = item.frame.map(frameIDComponent) ?? "no-frame"
    return "\(item.ownerPid)|\(owner)|\(title)|\(frame)"
}

func isLikelyMenuBarItem(_ element: AXUIElement) -> Bool {
    guard let frame = frame(of: element), frame.width > 0, frame.height > 0 else {
        return false
    }

    guard let role: String = attribute(element, kAXRoleAttribute) else {
        return false
    }

    if role == (kAXMenuBarItemRole as String) || role == (kAXButtonRole as String) {
        return true
    }

    return false
}

func stableID(app: NSRunningApplication, source: String, sourceIndex: Int, title: String?, frame: Frame?) -> String {
    let owner = app.bundleIdentifier ?? app.localizedName ?? "pid-\(app.processIdentifier)"
    let titleKey = normalizedIDComponent(title)
    let frameKey = frame.map(frameIDComponent) ?? "no-frame"
    let raw = "v2|\(app.processIdentifier)|\(owner)|\(source)|\(titleKey)|\(frameKey)"
    return raw
        .data(using: .utf8)?
        .base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
        ?? raw
}

func normalizedIDComponent(_ value: String?) -> String {
    guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
        return "-"
    }

    return value.replacingOccurrences(of: "|", with: "/")
}

func frameIDComponent(_ frame: Frame) -> String {
    [
        frame.x,
        frame.y,
        frame.width,
        frame.height
    ]
        .map { String(Int(($0 * 2).rounded())) }
        .joined(separator: ",")
}

func parseElementHint(_ rawHint: String?) -> ElementHint? {
    guard
        let rawHint,
        let data = rawHint.data(using: .utf8)
    else {
        return nil
    }

    return try? JSONDecoder().decode(ElementHint.self, from: data)
}

func hintMatchScore(item: MenuBarItem, source: String, hint: ElementHint) -> Int {
    var score = 0

    if let ownerPid = hint.ownerPid, item.ownerPid == ownerPid {
        score += 25
    }

    if let bundleId = hint.bundleId, !bundleId.isEmpty, item.bundleId == bundleId {
        score += 35
    }

    if let processName = normalizedText(hint.processName), normalizedText(item.processName) == processName {
        score += 20
    }

    if let category = hint.category, !category.isEmpty, item.category == category {
        score += 40
    }

    if let expectedSource = hint.source, source == expectedSource {
        score += 5
    }

    if
        let expectedTitle = hint.title?.trimmingCharacters(in: .whitespacesAndNewlines),
        !expectedTitle.isEmpty,
        item.title?.trimmingCharacters(in: .whitespacesAndNewlines) == expectedTitle
    {
        score += 40
    }

    if let expectedFrame = hint.frame, let itemFrame = item.frame {
        let centerDistance = hypot(
            (expectedFrame.x + expectedFrame.width / 2) - (itemFrame.x + itemFrame.width / 2),
            (expectedFrame.y + expectedFrame.height / 2) - (itemFrame.y + itemFrame.height / 2)
        )
        let sizeDistance = abs(expectedFrame.width - itemFrame.width) + abs(expectedFrame.height - itemFrame.height)

        if centerDistance <= 4 && sizeDistance <= 4 {
            score += 15
        } else if centerDistance <= 16 && sizeDistance <= 10 {
            score += 8
        }
    }

    return score
}

func isAcceptableHintMatch(item: MenuBarItem, score: Int, hint: ElementHint) -> Bool {
    guard isSameOwner(item: item, hint: hint) else {
        return false
    }

    if requiresStableIdentity(hint) {
        return hasStableIdentityMatch(item: item, hint: hint)
    }

    return hasStableIdentityMatch(item: item, hint: hint) || score >= 70
}

func isSameOwner(item: MenuBarItem, hint: ElementHint) -> Bool {
    if let ownerPid = hint.ownerPid, item.ownerPid == ownerPid {
        return true
    }

    if let bundleId = hint.bundleId, !bundleId.isEmpty, item.bundleId == bundleId {
        return true
    }

    if let processName = normalizedText(hint.processName), normalizedText(item.processName) == processName {
        return true
    }

    return hint.ownerPid == nil && (hint.bundleId?.isEmpty ?? true) && normalizedText(hint.processName) == nil
}

func resolveHintMatch<Element>(
    _ candidates: [HintMatch<Element>],
    hint: ElementHint
) -> (element: Element, item: MenuBarItem)? {
    guard !candidates.isEmpty else {
        return nil
    }

    let identityCandidates = candidates.filter { candidate in
        hasStableIdentityMatch(item: candidate.item, hint: hint)
    }

    if identityCandidates.isEmpty && requiresStableIdentity(hint) {
        return nil
    }

    let sourceCandidates = candidates.filter { candidate in
        guard let source = hint.source else { return true }
        return candidate.item.source == source
    }

    let scopedCandidates: [HintMatch<Element>]
    if !identityCandidates.isEmpty {
        scopedCandidates = identityCandidates
    } else if !sourceCandidates.isEmpty {
        scopedCandidates = sourceCandidates
    } else {
        scopedCandidates = candidates
    }

    if scopedCandidates.count == 1 {
        return (scopedCandidates[0].element, scopedCandidates[0].item)
    }

    let sorted = scopedCandidates.sorted { left, right in
        if left.score != right.score {
            return left.score > right.score
        }
        return left.frameDistance < right.frameDistance
    }

    guard let best = sorted.first else {
        return nil
    }

    if identityCandidates.isEmpty && isAmbiguousGenericHint(hint) {
        let challengers = sorted.dropFirst()
        if challengers.allSatisfy({ best.frameDistance + 24 < $0.frameDistance }) {
            return (best.element, best.item)
        }

        return nil
    }

    if best.score >= 70 {
        return (best.element, best.item)
    }

    if
        best.score >= 60,
        sorted.dropFirst().allSatisfy({ best.score - $0.score >= 15 || best.frameDistance + 24 < $0.frameDistance })
    {
        return (best.element, best.item)
    }

    return nil
}

func isAmbiguousGenericHint(_ hint: ElementHint) -> Bool {
    let category = hint.category ?? "app:generic"
    let hasSpecificCategory = category.hasPrefix("system:") || category.hasPrefix("input:")
    let hasTitle = normalizedText(hint.title) != nil

    return !hasSpecificCategory && !hasTitle
}

func requiresStableIdentity(_ hint: ElementHint) -> Bool {
    let category = hint.category ?? "app:generic"
    return category.hasPrefix("system:") ||
        category.hasPrefix("input:") ||
        normalizedText(hint.title) != nil
}

func hasStableIdentityMatch(item: MenuBarItem, hint: ElementHint) -> Bool {
    guard isSameOwner(item: item, hint: hint) else {
        return false
    }

    let categoryMatches = hint.category.map { !$0.isEmpty && item.category == $0 } ?? false
    let titleMatches = normalizedText(hint.title).map { normalizedText(item.title) == $0 } ?? false

    if categoryMatches && titleMatches {
        return true
    }

    if let category = hint.category, category.hasPrefix("system:"), category != "system:unknown", categoryMatches {
        return true
    }

    if let category = hint.category, category == "input:abc", categoryMatches {
        return true
    }

    return titleMatches && !(hint.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
}

func appHintPriority(_ app: NSRunningApplication, hint: ElementHint) -> Int {
    if let ownerPid = hint.ownerPid, app.processIdentifier == ownerPid {
        return 3
    }

    if let bundleId = hint.bundleId, !bundleId.isEmpty, app.bundleIdentifier == bundleId {
        return 2
    }

    if let processName = normalizedText(hint.processName), normalizedText(app.localizedName) == processName {
        return 1
    }

    return 0
}

func isLikelyOwner(_ app: NSRunningApplication, hint: ElementHint) -> Bool {
    appHintPriority(app, hint: hint) > 0
}

func hintFrameDistance(item: MenuBarItem, hint: ElementHint) -> Double {
    guard let expectedFrame = hint.frame, let itemFrame = item.frame else {
        return Double.greatestFiniteMagnitude
    }

    return hypot(
        (expectedFrame.x + expectedFrame.width / 2) - (itemFrame.x + itemFrame.width / 2),
        (expectedFrame.y + expectedFrame.height / 2) - (itemFrame.y + itemFrame.height / 2)
    )
}

func normalizedText(_ value: String?) -> String? {
    guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
        return nil
    }

    return value
}

func iconPath(for app: NSRunningApplication) -> String? {
    guard let key = iconCacheKey(bundleIdentifier: app.bundleIdentifier) else {
        return nil
    }
    let fileURL = iconCacheDirectoryURL().appendingPathComponent("\(key).png")

    if FileManager.default.fileExists(atPath: fileURL.path) {
        return fileURL.path
    }

    do {
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    } catch {
        return nil
    }

    guard let icon = app.icon else {
        return nil
    }

    icon.size = NSSize(width: 256, height: 256)

    guard
        let tiff = icon.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let png = bitmap.representation(using: .png, properties: [:])
    else {
        return nil
    }

    do {
        try png.write(to: fileURL, options: .atomic)
        return fileURL.path
    } catch {
        return nil
    }
}

func iconCacheKey(bundleIdentifier: String?) -> String? {
    guard let bundleIdentifier, !bundleIdentifier.isEmpty else {
        return nil
    }

    // FNV-1a is stable across processes, unlike Swift's randomized hashValue.
    var hash: UInt64 = 14_695_981_039_346_656_037
    for byte in bundleIdentifier.utf8 {
        hash ^= UInt64(byte)
        hash &*= 1_099_511_628_211
    }
    return "\(sanitizedIconCacheKey(bundleIdentifier))-\(String(hash, radix: 16))"
}

func iconCacheDirectoryURL() -> URL {
    let baseURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first ??
        URL(fileURLWithPath: NSTemporaryDirectory())

    return baseURL.appendingPathComponent("menubarctl-icons", isDirectory: true)
}

func sanitizedIconCacheKey(_ key: String) -> String {
    let sanitized = key
        .map { character in
            character.isLetter || character.isNumber ? character : "-"
        }
        .reduce(into: "") { $0.append($1) }

    return sanitized.isEmpty ? "unknown" : sanitized
}

func frame(of element: AXUIElement) -> Frame? {
    guard
        let positionValue: AXValue = attribute(element, kAXPositionAttribute),
        let sizeValue: AXValue = attribute(element, kAXSizeAttribute)
    else {
        return nil
    }

    var point = CGPoint.zero
    var size = CGSize.zero

    guard AXValueGetValue(positionValue, .cgPoint, &point), AXValueGetValue(sizeValue, .cgSize, &size) else {
        return nil
    }

    return Frame(x: point.x, y: point.y, width: size.width, height: size.height)
}

func centerPoint(of element: AXUIElement) -> CGPoint? {
    guard let frame = frame(of: element) else {
        return nil
    }

    return centerPoint(of: frame)
}

func centerPoint(of frame: Frame) -> CGPoint {
    CGPoint(x: frame.x + frame.width / 2, y: frame.y + frame.height / 2)
}

func actions(of element: AXUIElement) -> [String] {
    var value: CFArray?
    guard AXUIElementCopyActionNames(element, &value) == .success else {
        return []
    }

    return (value as? [String]) ?? []
}

func children(of element: AXUIElement) -> [AXUIElement] {
    attribute(element, kAXChildrenAttribute) ?? []
}

func attribute<T>(_ element: AXUIElement, _ name: String) -> T? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else {
        return nil
    }

    return value as? T
}

func firstNonEmpty(_ values: [String?]) -> String? {
    values
        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        .first { !$0.isEmpty }
}

func appSortKey(_ app: NSRunningApplication) -> String {
    "\(app.bundleIdentifier ?? "")|\(app.localizedName ?? "")|\(app.processIdentifier)"
}

func lastOpenTraceURL() -> URL {
    URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("menubarctl-last-open-trace.json")
}

func writeLastOpenTrace(_ trace: OpenTrace) {
    guard let data = try? encoder.encode(trace) else {
        return
    }

    try? data.write(to: lastOpenTraceURL())
}

func readLastOpenTrace() throws -> OpenTrace {
    do {
        let data = try Data(contentsOf: lastOpenTraceURL())
        return try JSONDecoder().decode(OpenTrace.self, from: data)
    } catch {
        throw HelperError(
            code: "last_open_trace_missing",
            message: "No open trace has been recorded yet",
            recoverySuggestion: "Try opening a menu bar item, then copy the trace again."
        )
    }
}

func printJSON<T: Encodable>(_ value: T) throws {
    let data = try encoder.encode(value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

func printError(_ error: HelperError) {
    if let data = try? encoder.encode(error) {
        FileHandle.standardError.write(data)
        FileHandle.standardError.write(Data("\n".utf8))
    } else {
        FileHandle.standardError.write(Data(error.message.utf8))
        FileHandle.standardError.write(Data("\n".utf8))
    }
}
