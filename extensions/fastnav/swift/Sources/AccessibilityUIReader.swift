// Store-contained copy of Sources/FastNav/AccessibilityUIReader.swift.
// Keep both copies in sync when changing accessibility behavior.
import AppKit
import ApplicationServices
import Foundation

final class AccessibilityUIReader: @unchecked Sendable {
    private struct ElementIdentity: Hashable {
        let element: AXUIElement

        func hash(into hasher: inout Hasher) {
            hasher.combine(CFHash(element))
        }

        static func == (lhs: ElementIdentity, rhs: ElementIdentity) -> Bool {
            CFEqual(lhs.element, rhs.element)
        }
    }

    private struct ActionTarget {
        let element: AXUIElement
        let action: String
        let role: String
        let hasOwnLabel: Bool
        let isWebBacked: Bool
    }

    private struct Node {
        let element: AXUIElement
        let context: [String]
        let nearestAction: ActionTarget?
        let depth: Int
        let isWebBacked: Bool
    }

    private struct Candidate {
        let element: AXUIElement
        let action: String
        let role: String
        let title: String
        let context: [String]
        let isEnabled: Bool
        let order: Int
        let isWebBacked: Bool
        let accessibilityLocator: String?
    }

    private let maximumNodes = 900
    private let maximumDepth = 18
    private let maximumDuration: TimeInterval = 0.45

    func commands(
        for application: NSRunningApplication,
        diagnostics: Bool = false
    ) throws -> [MenuCommand] {
        let firstPass = try scanCommands(for: application, diagnostics: diagnostics)

        // Web-based apps can briefly publish an incomplete AX tree while focus moves
        // to FastNav. Keep actions seen in either close snapshot, but identify an
        // element by its process-scoped AX locator so a title update cannot create
        // a stale duplicate.
        Thread.sleep(forTimeInterval: 0.04)
        let secondPass = try scanCommands(for: application, diagnostics: diagnostics)
        var merged: [MenuCommand] = []
        var identities = Set<String>()
        var accessibilityLocators = Set<String>()
        for command in secondPass + firstPass {
            let identity = commandIdentity(command)
            guard identities.insert(identity).inserted else { continue }
            if let accessibilityLocator = command.accessibilityLocator,
               !accessibilityLocators.insert(accessibilityLocator).inserted {
                continue
            }
            merged.append(command)
        }
        return merged
    }

