import { describe, expect, it } from "vitest";
import {
  RECENT_LIMIT,
  addRecentId,
  decodeStoredIds,
  sanitizeStoredIds,
  toggleFavoriteId,
} from "../src/lib/collection-logic";

describe("collection metadata", () => {
  it("decodes only arrays of string IDs", () => {
    expect(decodeStoredIds('["a",2,"b",null]')).toEqual(["a", "b"]);
    expect(decodeStoredIds("invalid json")).toEqual([]);
    expect(decodeStoredIds(42)).toEqual([]);
  });

  it("removes stale and duplicate IDs", () => {
    expect(sanitizeStoredIds(["a", "missing", "a", "b"], new Set(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("adds and removes favorites at the front", () => {
    expect(toggleFavoriteId(["a"], "b")).toEqual({ ids: ["b", "a"], isFavorite: true });
    expect(toggleFavoriteId(["b", "a"], "b")).toEqual({ ids: ["a"], isFavorite: false });
  });

  it("deduplicates and caps recent IDs", () => {
    const existing = Array.from({ length: RECENT_LIMIT }, (_, index) => `id-${index}`);
    expect(addRecentId(existing, "id-10").slice(0, 3)).toEqual(["id-10", "id-0", "id-1"]);
    expect(addRecentId(existing, "new-id")).toHaveLength(RECENT_LIMIT);
    expect(addRecentId(existing, "new-id")[0]).toBe("new-id");
  });
});
