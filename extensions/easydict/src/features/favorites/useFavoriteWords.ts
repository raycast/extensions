/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { usePromise } from "@raycast/utils";

import type { QueryInput } from "@/core/results/types";

import { favoriteKeyOf, type FavoriteWord } from "./model";
import {
  clearFavoriteWords,
  readFavoriteWords,
  removeFavoriteWord,
  restoreFavoriteWords,
  restoreLegacyFavoriteWords,
  toggleFavoriteWord,
} from "./repository";

type FavoriteIdentity = Pick<QueryInput, "word" | "fromLanguage" | "toLanguage">;

export function useFavoriteWords() {
  const { data: state, isLoading, revalidate } = usePromise(readFavoriteWords);
  const favorites = state?.kind === "ready" ? state.favorites : [];

  async function update<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } finally {
      await revalidate();
    }
  }

  return {
    favorites,
    state,
    isLoading,
    revalidate,
    has: (identity: FavoriteIdentity) =>
      favorites.some((item) => favoriteKeyOf(item.query) === favoriteKeyOf(identity)),
    remove: (identity: FavoriteIdentity) => update(removeFavoriteWord(identity)),
    toggle: (entry: FavoriteWord) => update(toggleFavoriteWord(entry)),
    clear: () => update(clearFavoriteWords()),
    restore: (path: string) => update(restoreFavoriteWords(path)),
    restoreLegacy: () => update(restoreLegacyFavoriteWords()),
  };
}
