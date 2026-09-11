import AppKit

struct AppearanceInfo: Encodable {
    let iconTheme: String
    let appearance: String
    let wallpaperPath: String
}

enum AppearanceManagerError: LocalizedError, CustomStringConvertible {
    case wallpaperFileNotFound(String)
    case wallpaperStoreParseFailed
    case applicationSupportUnavailable
    case compositeImageFailed
    case unsupportedMacOSVersion(Int)

    var errorDescription: String? {
        switch self {
        case .wallpaperFileNotFound(let path):
            return "Wallpaper file not found: \(path)"
        case .wallpaperStoreParseFailed:
            return "Failed to parse wallpaper store plist"
        case .applicationSupportUnavailable:
            return "Application Support directory unavailable"
        case .compositeImageFailed:
            return "Failed to create composite image"
        case .unsupportedMacOSVersion(let version):
            return "Requires macOS 26 or later. You are running macOS \(version)."
        }
    }

    var description: String {
        errorDescription ?? "Unknown error"
    }
}

enum SystemAppearanceMode: String {
    case light, dark, auto
}
