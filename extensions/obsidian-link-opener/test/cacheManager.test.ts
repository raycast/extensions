import { describe, it, expect, beforeEach, vi } from "vitest";
import { Cache } from "@raycast/api";
import { CacheManager } from "../src/services/cacheManager";
import { NoteWithUrl } from "../src/types";

// Mock Raycast API
vi.mock("@raycast/api", () => ({
  Cache: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  })),
}));

// Mock preferences - needs to be a function that returns the mock
vi.mock("../src/utils/preferences", () => ({
  getPreferences: () => ({
    cacheTTL: 5,
    urlProperties: ["url", "link", "website"],
    scanInterval: 60,
    useFrecency: true,
  }),
}));

// Mock fs promises
vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    promises: {
      ...actual.promises,
      stat: vi.fn(),
    },
  };
});

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock cache instance
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    };

    // Mock the Cache constructor to return our mock
    (Cache as any).mockImplementation(() => mockCache);

    cacheManager = new CacheManager();
  });

  describe("getCachedNotes", () => {
    it("should return null when cache is empty", async () => {
      mockCache.get.mockReturnValue(undefined);

      const result = await cacheManager.getCachedNotes("/test/vault");

      expect(result).toBeNull();
      expect(mockCache.get).toHaveBeenCalledWith("vault:/test/vault:index");
    });

    it("should return null when cache version is outdated", async () => {
      const outdatedCache = JSON.stringify({
        version: 0,
        vaultPath: "/test/vault",
        lastScanTime: Date.now(),
        directoryMtimes: {},
        files: {},
      });

      mockCache.get.mockReturnValue(outdatedCache);

      const result = await cacheManager.getCachedNotes("/test/vault");

      expect(result).toBeNull();
      expect(mockCache.remove).toHaveBeenCalledWith("vault:/test/vault:index");
    });

    it("should return cached notes when cache is valid and not expired", async () => {
      const validCache = {
        version: 1,
        vaultPath: "/test/vault",
        lastScanTime: Date.now() - 1000, // 1 second ago
        directoryMtimes: { "/test/vault": Date.now() },
        files: {
          "/test/vault/note1.md": {
            path: "note1.md",
            size: 100,
            mtime: Date.now(),
            urls: [{ property: "homepage", value: "https://example.com" }],
          },
        },
      };

      mockCache.get.mockReturnValue(JSON.stringify(validCache));

      const result = await cacheManager.getCachedNotes("/test/vault");

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].url).toBe("https://example.com");
      expect(result![0].urlSource).toBe("homepage");
    });

    it("should return null when cache TTL is expired and directory changed", async () => {
      const { promises: fs } = await import("fs");
      const expiredCache = {
        version: 1,
        vaultPath: "/test/vault",
        lastScanTime: Date.now() - 6 * 60 * 1000, // 6 minutes ago (TTL is 5 minutes)
        directoryMtimes: { "/test/vault": 1000 },
        files: {},
      };

      mockCache.get.mockReturnValue(JSON.stringify(expiredCache));
      // Directory mtime has changed (2000 vs cached 1000)
      (fs.stat as any).mockResolvedValue({ mtime: { getTime: () => 2000 } });

      const result = await cacheManager.getCachedNotes("/test/vault");

      // Should return null because directory changed
      expect(result).toBeNull();
    });
  });

  describe("setCachedNotes", () => {
    it("should store notes in cache with correct structure", async () => {
      const notes: NoteWithUrl[] = [
        {
          id: "note1-homepage",
          title: "Note 1",
          path: "note1.md",
          vault: "/test/vault",
          frontmatter: {},
          lastModified: new Date(),
          url: "https://example.com",
          urlSource: "homepage",
        },
      ];

      const directoryMtimes = { "/test/vault": Date.now() };
      const fileStats = new Map([
        ["/test/vault/note1.md", { size: 100, mtime: Date.now() }],
      ]);

      await cacheManager.setCachedNotes(
        "/test/vault",
        notes,
        directoryMtimes,
        fileStats
      );

      expect(mockCache.set).toHaveBeenCalled();
      const [key, value] = mockCache.set.mock.calls[0];
      expect(key).toBe("vault:/test/vault:index");

      const cached = JSON.parse(value);
      expect(cached.version).toBe(1);
      expect(cached.vaultPath).toBe("/test/vault");
      expect(cached.files["/test/vault/note1.md"]).toBeDefined();
      expect(cached.files["/test/vault/note1.md"].urls).toHaveLength(1);
    });
  });

  describe("clearCache", () => {
    it("should remove cache for specific vault", () => {
      cacheManager.clearCache("/test/vault");

      expect(mockCache.remove).toHaveBeenCalledWith("vault:/test/vault:index");
    });
  });

  describe("clearAllCaches", () => {
    it("should clear all caches", () => {
      cacheManager.clearAllCaches();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe("getInvalidatedFiles", () => {
    it("should return all files when no cache exists", async () => {
      mockCache.get.mockReturnValue(undefined);

      const currentFiles = new Set([
        "/test/vault/note1.md",
        "/test/vault/note2.md",
      ]);
      const result = await cacheManager.getInvalidatedFiles(
        "/test/vault",
        currentFiles
      );

      expect(result.toUpdate).toEqual(Array.from(currentFiles));
      expect(result.toRemove).toEqual([]);
      expect(result.cachedFiles.size).toBe(0);
    });

    it("should identify modified files", async () => {
      const { promises: fs } = await import("fs");
      const cache = {
        version: 1,
        vaultPath: "/test/vault",
        lastScanTime: Date.now(),
        directoryMtimes: {},
        files: {
          "/test/vault/note1.md": {
            path: "note1.md",
            size: 100,
            mtime: 1000,
            urls: [],
          },
        },
      };

      mockCache.get.mockReturnValue(JSON.stringify(cache));
      (fs.stat as any).mockResolvedValue({
        size: 200, // Different size
        mtime: { getTime: () => 2000 }, // Different mtime
      });

      const currentFiles = new Set(["/test/vault/note1.md"]);
      const result = await cacheManager.getInvalidatedFiles(
        "/test/vault",
        currentFiles
      );

      expect(result.toUpdate).toContain("/test/vault/note1.md");
    });

    it("should identify removed files", async () => {
      const cache = {
        version: 1,
        vaultPath: "/test/vault",
        lastScanTime: Date.now(),
        directoryMtimes: {},
        files: {
          "/test/vault/note1.md": {
            path: "note1.md",
            size: 100,
            mtime: 1000,
            urls: [],
          },
          "/test/vault/note2.md": {
            path: "note2.md",
            size: 100,
            mtime: 1000,
            urls: [],
          },
        },
      };

      mockCache.get.mockReturnValue(JSON.stringify(cache));

      const currentFiles = new Set(["/test/vault/note1.md"]); // note2.md is missing
      const result = await cacheManager.getInvalidatedFiles(
        "/test/vault",
        currentFiles
      );

      expect(result.toRemove).toContain("/test/vault/note2.md");
    });
  });
});
