import Cocoa
import ApplicationServices

struct HelperResult: Codable {
    let status: String
    let appName: String?
    let message: String
    let trusted: Bool
}

func printResult(status: String, appName: String? = nil, message: String, trusted: Bool = AXIsProcessTrusted()) {
    let res = HelperResult(status: status, appName: appName, message: message, trusted: trusted)
    if let data = try? JSONEncoder().encode(res), let str = String(data: data, encoding: .utf8) {
        print(str)
    } else {
        print("{\"status\":\"\(status)\",\"message\":\"\(message)\",\"trusted\":\(trusted)}")
    }
}

// 1. Check Accessibility Permission
func checkPermission(prompt: Bool = false) -> Bool {
    if prompt {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }
    return AXIsProcessTrusted()
}

// 2. Search for any active Gatekeeper dialog in CoreServicesUIAgent
func detectCoreServicesDialog() -> (element: AXUIElement, appName: String, hasOpenAnywayButton: Bool)? {
    let apps = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.coreservices.uiagent")
    guard let app = apps.first else { return nil }
    let appElement = AXUIElementCreateApplication(app.processIdentifier)
    
    var windowsRef: CFTypeRef?
    guard AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowsRef) == .success,
          let windows = windowsRef as? [AXUIElement] else { return nil }
    
    for window in windows {
        var foundName: String?
        var hasOpenAnyway = false
        
        func inspect(_ elem: AXUIElement) {
            var roleRef: CFTypeRef?
            var titleRef: CFTypeRef?
            var valRef: CFTypeRef?
            var descRef: CFTypeRef?
            AXUIElementCopyAttributeValue(elem, kAXRoleAttribute as CFString, &roleRef)
            AXUIElementCopyAttributeValue(elem, kAXTitleAttribute as CFString, &titleRef)
            AXUIElementCopyAttributeValue(elem, kAXValueAttribute as CFString, &valRef)
            AXUIElementCopyAttributeValue(elem, kAXDescriptionAttribute as CFString, &descRef)
            
            let role = roleRef as? String ?? ""
            let title = titleRef as? String ?? ""
            let val = valRef as? String ?? ""
            let desc = descRef as? String ?? ""
            
            if role == "AXStaticText" && (val.contains("“") || val.contains("blocked") || val.contains("malware") || val.contains("developer") || title.contains("“")) {
                let text = !val.isEmpty ? val : title
                if let start = text.firstIndex(of: "“"), let end = text.firstIndex(of: "”"), start < end {
                    foundName = String(text[text.index(after: start)..<end])
                } else if foundName == nil && !text.isEmpty {
                    foundName = text
                }
            }
            
            if role == "AXButton" && (title == "Open Anyway" || desc == "Open Anyway") {
                hasOpenAnyway = true
            }
            
            var childrenRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(elem, kAXChildrenAttribute as CFString, &childrenRef) == .success,
               let children = childrenRef as? [AXUIElement] {
                for child in children {
                    inspect(child)
                }
            }
        }
        
        inspect(window)
        if let name = foundName {
            return (window, name, hasOpenAnyway)
        }
    }
    
    return nil
}

// 3. Search for Open Anyway control in System Settings
func findSystemSettingsOpenAnyway() -> (btn: AXUIElement, appName: String?)? {
    let apps = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences")
    guard let app = apps.first else { return nil }
    let appElement = AXUIElementCreateApplication(app.processIdentifier)
    
    var windowsRef: CFTypeRef?
    guard AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowsRef) == .success,
          let windows = windowsRef as? [AXUIElement] else { return nil }
    
    func searchBtn(_ elem: AXUIElement) -> (AXUIElement, String?)? {
        var descRef: CFTypeRef?
        var titleRef: CFTypeRef?
        AXUIElementCopyAttributeValue(elem, kAXDescriptionAttribute as CFString, &descRef)
        AXUIElementCopyAttributeValue(elem, kAXTitleAttribute as CFString, &titleRef)
        let desc = descRef as? String ?? ""
        let title = titleRef as? String ?? ""
        
        if desc == "Open Anyway" || title == "Open Anyway" {
            var extractedName: String?
            var parentRef: CFTypeRef?
            AXUIElementCopyAttributeValue(elem, kAXParentAttribute as CFString, &parentRef)
            if let parent = parentRef {
                var siblingsRef: CFTypeRef?
                AXUIElementCopyAttributeValue(parent as! AXUIElement, kAXChildrenAttribute as CFString, &siblingsRef)
                if let siblings = siblingsRef as? [AXUIElement] {
                    for sib in siblings {
                        var valRef: CFTypeRef?
                        AXUIElementCopyAttributeValue(sib, kAXValueAttribute as CFString, &valRef)
                        if let val = valRef as? String, val.contains("blocked") {
                            if let start = val.firstIndex(of: "“"), let end = val.firstIndex(of: "”"), start < end {
                                extractedName = String(val[val.index(after: start)..<end])
                            } else {
                                extractedName = val
                            }
                            break
                        }
                    }
                }
            }
            return (elem, extractedName)
        }
        
        var childrenRef: CFTypeRef?
        if AXUIElementCopyAttributeValue(elem, kAXChildrenAttribute as CFString, &childrenRef) == .success,
           let children = childrenRef as? [AXUIElement] {
            for child in children {
                if let res = searchBtn(child) {
                    return res
                }
            }
        }
        return nil
    }
    
    for w in windows {
        if let res = searchBtn(w) {
            return res
        }
    }
    return nil
}

