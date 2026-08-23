/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { FavoriteWord } from "@/types/favorite";

/**
 * Render all favorites as tab-separated `word \t translation` lines for the
 * "Copy All to Clipboard" action. Multiple translations are comma-joined;
 * favorites without translations yield an empty right-hand column.
 */
export function copyAllText(favorites: readonly FavoriteWord[]): string {
  return favorites.map((f) => `${f.word}\t${f.translations?.join(", ") ?? ""}`).join("\n");
}
