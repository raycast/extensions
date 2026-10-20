import { describe, expect, test } from "bun:test";
import type { RaycastCard } from "../lib/api";
import { removeCardById, toTagQuery, upsertCard } from "../lib/cardListState";

const makeCard = (id: string, isFavorited = false): RaycastCard => ({
  appUrl: null,
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
  test("a done or to-do list drops links that no longer match", () => {
    const done = { ...makeCard("1"), completedAt: 5 };
    const todo = makeCard("2");
    expect(
      upsertCard([todo], { ...todo, completedAt: 6 }, { doneView: "todo" }),
    ).toEqual([]);
    expect(
      upsertCard([done], { ...done, completedAt: null }, { doneView: "done" }),
    ).toEqual([]);
    expect(upsertCard([done], done, { doneView: "done" })).toEqual([done]);
  });

  test("a card that comes back keeps its place in a shuffled list", () => {
    const shuffled = [makeCard("3"), makeCard("9"), makeCard("1")];
    const restored = upsertCard(
      [shuffled[0], shuffled[2]].filter((card) => card !== undefined),
      makeCard("9"),
      { insertIndex: 1 },
    );
    expect(restored.map((card) => card.id)).toEqual(["3", "9", "1"]);
  });

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

  test("drops a card that was archived from a list of the library", () => {
    const cards = [makeCard("5"), makeCard("4")];
    const next = upsertCard(
      cards,
      { ...makeCard("5"), isArchived: true },
      { archivedView: false },
    );
    expect(next.map((card) => card.id)).toEqual(["4"]);
  });

  test("drops a card that was unarchived from the Archive list", () => {
    const cards = [{ ...makeCard("5"), isArchived: true }, makeCard("4")];
    const next = upsertCard(cards, makeCard("5"), { archivedView: true });
    expect(next.map((card) => card.id)).toEqual(["4"]);
  });

  test("keeps an archived card in the Archive list when it changes", () => {
    const archived = { ...makeCard("5"), isArchived: true };
    const next = upsertCard(
      [archived],
      { ...archived, isFavorited: true },
      {
        archivedView: true,
      },
    );
    expect(next[0]?.isFavorited).toBe(true);
  });

  test("drops a card that became hidden unless the search names a hidden tag", () => {
    const hidden = { ...makeCard("5"), isHidden: true };
    expect(
      upsertCard([makeCard("5")], hidden, { removeWhenHidden: true }),
    ).toEqual([]);
    expect(
      upsertCard([makeCard("5")], hidden, { removeWhenHidden: false }),
    ).toHaveLength(1);
  });
});
