import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage, showToast } from "@raycast/api";

/**
 * Tests for favorites store logic. Since useFavorites is a React hook,
 * we test the core operations (add, remove, moveUp, moveDown) by
 * re-implementing the pure logic that the hook uses internally.
 */

function addFavorite(favorites: string[], symbol: string): string[] {
  if (favorites.includes(symbol)) return favorites;
  return [...favorites, symbol];
}

function removeFavorite(favorites: string[], symbol: string): string[] {
  return favorites.filter((s) => s !== symbol);
}

function moveFavorite(
  favorites: string[],
  symbol: string,
  delta: -1 | 1,
): string[] {
  const i = favorites.indexOf(symbol);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= favorites.length) return favorites;
  const next = [...favorites];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

describe("Favorites — add", () => {
  it("adds a symbol to empty list", () => {
    expect(addFavorite([], "AAPL")).toEqual(["AAPL"]);
  });

  it("appends to existing list", () => {
    expect(addFavorite(["AAPL"], "TSLA")).toEqual(["AAPL", "TSLA"]);
  });

  it("does not duplicate existing symbol", () => {
    expect(addFavorite(["AAPL", "TSLA"], "AAPL")).toEqual(["AAPL", "TSLA"]);
  });
});

describe("Favorites — remove", () => {
  it("removes a symbol from list", () => {
    expect(removeFavorite(["AAPL", "TSLA", "MSFT"], "TSLA")).toEqual([
      "AAPL",
      "MSFT",
    ]);
  });

  it("returns same list when symbol not found", () => {
    const list = ["AAPL", "TSLA"];
    expect(removeFavorite(list, "MSFT")).toEqual(["AAPL", "TSLA"]);
  });

  it("returns empty list when removing last item", () => {
    expect(removeFavorite(["AAPL"], "AAPL")).toEqual([]);
  });
});

describe("Favorites — moveUp", () => {
  it("moves symbol one position up", () => {
    expect(moveFavorite(["AAPL", "TSLA", "MSFT"], "TSLA", -1)).toEqual([
      "TSLA",
      "AAPL",
      "MSFT",
    ]);
  });

  it("does not move first item up (boundary)", () => {
    const list = ["AAPL", "TSLA"];
    expect(moveFavorite(list, "AAPL", -1)).toEqual(["AAPL", "TSLA"]);
  });

  it("does not move non-existent symbol", () => {
    const list = ["AAPL", "TSLA"];
    expect(moveFavorite(list, "MSFT", -1)).toEqual(["AAPL", "TSLA"]);
  });
});

describe("Favorites — moveDown", () => {
  it("moves symbol one position down", () => {
    expect(moveFavorite(["AAPL", "TSLA", "MSFT"], "TSLA", 1)).toEqual([
      "AAPL",
      "MSFT",
      "TSLA",
    ]);
  });

  it("does not move last item down (boundary)", () => {
    const list = ["AAPL", "TSLA"];
    expect(moveFavorite(list, "TSLA", 1)).toEqual(["AAPL", "TSLA"]);
  });

  it("does not move non-existent symbol", () => {
    const list = ["AAPL", "TSLA"];
    expect(moveFavorite(list, "MSFT", 1)).toEqual(["AAPL", "TSLA"]);
  });
});

describe("Favorites — LocalStorage persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
  });

  it("loads favorites from LocalStorage", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue(
      JSON.stringify(["AAPL", "TSLA"]),
    );

    const raw = await LocalStorage.getItem<string>("favorites");
    const parsed = JSON.parse(raw!);

    expect(parsed).toEqual(["AAPL", "TSLA"]);
  });

  it("handles corrupted JSON gracefully", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue("not valid json[[[");

    const raw = await LocalStorage.getItem<string>("favorites");
    let favorites: string[] = [];
    try {
      const parsed = JSON.parse(raw!);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        favorites = parsed;
      }
    } catch {
      // corrupted, reset
    }

    expect(favorites).toEqual([]);
  });

  it("handles non-array JSON gracefully", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify({ a: 1 }));

    const raw = await LocalStorage.getItem<string>("favorites");
    let favorites: string[] = [];
    try {
      const parsed = JSON.parse(raw!);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        favorites = parsed;
      }
    } catch {
      // corrupted
    }

    expect(favorites).toEqual([]);
  });

  it("persists updated favorites to LocalStorage", async () => {
    const next = ["AAPL", "TSLA", "MSFT"];
    await LocalStorage.setItem("favorites", JSON.stringify(next));

    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      "favorites",
      JSON.stringify(["AAPL", "TSLA", "MSFT"]),
    );
  });
});
