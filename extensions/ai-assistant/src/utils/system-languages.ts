import { environment } from "@raycast/api";
import { execSync } from "child_process";

// Get the system language from environment
export function getSystemLanguage(): string {
  return environment.systemLanguage || "en";
}

// Get keyboard layout language using system commands
export function getKeyboardLanguage(): string {
  try {
    const layout = execSync(
      "defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | grep -w 'KeyboardLayout Name' | cut -d'\"' -f4",
    )
      .toString()
      .trim();

    // Map common keyboard layouts to language codes
    const layoutMap: { [key: string]: string } = {
      French: "fr",
      "French - Numerical": "fr",
      ABC: "en",
      US: "en",
      British: "en",
      German: "de",
      Spanish: "es",
      Italian: "it",
      // Add more mappings as needed
    };

    return layoutMap[layout] || "en";
  } catch {
    return "en";
  }
}

// Get timezone-based language guess
export function getTimezoneLanguage(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map common timezones to likely languages
    const timezoneMap: { [key: string]: string } = {
      "Europe/Paris": "fr",
      "Europe/London": "en",
      "Europe/Berlin": "de",
      "Europe/Madrid": "es",
      "Europe/Rome": "it",
      // Add more mappings as needed
    };

    return timezoneMap[timezone] || "en";
  } catch {
    return "en";
  }
}

// Get the two most likely system languages
export function getSystemLanguages(): [string, string] {
  const systemLang = getSystemLanguage();
  const keyboardLang = getKeyboardLanguage();
  const timezoneLang = getTimezoneLanguage();

  // If system language matches keyboard or timezone, use the other as secondary
  if (systemLang === keyboardLang) {
    return [systemLang, timezoneLang];
  } else if (systemLang === timezoneLang) {
    return [systemLang, keyboardLang];
  } else {
    // Otherwise use system language and keyboard language
    return [systemLang, keyboardLang];
  }
}
