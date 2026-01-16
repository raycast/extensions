import { Cache } from "@raycast/api";
import { clearMockCache } from "../../__mocks__/@raycast/api";
import { readCache, writeCache, getCacheAge, shouldRefresh, getLastRefreshDate } from "../cache";
import { DocEntry } from "../../types/DocEntry";
import { DjangoVersion } from "../../constants";

describe("cache", () => {
  let cache: Cache;

  beforeEach(() => {
    clearMockCache();
    cache = new Cache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearMockCache();
  });

  describe("readCache", () => {
    it("should return null when cache is empty", () => {
      const result = readCache("5.0");

      expect(result).toBeNull();
    });

    it("should read and deserialize cached entries", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page1",
          title: "Page 1",
          content: "Content 1",
          parent: null,
          previous: null,
          next: null,
        },
        {
          url: "https://example.com/page2",
          title: "Page 2",
          content: "Content 2",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);
      const result = readCache("5.0");

      expect(result).toHaveLength(2);
      expect(result?.[0]).toMatchObject({
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
      });
      expect(result?.[1]).toMatchObject({
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
      });
    });

    it("should restore parent references correctly", () => {
      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: null,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      writeCache("5.0", [parent, child]);
      const result = readCache("5.0");

      expect(result).toHaveLength(2);
      expect(result?.[1].parent?.url).toBe("https://example.com/parent");
      expect(result?.[1].parent?.title).toBe("Parent");
    });

    it("should restore previous and next references correctly", () => {
      const entry1: DocEntry = {
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
        parent: null,
        previous: null,
        next: null,
      };

      const entry2: DocEntry = {
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
        parent: null,
        previous: entry1,
        next: null,
      };

      entry1.next = entry2;

      writeCache("5.0", [entry1, entry2]);
      const result = readCache("5.0");

      expect(result).toHaveLength(2);
      expect(result?.[0].next?.url).toBe("https://example.com/page2");
      expect(result?.[1].previous?.url).toBe("https://example.com/page1");
    });

    it("should handle circular references between entries", () => {
      const entry1: DocEntry = {
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
        parent: null,
        previous: null,
        next: null,
      };

      const entry2: DocEntry = {
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
        parent: null,
        previous: entry1,
        next: null,
      };

      entry1.next = entry2;

      writeCache("5.0", [entry1, entry2]);
      const result = readCache("5.0");

      expect(result?.[0].next).toBe(result?.[1]);
      expect(result?.[1].previous).toBe(result?.[0]);
    });

    it("should return null when cache contains invalid JSON", () => {
      cache.set("django-docs-5.0", "invalid json{");

      const result = readCache("5.0");

      expect(result).toBeNull();
    });

    it("should handle missing referenced URLs gracefully", () => {
      const cacheData = {
        entries: [
          {
            url: "https://example.com/page1",
            title: "Page 1",
            content: "Content 1",
            parentUrl: "https://example.com/nonexistent",
            previousUrl: null,
            nextUrl: null,
          },
        ],
        lastRefresh: Date.now(),
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));
      const result = readCache("5.0");

      expect(result).toHaveLength(1);
      expect(result?.[0].parent).toBeNull();
    });

    it("should cache entries for different Django versions independently", () => {
      const entries50: DocEntry[] = [
        {
          url: "https://example.com/5.0/page",
          title: "5.0 Page",
          content: "5.0 Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      const entries51: DocEntry[] = [
        {
          url: "https://example.com/5.1/page",
          title: "5.1 Page",
          content: "5.1 Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries50);
      writeCache("5.1", entries51);

      const result50 = readCache("5.0");
      const result51 = readCache("5.1");

      expect(result50?.[0].url).toBe("https://example.com/5.0/page");
      expect(result51?.[0].url).toBe("https://example.com/5.1/page");
    });

    it("should handle empty entries array", () => {
      writeCache("5.0", []);
      const result = readCache("5.0");

      expect(result).toEqual([]);
    });

    it("should handle entries with complex parent-child hierarchies", () => {
      const grandparent: DocEntry = {
        url: "https://example.com/grandparent",
        title: "Grandparent",
        content: "Grandparent content",
        parent: null,
        previous: null,
        next: null,
      };

      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: grandparent,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      writeCache("5.0", [grandparent, parent, child]);
      const result = readCache("5.0");

      expect(result?.[2].parent?.url).toBe("https://example.com/parent");
      expect(result?.[1].parent?.url).toBe("https://example.com/grandparent");
      expect(result?.[0].parent).toBeNull();
    });
  });

  describe("writeCache", () => {
    it("should serialize and store entries in cache", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page1",
          title: "Page 1",
          content: "Content 1",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const cachedData = cache.get("django-docs-5.0");
      expect(cachedData).toBeDefined();

      const parsed = JSON.parse(cachedData!);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].url).toBe("https://example.com/page1");
      expect(parsed.lastRefresh).toBeCloseTo(Date.now(), -2);
    });

    it("should store parent URL references", () => {
      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: null,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      writeCache("5.0", [parent, child]);

      const cachedData = cache.get("django-docs-5.0");
      const parsed = JSON.parse(cachedData!);

      expect(parsed.entries[1].parentUrl).toBe("https://example.com/parent");
      expect(parsed.entries[0].parentUrl).toBeNull();
    });

    it("should store previous and next URL references", () => {
      const entry1: DocEntry = {
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
        parent: null,
        previous: null,
        next: null,
      };

      const entry2: DocEntry = {
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
        parent: null,
        previous: entry1,
        next: null,
      };

      entry1.next = entry2;

      writeCache("5.0", [entry1, entry2]);

      const cachedData = cache.get("django-docs-5.0");
      const parsed = JSON.parse(cachedData!);

      expect(parsed.entries[0].nextUrl).toBe("https://example.com/page2");
      expect(parsed.entries[1].previousUrl).toBe("https://example.com/page1");
    });

    it("should overwrite existing cache for the same version", () => {
      const entries1: DocEntry[] = [
        {
          url: "https://example.com/old",
          title: "Old",
          content: "Old content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      const entries2: DocEntry[] = [
        {
          url: "https://example.com/new",
          title: "New",
          content: "New content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries1);
      writeCache("5.0", entries2);

      const result = readCache("5.0");

      expect(result).toHaveLength(1);
      expect(result?.[0].url).toBe("https://example.com/new");
    });

    it("should handle entries with all null references", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const cachedData = cache.get("django-docs-5.0");
      const parsed = JSON.parse(cachedData!);

      expect(parsed.entries[0].parentUrl).toBeNull();
      expect(parsed.entries[0].previousUrl).toBeNull();
      expect(parsed.entries[0].nextUrl).toBeNull();
    });

    it("should update lastRefresh timestamp", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      const beforeWrite = Date.now();
      writeCache("5.0", entries);
      const afterWrite = Date.now();

      const cachedData = cache.get("django-docs-5.0");
      const parsed = JSON.parse(cachedData!);

      expect(parsed.lastRefresh).toBeGreaterThanOrEqual(beforeWrite);
      expect(parsed.lastRefresh).toBeLessThanOrEqual(afterWrite);
    });
  });

  describe("getCacheAge", () => {
    it("should return null when cache is empty", () => {
      const age = getCacheAge("5.0");

      expect(age).toBeNull();
    });

    it("should return age in milliseconds", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const age = getCacheAge("5.0");

      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000);
    });

    it("should return null for invalid JSON in cache", () => {
      cache.set("django-docs-5.0", "invalid json");

      const age = getCacheAge("5.0");

      expect(age).toBeNull();
    });

    it("should calculate age correctly for older cache", () => {
      const oneHourAgo = Date.now() - 3600000;
      const cacheData = {
        entries: [],
        lastRefresh: oneHourAgo,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const age = getCacheAge("5.0");

      expect(age).toBeGreaterThanOrEqual(3600000);
      expect(age).toBeLessThan(3601000);
    });

    it("should return different ages for different versions", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const oneDayAgo = Date.now() - 86400000;
      const cacheData = {
        entries: [],
        lastRefresh: oneDayAgo,
      };
      cache.set("django-docs-5.1", JSON.stringify(cacheData));

      const age50 = getCacheAge("5.0");
      const age51 = getCacheAge("5.1");

      expect(age50).toBeLessThan(1000);
      expect(age51).toBeGreaterThanOrEqual(86400000);
    });
  });

  describe("shouldRefresh", () => {
    it("should return true when cache is empty", () => {
      const shouldRefreshCache = shouldRefresh("5.0");

      expect(shouldRefreshCache).toBe(true);
    });

    it("should return false when cache is fresh", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const shouldRefreshCache = shouldRefresh("5.0");

      expect(shouldRefreshCache).toBe(false);
    });

    it("should return true when cache is older than max age", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const cacheData = {
        entries: [],
        lastRefresh: eightDaysAgo,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const shouldRefreshCache = shouldRefresh("5.0");

      expect(shouldRefreshCache).toBe(true);
    });

    it("should use custom max age when provided", () => {
      const oneHourAgo = Date.now() - 3600000;
      const cacheData = {
        entries: [],
        lastRefresh: oneHourAgo,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const shouldRefreshCache = shouldRefresh("5.0", 1800000);

      expect(shouldRefreshCache).toBe(true);
    });

    it("should return false when cache is within custom max age", () => {
      const oneHourAgo = Date.now() - 3600000;
      const cacheData = {
        entries: [],
        lastRefresh: oneHourAgo,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const shouldRefreshCache = shouldRefresh("5.0", 7200000);

      expect(shouldRefreshCache).toBe(false);
    });

    it("should return true for invalid cache data", () => {
      cache.set("django-docs-5.0", "invalid json");

      const shouldRefreshCache = shouldRefresh("5.0");

      expect(shouldRefreshCache).toBe(true);
    });

    it("should handle edge case at exactly max age", () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const cacheData = {
        entries: [],
        lastRefresh: sevenDaysAgo,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const shouldRefreshCache = shouldRefresh("5.0");

      expect(shouldRefreshCache).toBe(false);
    });

    it("should evaluate different versions independently", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache("5.0", entries);

      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const oldCacheData = {
        entries: [],
        lastRefresh: eightDaysAgo,
      };
      cache.set("django-docs-5.1", JSON.stringify(oldCacheData));

      expect(shouldRefresh("5.0")).toBe(false);
      expect(shouldRefresh("5.1")).toBe(true);
    });
  });

  describe("getLastRefreshDate", () => {
    it("should return null when cache is empty", () => {
      const date = getLastRefreshDate("5.0");

      expect(date).toBeNull();
    });

    it("should return Date object for cached data", () => {
      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      const beforeWrite = new Date();
      writeCache("5.0", entries);
      const afterWrite = new Date();

      const date = getLastRefreshDate("5.0");

      expect(date).toBeInstanceOf(Date);
      expect(date!.getTime()).toBeGreaterThanOrEqual(beforeWrite.getTime());
      expect(date!.getTime()).toBeLessThanOrEqual(afterWrite.getTime());
    });

    it("should return null for invalid JSON in cache", () => {
      cache.set("django-docs-5.0", "invalid json");

      const date = getLastRefreshDate("5.0");

      expect(date).toBeNull();
    });

    it("should return correct date for older cache", () => {
      const expectedDate = new Date("2024-01-15T12:00:00Z");
      const cacheData = {
        entries: [],
        lastRefresh: expectedDate.getTime(),
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const date = getLastRefreshDate("5.0");

      expect(date).toBeInstanceOf(Date);
      expect(date!.getTime()).toBe(expectedDate.getTime());
    });

    it("should return different dates for different versions", () => {
      const date50 = new Date("2024-01-15T12:00:00Z");
      const date51 = new Date("2024-01-20T12:00:00Z");

      const cacheData50 = {
        entries: [],
        lastRefresh: date50.getTime(),
      };

      const cacheData51 = {
        entries: [],
        lastRefresh: date51.getTime(),
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData50));
      cache.set("django-docs-5.1", JSON.stringify(cacheData51));

      const result50 = getLastRefreshDate("5.0");
      const result51 = getLastRefreshDate("5.1");

      expect(result50!.getTime()).toBe(date50.getTime());
      expect(result51!.getTime()).toBe(date51.getTime());
    });

    it("should handle timestamp of 0", () => {
      const cacheData = {
        entries: [],
        lastRefresh: 0,
      };

      cache.set("django-docs-5.0", JSON.stringify(cacheData));

      const date = getLastRefreshDate("5.0");

      expect(date).toBeInstanceOf(Date);
      expect(date!.getTime()).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete write-read-check cycle", () => {
      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: null,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      writeCache("5.0", [parent, child]);

      expect(shouldRefresh("5.0")).toBe(false);

      const age = getCacheAge("5.0");
      expect(age).toBeLessThan(1000);

      const lastRefresh = getLastRefreshDate("5.0");
      expect(lastRefresh).toBeInstanceOf(Date);

      const entries = readCache("5.0");
      expect(entries).toHaveLength(2);
      expect(entries?.[1].parent?.url).toBe("https://example.com/parent");
    });

    it("should maintain data integrity across multiple operations", () => {
      const version: DjangoVersion = "dev";

      expect(readCache(version)).toBeNull();
      expect(shouldRefresh(version)).toBe(true);
      expect(getCacheAge(version)).toBeNull();
      expect(getLastRefreshDate(version)).toBeNull();

      const entries: DocEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parent: null,
          previous: null,
          next: null,
        },
      ];

      writeCache(version, entries);

      expect(readCache(version)).toHaveLength(1);
      expect(shouldRefresh(version)).toBe(false);
      expect(getCacheAge(version)).toBeGreaterThanOrEqual(0);
      expect(getLastRefreshDate(version)).toBeInstanceOf(Date);
    });
  });
});
