import assert from "node:assert/strict";
import { test } from "node:test";
import type { Emote } from "../src/providers.ts";
import {
  createSearchPreferencesStore,
  getSavedEmoteMatches,
} from "../src/search-state.ts";

const key = (e: Emote) => `${e.provider ?? "7tv"}:${e.id}`;
const emote = (
  id: string,
  name: string,
  provider?: "7tv" | "bttv" | "ffz",
  animated = true,
): Emote => ({
  id,
  name,
  provider,
  animated,
  host: { url: "//example.com", files: [] },
});
const selections = [
  "7tv:popular",
  "7tv:recent",
  "bttv:popular",
  "bttv:trending",
  "ffz:name-asc",
];

test("saved name search ignores case and whitespace and keeps favorites before unique recents", () => {
  const favorite = emote("1", "catJAM");
  const recent = emote("2", "CatDance");
  const result = getSavedEmoteMatches(
    [favorite],
    [favorite, recent, emote("3", "DogDance")],
    { provider: "7tv", query: " CAT ", animatedOnly: false },
    key,
  );
  assert.deepEqual(result.favorites.map(key), ["7tv:1"]);
  assert.deepEqual(result.history.map(key), ["7tv:2"]);
});

test("saved matches respect provider and animation while preserving legacy 7TV entries", () => {
  const all = [
    emote("1", "catJAM"),
    emote("1", "catJAM", "bttv"),
    emote("2", "catSit", "7tv", false),
  ];
  assert.deepEqual(
    getSavedEmoteMatches(
      all,
      [],
      { provider: "7tv", query: "cat", animatedOnly: true },
      key,
    ).favorites.map(key),
    ["7tv:1"],
  );
  assert.deepEqual(
    getSavedEmoteMatches(
      all,
      [],
      { provider: "bttv", query: "", animatedOnly: false },
      key,
    ).favorites.map(key),
    ["bttv:1"],
  );
  assert.equal(all.length, 3);
});

function memory(initial?: string) {
  const data = new Map<string, string>(
    initial === undefined ? [] : [["search_preferences_v1", initial]],
  );
  const writes: string[] = [];
  return {
    data,
    writes,
    storage: {
      getItem: async (key: string) => data.get(key),
      setItem: async (key: string, value: string) => {
        writes.push(key);
        data.set(key, value);
      },
    },
  };
}

test("preferences restore all view choices without writing or retaining search text", async () => {
  const m = memory(
    JSON.stringify({
      selection: "bttv:trending",
      isGridView: false,
      animatedOnly: true,
      searchText: "private query",
    }),
  );
  const store = createSearchPreferencesStore(m.storage, selections);
  assert.deepEqual(await store.load(), {
    selection: "bttv:trending",
    isGridView: false,
    animatedOnly: true,
  });
  assert.equal(m.writes.length, 0);
});

test("invalid stored selections fall back while valid preferences survive", async () => {
  const m = memory(
    JSON.stringify({
      selection: "7tv:name-asc",
      isGridView: false,
      animatedOnly: "yes",
    }),
  );
  assert.deepEqual(
    await createSearchPreferencesStore(m.storage, selections).load(),
    { selection: "7tv:popular", isGridView: false, animatedOnly: false },
  );
  assert.equal(m.writes.length, 0);
});

test("rapid preference updates preserve earlier fields and survive reopening", async () => {
  const m = memory();
  m.data.set("favorites_v1", "old favorites");
  m.data.set("history_v1", "old history");
  const store = createSearchPreferencesStore(m.storage, selections);
  await Promise.all([
    store.update({ selection: "ffz:name-asc" }),
    store.update({ isGridView: false }),
    store.update({ animatedOnly: true }),
  ]);
  assert.deepEqual(
    await createSearchPreferencesStore(m.storage, selections).load(),
    { selection: "ffz:name-asc", isGridView: false, animatedOnly: true },
  );
  assert.equal(m.data.get("favorites_v1"), "old favorites");
  assert.equal(m.data.get("history_v1"), "old history");
  assert.ok(m.writes.every((key) => key === "search_preferences_v1"));
});

test("an update during preference initialization keeps loaded settings", async () => {
  let release!: (value: string) => void;
  const initial = new Promise<string>((resolve) => {
    release = resolve;
  });
  let saved = "";
  const store = createSearchPreferencesStore(
    {
      getItem: async () => initial,
      setItem: async (_key, value) => {
        saved = value;
      },
    },
    selections,
  );
  const updated = store.update({ isGridView: false });
  release(JSON.stringify({ selection: "bttv:trending", animatedOnly: true }));
  await updated;
  assert.deepEqual(JSON.parse(saved), {
    selection: "bttv:trending",
    isGridView: false,
    animatedOnly: true,
  });
});

test("unreadable preferences are not overwritten by a later action", async () => {
  const m = memory("{broken");
  const store = createSearchPreferencesStore(m.storage, selections);
  await assert.rejects(store.load());
  await assert.rejects(store.update({ animatedOnly: true }));
  assert.equal(m.data.get("search_preferences_v1"), "{broken");
  assert.equal(m.writes.length, 0);
});
