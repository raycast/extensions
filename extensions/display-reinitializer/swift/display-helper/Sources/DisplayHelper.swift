import Foundation
import CoreGraphics
import IOKit.graphics
import RaycastSwiftMacros

// MARK: - Display Information Structure

struct DisplayInfo: Codable {
    let id: UInt32
    let name: String
    let uuid: String
    let isMain: Bool
    let isBuiltIn: Bool
    let width: Int
    let height: Int
    let availableMethods: [String]
    let hasMultipleRefreshRates: Bool
    let recommendedMethod: String
}

struct DisplayMode: Codable {
    let width: Int
    let height: Int
    let refreshRate: Double
}

// MARK: - Error Types

enum DisplayError: Error, CustomStringConvertible {
    case invalidDisplayId
    case displayModeUnavailable
    case noAlternateMode
    case configurationFailed(String)
    case m1ddcNotInstalled
    case ddcFailed
    case unknownMethod(String)
    case allMethodsFailed

    var description: String {
        switch self {
        case .invalidDisplayId:
            return "Invalid display ID"
        case .displayModeUnavailable:
            return "Could not get current display mode"
        case .noAlternateMode:
            return "No alternate display mode available"
        case .configurationFailed(let reason):
            return "Display configuration failed: \(reason)"
        case .m1ddcNotInstalled:
            return "m1ddc not found. Install with: brew install m1ddc"
        case .ddcFailed:
            return "DDC power cycle failed"
        case .unknownMethod(let method):
            return "Unknown reinitialization method: \(method)"
        case .allMethodsFailed:
            return "All reinitialization methods failed"
        }
    }
}

// MARK: - Exported Functions

@raycast func getAllDisplays() -> [DisplayInfo] {
    var displays: [DisplayInfo] = []
    var displayCount: UInt32 = 0
    var activeDisplays = [CGDirectDisplayID](repeating: 0, count: 16)

    guard CGGetActiveDisplayList(16, &activeDisplays, &displayCount) == .success else {
        return displays
    }

    for i in 0..<Int(displayCount) {
        let displayID = activeDisplays[i]
        let isBuiltIn = CGDisplayIsBuiltin(displayID) != 0

        let info = DisplayInfo(
            id: displayID,
            name: getDisplayName(displayID: displayID),
            uuid: getDisplayUUID(displayID: displayID),
            isMain: CGDisplayIsMain(displayID) != 0,
            isBuiltIn: isBuiltIn,
            width: CGDisplayPixelsWide(displayID),
            height: CGDisplayPixelsHigh(displayID),
            availableMethods: getAvailableMethods(displayID: displayID, isBuiltIn: isBuiltIn),
            hasMultipleRefreshRates: hasMultipleRefreshRates(displayID: displayID),
            recommendedMethod: getRecommendedMethod(displayID: displayID, isBuiltIn: isBuiltIn)
        )

        displays.append(info)
    }

    return displays
}

@raycast func reinitializeDisplay(displayId: UInt32, method: String) throws -> String {
    switch method {
    case "auto":
        if try reinitializeAuto(displayID: displayId) {
            return "Success: Display \(displayId) reinitialized (auto-select)"
        }

    case "ddc":
        if try reinitializeDDC(displayID: displayId) {
            return "Success: Display \(displayId) reinitialized via DDC"
        }

    case "refresh":
        if try reinitializeRefreshRate(displayID: displayId) {
            return "Success: Display \(displayId) reinitialized via refresh rate toggle"
        }

    case "resolution":
        if try reinitializeResolution(displayID: displayId) {
            return "Success: Display \(displayId) reinitialized via resolution cycle"
        }

    case "soft":
        if try reinitializeSoftReset(displayID: displayId) {
            return "Success: Display \(displayId) soft reset completed"
        }

    default:
        throw DisplayError.unknownMethod(method)
    }

    throw DisplayError.allMethodsFailed
}

// MARK: - Display Helper Functions

