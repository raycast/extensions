import type { PrhLanguageCode } from "../types/prh";

const DEFAULT_LANGUAGE_CODE: PrhLanguageCode = "3";

export type Language = "en" | "fi";
export type LanguagePreference = "system" | Language;

export function resolveLanguage(preference: LanguagePreference = "system", deviceLanguage = "en"): Language {
  if (preference === "en" || preference === "fi") {
    return preference;
  }

  return /^fi(?:[-_]|$)/i.test(deviceLanguage.trim()) ? "fi" : "en";
}

// `defaults read -g AppleLanguages` prints a property-list array in preference order.
export function parseDeviceLanguage(appleLanguages: string): string | undefined {
  return /^\s*\(\s*"?([a-z]{2,3}(?:[-_][a-z0-9]+)*)"?\s*(?:,|\))/i.exec(appleLanguages)?.[1];
}

export function getPreferredLanguageCode(language: Language = "en"): PrhLanguageCode {
  return language === "fi" ? "1" : DEFAULT_LANGUAGE_CODE;
}

export function getLanguageFromOrder(languageOrder: PrhLanguageCode[]): Language {
  return languageOrder[0] === "1" ? "fi" : "en";
}

export function getLanguageFallbackOrder(preferred = DEFAULT_LANGUAGE_CODE): PrhLanguageCode[] {
  const fullOrder: PrhLanguageCode[] = [preferred, "3", "1", "2"];
  const deduped = new Set<PrhLanguageCode>();

  for (const code of fullOrder) {
    deduped.add(code);
  }

  return [...deduped];
}
