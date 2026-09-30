// M-1: never configured vs deliberately empty (SPEC.md §5.3 four-row table), with an in-memory store.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, serializeSelection, type InstalledApp, type SelectedApp } from "../src/lib/badge/config.ts";
import type { KeyValueStore } from "../src/lib/badge/views.ts";
import { loadAppsFrom, SETUP_STORAGE_KEY, serializeSetup } from "../src/lib/setup.ts";

function memoryStore(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  const store: KeyValueStore = {
    async getItem(key) {
      return data.get(key);
    },
    async setItem(key, value) {
      writes.push([key, value]);
      data.set(key, value);
    },
  };
  return { store, data, writes };
}

const app = (bundleId: string, name: string): SelectedApp => ({ bundleId, path: `/Applications/${name}.app`, name });
const mail = app("com.apple.mail", "Mail");
const slack = app("com.tinyspeck.slackmacgap", "Slack");
const safari = app("com.apple.Safari", "Safari");
const installed: InstalledApp[] = [safari, slack, mail];
const installedReader = async () => installed;
const NOW = "2026-09-30T18:00:00.000Z";

describe("M-1 first-run and recovery rules", () => {
  it("missing apps.v1 + missing setup.v1: never configured → seeds once and writes both keys", async () => {
    const { store, data, writes } = memoryStore();
    const loaded = await loadAppsFrom(store, installedReader, () => NOW);
    assert.deepEqual(loaded, { apps: [mail, slack], notice: "seeded" });
    assert.deepEqual(writes, [
      [STORAGE_KEY, serializeSelection([mail, slack])],
      [SETUP_STORAGE_KEY, serializeSetup(NOW)],
    ]);
    assert.equal(data.get(SETUP_STORAGE_KEY), '{"seededAt":"2026-09-30T18:00:00.000Z"}');
    // Second launch: nothing written, no notice.
    const again = await loadAppsFrom(store, installedReader, () => "later");
    assert.deepEqual(again, { apps: [mail, slack] });
    assert.equal(writes.length, 2);
  });

  it("apps.v1 = [] : deliberately empty → no seed, no write, no notice (with or without setup.v1)", async () => {
    for (const initial of [{ [STORAGE_KEY]: "[]" }, { [STORAGE_KEY]: "[]", [SETUP_STORAGE_KEY]: serializeSetup(NOW) }]) {
      const { store, writes } = memoryStore(initial);
      assert.deepEqual(await loadAppsFrom(store, installedReader, () => NOW), { apps: [] });
      assert.equal(writes.length, 0);
    }
  });

  it("missing apps.v1 + present setup.v1: configured before, key gone → [] with the warning, nothing written", async () => {
    const { store, writes } = memoryStore({ [SETUP_STORAGE_KEY]: serializeSetup(NOW) });
    assert.deepEqual(await loadAppsFrom(store, installedReader, () => NOW), { apps: [], notice: "missing-after-setup" });
    assert.equal(writes.length, 0);
  });

  it("a corrupt setup.v1 still counts as present (the seed is never repeated on a hunch)", async () => {
    const { store, writes } = memoryStore({ [SETUP_STORAGE_KEY]: "{not json" });
    assert.deepEqual(await loadAppsFrom(store, installedReader, () => NOW), { apps: [], notice: "missing-after-setup" });
    assert.equal(writes.length, 0);
  });

  it("corrupt apps.v1: reseeds with the badge project's toast, whatever setup.v1 says", async () => {
    for (const bad of ["{not json", "42", '[{"bundleId":1}]', 7]) {
      const { store, data, writes } = memoryStore({ [STORAGE_KEY]: bad, [SETUP_STORAGE_KEY]: serializeSetup("earlier") });
      const loaded = await loadAppsFrom(store, installedReader, () => NOW);
      assert.deepEqual(loaded, { apps: [mail, slack], notice: "reseeded-corrupt" });
      assert.deepEqual(writes, [[STORAGE_KEY, serializeSelection([mail, slack])]]);
      assert.equal(data.get(SETUP_STORAGE_KEY), serializeSetup("earlier"), "existing setup stamp is kept");
    }
    const { store, writes } = memoryStore({ [STORAGE_KEY]: "{not json" });
    await loadAppsFrom(store, installedReader, () => NOW);
    assert.deepEqual(
      writes.map(([k]) => k),
      [STORAGE_KEY, SETUP_STORAGE_KEY],
      "corrupt without a setup stamp writes the stamp too",
    );
  });

  it("a readable list is returned as-is without any write, even when nothing in it is installed", async () => {
    const gone = app("com.example.gone", "Gone");
    const { store, writes } = memoryStore({ [STORAGE_KEY]: serializeSelection([gone]) });
    assert.deepEqual(await loadAppsFrom(store, installedReader, () => NOW), { apps: [gone] });
    assert.equal(writes.length, 0);
  });
});
