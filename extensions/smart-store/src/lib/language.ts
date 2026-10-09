import { getPreferenceValues } from "@raycast/api";
import { execFileSync } from "node:child_process";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  ru: "Russian",
  uk: "Ukrainian",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
};

let systemLanguage: string | undefined;

function detectSystemLanguage(): string {
  if (systemLanguage) return systemLanguage;
  let locale = "";
  try {
    // First entry of the macOS preferred languages list, e.g. "fr-FR".
    const output = execFileSync("/usr/bin/defaults", ["read", "-g", "AppleLanguages"], { encoding: "utf8" });
    locale = output.match(/"?([a-zA-Z-]+)"?/g)?.[0]?.replace(/"/g, "") ?? "";
  } catch {
    locale = Intl.DateTimeFormat().resolvedOptions().locale;
  }
  if (/^zh-(Hant|TW|HK)/i.test(locale)) systemLanguage = "zh-TW";
  else if (/^zh/i.test(locale)) systemLanguage = "zh-CN";
  else {
    const base = locale.split(/[-_]/)[0].toLowerCase();
    systemLanguage = LANGUAGE_NAMES[base] ? base : "en";
  }
  return systemLanguage;
}

/** Language code chosen in preferences, resolving "auto" to the macOS language. */
export function getLanguage(): string {
  const { language } = getPreferenceValues<Preferences>();
  return !language || language === "auto" ? detectSystemLanguage() : language;
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? "English";
}
