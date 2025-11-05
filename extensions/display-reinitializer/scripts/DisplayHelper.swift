#!/usr/bin/env swift

import Foundation
import CoreGraphics
import IOKit.graphics

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

func getAllDisplays() -> [DisplayInfo] {
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

func listDisplays() {
    let displays = getAllDisplays()

    let encoder = JSONEncoder()
    encoder.outputFormatting = .prettyPrinted

    if let jsonData = try? encoder.encode(displays),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("[]")
    }
}

// MARK: - Reinitialization Methods

// Method 1: DDC Power Cycle (External displays only)
func redetectViaDDC(displayID: CGDirectDisplayID) -> Bool {
    // Check if m1ddc is available
    let m1ddcPath = shell("which m1ddc")

    if !m1ddcPath.isEmpty {
        // Use m1ddc if available
        fputs("Using m1ddc for DDC power cycle...\n", stderr)

        // Power off
        let offResult = shell("m1ddc display off --display-id \(displayID) 2>&1")
        if offResult.contains("error") || offResult.contains("failed") {
            fputs("Warning: m1ddc power off may have failed\n", stderr)
        }

        usleep(1000000) // 1 second

        // Power on
        let onResult = shell("m1ddc display on --display-id \(displayID) 2>&1")
        if onResult.contains("error") || onResult.contains("failed") {
            fputs("Warning: m1ddc power on may have failed\n", stderr)
            return false
        }

        return true
    } else {
        fputs("Error: m1ddc not found. Install with: brew install m1ddc\n", stderr)
        fputs("Falling back to resolution cycle method...\n", stderr)
        return false
    }
}

// Method 2: Refresh Rate Toggle
func redetectViaRefreshRate(displayID: CGDirectDisplayID) -> Bool {
    guard let currentMode = CGDisplayCopyDisplayMode(displayID) else {
        fputs("Error: Could not get current display mode\n", stderr)
        return false
    }

    guard let allModes = CGDisplayCopyAllDisplayModes(displayID, nil) as? [CGDisplayMode] else {
        fputs("Error: Could not get available display modes\n", stderr)
        return false
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
        fputs("Error: No alternate refresh rate available\n", stderr)
        return false
    }

    fputs("Toggling refresh rate: \(currentRefresh)Hz -> \(tempMode.refreshRate)Hz -> \(currentRefresh)Hz\n", stderr)

    // Apply temporary mode change
    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        fputs("Error: Failed to begin display configuration\n", stderr)
        return false
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, tempMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        fputs("Error: Failed to apply temporary mode\n", stderr)
        return false
    }

    usleep(300000) // 0.3 seconds

    // Restore original
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        fputs("Error: Failed to begin restoration\n", stderr)
        return false
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, currentMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        fputs("Error: Failed to restore original mode\n", stderr)
        return false
    }

    return true
}

// Method 3: Resolution Cycle
func redetectViaResolution(displayID: CGDirectDisplayID) -> Bool {
    guard let currentMode = CGDisplayCopyDisplayMode(displayID) else {
        fputs("Error: Could not get current display mode\n", stderr)
        return false
    }

    guard let allModes = CGDisplayCopyAllDisplayModes(displayID, nil) as? [CGDisplayMode] else {
        fputs("Error: Could not get available display modes\n", stderr)
        return false
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
        fputs("Error: No alternate display mode available\n", stderr)
        return false
    }

    fputs("Cycling resolution: \(currentMode.width)x\(currentMode.height) -> \(tempMode.width)x\(tempMode.height) -> \(currentMode.width)x\(currentMode.height)\n", stderr)

    // Configure display change
    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        fputs("Error: Failed to begin display configuration\n", stderr)
        return false
    }

    // Change to temporary mode
    CGConfigureDisplayWithDisplayMode(configRef, displayID, tempMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        fputs("Error: Failed to apply temporary mode\n", stderr)
        return false
    }

    usleep(500000) // 0.5 seconds

    // Change back to original mode
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        fputs("Error: Failed to begin restoration\n", stderr)
        return false
    }

    CGConfigureDisplayWithDisplayMode(configRef, displayID, currentMode, nil)
    guard CGCompleteDisplayConfiguration(configRef, .forSession) == .success else {
        CGCancelDisplayConfiguration(configRef)
        fputs("Error: Failed to restore original mode\n", stderr)
        return false
    }

    return true
}

// Method 4: Soft Reset (Reconfiguration)
func redetectViaSoftReset(displayID: CGDirectDisplayID) -> Bool {
    guard let mode = CGDisplayCopyDisplayMode(displayID) else {
        fputs("Error: Could not get current display mode\n", stderr)
        return false
    }

    var configRef: CGDisplayConfigRef?
    guard CGBeginDisplayConfiguration(&configRef) == .success else {
        fputs("Error: Failed to begin display configuration\n", stderr)
        return false
    }

    // Reconfigure with same mode (triggers reconfiguration event)
    CGConfigureDisplayWithDisplayMode(configRef, displayID, mode, nil)

    guard CGCompleteDisplayConfiguration(configRef, .permanently) == .success else {
        CGCancelDisplayConfiguration(configRef)
        fputs("Error: Failed to complete configuration\n", stderr)
        return false
    }

    fputs("Triggered soft reconfiguration\n", stderr)
    return true
}

