import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getRecentlyPlayed,
  addToRecentlyPlayed,
  clearRecentlyPlayed,
} from "../storage";

describe("storage utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("favorites", () => {
    it("should get favorites from LocalStorage", async () => {
      const mockFavorites = ["station1", "station2"];
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(mockFavorites));

      const result = await getFavorites();

      expect(LocalStorage.getItem).toHaveBeenCalledWith("somafm-favorites");
      expect(result).toEqual(mockFavorites);
    });

    it("should return empty array when no favorites exist", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);

      const result = await getFavorites();

      expect(result).toEqual([]);
    });

    it("should add a favorite", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(["station1"]));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      await addFavorite("station2");

      expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-favorites", JSON.stringify(["station1", "station2"]));
    });

    it("should not add duplicate favorites", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(["station1"]));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      await addFavorite("station1");

      expect(LocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("should remove a favorite", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(["station1", "station2"]));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      await removeFavorite("station1");

      expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-favorites", JSON.stringify(["station2"]));
    });

    it("should toggle favorite - add when not exists", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(["station1"]));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      const result = await toggleFavorite("station2");

      expect(result).toBe(true);
      expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-favorites", JSON.stringify(["station1", "station2"]));
    });

    it("should toggle favorite - remove when exists", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(["station1", "station2"]));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      const result = await toggleFavorite("station2");

      expect(result).toBe(false);
      expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-favorites", JSON.stringify(["station1"]));
    });
  });

  describe("recently played", () => {
    it("should get recently played from LocalStorage", async () => {
      const mockRecent = [
        { stationId: "station1", playedAt: "2024-01-01T00:00:00.000Z" },
        { stationId: "station2", playedAt: "2024-01-01T01:00:00.000Z" },
      ];
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(mockRecent));

      const result = await getRecentlyPlayed();

      expect(LocalStorage.getItem).toHaveBeenCalledWith("somafm-recently-played");
      expect(result).toEqual(mockRecent);
    });

    it("should add to recently played and remove duplicates", async () => {
      const existingRecent = [
        { stationId: "station1", playedAt: "2024-01-01T00:00:00.000Z" },
        { stationId: "station2", playedAt: "2024-01-01T01:00:00.000Z" },
      ];
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(existingRecent));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      // Mock Date to control the timestamp
      const mockDate = new Date("2024-01-01T02:00:00.000Z");
      vi.setSystemTime(mockDate);

      try {
        await addToRecentlyPlayed("station1");

        const expectedRecent = [
          { stationId: "station1", playedAt: mockDate.toISOString() },
          { stationId: "station2", playedAt: "2024-01-01T01:00:00.000Z" },
        ];

        expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-recently-played", JSON.stringify(expectedRecent));
      } finally {
        vi.useRealTimers();
      }
    });

    it("should limit recently played to 5 items", async () => {
      const existingRecent = Array.from({ length: 5 }, (_, i) => ({
        stationId: `station${i + 1}`,
        playedAt: `2024-01-0${i + 1}T00:00:00.000Z`,
      }));
      vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(existingRecent));
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      const mockDate = new Date("2024-01-06T00:00:00.000Z");
      vi.setSystemTime(mockDate);

      try {
        await addToRecentlyPlayed("station6");

        const savedData = vi.mocked(LocalStorage.setItem).mock.calls[0][1];
        const savedRecent = JSON.parse(savedData as string);

        expect(savedRecent).toHaveLength(5);
        expect(savedRecent[0].stationId).toBe("station6");
        expect(savedRecent[4].stationId).toBe("station4");
      } finally {
        vi.useRealTimers();
      }
    });

    it("should clear recently played", async () => {
      vi.mocked(LocalStorage.setItem).mockResolvedValue();

      await clearRecentlyPlayed();

      expect(LocalStorage.setItem).toHaveBeenCalledWith("somafm-recently-played", JSON.stringify([]));
    });
  });
});
