import { describe, expect, it } from "vitest";

import { isSortDescending, sortCards } from "./card-sorting";
import type { MochiCard } from "./services/mochi-client";

describe("sortCards", () => {
  it("sorts cards by every supported criterion", () => {
    const cards = [
      card({
        id: "alpha",
        name: "Alpha",
        position: "C",
        createdAt: "2026-07-10",
        updatedAt: "2026-07-12",
        reviews: [],
      }),
      card({
        id: "beta",
        name: "Beta",
        position: "A",
        createdAt: "2026-07-12",
        updatedAt: "2026-07-10",
        reviews: [{ date: "2026-07-13" }, { date: "2026-07-11" }],
      }),
      card({
        id: "gamma",
        name: "Gamma",
        position: "B",
        createdAt: "2026-07-11",
        updatedAt: "2026-07-11",
        reviews: [{ date: "2026-07-14" }],
      }),
      card({ id: "untitled", name: null }),
    ];

    expect(ids(sortCards(cards, "position"))).toEqual(["beta", "gamma", "alpha", "untitled"]);
    expect(ids(sortCards(cards, "alphabetical"))).toEqual(["alpha", "beta", "gamma", "untitled"]);
    expect(ids(sortCards(cards, "created-at"))).toEqual(["beta", "gamma", "alpha", "untitled"]);
    expect(ids(sortCards(cards, "updated-at"))).toEqual(["alpha", "gamma", "beta", "untitled"]);
    expect(ids(sortCards(cards, "last-reviewed"))).toEqual(["gamma", "beta", "alpha", "untitled"]);
    expect(ids(sortCards(cards, "review-count"))).toEqual(["beta", "gamma", "alpha", "untitled"]);
  });

  it("reverses defined card order while keeping missing values last", () => {
    const cards = [
      card({ id: "alpha", name: "Alpha", position: "A" }),
      card({ id: "beta", name: "Beta", position: "B" }),
      card({ id: "missing", name: "Missing" }),
    ];

    expect(ids(sortCards(cards, "position", true))).toEqual(["beta", "alpha", "missing"]);
  });

  it("identifies descending default and reversed sort directions", () => {
    expect(isSortDescending("position")).toBe(false);
    expect(isSortDescending("position", true)).toBe(true);
    expect(isSortDescending("created-at")).toBe(true);
    expect(isSortDescending("created-at", true)).toBe(false);
  });
});

function ids(cards: readonly MochiCard[]): readonly string[] {
  return cards.map((card) => card.id);
}

function card({ id, name, ...overrides }: Partial<MochiCard> & Pick<MochiCard, "id" | "name">): MochiCard {
  return {
    id,
    deckId: "deck-1",
    content: "",
    name,
    tags: [],
    fields: [],
    createdAt: undefined,
    updatedAt: undefined,
    position: undefined,
    reviews: [],
    aiCacheEntries: [],
    archived: undefined,
    templateId: undefined,
    ...overrides,
  };
}
