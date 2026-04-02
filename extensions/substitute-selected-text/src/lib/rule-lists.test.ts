import { describe, expect, it } from "vitest";

import {
  addFavorite,
  clearHistory,
  deleteHistoryItem,
  moveFavorite,
  removeFavorite,
  upsertHistory,
} from "./rule-lists";
import type { FavoriteItem, HistoryItem } from "../types";

describe("history operations", () => {
  it("deduplicates by rawInput and moves reused item to front", () => {
    const seed: HistoryItem[] = [
      { id: "1", rawInput: "/a/b/g", createdAt: 1 },
      { id: "2", rawInput: "/c/d/g", createdAt: 2 },
    ];

    const updated = upsertHistory(
      seed,
      "/a/b/g",
      10,
      () => 3,
      () => "3",
    );

    expect(updated.map((item) => item.rawInput)).toEqual(["/a/b/g", "/c/d/g"]);
    expect(updated[0].id).toBe("3");
  });

  it("trims oldest items when exceeding history limit", () => {
    const seed: HistoryItem[] = [
      { id: "1", rawInput: "/a/b/g", createdAt: 1 },
      { id: "2", rawInput: "/c/d/g", createdAt: 2 },
    ];

    const updated = upsertHistory(
      seed,
      "/e/f/g",
      2,
      () => 3,
      () => "3",
    );

    expect(updated.map((item) => item.rawInput)).toEqual(["/e/f/g", "/a/b/g"]);
  });

  it("deletes one history item and clears all", () => {
    const seed: HistoryItem[] = [
      { id: "1", rawInput: "/a/b/g", createdAt: 1 },
      { id: "2", rawInput: "/c/d/g", createdAt: 2 },
    ];

    const oneDeleted = deleteHistoryItem(seed, "1");

    expect(oneDeleted).toEqual([{ id: "2", rawInput: "/c/d/g", createdAt: 2 }]);
    expect(clearHistory()).toEqual([]);
  });
});

describe("favorite operations", () => {
  it("adds and removes favorite", () => {
    const seed: FavoriteItem[] = [];

    const added = addFavorite(
      seed,
      "/a/b/g",
      () => 1,
      () => "1",
    );

    expect(added).toHaveLength(1);
    expect(added[0].rawInput).toBe("/a/b/g");

    const removed = removeFavorite(added, "1");
    expect(removed).toEqual([]);
  });

  it("keeps favorite unique by rawInput", () => {
    const seed: FavoriteItem[] = [
      { id: "1", rawInput: "/a/b/g", order: 0, createdAt: 1 },
    ];

    const added = addFavorite(
      seed,
      "/a/b/g",
      () => 2,
      () => "2",
    );

    expect(added).toEqual(seed);
  });

  it("moves favorite up and down with boundaries", () => {
    const seed: FavoriteItem[] = [
      { id: "1", rawInput: "/a/b/g", order: 0, createdAt: 1 },
      { id: "2", rawInput: "/c/d/g", order: 1, createdAt: 2 },
      { id: "3", rawInput: "/e/f/g", order: 2, createdAt: 3 },
    ];

    const movedUp = moveFavorite(seed, "2", "up");
    expect(movedUp.map((item) => item.id)).toEqual(["2", "1", "3"]);
    expect(movedUp.map((item) => item.order)).toEqual([0, 1, 2]);

    const movedDown = moveFavorite(seed, "2", "down");
    expect(movedDown.map((item) => item.id)).toEqual(["1", "3", "2"]);

    expect(moveFavorite(seed, "1", "up").map((item) => item.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(moveFavorite(seed, "3", "down").map((item) => item.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});
