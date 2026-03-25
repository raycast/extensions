import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getChromeBasePath,
  detectActiveProfile,
  getChromeProfilePath,
  getFaviconUrl,
  normalizeUrl,
  deduplicateResults,
  extractBookmarks,
  getChromeBookmarks,
  getChromeHistory,
  parseHistoryOutput,
  parseTabOutput,
  getSourceTagInfo,
  getSourceIconName,
  extractDomain,
  parseTabContentOutput,
  mergeContentIntoResults,
  SearchResult,
  ChromeBookmarkNode,
  FsDeps,
  TabContent,
} from "./chrome-utils";
import { homedir } from "os";
import { join } from "path";

describe("getChromeBasePath", () => {
  it("returns the Chrome base path", () => {
    const result = getChromeBasePath();
    expect(result).toBe(
      join(homedir(), "Library", "Application Support", "Google", "Chrome"),
    );
  });
});

describe("detectActiveProfile", () => {
  const createMockDeps = (
    overrides: Partial<Pick<FsDeps, "existsSync" | "readFileSync">> = {},
  ) => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue("{}"),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Default when Local State file does not exist", () => {
    const deps = createMockDeps({ existsSync: vi.fn().mockReturnValue(false) });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
    expect(deps.existsSync).toHaveBeenCalledWith(
      "/fake/chrome/path/Local State",
    );
    expect(deps.readFileSync).not.toHaveBeenCalled();
  });

  it("returns profile from last_active_profiles[0] when available and exists", () => {
    const deps = createMockDeps({
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            last_active_profiles: ["Profile 1", "Default"],
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Profile 1");
  });

  it("falls back to info_cache when last_active_profiles profile does not exist", () => {
    const deps = createMockDeps({
      existsSync: vi.fn().mockImplementation((path: string) => {
        if (path.includes("Local State")) return true;
        if (path.includes("Profile 1")) return false;
        if (path.includes("Profile 2")) return true;
        return false;
      }),
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            last_active_profiles: ["Profile 1"],
            info_cache: {
              "Profile 2": { active_time: 1000 },
              "Profile 3": { active_time: 500 },
            },
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Profile 2");
  });

  it("returns profile with most recent active_time from info_cache", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            info_cache: {
              Default: { active_time: 100 },
              "Profile 1": { active_time: 300 },
              "Profile 2": { active_time: 200 },
            },
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Profile 1");
  });

  it("returns Default when info_cache profiles do not exist on disk", () => {
    const deps = createMockDeps({
      existsSync: vi.fn().mockImplementation((path: string) => {
        if (path.includes("Local State")) return true;
        return false;
      }),
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            info_cache: {
              "Profile 1": { active_time: 300 },
            },
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
  });

  it("returns Default on JSON parse error", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue("invalid json"),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
  });

  it("returns Default when profile object is empty", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({})),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
  });

  it("handles missing active_time in info_cache entries", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            info_cache: {
              Default: {},
              "Profile 1": { active_time: 100 },
            },
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Profile 1");
  });

  it("handles empty info_cache", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            info_cache: {},
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
  });

  it("handles empty last_active_profiles array", () => {
    const deps = createMockDeps({
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            last_active_profiles: [],
          },
        }),
      ),
    });

    const result = detectActiveProfile("/fake/chrome/path", deps);

    expect(result).toBe("Default");
  });
});

describe("getChromeProfilePath", () => {
  it("returns profile path based on detected profile", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          profile: {
            last_active_profiles: ["Profile 1"],
          },
        }),
      ),
    };

    const result = getChromeProfilePath("/fake/chrome", deps);

    expect(result).toBe("/fake/chrome/Profile 1");
  });

  it("returns Default profile path when no profile detected", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn(),
    };

    const result = getChromeProfilePath("/fake/chrome", deps);

    expect(result).toBe("/fake/chrome/Default");
  });
});

describe("getFaviconUrl", () => {
  it("returns Google favicon service URL for valid URL", () => {
    const result = getFaviconUrl("https://example.com/page");
    expect(result).toBe(
      "https://www.google.com/s2/favicons?sz=64&domain=example.com",
    );
  });

  it("extracts hostname correctly from URL with path", () => {
    const result = getFaviconUrl(
      "https://sub.example.com/path/to/page?query=1",
    );
    expect(result).toBe(
      "https://www.google.com/s2/favicons?sz=64&domain=sub.example.com",
    );
  });

  it("returns empty string for invalid URL", () => {
    const result = getFaviconUrl("not a url");
    expect(result).toBe("");
  });

  it("returns empty string for empty string", () => {
    const result = getFaviconUrl("");
    expect(result).toBe("");
  });
});

