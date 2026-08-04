import { describe, expect, it } from "vitest";
import { mergeAppleScriptTabsWithFavicons } from "../../src/utils/tab-merge";

describe("mergeAppleScriptTabsWithFavicons", () => {
  it("preserves Helium tab ids for a 50-tab list and enriches available favicons", () => {
    const asTabs = Array.from({ length: 50 }, (_, index) => {
      const tabNumber = index + 1;
      return {
        heliumId: `helium-${tabNumber}`,
        url: tabNumber === 50 ? "" : `https://example.com/${tabNumber}`,
        title: `Tab ${tabNumber}`,
      };
    });
    const beTabs = [
      { url: "https://example.com/1", favicon: "https://example.com/favicon.ico" },
      { url: "https://example.com/25", favicon: "https://example.com/25.ico" },
      { url: "https://not-open.example", favicon: "https://not-open.example/favicon.ico" },
    ];

    const tabs = mergeAppleScriptTabsWithFavicons(asTabs, beTabs);

    expect(tabs).toHaveLength(50);
    expect(tabs[0]).toEqual({
      id: "helium-1",
      url: "https://example.com/1",
      title: "Tab 1",
      favicon: "https://example.com/favicon.ico",
    });
    expect(tabs[24].favicon).toBe("https://example.com/25.ico");
    expect(tabs[49]).toEqual({ id: "helium-50", url: "", title: "Tab 50", favicon: undefined });
  });
});
