// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import type * as ReactTypes from "react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteWord } from "@/types/favorite";

import { useFavoriteWords } from "./useFavoriteWords";

/**
 * Hoisted bindings backing the mocked useLocalStorage. vi.hoisted runs before
 * the vi.mock factory, so the factory can safely reference these. The React
 * hooks are resolved lazily (after imports complete) to avoid hoisting TDZ.
 */
const ctx = vi.hoisted(() => {
  const map = new Map<string, unknown>();
  // populated after `react` has been imported, before any hook is rendered
  let reactHooks: typeof ReactTypes | null = null;
  const setReactHooks = (h: typeof ReactTypes) => {
    reactHooks = h;
  };
  const getReactHooks = (): typeof ReactTypes => {
    if (!reactHooks) throw new Error("react hooks not initialized");
    return reactHooks;
  };
  return { map, setReactHooks, getReactHooks };
});
ctx.setReactHooks(React);

/**
 * In-memory, per-key stand-in for @raycast/utils useLocalStorage.
 * Mirrors the real API the hook relies on: setValue takes a plain value
 * (not an updater) and updates only the calling hook instance.
 */
vi.mock("@raycast/utils", () => ({
  useLocalStorage: function useLocalStorage<T>(key: string, initialValue?: T) {
    const { useState, useCallback } = ctx.getReactHooks();
    const [value, setValueState] = useState<T | undefined>(ctx.map.has(key) ? (ctx.map.get(key) as T) : initialValue);

    const setValue = useCallback(
      (next: T) => {
        ctx.map.set(key, next);
        setValueState(next);
      },
      [key],
    );

    const removeValue = useCallback(() => {
      ctx.map.delete(key);
      setValueState(undefined);
    }, [key]);

    return { value, setValue, removeValue, isLoading: false };
  },
}));

const FAVORITE_WORDS_KEY = "favorite-words";

function resetStore() {
  ctx.map.clear();
}

function peekStore<T>(key: string): T | undefined {
  return ctx.map.get(key) as T | undefined;
}

function makeFavorite(overrides: Partial<FavoriteWord> = {}): FavoriteWord {
  return {
    word: "serendipity",
    fromLanguage: "en",
    toLanguage: "zh-CHS",
    displaySections: [],
    createdAt: 1,
    ...overrides,
  };
}

beforeEach(resetStore);
afterEach(cleanup);

describe("useFavoriteWords", () => {
  it("starts empty and reports not-loading", () => {
    const { result } = renderHook(() => useFavoriteWords());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("toggle inserts at the front and persists", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    expect(result.current.favorites.map((f) => f.word)).toEqual(["alpha"]);
    expect(peekStore<FavoriteWord[]>(FAVORITE_WORDS_KEY)?.map((f) => f.word)).toEqual(["alpha"]);
  });

  it("toggle removes when the key already exists (dedup by word + direction)", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    expect(result.current.favorites).toEqual([]);
  });

  it("treats the same word in a different direction as a separate favorite", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha", fromLanguage: "en", toLanguage: "zh-CHS" })));
    act(() => result.current.toggle(makeFavorite({ word: "alpha", fromLanguage: "zh-CHS", toLanguage: "en" })));
    expect(result.current.favorites).toHaveLength(2);
  });

  it("has returns true only for a matching key", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    expect(result.current.has({ word: "alpha", fromLanguage: "en", toLanguage: "zh-CHS" })).toBe(true);
    expect(result.current.has({ word: "alpha", fromLanguage: "zh-CHS", toLanguage: "en" })).toBe(false);
    expect(result.current.has({ word: "beta", fromLanguage: "en", toLanguage: "zh-CHS" })).toBe(false);
  });

  it("remove drops only the matching key", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    act(() => result.current.toggle(makeFavorite({ word: "beta" })));
    act(() => result.current.remove({ word: "alpha", fromLanguage: "en", toLanguage: "zh-CHS" }));
    expect(result.current.favorites.map((f) => f.word)).toEqual(["beta"]);
  });

  it("clear empties the store", () => {
    const { result } = renderHook(() => useFavoriteWords());
    act(() => result.current.toggle(makeFavorite({ word: "alpha" })));
    act(() => result.current.clear());
    expect(result.current.favorites).toEqual([]);
    expect(peekStore(FAVORITE_WORDS_KEY)).toEqual([]);
  });
});
