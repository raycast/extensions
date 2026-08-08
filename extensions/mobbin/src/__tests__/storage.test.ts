import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenReference, SearchOptions } from "../lib/types";

const mocks = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    localStorage: {
      getItem: vi.fn(async (key: string) => values.get(key)),
      setItem: vi.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        values.delete(key);
      }),
    },
    cacheFavoriteImage: vi.fn(async () => "/support/favorites/screen.webp"),
    removeFavoriteImage: vi.fn(async () => undefined),
    validateFavoriteImagePath: vi.fn(
      async (value: string): Promise<string | undefined> => value,
    ),
  };
});

vi.mock("@raycast/api", () => ({ LocalStorage: mocks.localStorage }));
vi.mock("../lib/image-cache", () => ({
  cacheFavoriteImage: mocks.cacheFavoriteImage,
  removeFavoriteImage: mocks.removeFavoriteImage,
  validateFavoriteImagePath: mocks.validateFavoriteImagePath,
}));

import {
  addSearchHistory,
  getFavorites,
  getSearchHistory,
  toggleFavorite,
} from "../lib/storage";

const options: SearchOptions = {
  kind: "screen",
  query: "Login Screen",
  platform: "ios",
  mode: "deep",
  imageQuality: "optimized",
  mcpImageFormat: "webp",
  limit: 20,
  excludeScreenIds: ["excluded"],
};

const screen: ScreenReference = {
  kind: "screen",
  id: "screen-1",
  title: "Login",
  appName: "Example",
  platform: "ios",
  source: "api",
  mobbinUrl: "https://mobbin.com/screen-1",
  image: { url: "https://example.com/screen.webp" },
};

describe("storage", () => {
  beforeEach(() => {
    mocks.values.clear();
    vi.clearAllMocks();
  });

  it("migrates legacy history and favorites without invalid records", async () => {
    mocks.values.set(
      "mobbin.searchHistory",
      JSON.stringify([
        {
          id: "old-history",
          query: "checkout",
          platform: "web",
          mode: "fast",
          image_quality: "high",
          limit: 50,
          createdAt: "2025-01-01T00:00:00Z",
        },
        { bad: true },
      ]),
    );
    mocks.values.set(
      "mobbin.favorites",
      JSON.stringify([
        {
          id: "old-screen",
          image_url: "https://example.com/old.webp",
          mobbin_url: "https://mobbin.com/old",
          app_name: "Legacy",
          platform: "ios",
          source: "api",
          favoritedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    );

    await expect(getSearchHistory()).resolves.toEqual([
      expect.objectContaining({
        kind: "screen",
        query: "checkout",
        mode: "standard",
        imageQuality: "high",
        mcpImageFormat: "webp",
      }),
    ]);
    await expect(getFavorites()).resolves.toEqual([
      expect.objectContaining({
        kind: "screen",
        appName: "Legacy",
        image: { url: "https://example.com/old.webp" },
      }),
    ]);
    expect(mocks.values.get("mobbin.storageVersion")).toBe("2");
    expect(mocks.localStorage.removeItem).toHaveBeenCalledWith(
      "mobbin.debug.logs",
    );
  });

  it("recovers safely from corrupt storage", async () => {
    mocks.values.set("mobbin.storageVersion", "2");
    mocks.values.set("mobbin.searchHistory", "{not-json");
    mocks.values.set("mobbin.favorites", JSON.stringify({ not: "array" }));
    await expect(getSearchHistory()).resolves.toEqual([]);
    await expect(getFavorites()).resolves.toEqual([]);
  });

  it("deduplicates full-option history and resets exclusions", async () => {
    await addSearchHistory(options);
    await addSearchHistory({ ...options, query: " login screen " });
    const history = await getSearchHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.excludeScreenIds).toEqual([]);

    await addSearchHistory({ ...options, platform: "web" });
    await expect(getSearchHistory()).resolves.toHaveLength(2);
  });

  it("caps history at 20 without imposing a favorites limit", async () => {
    for (let index = 0; index < 21; index += 1) {
      await addSearchHistory({
        ...options,
        query: `query ${index}`,
      });
    }
    await expect(getSearchHistory()).resolves.toHaveLength(20);

    mocks.values.set(
      "mobbin.favorites",
      JSON.stringify(
        Array.from({ length: 21 }, (_, index) => ({
          ...screen,
          id: `screen-${index}`,
          favoritedAt: "2025-01-01T00:00:00Z",
        })),
      ),
    );
    await expect(getFavorites()).resolves.toHaveLength(21);
  });

  it("caches favorite images and deletes them when unfavorited", async () => {
    await expect(toggleFavorite(screen)).resolves.toEqual({
      added: true,
      localPath: "/support/favorites/screen.webp",
    });
    await expect(getFavorites()).resolves.toEqual([
      expect.objectContaining({
        id: "screen-1",
        image: expect.objectContaining({
          localPath: "/support/favorites/screen.webp",
        }),
      }),
    ]);

    await expect(toggleFavorite(screen)).resolves.toEqual({ added: false });
    expect(mocks.removeFavoriteImage).toHaveBeenCalledWith(
      "/support/favorites/screen.webp",
    );
    await expect(getFavorites()).resolves.toEqual([]);
  });

  it("keeps the favorite when offline caching fails", async () => {
    mocks.cacheFavoriteImage.mockRejectedValueOnce(new Error("offline"));
    await expect(toggleFavorite(screen)).resolves.toMatchObject({
      added: true,
      cacheWarning: expect.any(String),
    });
    await expect(getFavorites()).resolves.toHaveLength(1);
  });

  it("ignores missing or unsafe cached favorite paths", async () => {
    mocks.values.set("mobbin.storageVersion", "2");
    mocks.values.set(
      "mobbin.favorites",
      JSON.stringify([
        {
          ...screen,
          image: { ...screen.image, localPath: "/tmp/not-a-favorite.png" },
          favoritedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    );
    mocks.validateFavoriteImagePath.mockImplementationOnce(
      async () => undefined,
    );
    const favorites = await getFavorites();
    expect(favorites[0]?.image.localPath).toBeUndefined();
    expect(favorites[0]?.image.url).toBe(screen.image.url);
  });
});