// Parse Command Line Arguments
var mode = "--activate"
var targetApp: String? = nil

var argIdx = 1
while argIdx < CommandLine.arguments.count {
    let arg = CommandLine.arguments[argIdx]
    if arg == "--check-permission" || arg == "--detect" || arg == "--activate" {
        mode = arg
    } else if (arg == "--target" || arg == "--app") && argIdx + 1 < CommandLine.arguments.count {
        argIdx += 1
        targetApp = CommandLine.arguments[argIdx]
    }
    argIdx += 1
}

// Mode: Check Permission
if mode == "--check-permission" {
    let trusted = checkPermission(prompt: true)
    printResult(
        status: trusted ? "trusted" : "untrusted",
        message: trusted ? "Accessibility permission granted." : "Accessibility permission needed.",
        trusted: trusted
    )
    exit(0)
}

// Verify Accessibility Permission for execution
if !checkPermission() {
    printResult(
        status: "permission_denied",
        message: "Accessibility permission is required for Gatekeeper approval. Please enable Accessibility for Raycast in System Settings → Privacy & Security → Accessibility.",
        trusted: false
    )
    exit(0)
}

// Mode: Detect
if mode == "--detect" {
    if let csDialog = detectCoreServicesDialog() {
        printResult(
            status: csDialog.hasOpenAnywayButton ? "confirmation_pending" : "detected",
            appName: csDialog.appName,
            message: csDialog.hasOpenAnywayButton
                ? "Apple's native confirmation dialog is already displayed."
                : "Detected blocked application from system alert."
        )
        exit(0)
    }
    
    if let ssMatch = findSystemSettingsOpenAnyway() {
        printResult(
            status: "detected",
            appName: ssMatch.appName,
            message: "Detected pending approval in System Settings."
        )
        exit(0)
    }
    
    printResult(
        status: "not_found",
        message: "No application currently waiting for Gatekeeper approval."
    )
    exit(0)
}

// Mode: Activate
// Step 1: If Apple's secondary confirmation dialog with "Open Anyway" is already on screen,
// DO NOT automatically click or dismiss it. Prompt the user to confirm via Apple's native dialog.
if let csDialog = detectCoreServicesDialog(), csDialog.hasOpenAnywayButton {
    printResult(
        status: "confirmation_pending",
        appName: csDialog.appName,
        message: "Apple's native confirmation prompt for \"\(csDialog.appName)\" is displayed. Please authorize in Apple's dialog."
    )
    exit(0)
}

// Step 2: Open Privacy & Security settings in background to access the Gatekeeper approval control
let settingsUrl = URL(string: "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension")!
let config = NSWorkspace.OpenConfiguration()
config.activates = false
config.addsToRecentItems = false

let openSemaphore = DispatchSemaphore(value: 0)
NSWorkspace.shared.open(settingsUrl, configuration: config) { _, _ in
    openSemaphore.signal()
}
_ = openSemaphore.wait(timeout: .now() + 1.0)

var activated = false
var detectedName: String? = nil

for _ in 0..<15 {
    Thread.sleep(forTimeInterval: 0.2)
    if let match = findSystemSettingsOpenAnyway() {
        detectedName = match.appName
        
        // Safety check: if targetApp was specified, ensure it matches before activating
        if let target = targetApp, let detected = detectedName {
            let normTarget = target.lowercased().replacingOccurrences(of: ".app", with: "")
            let normDetected = detected.lowercased().replacingOccurrences(of: ".app", with: "")
            if !normDetected.contains(normTarget) && !normTarget.contains(normDetected) {
                // Mismatch, do not activate unintended application
                printResult(
                    status: "error",
                    appName: detectedName,
                    message: "Blocked app in Settings (\"\(detected)\") does not match target (\"\(target)\")."
                )
                exit(1)
            }
        }
        
        // Activate via accessibility semantic action (no synthetic mouse click or scrolling)
        let axResult = AXUIElementPerformAction(match.btn, kAXPressAction as CFString)
        if axResult == .success {
            activated = true
        }
        break
    }
}

// Step 3: Cleanly close/hide System Settings so user is not burdened with the Settings UI
let apps = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.systempreferences")
for app in apps {
    app.hide()
}

if activated {
    let nameMsg = detectedName != nil ? "for \"\(detectedName!)\"" : ""
    printResult(
        status: "success",
        appName: detectedName,
        message: "Activated Gatekeeper approval \(nameMsg). Please complete Apple's native confirmation prompt."
    )
    exit(0)
}

// Step 4: If no button found in System Settings
printResult(
    status: "not_found",
    message: "No blocked application currently waiting for 'Open Anyway' approval."
)
