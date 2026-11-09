import { describe, expect, it } from "vitest";
import {
  aiAddedTitle,
  ALL,
  browseSections,
  byName,
  categoryOptions,
  COLUMNS,
  firstSelection,
  inFilter,
  limitSections,
  NEW,
  otherLayout,
  searchSections,
  selectedIconName,
  tileOf,
} from "../../src/icons/sections";
import { IconEntry } from "../../src/icons/types";

function icon(name: string, categories: string[]): IconEntry {
  return { name, exportName: name, tags: [], categories, file: "" };
}

const icons = [
  icon("ticket", ["travel", "money"]),
  icon("broom", ["home"]),
  icon("hand", ["account"]),
  icon("house", ["home"]),
];
const newNames = new Set(["broom"]);

describe("dropdown", () => {
  it("lists categories A–Z by title", () => {
    expect(categoryOptions(icons).map((option) => option.title)).toEqual(["Account", "Home", "Money", "Travel"]);
  });

  it("filters by All, New, or any of an icon's categories", () => {
    expect(icons.filter((entry) => inFilter(entry, ALL, newNames))).toHaveLength(4);
    expect(icons.filter((entry) => inFilter(entry, NEW, newNames)).map((entry) => entry.name)).toEqual(["broom"]);
    expect(icons.filter((entry) => inFilter(entry, "money", newNames)).map((entry) => entry.name)).toEqual(["ticket"]);
  });
});

describe("browseSections", () => {
  const base = { icons, newNames, frequent: [], newSample: [] };

  it("leads with Favorites when the setting shows them, and only under All", () => {
    const favorites = byName(icons, ["house"]);
    const sections = browseSections({ ...base, filter: ALL, favorites, frequent: byName(icons, ["ticket"]) });
    expect(sections.map((section) => section.title)).toEqual([
      "Favorites",
      "Frequently Used",
      "Account",
      "Home",
      "Travel",
    ]);
    expect(sections[0]).toEqual({ kind: "favorites", title: "Favorites", icons: favorites });
    expect(browseSections({ ...base, filter: "home", favorites })[0].title).toBe("Home");
  });

  it("shows Frequently Used, New, then categories, skipping empty rows, and no Favorites when there are none", () => {
    const sections = browseSections({
      ...base,
      filter: ALL,
      frequent: byName(icons, ["ticket"]),
      newSample: byName(icons, ["broom"]),
    });
    expect(sections.map((section) => section.title)).toEqual(["Frequently Used", "New", "Account", "Home", "Travel"]);
    expect(browseSections({ ...base, filter: ALL }).map((section) => section.title)).toEqual([
      "Account",
      "Home",
      "Travel",
    ]);
  });

  it("groups each icon once, under its first category", () => {
    const sections = browseSections({ ...base, filter: ALL });
    expect(sections.flatMap((section) => section.icons)).toHaveLength(4);
  });

  it("shows the whole New set, or one category", () => {
    expect(browseSections({ ...base, filter: NEW })).toEqual([{ kind: "new", title: "New", icons: [icons[1]] }]);
    expect(browseSections({ ...base, filter: "home" })[0].icons.map((entry) => entry.name)).toEqual(["broom", "house"]);
  });
});

describe("searchSections", () => {
  it("lists AI results after keyword results, without repeats", () => {
    const sections = searchSections([icons[0]], [icons[0], icons[2]]);
    expect(sections.map((section) => [section.kind, section.icons.map((entry) => entry.name)])).toEqual([
      ["results", ["ticket"]],
      ["ai", ["hand"]],
    ]);
    expect(searchSections([], undefined)).toEqual([]);
  });

  it("puts favorites first under Favorites, best match first, and heads the rest More Results", () => {
    const favorites = new Set(["house", "hand"]);
    const sections = searchSections([icons[0], icons[3], icons[1], icons[2]], undefined, 0, favorites);
    expect(sections.map((section) => [section.kind, section.title, section.icons.map((entry) => entry.name)])).toEqual([
      ["favorites", "Favorites", ["house", "hand"]],
      ["results", "More Results", ["ticket", "broom"]],
    ]);
  });

  it("leaves the results untitled when no favorite matches, and shows Favorites alone when all are", () => {
    const favorites = new Set(["hand"]);
    expect(searchSections([icons[0]], undefined, 0, favorites)).toEqual([
      { kind: "results", title: "", icons: [icons[0]] },
    ]);
    expect(searchSections([icons[2]], undefined, 0, favorites)).toEqual([
      { kind: "favorites", title: "Favorites", icons: [icons[2]] },
    ]);
  });

  it("orders AI results favorites first, below the keyword results", () => {
    const favorites = new Set(["house", "ticket"]);
    const sections = searchSections([icons[0]], [icons[1], icons[3], icons[0], icons[2]], 0, favorites);
    expect(sections.map((section) => [section.kind, section.icons.map((entry) => entry.name)])).toEqual([
      ["favorites", ["ticket"]],
      ["ai", ["house", "broom", "hand"]],
    ]);
  });

  it("finds a tile's section so the highlight can follow it", () => {
    const sections = searchSections([icons[0], icons[2]], undefined, 0, new Set(["hand"]));
    expect(tileOf(sections, "hand")).toBe("favorites:hand");
    expect(tileOf(sections, "ticket")).toBe("results:ticket");
    expect(tileOf(sections, "broom")).toBeUndefined();
  });

  it("holds a loading tile in AI Results while AI works", () => {
    expect(searchSections([icons[0]], undefined, 1)).toEqual([
      { kind: "results", title: "", icons: [icons[0]] },
      { kind: "ai", title: "AI Results", icons: [], placeholders: 1 },
    ]);
    expect(searchSections([], undefined, 1)).toEqual([{ kind: "ai", title: "AI Results", icons: [], placeholders: 1 }]);
  });
});

