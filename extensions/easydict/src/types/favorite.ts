/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { TranslationType } from "./api";
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

/**
 * Derive the best preview translations from a query's display sections: the
 * copyText of the first TranslationType section's first item, split into lines.
 * Returns undefined when no translation section is present.
 */
function deriveTranslations(displaySections: readonly DisplaySection[]): string[] | undefined {
  const item = displaySections.find((s) => isTranslationType(s.type))?.items?.[0];
  if (!item?.copyText) return undefined;
  const lines = item.copyText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
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
 * Build a FavoriteWord from a completed query's shared info and its display
 * snapshot. The same word with different from/to directions is a distinct entry.
 */
export function buildFavoriteWord(info: QueryWordInfo, displaySections: readonly DisplaySection[]): FavoriteWord {
  return {
    word: info.word,
    fromLanguage: info.fromLanguage,
    toLanguage: info.toLanguage,
    isWord: info.isWord,
    translations: deriveTranslations(displaySections),
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