// Method 5: Auto-Select Best Method
func redetectAuto(displayID: CGDirectDisplayID) -> Bool {
    let isBuiltIn = CGDisplayIsBuiltin(displayID) != 0

    fputs("Auto-selecting best reinitialization method...\n", stderr)

    // Strategy 1: DDC for external displays
    if !isBuiltIn {
        fputs("Trying DDC power cycle (external display)...\n", stderr)
        if redetectViaDDC(displayID: displayID) {
            fputs("Success: DDC power cycle\n", stderr)
            return true
        }
        fputs("DDC failed, trying next method...\n", stderr)
    }

    // Strategy 2: Refresh rate toggle (less disruptive)
    if hasMultipleRefreshRates(displayID: displayID) {
        fputs("Trying refresh rate toggle...\n", stderr)
        if redetectViaRefreshRate(displayID: displayID) {
            fputs("Success: Refresh rate toggle\n", stderr)
            return true
        }
        fputs("Refresh rate toggle failed, trying next method...\n", stderr)
    }

    // Strategy 3: Resolution cycle
    let modes = getDisplayModes(displayID: displayID)
    if modes.count > 1 {
        fputs("Trying resolution cycle...\n", stderr)
        if redetectViaResolution(displayID: displayID) {
            fputs("Success: Resolution cycle\n", stderr)
            return true
        }
        fputs("Resolution cycle failed, trying next method...\n", stderr)
    }

    // Strategy 4: Soft reset (last resort)
    fputs("Trying soft reset (last resort)...\n", stderr)
    return redetectViaSoftReset(displayID: displayID)
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

// MARK: - Main Program

let args = CommandLine.arguments

if args.count < 2 {
    fputs("Usage: display-helper <command> [args]\n", stderr)
    fputs("Commands:\n", stderr)
    fputs("  list                        - List all connected displays as JSON\n", stderr)
    fputs("  redetect-auto <displayID>   - Auto-select best reinitialization method\n", stderr)
    fputs("  redetect-ddc <displayID>    - DDC power cycle (external displays only)\n", stderr)
    fputs("  redetect-refresh <displayID>- Refresh rate toggle\n", stderr)
    fputs("  redetect-resolution <displayID> - Resolution cycle (most disruptive)\n", stderr)
    fputs("  redetect-soft <displayID>   - Soft reconfiguration (least disruptive)\n", stderr)
    exit(1)
}

let command = args[1]

switch command {
case "list":
    listDisplays()
    exit(0)

case "redetect-auto":
    if args.count < 3 {
        fputs("Error: Display ID required\n", stderr)
        exit(1)
    }
    guard let displayID = UInt32(args[2]) else {
        fputs("Error: Invalid display ID\n", stderr)
        exit(1)
    }
    if redetectAuto(displayID: displayID) {
        print("Success: Display \(displayID) reinitialized (auto-select)")
        exit(0)
    } else {
        fputs("Error: All reinitialization methods failed\n", stderr)
        exit(1)
    }

case "redetect-ddc":
    if args.count < 3 {
        fputs("Error: Display ID required\n", stderr)
        exit(1)
    }
    guard let displayID = UInt32(args[2]) else {
        fputs("Error: Invalid display ID\n", stderr)
        exit(1)
    }
    if redetectViaDDC(displayID: displayID) {
        print("Success: Display \(displayID) reinitialized via DDC")
        exit(0)
    } else {
        exit(1)
    }

case "redetect-refresh":
    if args.count < 3 {
        fputs("Error: Display ID required\n", stderr)
        exit(1)
    }
    guard let displayID = UInt32(args[2]) else {
        fputs("Error: Invalid display ID\n", stderr)
        exit(1)
    }
    if redetectViaRefreshRate(displayID: displayID) {
        print("Success: Display \(displayID) reinitialized via refresh rate toggle")
        exit(0)
    } else {
        exit(1)
    }

case "redetect-resolution":
    if args.count < 3 {
        fputs("Error: Display ID required\n", stderr)
        exit(1)
    }
    guard let displayID = UInt32(args[2]) else {
        fputs("Error: Invalid display ID\n", stderr)
        exit(1)
    }
    if redetectViaResolution(displayID: displayID) {
        print("Success: Display \(displayID) reinitialized via resolution cycle")
        exit(0)
    } else {
        exit(1)
    }

case "redetect-soft":
    if args.count < 3 {
        fputs("Error: Display ID required\n", stderr)
        exit(1)
    }
    guard let displayID = UInt32(args[2]) else {
        fputs("Error: Invalid display ID\n", stderr)
        exit(1)
    }
    if redetectViaSoftReset(displayID: displayID) {
        print("Success: Display \(displayID) soft reset completed")
        exit(0)
    } else {
        exit(1)
    }

default:
    fputs("Error: Unknown command '\(command)'\n", stderr)
    fputs("Valid commands: list, redetect-auto, redetect-ddc, redetect-refresh, redetect-resolution, redetect-soft\n", stderr)
    exit(1)
}