func getDisplayName(displayID: CGDirectDisplayID) -> String {
    var name = "Unknown Display"

    // Get the IOKit service for the display
    var iter: io_iterator_t = 0

    let matching = IOServiceMatching("IODisplayConnect")
    let result = IOServiceGetMatchingServices(kIOMainPortDefault, matching, &iter)

    if result == KERN_SUCCESS {
        var service = IOIteratorNext(iter)
        while service != 0 {
            let info = IODisplayCreateInfoDictionary(service, IOOptionBits(kIODisplayOnlyPreferredName)).takeRetainedValue() as NSDictionary

            if let displayNames = info[kDisplayProductName] as? [String: String] {
                // Try to get English name, or first available
                name = displayNames["en_US"] ?? displayNames.values.first ?? name
                break
            }

            IOObjectRelease(service)
            service = IOIteratorNext(iter)
        }
        IOObjectRelease(iter)
    }

    // If we couldn't get a name from IOKit, provide a generic name
    if name == "Unknown Display" {
        if CGDisplayIsBuiltin(displayID) != 0 {
            name = "Built-in Display"
        } else if CGDisplayIsMain(displayID) != 0 {
            name = "Main Display"
        } else {
            name = "External Display"
        }
    }

    return name
}

func getDisplayUUID(displayID: CGDirectDisplayID) -> String {
    // Generate a consistent UUID from the display ID
    return "display-\(displayID)"
}

func getDisplayModes(displayID: CGDirectDisplayID) -> [DisplayMode] {
    var modes: [DisplayMode] = []

    guard let allModes = CGDisplayCopyAllDisplayModes(displayID, nil) as? [CGDisplayMode] else {
        return modes
    }

    for mode in allModes {
        modes.append(DisplayMode(
            width: mode.width,
            height: mode.height,
            refreshRate: mode.refreshRate
        ))
    }

    return modes
}

func hasMultipleRefreshRates(displayID: CGDirectDisplayID) -> Bool {
    let modes = getDisplayModes(displayID: displayID)
    guard let currentMode = CGDisplayCopyDisplayMode(displayID) else {
        return false
    }

    // Check if there are modes with same resolution but different refresh rates
    let currentWidth = currentMode.width
    let currentHeight = currentMode.height
    let currentRefresh = currentMode.refreshRate

    for mode in modes {
        if mode.width == currentWidth &&
           mode.height == currentHeight &&
           abs(mode.refreshRate - currentRefresh) > 0.5 {
            return true
        }
    }

    return false
}

func getAvailableMethods(displayID: CGDirectDisplayID, isBuiltIn: Bool) -> [String] {
    var methods: [String] = []

    // Soft reset is always available
    methods.append("soft")

    // Resolution cycle is always available (as long as there are any modes)
    let modes = getDisplayModes(displayID: displayID)
    if modes.count > 1 {
        methods.append("resolution")
    }

    // Refresh rate toggle only if multiple rates exist
    if hasMultipleRefreshRates(displayID: displayID) {
        methods.append("refresh")
    }

    // DDC only for external displays
    if !isBuiltIn {
        methods.append("ddc")
    }

    // Auto is always available
    methods.append("auto")

    return methods
}

func getRecommendedMethod(displayID: CGDirectDisplayID, isBuiltIn: Bool) -> String {
    // External displays: prefer DDC
    if !isBuiltIn {
        return "ddc"
    }

    // Built-in displays with multiple refresh rates: prefer refresh toggle
    if hasMultipleRefreshRates(displayID: displayID) {
        return "refresh"
    }

    // Otherwise: resolution cycle
    let modes = getDisplayModes(displayID: displayID)
    if modes.count > 1 {
        return "resolution"
    }

    // Last resort: soft reset
    return "soft"
}

// MARK: - Reinitialization Methods

// Method 1: DDC Power Cycle (External displays only)
func reinitializeDDC(displayID: CGDirectDisplayID) throws -> Bool {
    // Check if m1ddc is available
    let m1ddcPath = shell("which m1ddc")

    if m1ddcPath.isEmpty {
        throw DisplayError.m1ddcNotInstalled
    }

    // Power off
    let offResult = shell("m1ddc display off --display-id \(displayID) 2>&1")
    if offResult.contains("error") || offResult.contains("failed") {
        throw DisplayError.ddcFailed
    }

    usleep(1000000) // 1 second

    // Power on
    let onResult = shell("m1ddc display on --display-id \(displayID) 2>&1")
    if onResult.contains("error") || onResult.contains("failed") {
        throw DisplayError.ddcFailed
    }

    return true
}

