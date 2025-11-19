/**
 * Service Logic Tests - Pure Functions Only
 *
 * These tests focus on the core logic without external dependencies.
 * They test the filtering, search suggestion, and parsing functionality.
 */

// Mock the Icon enum since we can't import @raycast/api in tests
const Icon = {
  Globe: "globe" as const,
  Clock: "clock" as const,
  MagnifyingGlass: "magnifying-glass" as const,
};

// Copy the interfaces and functions we want to test
interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: "tab" | "history" | "search";
  icon: string;
  accessory?: string;
  windowIndex?: number;
  tabIndex?: number;
}

// Copy the functions to test from service.ts
const filterItems = (items: SearchItem[], query: string): SearchItem[] => {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.subtitle.toLowerCase().includes(lowerQuery) ||
      item.url.toLowerCase().includes(lowerQuery)
  );
};

const createSearchSuggestion = (query: string, searchEngine: string): SearchItem => {
  const searchEngines = {
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  };

  const searchUrl = searchEngines[searchEngine as keyof typeof searchEngines] || searchEngines.google;

  return {
    id: `search-${query}`,
    title: `Search for "${query}"`,
    subtitle: `Search using ${searchEngine}`,
    url: searchUrl,
    type: "search",
    icon: Icon.MagnifyingGlass,
    accessory: "Web Search",
  };
};

// Tests
describe("Brave Fuzzy Service Logic", () => {
  describe("filterItems", () => {
    const sampleItems: SearchItem[] = [
      {
        id: "tab-1",
        title: "GitHub - brave-fuzzy",
        subtitle: "https://github.com/user/brave-fuzzy",
        url: "https://github.com/user/brave-fuzzy",
        type: "tab",
        icon: Icon.Globe,
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "history-1",
        title: "TypeScript Documentation",
        subtitle: "https://www.typescriptlang.org/docs/",
        url: "https://www.typescriptlang.org/docs/",
        type: "history",
        icon: Icon.Clock,
      },
      {
        id: "tab-2",
        title: "Stack Overflow - JavaScript question",
        subtitle: "https://stackoverflow.com/questions/javascript",
        url: "https://stackoverflow.com/questions/javascript",
        type: "tab",
        icon: Icon.Globe,
        windowIndex: 1,
        tabIndex: 2,
      },
    ];

    it("should return all items when query is empty", () => {
      const result = filterItems(sampleItems, "");
      expect(result).toHaveLength(3);
      expect(result).toEqual(sampleItems);
    });

    it("should return all items when query is whitespace only", () => {
      const result = filterItems(sampleItems, "   ");
      expect(result).toHaveLength(3);
      expect(result).toEqual(sampleItems);
    });

    it("should filter by title case insensitively", () => {
      const result = filterItems(sampleItems, "github");
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain("GitHub");
    });

    it("should filter by subtitle and URL", () => {
      const result = filterItems(sampleItems, "typescript");
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain("TypeScript");
    });

    it("should find partial matches across multiple fields", () => {
      const result = filterItems(sampleItems, "script");
      expect(result).toHaveLength(2); // TypeScript and JavaScript
    });

    it("should handle complex queries", () => {
      const result = filterItems(sampleItems, "stack overflow");
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain("Stack Overflow");
    });

    it("should return empty array when no matches found", () => {
      const result = filterItems(sampleItems, "nonexistent");
      expect(result).toHaveLength(0);
    });

    it("should handle special characters gracefully", () => {
      const specialItems: SearchItem[] = [
        {
          id: "special-1",
          title: "Test & Debug",
          subtitle: "https://example.com/test?param=value",
          url: "https://example.com/test?param=value",
          type: "tab",
          icon: Icon.Globe,
        },
      ];

      const result = filterItems(specialItems, "test");
      expect(result).toHaveLength(1);

      const result2 = filterItems(specialItems, "param=value");
      expect(result2).toHaveLength(1);
    });
  });

  describe("createSearchSuggestion", () => {
    it("should create Google search suggestion", () => {
      const result = createSearchSuggestion("test query", "google");

      expect(result).toMatchObject({
        id: "search-test query",
        title: 'Search for "test query"',
        subtitle: "Search using google",
        url: "https://www.google.com/search?q=test%20query",
        type: "search",
        icon: Icon.MagnifyingGlass,
        accessory: "Web Search",
      });
    });

    it("should create DuckDuckGo search suggestion", () => {
      const result = createSearchSuggestion("privacy search", "duckduckgo");

      expect(result.url).toBe("https://duckduckgo.com/?q=privacy%20search");
      expect(result.subtitle).toBe("Search using duckduckgo");
    });

    it("should create Bing search suggestion", () => {
      const result = createSearchSuggestion("microsoft search", "bing");

      expect(result.url).toBe("https://www.bing.com/search?q=microsoft%20search");
      expect(result.subtitle).toBe("Search using bing");
    });

    it("should fallback to Google for unknown search engine", () => {
      const result = createSearchSuggestion("fallback test", "unknown");

      expect(result.url).toBe("https://www.google.com/search?q=fallback%20test");
      expect(result.subtitle).toBe("Search using unknown");
    });

    it("should properly encode special characters", () => {
      const result = createSearchSuggestion("test & encode + special?", "google");

      expect(result.url).toBe("https://www.google.com/search?q=test%20%26%20encode%20%2B%20special%3F");
    });

    it("should handle empty query", () => {
      const result = createSearchSuggestion("", "google");

      expect(result.title).toBe('Search for ""');
      expect(result.url).toBe("https://www.google.com/search?q=");
    });

    it("should handle unicode and emojis", () => {
      const result = createSearchSuggestion("test 🚀 unicode", "google");

      expect(result.title).toBe('Search for "test 🚀 unicode"');
      expect(result.url).toContain("test%20%F0%9F%9A%80%20unicode");
    });
  });
});

