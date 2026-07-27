import { describe, expect, it } from "vitest";
import { searchTiles } from "./search";
import type { IconTile } from "../types";

function tile(name: string, keywords: string[] = []): IconTile {
  return { name, category: "Test", keywords, id: `s:${name}`, fill: "outlined", style: "s" };
}

/** Ordered so a naive `includes()` would surface the wrong item first. */
const TILES: IconTile[] = [
  tile("IconMenucard", ["menu", "card"]),
  tile("IconScorecard", ["score"]),
  tile("IconCar1", ["car", "vehicle"]),
  tile("IconCarWash", ["car", "wash"]),
  tile("IconBag", ["bag"]),
  tile("IconBug", ["bug", "insect"]),
  tile("IconDebugger", ["debug", "bug"]),
];

describe("searchTiles", () => {
  it("ranks prefix matches above substring matches", () => {
    // The exact failure SF Symbols documented: searching "car" returned
    // "menucard" first, because it appears earlier in the array.
    const { results } = searchTiles(TILES, "car", 10);
    expect(results[0].name).toBe("IconCar1");
    expect(results.map((t) => t.name)).toContain("IconMenucard");
    expect(results.indexOf(results.find((t) => t.name === "IconMenucard")!)).toBeGreaterThan(0);
  });

  it("ranks an exact name match first", () => {
    const { results } = searchTiles(TILES, "bug", 10);
    expect(results[0].name).toBe("IconBug");
  });

  it("matches keywords, not just names", () => {
    const { results } = searchTiles(TILES, "insect", 10);
    expect(results.map((t) => t.name)).toEqual(["IconBug"]);
  });

  it("caps results at the limit", () => {
    const { results } = searchTiles(TILES, "", 3);
    expect(results).toHaveLength(3);
  });

  it("reports the uncapped total so truncation can be surfaced", () => {
    // Without this the UI silently drops matches, which reads to the user as
    // "that icon doesn't exist".
    const { results, total } = searchTiles(TILES, "car", 1);
    expect(results).toHaveLength(1);
    // Car1, CarWash, Menucard, Scorecard — "car" is a substring of the last two.
    expect(total).toBe(4);
  });

  it("returns everything up to the limit for an empty query", () => {
    const { results, total } = searchTiles(TILES, "   ", 100);
    expect(results).toHaveLength(TILES.length);
    expect(total).toBe(TILES.length);
  });

  it("is case-insensitive", () => {
    expect(searchTiles(TILES, "BUG", 10).results[0].name).toBe("IconBug");
  });
});