    private func scanCommands(
        for application: NSRunningApplication,
        diagnostics: Bool
    ) throws -> [MenuCommand] {
        guard AXIsProcessTrusted() else { throw AccessibilityMenuError.permissionRequired }

        let applicationElement = AXUIElementCreateApplication(application.processIdentifier)
        AXUIElementSetMessagingTimeout(applicationElement, 0.2)
        guard let window = elementAttribute(applicationElement, kAXFocusedWindowAttribute)
            ?? elementArrayAttribute(applicationElement, kAXWindowsAttribute).first else {
            return []
        }

        let appName = application.localizedName ?? "Application"
        var queue = [
            Node(
                element: window,
                context: [],
                nearestAction: nil,
                depth: 0,
                isWebBacked: false
            )
        ]
        var queueIndex = 0
        var visited = Set<ElementIdentity>()
        var candidateTargets = Set<ElementIdentity>()
        var candidates: [Candidate] = []
        let startedAt = Date()

        while queueIndex < queue.count,
              visited.count < maximumNodes,
              Date().timeIntervalSince(startedAt) < maximumDuration {
            let node = queue[queueIndex]
            queueIndex += 1

            let elementIdentity = ElementIdentity(element: node.element)
            guard visited.insert(elementIdentity).inserted else { continue }
            guard boolAttribute(node.element, kAXHiddenAttribute) != true else { continue }

            let role = stringAttribute(node.element, kAXRoleAttribute) ?? ""
            guard !excludedRoles.contains(role) else { continue }
            let isWebBacked = node.isWebBacked || role == "AXWebArea"

            let label = bestLabel(for: node.element, role: role)
            let action = preferredAction(for: node.element, role: role, hasLabel: label != nil)
            let ownAction = action.map {
                ActionTarget(
                    element: node.element,
                    action: $0,
                    role: role,
                    hasOwnLabel: label != nil,
                    isWebBacked: isWebBacked
                )
            }

            if let label, let ownAction {
                appendCandidate(
                    label: label,
                    target: ownAction,
                    context: node.context,
                    targets: &candidateTargets,
                    candidates: &candidates
                )
            } else if let label,
                      let ancestor = node.nearestAction,
                      !ancestor.hasOwnLabel,
                      labelProvidingRoles.contains(role) {
                appendCandidate(
                    label: label,
                    target: ancestor,
                    context: node.context,
                    targets: &candidateTargets,
                    candidates: &candidates
                )
            }

            guard node.depth < maximumDepth else { continue }
            let context = childContext(current: node.context, role: role, label: label)
            let nearestAction = ownAction ?? node.nearestAction
            var children = mergedChildren(of: node.element)
            if role == "AXWebArea" {
                children = uniqueElements(children + searchableWebDescendants(of: node.element))
            }

            if diagnostics, visited.count <= 80 {
                let frameDescription = elementFrame(node.element).map {
                    String(
                        format: "%.0f,%.0f %.0fx%.0f",
                        $0.origin.x,
                        $0.origin.y,
                        $0.width,
                        $0.height
                    )
                } ?? "–"
                print(
                    "  [\(visited.count)] role=\(role) label=\(label ?? "–") " +
                    "action=\(action ?? "–") frame=\(frameDescription) children=\(children.count)"
                )
            }

            for child in children {
                queue.append(
                    Node(
                        element: child,
                        context: context,
                        nearestAction: nearestAction,
                        depth: node.depth + 1,
                        isWebBacked: isWebBacked
                    )
                )
            }
        }

        if diagnostics {
            let elapsed = Date().timeIntervalSince(startedAt)
            print(
                "UI scan: visited=\(visited.count) queued=\(queue.count) " +
                "candidates=\(candidates.count) elapsed=\(String(format: "%.3f", elapsed))s"
            )
        }

        return candidates.map { candidate in
            let context = candidate.context.filter { $0 != candidate.title }
            return MenuCommand(
                pid: application.processIdentifier,
                appName: appName,
                bundleIdentifier: application.bundleIdentifier,
                title: candidate.title,
                menuPath: ["Interface"] + context,
                shortcut: nil,
                isEnabled: candidate.isEnabled,
                element: candidate.element,
                order: 10_000 + candidate.order,
                source: .interface(role: candidate.role),
                action: candidate.action,
                isWebBacked: candidate.isWebBacked,
                accessibilityLocator: candidate.accessibilityLocator.map {
                    "\(application.processIdentifier)|\($0)"
                }
            )
        }
    }

    func resolveAndPerform(_ command: MenuCommand, in application: NSRunningApplication) throws {
        let refreshedCommands = try commands(for: application)
        guard let refreshed = refreshedCommands.first(where: { $0.hasSameIdentity(as: command) }) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(command.title)
        }
        guard refreshed.isEnabled else {
            throw AccessibilityMenuError.commandDisabled(refreshed.title)
        }

        if refreshed.action == kAXPressAction,
           refreshed.isWebBacked {
            try performValidatedClick(
                on: refreshed.element,
                titled: refreshed.title,
                in: application
            )
            return
        }