describe("Data Parsing Logic", () => {
  describe("Tab parsing with triple-pipe delimiter", () => {
    it("should parse normal tab data correctly", () => {
      const mockAppleScriptOutput =
        "GitHub|||https://github.com|||1|||1, TypeScript Docs|||https://typescriptlang.org|||1|||2";
      const entries = mockAppleScriptOutput.split(", ");
      const parsedTabs = [];

      for (let i = 0; i < entries.length; i++) {
        const parts = entries[i].split("|||");
        if (parts.length === 4) {
          const [title, url, windowIndex, tabIndex] = parts;
          parsedTabs.push({
            id: `tab-${i}`,
            title: title.trim(),
            url: url.trim(),
            windowIndex: Number.parseInt(windowIndex.trim(), 10),
            tabIndex: Number.parseInt(tabIndex.trim(), 10),
          });
        }
      }

      expect(parsedTabs).toHaveLength(2);
      expect(parsedTabs[0]).toMatchObject({
        title: "GitHub",
        url: "https://github.com",
        windowIndex: 1,
        tabIndex: 1,
      });
      expect(parsedTabs[1]).toMatchObject({
        title: "TypeScript Docs",
        url: "https://typescriptlang.org",
        windowIndex: 1,
        tabIndex: 2,
      });
    });

    it("should handle tab titles containing pipe characters", () => {
      const mockOutput = "Tab | with | pipes|||https://example.com|||1|||1";
      const parts = mockOutput.split("|||");

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("Tab | with | pipes");
      expect(parts[1]).toBe("https://example.com");
      expect(parts[2]).toBe("1");
      expect(parts[3]).toBe("1");
    });

    it("should skip malformed entries", () => {
      const mockOutput = "Incomplete|||missing, Valid Tab|||https://valid.com|||1|||1, Another incomplete|||";
      const entries = mockOutput.split(", ");
      const parsedTabs = [];

      for (const entry of entries) {
        const parts = entry.split("|||");
        if (parts.length === 4) {
          const [title, url, windowIndex, tabIndex] = parts;
          parsedTabs.push({
            title: title.trim(),
            url: url.trim(),
            windowIndex: Number.parseInt(windowIndex.trim(), 10),
            tabIndex: Number.parseInt(tabIndex.trim(), 10),
          });
        }
      }

      expect(parsedTabs).toHaveLength(1);
      expect(parsedTabs[0].title).toBe("Valid Tab");
    });

    it("should handle empty or whitespace entries", () => {
      const mockOutput = "|||||||, Valid Tab|||https://valid.com|||1|||1,    |||   |||   |||   ";
      const entries = mockOutput.split(", ");
      const parsedTabs = [];

      for (const entry of entries) {
        const parts = entry.split("|||");
        if (parts.length === 4) {
          const [title, url, windowIndex, tabIndex] = parts;
          // Skip entries with empty titles or URLs
          if (title.trim() && url.trim()) {
            parsedTabs.push({
              title: title.trim(),
              url: url.trim(),
              windowIndex: Number.parseInt(windowIndex.trim(), 10),
              tabIndex: Number.parseInt(tabIndex.trim(), 10),
            });
          }
        }
      }

      expect(parsedTabs).toHaveLength(1);
      expect(parsedTabs[0].title).toBe("Valid Tab");
    });
  });

  describe("History URL validation and formatting", () => {
    it("should add https protocol to URLs without protocol", () => {
      const urls = ["example.com", "github.com", "stackoverflow.com"];
      const formatted = urls.map((url) => {
        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
          return `https://${url}`;
        }
        return url;
      });

      expect(formatted).toEqual(["https://example.com", "https://github.com", "https://stackoverflow.com"]);
    });

    it("should preserve existing protocols", () => {
      const urls = ["https://example.com", "http://insecure.com"];
      const formatted = urls.map((url) => {
        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
          return `https://${url}`;
        }
        return url;
      });

      expect(formatted).toEqual(["https://example.com", "http://insecure.com"]);
    });

    it("should filter out invalid URLs", () => {
      const testUrls = ["", " ", "https://", "valid.com", "|||"];
      const validUrls = [];

      for (const url of testUrls) {
        let processedUrl = url.trim();

        if (processedUrl && !processedUrl.startsWith("http://") && !processedUrl.startsWith("https://")) {
          processedUrl = `https://${processedUrl}`;
        }

        if (processedUrl && processedUrl !== "https://" && processedUrl !== "https://|||") {
          validUrls.push(processedUrl);
        }
      }

      expect(validUrls).toEqual(["https://valid.com"]);
    });

    it("should parse SQLite history output correctly", () => {
      const mockSqliteOutput = `Example Site|example.com|5|1234567890
GitHub Repository|github.com/user/repo|10|1234567891
TypeScript Docs|typescriptlang.org|3|1234567892`;

      const lines = mockSqliteOutput.trim().split("\n");
      const parsedHistory = [];

      for (let index = 0; index < lines.length; index++) {
        const item = lines[index];
        const parts = item.split("|");
        const title = parts[0]?.trim() || "Untitled";
        let url = parts[1]?.trim() || "";
        const visitCount = parts[2]?.trim() || "0";

        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }

        if (!url || url === "https://") {
          continue;
        }

        parsedHistory.push({
          id: `history-${index}`,
          title,
          url,
          visitCount,
        });
      }

      expect(parsedHistory).toHaveLength(3);
      expect(parsedHistory[0]).toMatchObject({
        title: "Example Site",
        url: "https://example.com",
        visitCount: "5",
      });
      expect(parsedHistory[1]).toMatchObject({
        title: "GitHub Repository",
        url: "https://github.com/user/repo",
        visitCount: "10",
      });
    });

    it("should handle incomplete SQLite entries", () => {
      const mockOutput = `Title Only
Complete Entry|example.com|5|1234567890
No URL||3|1234567891
Empty Line

Another Valid|github.com|1|1234567892`;

      const lines = mockOutput
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      const parsedHistory = [];

      for (const item of lines) {
        const parts = item.split("|");
        const title = parts[0]?.trim() || "Untitled";
        let url = parts[1]?.trim() || "";

        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }

        if (!url || url === "https://") {
          continue;
        }

        parsedHistory.push({ title, url });
      }

      expect(parsedHistory).toHaveLength(2);
      expect(parsedHistory[0].title).toBe("Complete Entry");
      expect(parsedHistory[1].title).toBe("Another Valid");
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle very long search queries", () => {
      const longQuery = "a".repeat(1000);
      const sampleItem: SearchItem = {
        id: "test-1",
        title: "Test Item",
        subtitle: "Test subtitle",
        url: "https://test.com",
        type: "tab",
        icon: Icon.Globe,
      };

      const result = filterItems([sampleItem], longQuery);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // No match expected
    });

    it("should handle queries with only special characters", () => {
      const specialQuery = "!@#$%^&*()";
      const result = createSearchSuggestion(specialQuery, "google");

      expect(result.title).toBe(`Search for "${specialQuery}"`);
      expect(result.url).toContain(encodeURIComponent(specialQuery));
    });

    it("should handle empty data sets", () => {
      const result = filterItems([], "any query");
      expect(result).toHaveLength(0);
    });
  });
});
