import { describe, expect, it } from "vitest";
import type { HistoryEntry, Tab } from "../../src/types";
import { excludeOpenTabUrls, isSearchHeliumViewMode, shouldShowSection } from "../../src/utils/unified-search";

function historyEntry(id: string, url: string): HistoryEntry {
  return { id, url, title: id, lastVisitedAt: "2026-11-12T00:00:00.000Z" };
}

function tab(id: string, url: string): Tab {
  return { id, url, title: id };
}

describe("excludeOpenTabUrls", () => {
  it("drops history entries whose page is already open in a tab", () => {
    const history = [historyEntry("a", "https://example.com/a"), historyEntry("b", "https://example.com/b")];
    const tabs = [tab("1", "https://example.com/a")];

    expect(excludeOpenTabUrls(history, tabs).map((entry) => entry.id)).toEqual(["b"]);
  });

  it("ignores host case and trailing slashes when comparing URLs", () => {
    const history = [historyEntry("a", "https://Example.com/"), historyEntry("b", "https://example.com/docs")];
    const tabs = [tab("1", "https://example.com"), tab("2", "https://EXAMPLE.com/docs/")];

    expect(excludeOpenTabUrls(history, tabs)).toEqual([]);
  });

  it("treats paths that differ only by case as different pages", () => {
    const history = [historyEntry("a", "https://example.com/Docs")];
    const tabs = [tab("1", "https://example.com/docs")];

    expect(excludeOpenTabUrls(history, tabs)).toEqual(history);
  });

  it("keeps different pages on the same site", () => {
    const history = [historyEntry("a", "https://example.com/?q=1")];
    const tabs = [tab("1", "https://example.com/")];

    expect(excludeOpenTabUrls(history, tabs)).toEqual(history);
  });

  it("returns history unchanged when no tabs are open", () => {
    const history = [historyEntry("a", "https://example.com/a")];

    expect(excludeOpenTabUrls(history, [])).toBe(history);
  });
});

describe("shouldShowSection", () => {
  it("shows tabs and history in All before the user types", () => {
    expect(shouldShowSection("tabs", "all", "")).toBe(true);
    expect(shouldShowSection("history", "all", "")).toBe(true);
  });

  it("waits for a query before showing bookmarks and web results in All", () => {
    expect(shouldShowSection("bookmarks", "all", "  ")).toBe(false);
    expect(shouldShowSection("web", "all", "")).toBe(false);
    expect(shouldShowSection("bookmarks", "all", "docs")).toBe(true);
    expect(shouldShowSection("web", "all", "docs")).toBe(true);
  });

  it("shows only the selected section, even with an empty query", () => {
    expect(shouldShowSection("bookmarks", "bookmarks", "")).toBe(true);
    expect(shouldShowSection("tabs", "bookmarks", "docs")).toBe(false);
    expect(shouldShowSection("history", "web", "docs")).toBe(false);
  });
});

describe("isSearchHeliumViewMode", () => {
  it("accepts known view modes and rejects anything else", () => {
    expect(isSearchHeliumViewMode("all")).toBe(true);
    expect(isSearchHeliumViewMode("history")).toBe(true);
    expect(isSearchHeliumViewMode("pinned-tabs")).toBe(false);
  });
});
