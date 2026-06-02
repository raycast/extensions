import { createHash } from "node:crypto";
import { Cache } from "@raycast/api";

const cache = new Cache({ namespace: "translation" });

export interface CachedTranslation {
  translation: string;
  coaching?: string;
  targetLanguage: string;
  targetLanguageTitle: string;
}

export function translationCacheKey(parts: {
  text: string;
  provider: string;
  model: string;
  targetLanguage: string;
  promptMode?: string;
}): string {
  return createHash("sha1")
    .update(JSON.stringify({ ...parts, text: parts.text.trim() }))
    .digest("hex")
    .slice(0, 20);
}

export function readTranslationCache(key: string): CachedTranslation | null {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedTranslation>;
    if (
      typeof parsed.translation === "string" &&
      typeof parsed.targetLanguage === "string" &&
      typeof parsed.targetLanguageTitle === "string"
    ) {
      return {
        translation: parsed.translation,
        coaching:
          typeof parsed.coaching === "string" ? parsed.coaching : undefined,
        targetLanguage: parsed.targetLanguage,
        targetLanguageTitle: parsed.targetLanguageTitle,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeTranslationCache(
  key: string,
  translation: CachedTranslation,
): void {
  cache.set(key, JSON.stringify(translation));
}
