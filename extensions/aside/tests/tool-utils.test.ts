import { describe, expect, it } from "vitest";
import {
  clampLimit,
  closeTabsConfirmationMessage,
  filterBookmarks,
  filterTabs,
  frontmostActiveTab,
  matchesSearch,
  parseTabReferences,
  resolveTabReferences,
  toTabTarget,
} from "../src/lib/tool-utils";
import { AsideBookmark, AsideTab } from "../src/types";

const tabs: AsideTab[] = [
  {
    id: "tab-1",
    windowId: "window-2",
    windowIndex: 2,
    windowMode: "normal",
    title: "Project Proposal",
    url: "https://example.com/proposal",
    loading: false,
    active: true,
  },
  {
    id: "tab-2",
    windowId: "window-1",
    windowIndex: 1,
    windowMode: "incognito",
    title: "Raycast Docs",
    url: "https://developers.raycast.com",
    loading: false,
    active: true,
  },
];

const bookmarks: AsideBookmark[] = [
  { id: "bookmark-1", title: "Raycast", url: "https://raycast.com", path: ["Bookmarks Bar", "Tools"] },
  { id: "bookmark-2", title: "Example", url: "https://example.com", path: ["Other Bookmarks"] },
];

describe("Raycast AI tool helpers", () => {
  it("matches every query term without regard to case", () => {
    expect(matchesSearch("Project Proposal Example.com", "proposal EXAMPLE")).toBe(true);
    expect(matchesSearch("Project Proposal", "proposal missing")).toBe(false);
  });

  it("filters tabs by title and URL", () => {
    expect(filterTabs(tabs, "raycast developers").map((tab) => tab.id)).toEqual(["tab-2"]);
  });

  it("selects the active tab in the frontmost window", () => {
    expect(frontmostActiveTab(tabs)?.id).toBe("tab-2");
  });

  it("filters bookmark paths as well as titles and URLs", () => {
    expect(filterBookmarks(bookmarks, "tools raycast").map((bookmark) => bookmark.id)).toEqual(["bookmark-1"]);
  });

  it("clamps requested result limits", () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(999)).toBe(100);
  });

  it("converts tool references to adapter targets", () => {
    expect(toTabTarget({ tabId: "tab-1", windowId: "window-2", title: "Ignored" })).toEqual({
      id: "tab-1",
      windowId: "window-2",
    });
  });

  it("parses batch-close references from a JSON tool argument", () => {
    expect(parseTabReferences('[{"tabId":"tab-1","windowId":"window-2","title":"Project Proposal"}]')).toEqual([
      { tabId: "tab-1", windowId: "window-2", title: "Project Proposal" },
    ]);
  });

  it("rejects malformed batch-close references", () => {
    expect(() => parseTabReferences('[{"tabId":"tab-1"}]')).toThrow(/windowId/);
  });

  it("resolves close requests against current tabs and ignores supplied titles", () => {
    const plan = resolveTabReferences(
      [
        { tabId: "tab-1", windowId: "window-2", title: "Misleading title" },
        { tabId: "tab-1", windowId: "window-2" },
      ],
      tabs,
    );

    expect(plan.stale).toEqual([]);
    expect(plan.tabs).toHaveLength(1);
    expect(plan.tabs[0].title).toBe("Project Proposal");
  });

  it("separates stale close references before confirmation", () => {
    const plan = resolveTabReferences([{ tabId: "missing", windowId: "window-2" }], tabs);
    expect(plan.tabs).toEqual([]);
    expect(plan.stale).toEqual([{ tabId: "missing", windowId: "window-2" }]);
  });

  it("uses live titles and URLs in close confirmation text", () => {
    expect(closeTabsConfirmationMessage([tabs[0]])).toContain("Project Proposal\n  https://example.com/proposal");
  });
});
