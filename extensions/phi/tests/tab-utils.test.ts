import { describe, expect, it } from "vitest";
import {
  groupTabsBySpace,
  hasTabSearchResults,
  pinnedTabDisplaySpace,
  removeTabFromSearchData,
  resolveOpenTabAddress,
  resolveSpaceArgument,
  resolveTabFaviconURL,
} from "../src/tab-utils";
import { PhiBookmark, PhiPinnedTab, PhiSpace, PhiTab } from "../src/types";

const spaces: PhiSpace[] = [
  {
    id: "space-a",
    title: "Work",
    profileId: "Default",
    profileName: "Personal",
    colorHex: "#123456",
    iconData: null,
    isActive: true,
    isOpen: true,
  },
  {
    id: "space-b",
    title: "工作",
    profileId: "Profile 1",
    profileName: "Team",
    colorHex: "#654321",
    iconData: null,
    isActive: false,
    isOpen: true,
  },
];

function tab(id: string, windowId: string, spaceId: string): PhiTab {
  return {
    id,
    windowId,
    spaceId,
    title: `Tab ${id}`,
    url: `https://${id}.example`,
    isActive: false,
    isPinned: false,
  };
}

function pinnedTab(
  scope: PhiPinnedTab["scope"],
  spaceIds: string[],
): PhiPinnedTab {
  return {
    id: `pin-${scope}`,
    scope,
    ownerSpaceId: scope === "space" ? (spaceIds[0] ?? null) : null,
    spaceIds,
    title: "Pinned Tab",
    url: "https://pinned.example",
    secondary: null,
  };
}

describe("tab grouping", () => {
  it("groups duplicate tab IDs by Space while preserving window identity and order", () => {
    const groups = groupTabsBySpace(
      [
        tab("7", "100", "space-a"),
        tab("7", "200", "space-b"),
        tab("8", "100", "space-a"),
      ],
      spaces,
    );

    expect(groups.map((group) => group.space?.title)).toEqual(["Work", "工作"]);
    expect(
      groups[0]?.tabs.map((item) => `${item.windowId}:${item.id}`),
    ).toEqual(["100:7", "100:8"]);
    expect(
      groups[1]?.tabs.map((item) => `${item.windowId}:${item.id}`),
    ).toEqual(["200:7"]);
  });

  it("keeps results for a Space missing from the auxiliary Space response", () => {
    const groups = groupTabsBySpace([tab("9", "300", "stale-space")], spaces);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.space).toBeUndefined();
    expect(groups[0]?.tabs[0]?.id).toBe("9");
  });

  it("optimistically removes only the exact window and tab pair", () => {
    const original = {
      tabs: [
        tab("7", "100", "space-a"),
        tab("7", "200", "space-b"),
        tab("8", "100", "space-a"),
      ],
      pinnedTabs: [],
      bookmarks: [],
      targetSpaceId: null,
      spaces,
    };

    const updated = removeTabFromSearchData(original, {
      id: "7",
      windowId: "100",
    });

    expect(updated.tabs.map((item) => `${item.windowId}:${item.id}`)).toEqual([
      "200:7",
      "100:8",
    ]);
    expect(original.tabs).toHaveLength(3);
    expect(updated.spaces).toBe(original.spaces);
  });
});

describe("tab search results", () => {
  const emptyResults = {
    tabs: [],
    pinnedTabs: [],
    bookmarks: [],
  };

  it("reports an empty result when every supported row type is absent", () => {
    expect(hasTabSearchResults(emptyResults)).toBe(false);
  });

  it("reports results for open tabs, pinned tabs, and bookmarks", () => {
    expect(hasTabSearchResults({ ...emptyResults, tabs: [{} as PhiTab] })).toBe(
      true,
    );
    expect(
      hasTabSearchResults({
        ...emptyResults,
        pinnedTabs: [{} as PhiPinnedTab],
      }),
    ).toBe(true);
    expect(
      hasTabSearchResults({
        ...emptyResults,
        bookmarks: [{} as PhiBookmark],
      }),
    ).toBe(true);
  });
});

describe("pinned tab display Space", () => {
  it.each(["space", "profile"] as const)(
    "shows one target Space for %s-scoped pins",
    (scope) => {
      expect(
        pinnedTabDisplaySpace(pinnedTab(scope, ["space-a", "space-b"]), spaces),
      ).toBe(spaces[0]);
    },
  );

  it("does not show a Space for app-scoped pins", () => {
    expect(
      pinnedTabDisplaySpace(pinnedTab("app", ["space-a"]), [spaces[0]!]),
    ).toBeUndefined();
  });
});

describe("inline URL arguments", () => {
  it("uses the new-tab page when the optional argument is blank", () => {
    expect(resolveOpenTabAddress(undefined)).toBe("chrome://newtab/");
    expect(resolveOpenTabAddress("  ")).toBe("chrome://newtab/");
  });

  it("trims and preserves a provided URL or search", () => {
    expect(resolveOpenTabAddress("  https://example.com/path  ")).toBe(
      "https://example.com/path",
    );
    expect(resolveOpenTabAddress("  search terms  ")).toBe("search terms");
  });
});

describe("tab favicon URLs", () => {
  it("keeps HTTP and HTTPS URLs for Raycast's favicon provider", () => {
    expect(resolveTabFaviconURL("https://example.com/path")?.toString()).toBe(
      "https://example.com/path",
    );
    expect(resolveTabFaviconURL("http://localhost:3000")?.toString()).toBe(
      "http://localhost:3000/",
    );
  });

  it("rejects missing, malformed, and internal URLs", () => {
    expect(resolveTabFaviconURL(null)).toBeUndefined();
    expect(resolveTabFaviconURL("not a URL")).toBeUndefined();
    expect(resolveTabFaviconURL("chrome://newtab/")).toBeUndefined();
    expect(resolveTabFaviconURL("phi://conversation/123")).toBeUndefined();
    expect(resolveTabFaviconURL("file:///tmp/index.html")).toBeUndefined();
  });
});

describe("inline Space arguments", () => {
  it("uses the current Space when the optional argument is blank", () => {
    expect(resolveSpaceArgument(spaces, undefined)).toBeUndefined();
    expect(resolveSpaceArgument(spaces, "  ")).toBeUndefined();
  });

  it("resolves opaque IDs, names, and qualified names", () => {
    expect(resolveSpaceArgument(spaces, "space-b")).toBe("space-b");
    expect(resolveSpaceArgument(spaces, " work ")).toBe("space-a");
    expect(resolveSpaceArgument(spaces, "工作 — team")).toBe("space-b");
  });

  it("prefers the active Space when duplicate titles are otherwise ambiguous", () => {
    const duplicate = {
      ...spaces[1],
      id: "space-c",
      title: "Work",
      profileName: "Secondary",
    };

    expect(resolveSpaceArgument([...spaces, duplicate], "Work")).toBe(
      "space-a",
    );
    expect(
      resolveSpaceArgument([...spaces, duplicate], "Work — Secondary"),
    ).toBe("space-c");
  });

  it("returns actionable errors for missing or ambiguous names", () => {
    expect(() => resolveSpaceArgument(spaces, "Missing")).toThrowError(
      'No Phi Space named "Missing" was found.',
    );
    const duplicates = [
      { ...spaces[0], id: "space-c", isActive: false },
      { ...spaces[0], id: "space-d", isActive: false },
    ];
    expect(() => resolveSpaceArgument(duplicates, "Work")).toThrowError(
      'Multiple Phi Spaces match "Work". Use "Space — Profile".',
    );
  });
});
