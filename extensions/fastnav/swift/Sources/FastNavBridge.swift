import AppKit
import ApplicationServices
import Foundation
import RaycastSwiftMacros

struct BridgeApplication: Codable {
    let pid: Int
    let name: String
    let bundleIdentifier: String?
    let path: String?
}

struct ApplicationsResponse: Codable {
    let trusted: Bool
    let defaultPid: Int?
    let applications: [BridgeApplication]
}

struct PermissionResponse: Codable {
    let trusted: Bool
}

struct ExecutionResponse: Codable {
    let ok: Bool
}

struct BridgeCommand: Codable {
    let id: String
    let pid: Int
    let appName: String
    let bundleIdentifier: String?
    let title: String
    let menuPath: [String]
    let shortcut: String?
    let isEnabled: Bool
    let order: Int
    let source: String
    let role: String?
    let action: String
    let focusedApplicationBonusEmpty: Double?
    let focusedApplicationBonusSearch: Double?
    let isWebBacked: Bool?
    let accessibilityLocator: String?

    init(_ command: MenuCommand) {
        id = command.accessibilityLocator.map {
            [
                command.bundleIdentifier ?? String(command.pid),
                command.source.storageKey,
                $0,
                command.action
            ].joined(separator: "|")
        } ?? "\(command.usageKey)|\(command.order)"
        pid = Int(command.pid)
        appName = command.appName
        bundleIdentifier = command.bundleIdentifier
        title = command.title
        menuPath = command.menuPath
        shortcut = command.shortcut
        isEnabled = command.isEnabled
        order = command.order
        action = command.action
        focusedApplicationBonusEmpty = command.focusedApplicationBonus(hasQuery: false)
        focusedApplicationBonusSearch = command.focusedApplicationBonus(hasQuery: true)
        isWebBacked = command.isWebBacked
        accessibilityLocator = command.accessibilityLocator

        switch command.source {
        case .menu:
            source = "menu"
            role = nil
        case .interface(let interfaceRole):
            source = "interface"
            role = interfaceRole
        }
    }

    var menuCommand: MenuCommand {
        let commandSource: CommandSource = source == "menu"
            ? .menu
            : .interface(role: role ?? "")

        return MenuCommand(
            pid: pid_t(pid),
            appName: appName,
            bundleIdentifier: bundleIdentifier,
            title: title,
            menuPath: menuPath,
            shortcut: shortcut,
            isEnabled: isEnabled,
            element: AXUIElementCreateApplication(pid_t(pid)),
            order: order,
            source: commandSource,
            action: action,
            isWebBacked: isWebBacked ?? false,
            accessibilityLocator: accessibilityLocator
        )
    }
}

enum BridgeError: LocalizedError {
    case applicationUnavailable
    case applicationCouldNotActivate(String)
    case commandCouldNotStart(String)
    case commandCouldNotComplete(String)
    case commandDisabled
    case permissionRequired

    var errorDescription: String? {
        switch self {
        case .applicationUnavailable:
            return "The selected application is no longer running."
        case .applicationCouldNotActivate(let name):
            return "\(name) could not be brought to the front."
        case .commandCouldNotStart(let title):
            return "The command “\(title)” could not be started."
        case .commandCouldNotComplete(let title):
            return "The command “\(title)” could not be completed."
        case .commandDisabled:
            return "That command is currently unavailable."
        case .permissionRequired:
            return "FastNav Bridge needs macOS Accessibility access."
        }
    }
}

@raycast func getRunningApplications() -> ApplicationsResponse {
    let runningApplications = NSWorkspace.shared.runningApplications
        .filter(isEligibleApplication)
    let defaultPid = defaultApplicationPID(from: runningApplications)
    let applications = runningApplications
        .map {
            BridgeApplication(
                pid: Int($0.processIdentifier),
                name: $0.localizedName ?? "Application",
                bundleIdentifier: $0.bundleIdentifier,
                path: $0.bundleURL?.path
            )
        }
        .sorted { lhs, rhs in
            if lhs.pid == defaultPid { return true }
            if rhs.pid == defaultPid { return false }
            return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
        }

    return ApplicationsResponse(
        trusted: AXIsProcessTrusted(),
        defaultPid: defaultPid,
        applications: applications
    )
}

@raycast func scanMenuCommands(pid: Int) throws -> [BridgeCommand] {
    try scan(pid: pid, includeMenu: true, includeInterface: false)
}

@raycast func scanInterfaceCommands(pid: Int) throws -> [BridgeCommand] {
    try scan(pid: pid, includeMenu: false, includeInterface: true)
}

@raycast func requestAccessibilityPermission(prompt: Bool) -> PermissionResponse {
    guard prompt else { return PermissionResponse(trusted: AXIsProcessTrusted()) }
    let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
    return PermissionResponse(trusted: AXIsProcessTrustedWithOptions(options))
}

