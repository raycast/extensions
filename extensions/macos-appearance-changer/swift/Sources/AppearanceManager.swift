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

// `getCurrentSettings` removed: it was exposed to Raycast but not used from TypeScript.
// Keeping the implementation removed to avoid shipping unused Swift commands.
