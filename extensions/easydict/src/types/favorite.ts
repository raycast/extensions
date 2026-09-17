/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { DictionaryType, TranslationType } from "./api";
import type { DisplaySection } from "./display";
import type { QueryWordInfo } from "./query";

/**
 * A saved word entry persisted in Raycast `LocalStorage` under "favorite-words".
 *
 * The full `displaySections` snapshot lets the favorites list re-render a word's
 * complete dictionary result offline (no network re-query needed). Language
 * display names / emoji are derived via `getLanguageItem`, so only the Youdao
 * codes are stored. `createdAt` has no source on existing query results and is
 * added at save time.
 */
export interface FavoriteWord {
  readonly word: string;
  readonly fromLanguage: string; // Youdao language code (same convention as QueryInput)
  readonly toLanguage: string;
  readonly isWord?: boolean;
  readonly translations?: string[]; // preview rows in the favorites list
  readonly displaySections: readonly DisplaySection[]; // full offline snapshot
  readonly createdAt: number; // ms timestamp
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Derive the best preview translations from persisted display sections: prefer
 * a real translation section's copyText; otherwise fall back to the first
 * dictionary "Translation" item's title (Youdao / Linguee / AI all expose the
 * translated text in `title`, while Linguee's copyText mixes in the source
 * word). Legacy Linguee snapshots may reuse the word as a placeholder title
 * when no word entry existed (only examples or related words); other providers
 * may legitimately translate to the same text (proper nouns, abbreviations).
 * Returns undefined when no translation is present.
 */
function deriveTranslationsFromSections(displaySections: readonly DisplaySection[]): string[] | undefined {
  const item = displaySections.find((s) => isTranslationType(s.type))?.items?.[0];
  if (item?.copyText) {
    const lines = splitLines(item.copyText);
    if (lines.length) return lines;
  }

  for (const section of displaySections) {
    for (const item of section.items) {
      // Youdao / Linguee / AI all use "Translation" as the display discriminator
      // for the item whose title is the translated text.
      if (item.displayType !== "Translation") continue;

      const title = item.title.trim();
      // Legacy persisted-data compatibility: older Linguee snapshots reused the
      // query word as a placeholder title when no word entry existed. Other
      // providers may legitimately translate to the same text (proper nouns,
      // abbreviations).
      const isLingueePlaceholder =
        item.queryType === DictionaryType.Linguee && title === item.queryWordInfo.word.trim();
      if (title && !isLingueePlaceholder) return [title];
    }
  }

  return undefined;
}

/**
 * Type guard: a DisplaySection.type is a TranslationType section when its value
 * is one of the TranslationType enum members (string enum, so value comparison
 * is reliable across reloads / persisted data).
 */
function isTranslationType(value: DisplaySection["type"]): boolean {
  return Object.values(TranslationType).includes(value as TranslationType);
}

/**
 * Resolve the translations shown for a favorite. Prefers the persisted
 * `translations` snapshot, then derives a fallback from the persisted
 * `displaySections` so older favorites saved without a translation snapshot
 * (e.g. dictionary-only results) still surface their translation.
 */
export function resolveFavoriteTranslations(
  favorite: Pick<FavoriteWord, "translations" | "displaySections">,
): string[] | undefined {
  if (favorite.translations?.length) return favorite.translations;
  return deriveTranslationsFromSections(favorite.displaySections);
}

/**
 * Build a FavoriteWord from a completed query's shared info and its display
 * snapshot. The same word with different from/to directions is a distinct entry.
 */
export function buildFavoriteWord(info: QueryWordInfo, displaySections: readonly DisplaySection[]): FavoriteWord {
  return {
    word: info.word,
    fromLanguage: info.fromLanguage,
    toLanguage: info.toLanguage,
    isWord: info.isWord,
    translations: resolveFavoriteTranslations({ displaySections }),
    displaySections,
    createdAt: Date.now(),
  };
}

/**
 * Stable string identity for a favorite. Uses a NUL separator so a word can
 * never collide with another language code.
 */
export function favoriteKeyOf(favorite: Pick<FavoriteWord, "word" | "fromLanguage" | "toLanguage">): string {
  return `${favorite.word}\u0000${favorite.fromLanguage}\u0000${favorite.toLanguage}`;
}
