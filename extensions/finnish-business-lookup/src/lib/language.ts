import type { PrhLanguageCode } from "../types/prh";

export function getRuntimeLocale(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return locale || "en";
}

export function getPreferredLanguageCode(locale = getRuntimeLocale()): PrhLanguageCode {
  const lowerLocale = locale.toLowerCase();

  if (lowerLocale.startsWith("fi")) {
    return "1";
  }

  if (lowerLocale.startsWith("sv")) {
    return "2";
  }

  return "3";
}

export function getLanguageFallbackOrder(preferred = getPreferredLanguageCode()): PrhLanguageCode[] {
  const fullOrder: PrhLanguageCode[] = [preferred, "3", "1", "2"];
  const deduped = new Set<PrhLanguageCode>();

  for (const code of fullOrder) {
    deduped.add(code);
  }

  return [...deduped];
}