describe("normalizeUrl", () => {
  it("removes trailing slashes", () => {
    const result = normalizeUrl("https://example.com/path/");
    expect(result).toBe("https://example.com/path");
  });

  it("removes multiple trailing slashes", () => {
    const result = normalizeUrl("https://example.com/path///");
    expect(result).toBe("https://example.com/path");
  });

  it("removes URL fragments", () => {
    const result = normalizeUrl("https://example.com/page#section");
    expect(result).toBe("https://example.com/page");
  });

  it("removes query parameters", () => {
    const result = normalizeUrl("https://example.com/page?foo=bar");
    expect(result).toBe("https://example.com/page");
  });

  it("preserves protocol and host", () => {
    const result = normalizeUrl("http://example.com");
    expect(result).toBe("http://example.com");
  });

  it("returns original string for invalid URL", () => {
    const result = normalizeUrl("not a url");
    expect(result).toBe("not a url");
  });
});

describe("deduplicateResults", () => {
  it("removes duplicate URLs keeping highest priority (tab > bookmark > history)", () => {
    const results: SearchResult[] = [
      {
        id: "history-1",
        title: "Example",
        url: "https://example.com",
        source: "history",
      },
      {
        id: "tab-1",
        title: "Example Tab",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "bookmark-1",
        title: "Example Bookmark",
        url: "https://example.com",
        source: "bookmark",
      },
    ];

    const deduped = deduplicateResults(results);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("tab");
    expect(deduped[0].title).toBe("Example Tab");
  });

  it("keeps bookmark over history for same URL", () => {
    const results: SearchResult[] = [
      {
        id: "history-1",
        title: "History Title",
        url: "https://example.com",
        source: "history",
      },
      {
        id: "bookmark-1",
        title: "Bookmark Title",
        url: "https://example.com",
        source: "bookmark",
      },
    ];

    const deduped = deduplicateResults(results);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("bookmark");
  });

  it("normalizes URLs for comparison (trailing slash)", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1",
        title: "With Slash",
        url: "https://example.com/",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "history-1",
        title: "Without Slash",
        url: "https://example.com",
        source: "history",
      },
    ];

    const deduped = deduplicateResults(results);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("tab");
  });

  it("normalizes URLs for comparison (fragments)", () => {
    const results: SearchResult[] = [
      {
        id: "bookmark-1",
        title: "With Fragment",
        url: "https://example.com/page#section",
        source: "bookmark",
      },
      {
        id: "history-1",
        title: "Without Fragment",
        url: "https://example.com/page",
        source: "history",
      },
    ];

    const deduped = deduplicateResults(results);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("bookmark");
  });

  it("keeps different URLs separate", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1",
        title: "Example",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "tab-2",
        title: "Other",
        url: "https://other.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 2,
      },
    ];

    const deduped = deduplicateResults(results);

    expect(deduped).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const deduped = deduplicateResults([]);
    expect(deduped).toHaveLength(0);
  });
});

