import AppKit
import RaycastSwiftMacros

@raycast func applyProfile(wallpaperPath: String, iconTheme: String, appearance: String) throws
    -> String
{
    let version = ProcessInfo.processInfo.operatingSystemVersion
    guard version.majorVersion >= 26 else {
        throw AppearanceManagerError.unsupportedMacOSVersion(version.majorVersion)
    }

    writeIconThemePreference(iconTheme)

    if let mode = SystemAppearanceMode(rawValue: appearance) {
        applySystemAppearance(mode)
    }

    if !wallpaperPath.isEmpty {
        try applyWallpaperAcrossAllSpaces(wallpaperPath)
    }

    killProcess("Dock")

    return "Profile applied successfully"
}

@raycast func compositeImage(
    backgroundPath: String, overlayPath: String, outputPath: String, backgroundColorHex: String,
    canvasWidth: Int, canvasHeight: Int
) throws -> String {
    try createCompositeImage(
        backgroundPath: backgroundPath,
        overlayPath: overlayPath,
        outputPath: outputPath,
        backgroundColorHex: backgroundColorHex,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight
    )
    return outputPath
}

@raycast func getCurrentSettings() throws -> AppearanceInfo {
    let iconTheme = readIconThemePreference()

    let isAutoSwitch = readGlobalPreference(PreferenceKey.autoSwitchAppearance) as? Bool ?? false

    let currentAppearance: String
    if isAutoSwitch {
        currentAppearance = "auto"
    } else {
        let interfaceStyle = readGlobalPreference(PreferenceKey.interfaceStyle) as? String
        currentAppearance = (interfaceStyle == "Dark") ? "dark" : "light"
    }

    let currentWallpaper =
        NSScreen.main.flatMap {
            NSWorkspace.shared.desktopImageURL(for: $0)?.path
        } ?? ""

    return AppearanceInfo(
        iconTheme: iconTheme, appearance: currentAppearance, wallpaperPath: currentWallpaper)
}
