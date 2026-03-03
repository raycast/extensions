import { describe, expect, test } from "bun:test";
import type { RaycastCard } from "../lib/api";
import { removeCardById, toTagQuery, upsertCard } from "../lib/cardListState";

const makeCard = (id: string, isFavorited = false): RaycastCard => ({
  id,
  type: "text",
  content: `Card ${id}`,
  notes: null,
  url: null,
  tags: [],
  aiTags: [],
  aiSummary: null,
  isFavorited,
  createdAt: Number(id),
  updatedAt: Number(id),
  fileUrl: null,
  thumbnailUrl: null,
  screenshotUrl: null,
  linkPreviewImageUrl: null,
  metadataTitle: null,
  metadataDescription: null,
});

describe("card list state helpers", () => {
  test("supports optimistic favorite updates and rollback via upsert", () => {
    const cards = [makeCard("1", false)];
    const optimistic = upsertCard(cards, makeCard("1", true));
    expect(optimistic[0]?.isFavorited).toBe(true);

    const rolledBack = upsertCard(optimistic, makeCard("1", false));
    expect(rolledBack[0]?.isFavorited).toBe(false);
  });

  test("removes cards for soft delete and can restore with upsert", () => {
    const cards = [makeCard("2"), makeCard("1")];
    const removal = removeCardById(cards, "1");

    expect(removal.cards).toHaveLength(1);
    expect(removal.removedCard?.id).toBe("1");

    const restored = upsertCard(removal.cards, removal.removedCard!);
    expect(restored.map((card) => card.id)).toEqual(["2", "1"]);
  });

  test("updates query from tag interaction using trimmed tag text", () => {
    expect(toTagQuery("  cinematic  ")).toBe("cinematic");
  });

  test("removes unfavorited cards from favorites list views", () => {
    const cards = [makeCard("5", true), makeCard("4", true)];
    const next = upsertCard(cards, makeCard("5", false), {
      removeWhenUnfavorited: true,
    });

    expect(next.map((card) => card.id)).toEqual(["4"]);
  });
});
