import { describe, it, expect } from "vitest";
import { filterValidFavorites, parseFavorites, createEmptyFavorites, createFavoritesData } from "./favorites-utils";
import type { FavoritesData } from "../types";

describe("favorites-utils", () => {
  describe("parseFavorites", () => {
    it("parses valid JSON to FavoritesData", () => {
      const json = JSON.stringify({
        linkIds: ["link-1", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      });

      const result = parseFavorites(json);

      expect(result).toEqual({
        linkIds: ["link-1", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      });
    });

    it("returns null for invalid JSON", () => {
      expect(parseFavorites("not-valid-json")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseFavorites("")).toBeNull();
    });

    it("parses empty favorites", () => {
      const json = JSON.stringify({ linkIds: [], validatedAt: "2025-12-17T10:00:00Z" });

      const result = parseFavorites(json);

      expect(result?.linkIds).toEqual([]);
    });
  });

  describe("filterValidFavorites", () => {
    it("removes stale favorites not in valid set", () => {
      const favorites: FavoritesData = {
        linkIds: ["link-1", "link-2", "link-3"],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      // Only link-1 is valid
      const validIds = new Set(["link-1"]);
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual(["link-1"]);
      expect(result.removedCount).toBe(2);
    });

    it("keeps all favorites when all are valid", () => {
      const favorites: FavoritesData = {
        linkIds: ["link-1", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      const validIds = new Set(["link-1", "link-2", "link-3"]);
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual(["link-1", "link-2"]);
      expect(result.removedCount).toBe(0);
    });

    it("removes all favorites when none are valid", () => {
      const favorites: FavoritesData = {
        linkIds: ["link-1", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      const validIds = new Set(["link-3", "link-4"]);
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual([]);
      expect(result.removedCount).toBe(2);
    });

    it("handles empty favorites", () => {
      const favorites: FavoritesData = {
        linkIds: [],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      const validIds = new Set(["link-1", "link-2"]);
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual([]);
      expect(result.removedCount).toBe(0);
    });

    it("handles empty valid set", () => {
      const favorites: FavoritesData = {
        linkIds: ["link-1", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      const validIds = new Set<string>();
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual([]);
      expect(result.removedCount).toBe(2);
    });

    it("preserves order of valid favorites", () => {
      const favorites: FavoritesData = {
        linkIds: ["link-3", "link-1", "link-5", "link-2"],
        validatedAt: "2025-12-17T10:00:00Z",
      };

      const validIds = new Set(["link-1", "link-5"]);
      const result = filterValidFavorites(favorites, validIds);

      expect(result.validFavorites).toEqual(["link-1", "link-5"]);
    });
  });

  describe("createEmptyFavorites", () => {
    it("returns empty favorites with current timestamp", () => {
      const before = new Date().toISOString();
      const result = createEmptyFavorites();
      const after = new Date().toISOString();

      expect(result.linkIds).toEqual([]);
      expect(result.validatedAt >= before).toBe(true);
      expect(result.validatedAt <= after).toBe(true);
    });
  });

  describe("createFavoritesData", () => {
    it("creates favorites with given link IDs", () => {
      const before = new Date().toISOString();
      const result = createFavoritesData(["link-1", "link-2"]);
      const after = new Date().toISOString();

      expect(result.linkIds).toEqual(["link-1", "link-2"]);
      expect(result.validatedAt >= before).toBe(true);
      expect(result.validatedAt <= after).toBe(true);
    });

    it("creates favorites with empty array", () => {
      const result = createFavoritesData([]);

      expect(result.linkIds).toEqual([]);
    });

    it("preserves link ID order", () => {
      const result = createFavoritesData(["z-link", "a-link", "m-link"]);

      expect(result.linkIds).toEqual(["z-link", "a-link", "m-link"]);
    });
  });
});
