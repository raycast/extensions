import AppKit
import RaycastExtensionMacro

#exportFunction(quitButFront)
func quitButFront() {
    guard let frontmostApplication = NSWorkspace.shared.frontmostApplication else {
        return
    }
    
    var excludedBundleIdentifiers = ["com.apple.finder", "com.raycast.macos"]
    if let frontmostAppBundleIdentifier = frontmostApplication.bundleIdentifier {
        excludedBundleIdentifiers.append(frontmostAppBundleIdentifier)
    }

    NSWorkspace.shared.runningApplications
        .filter {
            $0 != NSRunningApplication.current
                && $0.activationPolicy == .regular
                && !excludedBundleIdentifiers.contains($0.bundleIdentifier ?? "")
        }
        .forEach { $0.terminate() }
}


#handleFunctionCall()
