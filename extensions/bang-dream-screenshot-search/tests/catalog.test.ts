import { describe, expect, it } from "vitest";
import { filterCatalog, matchesSearch, normalizeSearchValue, searchTokens } from "../src/lib/catalog";
import type { ScreenshotManifest } from "../src/types";

const manifest: ScreenshotManifest = {
  schemaVersion: 1,
  sourceCommit: "a".repeat(40),
  sourceWebsiteUrl: "https://example.com",
  sourceRepositoryUrl: "https://github.com/example/example",
  series: [
    { id: "mygo", title: "MyGO!!!!!", assetDirectory: "mygo", sourceStateKey: "myGOImages", order: 0 },
    {
      id: "ave-mujica",
      title: "Ave Mujica",
      assetDirectory: "ave-mujica",
      sourceStateKey: "aveMujicaImages",
      order: 1,
    },
  ],
  screenshots: [
    {
      id: "mygo/為什麼要演奏春日影",
      seriesId: "mygo",
      rawName: "為什麼要演奏春日影",
      title: "為什麼要演奏春日影",
      episode: 7,
      previewUrl: "https://example.com/1.webp",
      copyUrl: "https://example.com/1.jpg",
    },
    {
      id: "mygo/一輩子",
      seriesId: "mygo",
      rawName: "一輩子_2",
      title: "一輩子",
      episode: 10,
      previewUrl: "https://example.com/2.webp",
      copyUrl: "https://example.com/2.jpg",
    },
    {
      id: "ave-mujica/就將一切委身於Ave Mujica吧",
      seriesId: "ave-mujica",
      rawName: "就將一切委身於Ave Mujica吧",
      title: "就將一切委身於Ave Mujica吧",
      episode: 2,
      previewUrl: "https://example.com/3.webp",
      copyUrl: "https://example.com/3.jpg",
    },
  ],
};

describe("search normalization", () => {
  it("normalizes width, case, and whitespace", () => {
    expect(normalizeSearchValue("  ＡＶＥ Mujica  ")).toBe("ave mujica");
    expect(searchTokens("  春日影   EP7 ")).toEqual(["春日影", "ep7"]);
  });

  it("requires every token to match", () => {
    expect(matchesSearch(manifest.screenshots[0], "春日影 mygo", "MyGO!!!!!")).toBe(true);
    expect(matchesSearch(manifest.screenshots[0], "春日影 mujica", "MyGO!!!!!")).toBe(false);
  });
});

describe("catalog filtering", () => {
  it("filters a series before applying the query", () => {
    const results = filterCatalog({
      manifest,
      filter: "series:ave-mujica",
      favoriteIds: [],
      recentIds: [],
      query: "ave",
    });
    expect(results.map((item) => item.id)).toEqual(["ave-mujica/就將一切委身於Ave Mujica吧"]);
  });

  it("keeps favorite and recent ordering", () => {
    const favoriteIds = [manifest.screenshots[2].id, manifest.screenshots[0].id];
    const recentIds = [manifest.screenshots[1].id, manifest.screenshots[2].id];
    expect(
      filterCatalog({ manifest, filter: "favorites", favoriteIds, recentIds, query: "" }).map((item) => item.id),
    ).toEqual(favoriteIds);
    expect(
      filterCatalog({ manifest, filter: "recent", favoriteIds, recentIds, query: "" }).map((item) => item.id),
    ).toEqual(recentIds);
  });

  it("ignores stale collection IDs", () => {
    const results = filterCatalog({
      manifest,
      filter: "favorites",
      favoriteIds: ["missing", manifest.screenshots[0].id],
      recentIds: [],
      query: "",
    });
    expect(results.map((item) => item.id)).toEqual([manifest.screenshots[0].id]);
  });
});