describe("extractBookmarks", () => {
  it("extracts URL type bookmarks", () => {
    const node: ChromeBookmarkNode = {
      type: "url",
      name: "Example",
      url: "https://example.com",
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Example");
    expect(results[0].url).toBe("https://example.com");
    expect(results[0].source).toBe("bookmark");
  });

  it("extracts bookmarks from children recursively", () => {
    const node: ChromeBookmarkNode = {
      type: "folder",
      name: "Folder",
      children: [
        { type: "url", name: "Child 1", url: "https://child1.com" },
        { type: "url", name: "Child 2", url: "https://child2.com" },
      ],
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(2);
    expect(results[0].subtitle).toContain("Folder");
  });

  it("extracts bookmarks from bookmark_bar root", () => {
    const node: ChromeBookmarkNode = {
      bookmark_bar: {
        type: "folder",
        name: "Bookmarks Bar",
        children: [{ type: "url", name: "Bar Item", url: "https://bar.com" }],
      },
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
  });

  it("extracts bookmarks from other root", () => {
    const node: ChromeBookmarkNode = {
      other: {
        type: "folder",
        name: "Other",
        children: [
          { type: "url", name: "Other Item", url: "https://other.com" },
        ],
      },
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
  });

  it("extracts bookmarks from synced root", () => {
    const node: ChromeBookmarkNode = {
      synced: {
        type: "folder",
        name: "Synced",
        children: [
          { type: "url", name: "Synced Item", url: "https://synced.com" },
        ],
      },
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
  });

  it("ignores nodes without url or name", () => {
    const node: ChromeBookmarkNode = {
      type: "url",
      name: "No URL",
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(0);
  });

  it("builds correct path for nested folders", () => {
    const node: ChromeBookmarkNode = {
      type: "folder",
      name: "Level 1",
      children: [
        {
          type: "folder",
          name: "Level 2",
          children: [{ type: "url", name: "Deep", url: "https://deep.com" }],
        },
      ],
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
    expect(results[0].subtitle).toContain("Level 1");
    expect(results[0].subtitle).toContain("Level 2");
  });

  it("handles empty children array", () => {
    const node: ChromeBookmarkNode = {
      type: "folder",
      name: "Empty Folder",
      children: [],
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(0);
  });

  it("handles folder without name", () => {
    const node: ChromeBookmarkNode = {
      type: "folder",
      children: [{ type: "url", name: "Child", url: "https://child.com" }],
    };
    const results: SearchResult[] = [];

    extractBookmarks(node, results);

    expect(results).toHaveLength(1);
  });
});

describe("getChromeBookmarks", () => {
  it("returns empty array when Bookmarks file does not exist", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn(),
    };

    const result = getChromeBookmarks("/fake/profile", deps);

    expect(result).toHaveLength(0);
    expect(deps.existsSync).toHaveBeenCalledWith("/fake/profile/Bookmarks");
  });

  it("parses bookmarks from file", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(
        JSON.stringify({
          roots: {
            bookmark_bar: {
              type: "folder",
              children: [
                { type: "url", name: "Test", url: "https://test.com" },
              ],
            },
          },
        }),
      ),
    };

    const result = getChromeBookmarks("/fake/profile", deps);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test");
  });

  it("returns empty array on parse error", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue("invalid json"),
    };

    const result = getChromeBookmarks("/fake/profile", deps);

    expect(result).toHaveLength(0);
  });

  it("returns empty array when roots is missing", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({})),
    };

    const result = getChromeBookmarks("/fake/profile", deps);

    expect(result).toHaveLength(0);
  });

  it("handles read error", () => {
    const deps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockImplementation(() => {
        throw new Error("Read error");
      }),
    };

    const result = getChromeBookmarks("/fake/profile", deps);

    expect(result).toHaveLength(0);
  });
});

describe("parseHistoryOutput", () => {
  it("parses valid history output", () => {
    const output =
      "https://example.com|||Example Title|||5\nhttps://other.com|||Other|||3";

    const results = parseHistoryOutput(output);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: "history-0",
      title: "Example Title",
      url: "https://example.com",
      source: "history",
      visitCount: 5,
    });
  });

  it("returns empty array for empty output", () => {
    expect(parseHistoryOutput("")).toHaveLength(0);
    expect(parseHistoryOutput("   ")).toHaveLength(0);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseHistoryOutput(null as unknown as string)).toHaveLength(0);
    expect(parseHistoryOutput(undefined as unknown as string)).toHaveLength(0);
  });

  it("uses URL as title when title is missing", () => {
    const output = "https://example.com||||||3";

    const results = parseHistoryOutput(output);

    expect(results[0].title).toBe("https://example.com");
  });

  it("handles missing visit count", () => {
    const output = "https://example.com|||Title|||";

    const results = parseHistoryOutput(output);

    expect(results[0].visitCount).toBe(0);
  });

  it("generates favicon URL", () => {
    const output = "https://example.com|||Title|||1";

    const results = parseHistoryOutput(output);

    expect(results[0].favicon).toBe(
      "https://www.google.com/s2/favicons?sz=64&domain=example.com",
    );
  });
});

