import Foundation

func writeIconThemePreference(_ theme: String) {
    let preferenceValue: CFString? = theme.isEmpty ? nil : theme as CFString

    writeGlobalPreference(PreferenceKey.iconAppearanceTheme, value: preferenceValue)
    writeGlobalPreference(PreferenceKey.iconAppearanceTheme, value: nil, host: kCFPreferencesCurrentHost)

    synchronizeGlobalPreferences()
    synchronizeGlobalPreferences(host: kCFPreferencesCurrentHost)
}

func readIconThemePreference() -> String {
    (readGlobalPreference(PreferenceKey.iconAppearanceTheme) as? String) ?? ""
}