describe("aiAddedTitle", () => {
  it("counts what Tab added, or says nothing new came", () => {
    expect(aiAddedTitle(0)).toBe("No new AI results");
    expect(aiAddedTitle(1)).toBe("1 AI result below");
    expect(aiAddedTitle(12)).toBe("12 AI results below");
  });
});

describe("byName", () => {
  it("keeps the given order and skips unknown names", () => {
    expect(byName(icons, ["house", "gone", "ticket"]).map((entry) => entry.name)).toEqual(["house", "ticket"]);
  });
});

describe("limitSections", () => {
  const sections = [
    { kind: "favorites" as const, title: "Favorites", icons: icons.slice(0, 2) },
    { kind: "category" as const, title: "Home", icons: icons.slice(1, 4) },
  ];

  it("cuts off partway through a section", () => {
    const { sections: shown, hasMore } = limitSections(sections, 3);
    expect(shown.map((section) => section.icons.length)).toEqual([2, 1]);
    expect(hasMore).toBe(true);
  });

  it("stops at a section boundary and reports more to come", () => {
    const { sections: shown, hasMore } = limitSections(sections, 2);
    expect(shown.map((section) => section.title)).toEqual(["Favorites"]);
    expect(hasMore).toBe(true);
  });

  it("shows everything when it fits", () => {
    expect(limitSections(sections, 5)).toEqual({ sections, hasMore: false });
    expect(limitSections(sections, 100).hasMore).toBe(false);
  });
});

describe("firstSelection", () => {
  const sections = [
    { kind: "results" as const, title: "", icons: icons.slice(0, 2) },
    { kind: "ai" as const, title: "AI Results", icons: icons.slice(2) },
  ];

  it("selects the first tile of a search", () => {
    expect(firstSelection(sections, "ticket", ALL)).toBe("results:ticket");
  });

  it("selects the first tile of a filtered view", () => {
    expect(firstSelection(sections, "", NEW)).toBe("results:ticket");
    expect(firstSelection(sections, " ", "home")).toBe("results:ticket");
  });

  it("leaves the start view alone, where pin changes would move the first tile", () => {
    expect(firstSelection(sections, "  ", ALL)).toBeUndefined();
  });

  it("selects nothing when there are no tiles", () => {
    expect(firstSelection([], "ticket", ALL)).toBeUndefined();
  });
});

describe("selectedIconName", () => {
  const results = searchSections([icons[0]], [icons[2]]);

  it("names real keyword and AI results, including names containing punctuation", () => {
    const punctuated = searchSections([icon("re:", [])], []);
    expect(selectedIconName(results, "lucide", "lucide:results:ticket")).toBe("ticket");
    expect(selectedIconName(results, "lucide", "lucide:ai:hand")).toBe("hand");
    expect(selectedIconName(punctuated, "hugeicons", "hugeicons:results:re:")).toBe("re:");
  });

  it("ignores placeholders, empty selections, and icons outside the current results or library", () => {
    const loading = searchSections([], undefined, 1);
    expect(selectedIconName(loading, "lucide", "placeholder:0")).toBeUndefined();
    expect(selectedIconName(loading, "lucide", "lucide:ai:hand")).toBeUndefined();
    expect(selectedIconName(results, "lucide", null)).toBeUndefined();
    expect(selectedIconName(results, "lucide", "hugeicons:results:ticket")).toBeUndefined();
    expect(selectedIconName(results, "lucide", "lucide:results:hand")).toBeUndefined();
    expect(selectedIconName(limitSections(results, 1).sections, "lucide", "lucide:ai:hand")).toBeUndefined();
  });
});

describe("tile layouts", () => {
  it("fits 8 across without names and 7 with them", () => {
    expect(COLUMNS).toEqual({ compact: 8, labeled: 7 });
  });

  it("switches between the two", () => {
    expect(otherLayout("compact")).toBe("labeled");
    expect(otherLayout("labeled")).toBe("compact");
  });
});