        let result = AXUIElementPerformAction(refreshed.element, refreshed.action as CFString)
        if result == .cannotComplete { return }
        guard result == .success else { throw AccessibilityMenuError.actionFailed(result) }
    }

    private func performValidatedClick(
        on element: AXUIElement,
        titled title: String,
        in application: NSRunningApplication
    ) throws {
        let point = try waitForValidatedClickPoint(
            on: element,
            titled: title,
            in: application
        )
        let source = CGEventSource(stateID: .hidSystemState)
        guard let mouseDown = CGEvent(
            mouseEventSource: source,
            mouseType: .leftMouseDown,
            mouseCursorPosition: point,
            mouseButton: .left
        ) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }

        // Create the release event before posting mouse-down so cleanup cannot
        // be blocked by event allocation after the button is held.
        guard let mouseUp = CGEvent(
            mouseEventSource: source,
            mouseType: .leftMouseUp,
            mouseCursorPosition: point,
            mouseButton: .left
        ) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }

        var releasePoint = point
        var mouseDownPosted = false
        var mouseUpPosted = false
        defer {
            if mouseDownPosted && !mouseUpPosted {
                mouseUp.location = releasePoint
                CGWarpMouseCursorPosition(releasePoint)
                mouseUp.post(tap: .cghidEventTap)
            }
        }

        mouseDown.setIntegerValueField(.mouseEventClickState, value: 1)
        mouseUp.setIntegerValueField(.mouseEventClickState, value: 1)
        let mouseDownCounter = CGEventSource.counterForEventType(
            .hidSystemState,
            eventType: .leftMouseDown
        )
        CGWarpMouseCursorPosition(point)
        mouseDown.post(tap: .cghidEventTap)
        mouseDownPosted = true
        guard waitForEventDelivery(.leftMouseDown, after: mouseDownCounter) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }

        releasePoint = try validatedClickPoint(
            on: element,
            titled: title,
            in: application
        )

        let mouseUpCounter = CGEventSource.counterForEventType(
            .hidSystemState,
            eventType: .leftMouseUp
        )
        mouseUp.location = releasePoint
        CGWarpMouseCursorPosition(releasePoint)
        mouseUp.post(tap: .cghidEventTap)
        mouseUpPosted = true
        guard waitForEventDelivery(.leftMouseUp, after: mouseUpCounter) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }
    }

    private func validatedClickPoint(
        on element: AXUIElement,
        titled title: String,
        in application: NSRunningApplication
    ) throws -> CGPoint {
        let applicationElement = AXUIElementCreateApplication(application.processIdentifier)
        let systemWideElement = AXUIElementCreateSystemWide()
        guard isActive(application),
              boolAttribute(element, kAXHiddenAttribute) != true,
              boolAttribute(element, kAXEnabledAttribute) != false,
              let targetFrame = elementFrame(element),
              targetFrame.width >= 2,
              targetFrame.height >= 2,
              let targetWindow = elementAttribute(element, kAXWindowAttribute)
                ?? elementAttribute(applicationElement, kAXFocusedWindowAttribute),
              let focusedWindow = elementAttribute(applicationElement, kAXFocusedWindowAttribute),
              CFEqual(targetWindow, focusedWindow),
              let windowFrame = elementFrame(targetWindow),
              !windowFrame.isEmpty else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }

        let visibleFrame = targetFrame.intersection(windowFrame)
        guard !visibleFrame.isNull,
              visibleFrame.width >= 2,
              visibleFrame.height >= 2 else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }

        let point = visibleFrame.center
        var hitElement: AXUIElement?
        guard AXUIElementCopyElementAtPosition(
            systemWideElement,
            Float(point.x),
            Float(point.y),
            &hitElement
        ) == .success,
        let hitElement,
        isDescendant(hitElement, of: element),
        isActive(application) else {
            throw AccessibilityMenuError.interfaceElementUnavailable(title)
        }
        return point
    }

    private func waitForValidatedClickPoint(
        on element: AXUIElement,
        titled title: String,
        in application: NSRunningApplication
    ) throws -> CGPoint {
        let deadline = Date(timeIntervalSinceNow: 0.5)
        repeat {
            if let point = try? validatedClickPoint(
                on: element,
                titled: title,
                in: application
            ) {
                return point
            }
            guard isActive(application) else { break }
            _ = RunLoop.current.run(
                mode: .default,
                before: min(deadline, Date(timeIntervalSinceNow: 0.005))
            )
        } while Date() < deadline
        throw AccessibilityMenuError.interfaceElementUnavailable(title)
    }

    private func waitForEventDelivery(
        _ eventType: CGEventType,
        after previousCounter: UInt32
    ) -> Bool {
        let deadline = Date(timeIntervalSinceNow: 0.08)
        repeat {
            if CGEventSource.counterForEventType(
                .hidSystemState,
                eventType: eventType
            ) != previousCounter {
                return true
            }
            _ = RunLoop.current.run(
                mode: .default,
                before: min(deadline, Date(timeIntervalSinceNow: 0.002))
            )
        } while Date() < deadline
        return false
    }

    private func isActive(_ application: NSRunningApplication) -> Bool {
        application.isActive ||
            NSWorkspace.shared.frontmostApplication?.processIdentifier == application.processIdentifier
    }

    private func isDescendant(_ element: AXUIElement, of ancestor: AXUIElement) -> Bool {
        var current: AXUIElement? = element
        for _ in 0..<16 {
            guard let candidate = current else { return false }
            if CFEqual(candidate, ancestor) { return true }
            current = elementAttribute(candidate, kAXParentAttribute)
        }
        return false
    }

    private func appendCandidate(
        label: String,
        target: ActionTarget,
        context: [String],
        targets: inout Set<ElementIdentity>,
        candidates: inout [Candidate]
    ) {
        let targetIdentity = ElementIdentity(element: target.element)
        guard targets.insert(targetIdentity).inserted else { return }
        candidates.append(
            Candidate(
                element: target.element,
                action: target.action,
                role: target.role,
                title: label,
                context: Array(context.suffix(3)),
                isEnabled: boolAttribute(target.element, kAXEnabledAttribute) ?? true,
                order: candidates.count,
                isWebBacked: target.isWebBacked,
                accessibilityLocator: accessibilityLocator(for: target.element)
            )
        )
    }

    private func preferredAction(
        for element: AXUIElement,
        role: String,
        hasLabel: Bool
    ) -> String? {
        var names: CFArray?
        for attempt in 0..<2 {
            let result = AXUIElementCopyActionNames(element, &names)
            if result == .success { break }
            guard result == .cannotComplete, attempt == 0 else { return nil }
            Thread.sleep(forTimeInterval: 0.005)
        }
        let actions = names as? [String] ?? []
        if let primaryAction = [kAXPressAction, kAXConfirmAction, kAXPickAction]
            .first(where: actions.contains) {
            return primaryAction
        }

        let meaningfulMenuRoles: Set<String> = [kAXPopUpButtonRole, "AXMenuButton"]
        if actions.contains(kAXShowMenuAction),
           meaningfulMenuRoles.contains(role) || (role == kAXGroupRole && hasLabel) {
            return kAXShowMenuAction
        }
        return nil
    }

    private func commandIdentity(_ command: MenuCommand) -> String {
        return [
            command.bundleIdentifier ?? String(command.pid),
            command.source.storageKey,
            command.breadcrumb,
            command.title,
            command.action
        ].joined(separator: "|")
    }

    private func accessibilityLocator(for element: AXUIElement) -> String? {
        if let identifier = stringAttribute(element, kAXIdentifierAttribute),
           !identifier.isEmpty {
            return "AXIdentifier:\(identifier)"
        }
        if let domIdentifier = stringAttribute(element, "AXDOMIdentifier"),
           !domIdentifier.isEmpty {
            return "AXDOMIdentifier:\(domIdentifier)"
        }
        if let chromeNodeID = rawAttribute(element, "ChromeAXNodeId") as? NSNumber {
            return "ChromeAXNodeId:\(chromeNodeID.stringValue)"
        }
        if let frame = elementFrame(element),
           frame.width >= 2,
           frame.height >= 2 {
            return String(
                format: "AXFrame:%.0f,%.0f,%.0f,%.0f",
                frame.origin.x,
                frame.origin.y,
                frame.width,
                frame.height
            )
        }
        return nil
    }

    private func bestLabel(for element: AXUIElement, role: String) -> String? {
        let title = cleanedLabel(stringAttribute(element, kAXTitleAttribute))
        if let title, !isGenericLabel(title, role: role) { return title }

        let description = cleanedLabel(stringAttribute(element, kAXDescriptionAttribute))
        if let description, !isGenericLabel(description, role: role) { return description }

        if valueLabelRoles.contains(role),
           let value = cleanedLabel(stringAttribute(element, kAXValueAttribute)),
           !isGenericLabel(value, role: role) {
            return value
        }

        let help = cleanedLabel(stringAttribute(element, kAXHelpAttribute))
        if let help, !isGenericLabel(help, role: role) { return help }
        return nil
    }

    private func cleanedLabel(_ value: String?) -> String? {
        guard let value else { return nil }
        let cleaned = value
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        guard !cleaned.isEmpty, cleaned.count <= 180 else { return nil }
        return cleaned
    }

    private func isGenericLabel(_ label: String, role: String) -> Bool {
        let normalized = label.lowercased()
        let generic = [
            "button", "group", "link", "image", "text", "web content", "scroll area",
            "list", "table", "row", "cell", "toolbar", "unknown"
        ]
        return generic.contains(normalized) || normalized == role.lowercased()
    }

    private func childContext(current: [String], role: String, label: String?) -> [String] {
        guard contextRoles.contains(role), let label else { return current }
        guard current.last != label else { return current }
        return Array((current + [label]).suffix(3))
    }

    private var excludedRoles: Set<String> {
        [kAXMenuBarRole, kAXMenuRole, kAXMenuItemRole, kAXMenuBarItemRole]
    }

    private var contextRoles: Set<String> {
        [
            kAXWindowRole, kAXGroupRole, kAXSplitGroupRole, kAXScrollAreaRole,
            kAXListRole, kAXOutlineRole, kAXTableRole, kAXToolbarRole
        ]
    }

    private var labelProvidingRoles: Set<String> {
        [
            kAXStaticTextRole, kAXHeadingRole, kAXImageRole, "AXLink",
            kAXButtonRole, kAXRowRole, kAXCellRole
        ]
    }

    private var valueLabelRoles: Set<String> {
        [
            kAXStaticTextRole, kAXHeadingRole, "AXLink", kAXButtonRole,
            kAXRowRole, kAXCellRole, kAXCheckBoxRole, kAXRadioButtonRole,
            kAXTabGroupRole
        ]
    }

    private func rawAttribute(_ element: AXUIElement, _ attribute: String) -> AnyObject? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
        guard result == .success else { return nil }
        return value
    }

    private func stringAttribute(_ element: AXUIElement, _ attribute: String) -> String? {
        rawAttribute(element, attribute) as? String
    }

    private func boolAttribute(_ element: AXUIElement, _ attribute: String) -> Bool? {
        rawAttribute(element, attribute) as? Bool
    }

    private func elementAttribute(_ element: AXUIElement, _ attribute: String) -> AXUIElement? {
        guard let value = rawAttribute(element, attribute),
              CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
        return (value as! AXUIElement)
    }

    private func elementArrayAttribute(_ element: AXUIElement, _ attribute: String) -> [AXUIElement] {
        rawAttribute(element, attribute) as? [AXUIElement] ?? []
    }

    private func elementFrame(_ element: AXUIElement) -> CGRect? {
        guard let positionValue = rawAttribute(element, kAXPositionAttribute),
              CFGetTypeID(positionValue) == AXValueGetTypeID(),
              let sizeValue = rawAttribute(element, kAXSizeAttribute),
              CFGetTypeID(sizeValue) == AXValueGetTypeID() else {
            return nil
        }

        var position = CGPoint.zero
        var size = CGSize.zero
        guard AXValueGetValue(positionValue as! AXValue, .cgPoint, &position),
              AXValueGetValue(sizeValue as! AXValue, .cgSize, &size) else {
            return nil
        }
        return CGRect(origin: position, size: size)
    }

    private func mergedChildren(of element: AXUIElement) -> [AXUIElement] {
        let visibleChildren = elementArrayAttribute(element, kAXVisibleChildrenAttribute)
        let allChildren = elementArrayAttribute(element, kAXChildrenAttribute)
        return uniqueElements(visibleChildren + allChildren)
    }

    private func searchableWebDescendants(of element: AXUIElement) -> [AXUIElement] {
        let predicate: NSDictionary = [
            "AXSearchKey": [
                "AXControlSearchKey",
                "AXButtonSearchKey",
                "AXCheckBoxSearchKey",
                "AXLinkSearchKey"
            ],
            "AXResultsLimit": maximumNodes,
            "AXVisibleOnly": true
        ]
        var value: CFTypeRef?
        let result = AXUIElementCopyParameterizedAttributeValue(
            element,
            "AXUIElementsForSearchPredicate" as CFString,
            predicate,
            &value
        )
        guard result == .success else { return [] }
        return value as? [AXUIElement] ?? []
    }

    private func uniqueElements(_ elements: [AXUIElement]) -> [AXUIElement] {
        var identities = Set<ElementIdentity>()
        var children: [AXUIElement] = []

        for child in elements {
            let identity = ElementIdentity(element: child)
            if identities.insert(identity).inserted {
                children.append(child)
            }
        }
        return children
    }
}

private extension CGRect {
    var center: CGPoint {
        CGPoint(x: midX, y: midY)
    }
}
