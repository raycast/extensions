import type { PrhLanguageCode } from "../types/prh";

const DEFAULT_LANGUAGE_CODE: PrhLanguageCode = "3";

export function getPreferredLanguageCode(): PrhLanguageCode {
  return DEFAULT_LANGUAGE_CODE;
}

export function getLanguageFallbackOrder(preferred = DEFAULT_LANGUAGE_CODE): PrhLanguageCode[] {
  const fullOrder: PrhLanguageCode[] = [preferred, "3", "1", "2"];
  const deduped = new Set<PrhLanguageCode>();

  for (const code of fullOrder) {
    deduped.add(code);
  }

  return [...deduped];
}
