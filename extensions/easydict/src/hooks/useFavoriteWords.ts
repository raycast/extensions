/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useLocalStorage } from "@raycast/utils";
import { useRef } from "react";

import { favoriteKeyOf, type FavoriteWord } from "@/types/favorite";

type FavoriteIdentity = Pick<FavoriteWord, "word" | "fromLanguage" | "toLanguage">;

/**
 * LocalStorage key holding the persisted favorites array.
 */
const FAVORITE_WORDS_KEY = "favorite-words";

/**
 * Reactive favorites store backed by Raycast `LocalStorage`.
 *
 * `useLocalStorage.setValue` accepts a plain value rather than an updater, so
 * mutations read the latest rendered array from `latestRef` instead of closing
 * over the value from the render that created the callback.
 */
export function useFavoriteWords() {
  const { value, setValue, isLoading } = useLocalStorage<FavoriteWord[]>(FAVORITE_WORDS_KEY, []);
  const favorites = value ?? [];
  // Always-current snapshot; updated every render, read by mutations.
  const latestRef = useRef(favorites);
  latestRef.current = favorites;

  const has = (identity: FavoriteIdentity): boolean =>
    latestRef.current.some((f) => favoriteKeyOf(f) === favoriteKeyOf(identity));

  const remove = (identity: FavoriteIdentity): void => {
    setValue(latestRef.current.filter((f) => favoriteKeyOf(f) !== favoriteKeyOf(identity)));
  };

  const toggle = (entry: FavoriteWord): void => {
    const current = latestRef.current;
    setValue(
      current.some((f) => favoriteKeyOf(f) === favoriteKeyOf(entry))
        ? current.filter((f) => favoriteKeyOf(f) !== favoriteKeyOf(entry))
        : [entry, ...current],
    );
  };

  const clear = (): void => {
    setValue([]);
  };

  return { favorites, isLoading, has, remove, toggle, clear };
}
