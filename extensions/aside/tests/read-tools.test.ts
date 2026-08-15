import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/browser", () => ({
  listBookmarks: vi.fn(),
  listTabs: vi.fn(),
}));

import { listBookmarks, listTabs } from "../src/lib/browser";
import getTabsTool from "../src/tools/get-tabs";
import searchBookmarksTool from "../src/tools/search-bookmarks";
import { AsideBookmark, AsideTab } from "../src/types";

const tabs: AsideTab[] = Array.from({ length: 30 }, (_, index) => ({
  id: `tab-${index}`,
  windowId: index % 2 ? "window-private" : "window-normal",
  windowIndex: index % 2 ? 2 : 1,
  windowMode: index % 2 ? "incognito" : "normal",
  title: index === 4 ? "Project Proposal" : `Example ${index}`,
  url: index === 4 ? "https://example.com/proposal" : `https://example.com/${index}`,
  loading: false,
  active: index < 2,
}));

const bookmarks: AsideBookmark[] = [
  { id: "bookmark-1", title: "Raycast", url: "https://raycast.com", path: ["Bookmarks Bar", "Tools"] },
  { id: "bookmark-2", title: "Aside", url: "https://aside.com", path: ["Other Bookmarks"] },
];

describe("read-only AI tools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listTabs).mockResolvedValue(tabs);
    vi.mocked(listBookmarks).mockResolvedValue(bookmarks);
  });

  it("defaults Get Tabs to 25 results", async () => {
    expect(await getTabsTool({})).toHaveLength(25);
  });

  it("filters Get Tabs before applying its result limit", async () => {
    const result = await getTabsTool({ query: "project proposal", windowMode: "normal", limit: 5 });
    expect(result.map((tab) => tab.id)).toEqual(["tab-4"]);
  });

  it("returns only active tabs when requested", async () => {
    const result = await getTabsTool({ activeOnly: true });
    expect(result.every((tab) => tab.active)).toBe(true);
  });

  it("requires a bookmark query and returns matching bookmarks", async () => {
    await expect(searchBookmarksTool({ query: "  " })).rejects.toThrow(/query/);
    expect(await searchBookmarksTool({ query: "tools raycast", limit: 5 })).toEqual([bookmarks[0]]);
  });
});
