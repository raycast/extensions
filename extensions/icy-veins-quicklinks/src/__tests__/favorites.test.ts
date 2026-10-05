import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  showHUD: vi.fn(),
}));

import { LocalStorage } from "@raycast/api";
import {
  getFavoriteSlugs,
  getFavoriteSpecs,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from "../utils/favorites";

const mockStorage = LocalStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.setItem.mockResolvedValue(undefined);
});

describe("getFavoriteSlugs()", () => {
  it("returns empty array when nothing stored", async () => {
    mockStorage.getItem.mockResolvedValue(undefined);
    expect(await getFavoriteSlugs()).toEqual([]);
  });

  it("returns parsed slugs from storage", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify(["shadow-priest", "havoc-demon-hunter"]),
    );
    expect(await getFavoriteSlugs()).toEqual([
      "shadow-priest",
      "havoc-demon-hunter",
    ]);
  });

  it("returns empty array on malformed JSON", async () => {
    mockStorage.getItem.mockResolvedValue("not-json");
    expect(await getFavoriteSlugs()).toEqual([]);
  });
});

describe("getFavoriteSpecs()", () => {
  it("returns SpecEntry objects for valid slugs", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify(["shadow-priest", "havoc-demon-hunter"]),
    );
    const result = await getFavoriteSpecs();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("shadow-priest");
    expect(result[1].slug).toBe("havoc-demon-hunter");
  });

  it("silently filters out unknown slugs", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify(["not-a-real-spec", "shadow-priest"]),
    );
    const result = await getFavoriteSpecs();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("shadow-priest");
  });

  it("returns empty array when storage is empty", async () => {
    mockStorage.getItem.mockResolvedValue(undefined);
    expect(await getFavoriteSpecs()).toHaveLength(0);
  });
});

describe("isFavorite()", () => {
  it("returns true when slug is in favorites", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(["shadow-priest"]));
    expect(await isFavorite("shadow-priest")).toBe(true);
  });

  it("returns false when slug is not in favorites", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(["shadow-priest"]));
    expect(await isFavorite("havoc-demon-hunter")).toBe(false);
  });
});

describe("addFavorite()", () => {
  it("prepends new slug to favorites", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(["shadow-priest"]));
    await addFavorite("havoc-demon-hunter");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "favorites",
      JSON.stringify(["havoc-demon-hunter", "shadow-priest"]),
    );
  });

  it("does not add duplicate slugs", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(["shadow-priest"]));
    await addFavorite("shadow-priest");
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("caps at 5 favorites", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify(["a", "b", "c", "d", "e"]),
    );
    await addFavorite("shadow-priest");
    const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(5);
    expect(saved[0]).toBe("shadow-priest");
  });
});

describe("removeFavorite()", () => {
  it("removes the specified slug", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify(["shadow-priest", "havoc-demon-hunter"]),
    );
    await removeFavorite("shadow-priest");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "favorites",
      JSON.stringify(["havoc-demon-hunter"]),
    );
  });
});

describe("toggleFavorite()", () => {
  it("adds when not favorited", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    await toggleFavorite("shadow-priest");
    const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(saved).toContain("shadow-priest");
  });

  it("removes when already favorited", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(["shadow-priest"]));
    await toggleFavorite("shadow-priest");
    const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(saved).not.toContain("shadow-priest");
  });
});
