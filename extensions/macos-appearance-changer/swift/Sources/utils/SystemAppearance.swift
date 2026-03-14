import AppKit

func applySystemAppearance(_ mode: SystemAppearanceMode) {
    switch mode {
    case .dark, .light:
        let isDark = mode == .dark
        let source = "tell application \"System Events\" to tell appearance preferences to set dark mode to \(isDark)"
        var error: NSDictionary?
        NSAppleScript(source: source)?.executeAndReturnError(&error)
        writeGlobalPreference(PreferenceKey.autoSwitchAppearance, value: kCFBooleanFalse)

    case .auto:
        writeGlobalPreference(PreferenceKey.autoSwitchAppearance, value: kCFBooleanTrue)
    }

    synchronizeGlobalPreferences()
}