describe("getChromeHistory", () => {
  const createMockDeps = (): FsDeps => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn(),
    copyFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    execSync: vi.fn().mockReturnValue("https://example.com|||Example|||5"),
    tmpdir: vi.fn().mockReturnValue("/tmp"),
  });

  it("returns empty array when History file does not exist", () => {
    const deps = createMockDeps();
    deps.existsSync = vi.fn().mockReturnValue(false);

    const result = getChromeHistory(500, "/fake/profile", deps);

    expect(result).toHaveLength(0);
  });

  it("copies history file, queries it, and cleans up", () => {
    const deps = createMockDeps();

    const result = getChromeHistory(500, "/fake/profile", deps);

    expect(deps.copyFileSync).toHaveBeenCalled();
    expect(deps.execSync).toHaveBeenCalled();
    expect(deps.unlinkSync).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("returns empty array when copy fails", () => {
    const deps = createMockDeps();
    deps.copyFileSync = vi.fn().mockImplementation(() => {
      throw new Error("Copy failed");
    });

    const result = getChromeHistory(500, "/fake/profile", deps);

    expect(result).toHaveLength(0);
  });

  it("returns empty array when sqlite query fails", () => {
    const deps = createMockDeps();
    deps.execSync = vi.fn().mockImplementation(() => {
      throw new Error("Query failed");
    });

    const result = getChromeHistory(500, "/fake/profile", deps);

    expect(result).toHaveLength(0);
    expect(deps.unlinkSync).toHaveBeenCalled(); // cleanup still happens
  });

  it("handles cleanup error gracefully", () => {
    const deps = createMockDeps();
    deps.unlinkSync = vi.fn().mockImplementation(() => {
      throw new Error("Cleanup failed");
    });

    const result = getChromeHistory(500, "/fake/profile", deps);

    expect(result).toHaveLength(1); // should still return results
  });

  it("uses correct limit in query", () => {
    const deps = createMockDeps();

    getChromeHistory(100, "/fake/profile", deps);

    expect(deps.execSync).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT 100"),
      expect.any(Object),
    );
  });
});

describe("parseTabOutput", () => {
  it("parses valid tab output", () => {
    const output =
      "1|||1|||Example Tab|||https://example.com\n2|||1|||Other Tab|||https://other.com";

    const tabs = parseTabOutput(output);

    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toMatchObject({
      id: "tab-1-1",
      title: "Example Tab",
      url: "https://example.com",
      source: "tab",
      windowIndex: 1,
      tabIndex: 1,
    });
  });

  it("returns empty array for empty output", () => {
    expect(parseTabOutput("")).toHaveLength(0);
    expect(parseTabOutput("   ")).toHaveLength(0);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseTabOutput(null as unknown as string)).toHaveLength(0);
    expect(parseTabOutput(undefined as unknown as string)).toHaveLength(0);
  });

  it("handles missing title", () => {
    const output = "1|||1||||||https://example.com";

    const tabs = parseTabOutput(output);

    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe("Untitled");
  });

  it("handles missing URL", () => {
    const output = "1|||1|||Title|||";

    const tabs = parseTabOutput(output);

    expect(tabs).toHaveLength(1);
    expect(tabs[0].url).toBe("");
  });

  it("skips malformed lines", () => {
    const output =
      "1|||1|||Valid|||https://valid.com\nmalformed line\n2|||2|||Also Valid|||https://also.com";

    const tabs = parseTabOutput(output);

    expect(tabs).toHaveLength(2);
  });

  it("filters empty lines", () => {
    const output =
      "1|||1|||Tab|||https://tab.com\n\n\n2|||1|||Tab2|||https://tab2.com";

    const tabs = parseTabOutput(output);

    expect(tabs).toHaveLength(2);
  });

  it("generates favicon URL for each tab", () => {
    const output = "1|||1|||Tab|||https://example.com";

    const tabs = parseTabOutput(output);

    expect(tabs[0].favicon).toBe(
      "https://www.google.com/s2/favicons?sz=64&domain=example.com",
    );
  });
});

describe("getSourceTagInfo", () => {
  it("returns correct info for tab", () => {
    const info = getSourceTagInfo("tab");
    expect(info).toEqual({ value: "Tab", colorName: "Green" });
  });

  it("returns correct info for bookmark", () => {
    const info = getSourceTagInfo("bookmark");
    expect(info).toEqual({ value: "Bookmark", colorName: "Blue" });
  });

  it("returns correct info for history", () => {
    const info = getSourceTagInfo("history");
    expect(info).toEqual({ value: "History", colorName: "Orange" });
  });
});

describe("getSourceIconName", () => {
  it("returns Globe for tab", () => {
    expect(getSourceIconName("tab")).toBe("Globe");
  });

  it("returns Bookmark for bookmark", () => {
    expect(getSourceIconName("bookmark")).toBe("Bookmark");
  });

  it("returns Clock for history", () => {
    expect(getSourceIconName("history")).toBe("Clock");
  });
});

describe("extractDomain", () => {
  it("extracts domain from URL", () => {
    expect(extractDomain("https://example.com/path")).toBe("example.com");
  });

  it("extracts subdomain", () => {
    expect(extractDomain("https://sub.example.com")).toBe("sub.example.com");
  });

  it("returns original string for invalid URL", () => {
    expect(extractDomain("not a url")).toBe("not a url");
  });

  it("returns empty string for empty input", () => {
    expect(extractDomain("")).toBe("");
  });
});

