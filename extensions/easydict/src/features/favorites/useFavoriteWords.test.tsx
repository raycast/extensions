// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QueryInput } from "@/core/results/types";

import type { FavoriteWord } from "./model";
import { useFavoriteWords } from "./useFavoriteWords";

const storage = vi.hoisted(() => new Map<string, string>());
const failures = vi.hoisted(() => ({ write: false }));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => storage.get(key),
    setItem: async (key: string, value: string) => {
      if (failures.write) throw new Error("storage write failed");
      storage.set(key, value);
    },
  },
  LaunchType: { Background: "background" },
  environment: { launchType: "userInitiated", commandMode: "view" },
}));

const KEY = "favorite-content-v1";
const query = { word: "serendipity", fromLanguage: "en", toLanguage: "zh-CHS" };
const makeFavorite = (overrides: Partial<QueryInput> = {}): FavoriteWord => ({
  query: { ...query, ...overrides },
  services: [],
  createdAt: 1,
});
const envelope = (favorites: FavoriteWord[]) => JSON.stringify({ version: 1, favorites });

beforeEach(() => {
  storage.clear();
  failures.write = false;
});
afterEach(cleanup);

describe("useFavoriteWords", () => {
  it("exposes loading until the empty stored collection is read", async () => {
    const { result } = renderHook(() => useFavoriteWords());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.state?.kind).toBe("ready");
    expect(result.current.favorites).toEqual([]);
  });

  it("updates a captured toggle callback from persisted data and restores the list after remount", async () => {
    const { result, unmount } = await renderLoadedFavorites();
    const toggle = result.current.toggle;
    const alpha = makeFavorite({ word: "alpha" });
    const beta = makeFavorite({ word: "beta" });
    await act(() => toggle(alpha));
    await act(() => toggle(beta));
    expect(result.current.favorites).toEqual([beta, alpha]);
    expect(storage.get(KEY)).toBe(envelope([beta, alpha]));
    unmount();
    const restored = await renderLoadedFavorites();
    expect(restored.result.current.favorites).toEqual([beta, alpha]);
  });

  it("checks and removes only the requested word and language direction", async () => {
    const { result } = await renderLoadedFavorites();
    const forward = makeFavorite({ word: "alpha" });
    const reverse = makeFavorite({ word: "alpha", fromLanguage: "zh-CHS", toLanguage: "en" });
    await act(() => result.current.toggle(forward));
    await act(() => result.current.toggle(reverse));
    expect(result.current.has(forward.query)).toBe(true);
    expect(result.current.has(reverse.query)).toBe(true);
    expect(result.current.has({ ...forward.query, word: "beta" })).toBe(false);
    await act(() => result.current.remove(forward.query));
    expect(result.current.has(forward.query)).toBe(false);
    expect(result.current.favorites).toEqual([reverse]);
    await act(() => result.current.toggle(reverse));
    expect(result.current.favorites).toEqual([]);
  });

  it("reloads the new authoritative collection when an older page modifies favorites", async () => {
    const old = JSON.stringify([{ ...query, createdAt: 1, displaySections: [] }]);
    storage.set("favorite-words", old);
    const { result } = await renderLoadedFavorites();
    const toggle = result.current.toggle;
    const remote = makeFavorite({ word: "remote" });
    const local = makeFavorite({ word: "local" });
    storage.set(KEY, envelope([remote]));
    await act(() => toggle(local));
    expect(result.current.favorites).toEqual([local, remote]);
    expect(storage.get("favorite-words")).toBe(old);
  });

  it("exposes invalid storage and refuses to replace it when adding a word", async () => {
    const original = JSON.stringify({ version: 1, favorites: [makeFavorite(), { query: "broken" }] });
    storage.set(KEY, original);
    const { result } = await renderLoadedFavorites();
    expect(result.current.state?.kind).toBe("invalid");
    await act(async () => {
      await expect(result.current.toggle(makeFavorite())).rejects.toThrow();
    });
    expect(storage.get(KEY)).toBe(original);
    expect(result.current.favorites).toEqual([]);
  });

  it("retains the last persisted list when a write fails", async () => {
    const saved = makeFavorite();
    storage.set(KEY, envelope([saved]));
    const { result } = await renderLoadedFavorites();
    failures.write = true;
    await act(async () => {
      await expect(result.current.clear()).rejects.toThrow("storage write failed");
    });
    expect(result.current.favorites).toEqual([saved]);
    expect(result.current.state?.kind).toBe("ready");
    expect(storage.get(KEY)).toBe(envelope([saved]));
  });
});

async function renderLoadedFavorites() {
  const rendered = renderHook(() => useFavoriteWords());
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
}
