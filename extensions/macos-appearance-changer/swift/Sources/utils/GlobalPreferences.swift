import Foundation

func writeGlobalPreference(_ key: CFString, value: CFPropertyList?, host: CFString = kCFPreferencesAnyHost) {
    CFPreferencesSetValue(key, value, kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, host)
}

func readGlobalPreference(_ key: CFString, host: CFString = kCFPreferencesAnyHost) -> CFPropertyList? {
    CFPreferencesCopyValue(key, kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, host)
}

func synchronizeGlobalPreferences(host: CFString = kCFPreferencesAnyHost) {
    CFPreferencesSynchronize(kCFPreferencesAnyApplication, kCFPreferencesCurrentUser, host)
}