@raycast func executeCommand(command: BridgeCommand) throws -> ExecutionResponse {
    guard AXIsProcessTrusted() else { throw BridgeError.permissionRequired }
    guard command.isEnabled else { throw BridgeError.commandDisabled }
    guard let application = NSRunningApplication(processIdentifier: pid_t(command.pid)),
          isEligibleApplication(application) else {
        throw BridgeError.applicationUnavailable
    }

    if command.source == "interface",
       command.action == kAXPressAction,
       command.isWebBacked == true {
        try launchDeferredCommand(command)
        return ExecutionResponse(ok: true)
    }

    return try executeSynchronously(command, in: application)
}

@raycast func executeDeferredCommand(command: BridgeCommand) throws -> ExecutionResponse {
    guard AXIsProcessTrusted() else { throw BridgeError.permissionRequired }
    guard command.isEnabled else { throw BridgeError.commandDisabled }
    guard let application = NSRunningApplication(processIdentifier: pid_t(command.pid)),
          isEligibleApplication(application) else {
        throw BridgeError.applicationUnavailable
    }
    return try executeSynchronously(command, in: application)
}

private func launchDeferredCommand(_ command: BridgeCommand) throws {
    let data = try JSONEncoder().encode(command)
    guard let payload = String(data: data, encoding: .utf8) else {
        throw BridgeError.commandCouldNotStart(command.title)
    }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    process.arguments = ["executeDeferredCommand", payload]
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    do {
        try process.run()
    } catch {
        throw BridgeError.commandCouldNotStart(command.title)
    }

    // The generated bridge exits nonzero when the deferred function throws.
    // Wait for that result so callers only observe success after the action ran.
    process.waitUntilExit()
    guard process.terminationReason == .exit,
          process.terminationStatus == 0 else {
        throw BridgeError.commandCouldNotComplete(command.title)
    }
}

private func executeSynchronously(
    _ command: BridgeCommand,
    in application: NSRunningApplication
) throws -> ExecutionResponse {

    if !isActiveApplication(application) {
        application.activate(options: [])
        for _ in 0..<30 where !isActiveApplication(application) && !application.isTerminated {
            // NSRunningApplication state is refreshed on a run-loop turn.
            // Sleeping here leaves `isActive` stuck at its pre-activation
            // value and makes successfully activated apps look unavailable.
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        }
    }

    guard isActiveApplication(application), !application.isTerminated else {
        throw BridgeError.applicationCouldNotActivate(command.appName)
    }

    let menuCommand = command.menuCommand
    switch menuCommand.source {
    case .menu:
        try AccessibilityMenuReader().resolveAndPerform(menuCommand, in: application)
    case .interface:
        try AccessibilityUIReader().resolveAndPerform(menuCommand, in: application)
    }
    return ExecutionResponse(ok: true)
}

private func isActiveApplication(_ application: NSRunningApplication) -> Bool {
    application.isActive ||
        NSWorkspace.shared.frontmostApplication?.processIdentifier == application.processIdentifier
}

private func scan(
    pid: Int,
    includeMenu: Bool,
    includeInterface: Bool
) throws -> [BridgeCommand] {
    guard AXIsProcessTrusted() else { throw BridgeError.permissionRequired }
    guard let application = NSRunningApplication(processIdentifier: pid_t(pid)),
          isEligibleApplication(application) else {
        throw BridgeError.applicationUnavailable
    }

    var commands: [MenuCommand] = []
    if includeMenu {
        commands.append(contentsOf: try AccessibilityMenuReader().commands(for: application))
    }
    if includeInterface {
        commands.append(contentsOf: try AccessibilityUIReader().commands(for: application))
    }
    return commands.map(BridgeCommand.init)
}

private func isEligibleApplication(_ application: NSRunningApplication) -> Bool {
    let bundleIdentifier = application.bundleIdentifier ?? ""
    let name = application.localizedName ?? ""
    return application.processIdentifier != ProcessInfo.processInfo.processIdentifier &&
        !application.isTerminated &&
        application.activationPolicy == .regular &&
        !bundleIdentifier.hasPrefix("com.raycast.") &&
        name.caseInsensitiveCompare("Raycast") != .orderedSame &&
        !name.isEmpty
}

private func defaultApplicationPID(
    from applications: [NSRunningApplication]
) -> Int? {
    let eligiblePIDs = Set(applications.map(\.processIdentifier))
    let windowOptions: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    let windows = CGWindowListCopyWindowInfo(
        windowOptions,
        kCGNullWindowID
    ) as? [[String: Any]] ?? []

    for window in windows {
        guard let ownerPID = window[kCGWindowOwnerPID as String] as? NSNumber,
              let layer = window[kCGWindowLayer as String] as? NSNumber,
              layer.intValue == 0 else { continue }
        let pid = pid_t(ownerPID.int32Value)
        if eligiblePIDs.contains(pid) { return Int(pid) }
    }

    return applications.first(where: \.isActive).map { Int($0.processIdentifier) }
        ?? applications.first.map { Int($0.processIdentifier) }
}