describe("parseTabContentOutput", () => {
  it("parses valid content output", () => {
    const output =
      "1|||1|||This is the page content\n2|||3|||Another page content";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(2);
    expect(contents[0]).toMatchObject({
      windowIndex: 1,
      tabIndex: 1,
      content: "This is the page content",
    });
    expect(contents[1]).toMatchObject({
      windowIndex: 2,
      tabIndex: 3,
      content: "Another page content",
    });
  });

  it("returns empty array for empty output", () => {
    expect(parseTabContentOutput("")).toHaveLength(0);
    expect(parseTabContentOutput("   ")).toHaveLength(0);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseTabContentOutput(null as unknown as string)).toHaveLength(0);
    expect(parseTabContentOutput(undefined as unknown as string)).toHaveLength(
      0,
    );
  });

  it("handles content with ||| separator in it", () => {
    const output = "1|||1|||Content with ||| in the middle";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(1);
    expect(contents[0].content).toBe("Content with ||| in the middle");
  });

  it("skips malformed lines", () => {
    const output = "1|||1|||Valid content\nmalformed line\n2|||2|||Also valid";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(2);
  });

  it("skips lines with invalid window/tab indices", () => {
    const output = "abc|||1|||Content\n1|||xyz|||Content\n1|||1|||Valid";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(1);
    expect(contents[0].windowIndex).toBe(1);
  });

  it("skips lines with empty content", () => {
    const output = "1|||1|||\n2|||2|||Has content";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(1);
    expect(contents[0].windowIndex).toBe(2);
  });

  it("handles empty lines in output", () => {
    const output = "1|||1|||Content\n\n\n2|||2|||More content";

    const contents = parseTabContentOutput(output);

    expect(contents).toHaveLength(2);
  });
});

describe("mergeContentIntoResults", () => {
  it("merges content into matching tab results", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab 1",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "tab-1-2",
        title: "Tab 2",
        url: "https://other.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 2,
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Page content for tab 1" },
      { windowIndex: 1, tabIndex: 2, content: "Page content for tab 2" },
    ];

    const merged = mergeContentIntoResults(results, contents);

    expect(merged[0].content).toBe("Page content for tab 1");
    expect(merged[1].content).toBe("Page content for tab 2");
  });

  it("does not modify non-tab results", () => {
    const results: SearchResult[] = [
      {
        id: "bookmark-1",
        title: "Bookmark",
        url: "https://example.com",
        source: "bookmark",
      },
      {
        id: "history-1",
        title: "History",
        url: "https://other.com",
        source: "history",
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Some content" },
    ];

    const merged = mergeContentIntoResults(results, contents);

    expect(merged[0].content).toBeUndefined();
    expect(merged[1].content).toBeUndefined();
  });

  it("handles tabs without matching content", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab 1",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 2, tabIndex: 1, content: "Different window" },
    ];

    const merged = mergeContentIntoResults(results, contents);

    expect(merged[0].content).toBeUndefined();
  });

  it("handles empty content array", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab 1",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
    ];

    const merged = mergeContentIntoResults(results, []);

    expect(merged[0].content).toBeUndefined();
  });

  it("handles empty results array", () => {
    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Content" },
    ];

    const merged = mergeContentIntoResults([], contents);

    expect(merged).toHaveLength(0);
  });

  it("handles tabs without windowIndex or tabIndex", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab without indices",
        url: "https://example.com",
        source: "tab",
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Content" },
    ];

    const merged = mergeContentIntoResults(results, contents);

    expect(merged[0].content).toBeUndefined();
  });

  it("preserves all other result properties", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab 1",
        url: "https://example.com",
        source: "tab",
        subtitle: "Subtitle",
        favicon: "https://favicon.com/icon.png",
        windowIndex: 1,
        tabIndex: 1,
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Content" },
    ];

    const merged = mergeContentIntoResults(results, contents);

    expect(merged[0].id).toBe("tab-1-1");
    expect(merged[0].title).toBe("Tab 1");
    expect(merged[0].subtitle).toBe("Subtitle");
    expect(merged[0].favicon).toBe("https://favicon.com/icon.png");
    expect(merged[0].content).toBe("Content");
  });

  it("does not mutate original results array", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "Tab 1",
        url: "https://example.com",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
    ];

    const contents: TabContent[] = [
      { windowIndex: 1, tabIndex: 1, content: "Content" },
    ];

    mergeContentIntoResults(results, contents);

    expect(results[0].content).toBeUndefined();
  });
});