// Method 2: Refresh Rate Toggle
func reinitializeRefreshRate(displayID: CGDirectDisplayID) throws -> Bool {
    guard let currentMode = CGDisplayCopyDisplayMode(displayID) else {
        throw DisplayError.displayModeUnavailable
    }

    guard let allModes = CGDisplayCopyAllDisplayModes(displayID, nil) as? [CGDisplayMode] else {
        throw DisplayError.displayModeUnavailable
    }

    // Find mode with same resolution but different refresh rate
    let currentRefresh = currentMode.refreshRate
    var alternateMode: CGDisplayMode?

    for mode in allModes {
        if mode.width == currentMode.width &&
           mode.height == currentMode.height &&
           abs(mode.refreshRate - currentRefresh) > 0.5 {
            alternateMode = mode
            break
        }
    }

    guard let tempMode = alternateMode else {
        throw DisplayError.noAlternateMode
    }

    // Apply temporary mode change
    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        throw DisplayError.configurationFailed("Failed to begin display configuration")
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, tempMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        throw DisplayError.configurationFailed("Failed to apply temporary mode")
    }

    usleep(300000) // 0.3 seconds

    // Restore original
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        throw DisplayError.configurationFailed("Failed to begin restoration")
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, currentMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        throw DisplayError.configurationFailed("Failed to restore original mode")
    }

    return true
}

// Method 3: Resolution Cycle
func reinitializeResolution(displayID: CGDirectDisplayID) throws -> Bool {
    guard let currentMode = CGDisplayCopyDisplayMode(displayID) else {
        throw DisplayError.displayModeUnavailable
    }

    guard let allModes = CGDisplayCopyAllDisplayModes(displayID, nil) as? [CGDisplayMode] else {
        throw DisplayError.displayModeUnavailable
    }

    // Find a different mode (different resolution or refresh rate)
    var alternateMode: CGDisplayMode?
    for mode in allModes {
        if mode.width != currentMode.width ||
           mode.height != currentMode.height ||
           abs(mode.refreshRate - currentMode.refreshRate) > 0.5 {
            alternateMode = mode
            break
        }
    }

    guard let tempMode = alternateMode else {
        throw DisplayError.noAlternateMode
    }

    // Configure display change
    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        throw DisplayError.configurationFailed("Failed to begin display configuration")
    }

    // Change to temporary mode
    CGConfigureDisplayWithDisplayMode(configRef, displayID, tempMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        throw DisplayError.configurationFailed("Failed to apply temporary mode")
    }

    usleep(500000) // 0.5 seconds

    // Change back to original mode
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        throw DisplayError.configurationFailed("Failed to begin restoration")
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, currentMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        throw DisplayError.configurationFailed("Failed to restore original mode")
    }

    return true
}

// Method 4: Soft Reset (Reconfiguration)
func reinitializeSoftReset(displayID: CGDirectDisplayID) throws -> Bool {
    guard let mode = CGDisplayCopyDisplayMode(displayID) else {
        throw DisplayError.displayModeUnavailable
    }

    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        throw DisplayError.configurationFailed("Failed to begin display configuration")
    }

    // Reconfigure with same mode (triggers reconfiguration event)
    CGConfigureDisplayWithDisplayMode(configRef, displayID, mode, nil)

    guard CGCompleteDisplayConfiguration(configRef, .permanently) == .success else {
        CGCancelDisplayConfiguration(configRef)
        throw DisplayError.configurationFailed("Failed to complete configuration")
    }

    return true
}

// Method 5: Auto-Select Best Method
func reinitializeAuto(displayID: CGDirectDisplayID) throws -> Bool {
    let isBuiltIn = CGDisplayIsBuiltin(displayID) != 0

    // Strategy 1: DDC for external displays
    if !isBuiltIn {
        do {
            if try reinitializeDDC(displayID: displayID) {
                return true
            }
        } catch {
            // DDC failed, try next method
        }
    }

    // Strategy 2: Refresh rate toggle (less disruptive)
    if hasMultipleRefreshRates(displayID: displayID) {
        do {
            if try reinitializeRefreshRate(displayID: displayID) {
                return true
            }
        } catch {
            // Refresh rate toggle failed, try next method
        }
    }

    // Strategy 3: Resolution cycle
    let modes = getDisplayModes(displayID: displayID)
    if modes.count > 1 {
        do {
            if try reinitializeResolution(displayID: displayID) {
                return true
            }
        } catch {
            // Resolution cycle failed, try next method
        }
    }

    // Strategy 4: Soft reset (last resort)
    return try reinitializeSoftReset(displayID: displayID)
}

// MARK: - Shell Helper

func shell(_ command: String) -> String {
    let task = Process()
    let pipe = Pipe()

    task.standardOutput = pipe
    task.standardError = pipe
    task.arguments = ["-c", command]
    task.launchPath = "/bin/bash"
    task.standardInput = nil

    do {
        try task.run()
        task.waitUntilExit()
    } catch {
        return ""
    }

    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
}
