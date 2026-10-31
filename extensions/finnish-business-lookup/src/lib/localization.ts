import { getPreferenceValues } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { parseDeviceLanguage, resolveLanguage } from "./language";
import type { Language, LanguagePreference } from "./language";

let deviceLanguage: string | undefined;

export function getLanguage(): Language {
  const { language = "system" } = getPreferenceValues<{ language?: LanguagePreference }>();
  if (language === "en" || language === "fi") {
    return language;
  }

  if (deviceLanguage === undefined) {
    try {
      // Read the UI language, not AppleLocale (the user's region/formatting setting).
      deviceLanguage = parseDeviceLanguage(
        execFileSync("/usr/bin/defaults", ["read", "-g", "AppleLanguages"], {
          encoding: "utf8",
          timeout: 1000,
          stdio: ["ignore", "pipe", "ignore"],
        }),
      );
    } catch {
      // The runtime locale is a fallback when macOS preferences cannot be read.
    }
    deviceLanguage ??= Intl.DateTimeFormat().resolvedOptions().locale;
  }

  return resolveLanguage(language, deviceLanguage);
}
