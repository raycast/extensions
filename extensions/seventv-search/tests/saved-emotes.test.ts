import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSavedEmotesStore,
  type EmoteStorage,
} from "../src/saved-emotes.ts";
import { getEmoteKey, type Emote } from "../src/providers.ts";

const legacy: Emote = {
  id: "old-cat",
  name: "catJAM",
  animated: true,
  host: {
    url: "//cdn.7tv.app/emote/old-cat",
    files: [{ name: "4x.webp", format: "WEBP", width: 128, height: 128 }],
  },
};
const other: Emote = { ...legacy, id: "other", name: "Life" };
const incoming: Emote = {
  ...legacy,
  id: "old-cat",
  name: "Dance",
  provider: "bttv",
};
function memoryStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  const storage: EmoteStorage = {
    async getItem(key) {
      return values.get(key);
    },
    async setItem(key, value) {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { storage, values, writes };
}

test("an installed-version snapshot loads unchanged without rewriting it", async () => {
  const data = memoryStorage({
    favorites_v1: JSON.stringify([legacy]),
    history_v1: JSON.stringify([legacy, other]),
  });
  const store = createSavedEmotesStore(data.storage, getEmoteKey);
  const state = await store.load();
  assert.deepEqual(state, { favorites: [legacy], history: [legacy, other] });
  assert.equal(getEmoteKey(state.favorites[0]), "7tv:old-cat");
  assert.deepEqual(data.writes, []);
});

test("first paste before saved history loads keeps the installed-version entries", async () => {
  const data = memoryStorage({
    favorites_v1: JSON.stringify([legacy]),
    history_v1: JSON.stringify([legacy, other]),
  });
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const originalGet = data.storage.getItem;
  data.storage.getItem = async (key) => {
    await blocked;
    return originalGet(key);
  };
  const store = createSavedEmotesStore(data.storage, getEmoteKey);
  const loading = store.load();
  const saving = store.recordRecent(incoming);
  release();
  await Promise.all([loading, saving]);
  assert.deepEqual(JSON.parse(data.values.get("history_v1")!), [
    incoming,
    legacy,
    other,
  ]);
  assert.equal(data.values.get("favorites_v1"), JSON.stringify([legacy]));
});

test("starring a new provider before initialization preserves old favorites", async () => {
  const data = memoryStorage({ favorites_v1: JSON.stringify([legacy]) });
  const store = createSavedEmotesStore(data.storage, getEmoteKey);
  await store.toggleFavorite(incoming);
  assert.deepEqual(JSON.parse(data.values.get("favorites_v1")!), [
    incoming,
    legacy,
  ]);
});

test("concurrent recent updates keep both new entries and old history", async () => {
  const data = memoryStorage({ history_v1: JSON.stringify([legacy]) });
  const store = createSavedEmotesStore(data.storage, getEmoteKey);
  await store.load();
  await Promise.all([store.recordRecent(incoming), store.recordRecent(other)]);
  assert.deepEqual(JSON.parse(data.values.get("history_v1")!), [
    other,
    incoming,
    legacy,
  ]);
});

test("unreadable saved data is not overwritten by the next action", async () => {
  const data = memoryStorage({
    favorites_v1: "broken-json",
    history_v1: JSON.stringify([legacy]),
  });
  const store = createSavedEmotesStore(data.storage, getEmoteKey);
  await assert.rejects(store.toggleFavorite(incoming));
  assert.equal(data.values.get("favorites_v1"), "broken-json");
  assert.deepEqual(data.writes, []);
});
