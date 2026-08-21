import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import {
  deletedPresetStorageKey,
  PRESETS_STORAGE_KEY,
  presetStorageKey,
  type PromptPreset,
} from "../src/lib/presets.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".js") && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { deletePreset, loadPreset, loadPresets, upsertPreset } =
  await import("../src/lib/preset-storage.ts");

interface PresetStorage {
  allItems(): Promise<Record<string, string | number | boolean>>;
  getItem(key: string): Promise<string | number | boolean | undefined>;
  setItem(key: string, value: string | number | boolean): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const preset: PromptPreset = {
  id: "preset-id",
  name: "Current preset",
  template: "Explain {topic}",
  serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
};

class MemoryStorage implements PresetStorage {
  readonly items = new Map<string, string | number | boolean>();
  readonly removedKeys: string[] = [];
  beforeGet?: (key: string) => Promise<void> | void;
  beforeSet?: (key: string) => Promise<void> | void;
  afterRemove?: (key: string) => Promise<void> | void;

  constructor(items: Record<string, string | number | boolean> = {}) {
    for (const [key, value] of Object.entries(items))
      this.items.set(key, value);
  }

  async allItems() {
    return Object.fromEntries(this.items);
  }

  async getItem(key: string) {
    await this.beforeGet?.(key);
    return this.items.get(key);
  }

  async setItem(key: string, value: string | number | boolean) {
    await this.beforeSet?.(key);
    this.items.set(key, value);
  }

  async removeItem(key: string) {
    this.removedKeys.push(key);
    this.items.delete(key);
    await this.afterRemove?.(key);
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("keeps malformed legacy storage and surfaces a migration failure", async () => {
  const storage = new MemoryStorage({ [PRESETS_STORAGE_KEY]: "not json" });

  await assert.rejects(loadPresets(storage), /original data was kept/i);
  assert.equal(storage.items.get(PRESETS_STORAGE_KEY), "not json");
  assert.deepEqual(storage.removedKeys, []);
});

test("removes valid legacy storage only after every preset is written", async () => {
  const secondPreset = { ...preset, id: "second", name: "Second" };
  const legacyValue = JSON.stringify([preset, secondPreset]);
  const storage = new MemoryStorage({ [PRESETS_STORAGE_KEY]: legacyValue });
  storage.beforeSet = (key) => {
    if (key === presetStorageKey(secondPreset.id)) {
      throw new Error("simulated write failure");
    }
  };

  await assert.rejects(loadPresets(storage), /simulated write failure/);
  assert.equal(storage.items.get(PRESETS_STORAGE_KEY), legacyValue);
  assert.equal(storage.removedKeys.includes(PRESETS_STORAGE_KEY), false);

  storage.beforeSet = undefined;
  assert.deepEqual(await loadPresets(storage), [preset, secondPreset]);
  assert.equal(storage.items.has(PRESETS_STORAGE_KEY), false);
});

test("a deletion wins when an earlier upsert resumes after delete returns", async () => {
  const storage = new MemoryStorage({
    [presetStorageKey(preset.id)]: JSON.stringify(preset),
  });
  const upsertReachedWrite = deferred();
  const resumeUpsert = deferred();
  let shouldPauseWrite = true;
  storage.beforeSet = async (key) => {
    if (key === presetStorageKey(preset.id) && shouldPauseWrite) {
      shouldPauseWrite = false;
      upsertReachedWrite.resolve();
      await resumeUpsert.promise;
    }
  };

  const stalePreset = { ...preset, name: "Stale edit" };
  const saving = upsertPreset(stalePreset, storage);
  await upsertReachedWrite.promise;
  await deletePreset(preset.id, storage);
  resumeUpsert.resolve();

  await assert.rejects(saving, /deleted in another Raycast window/);
  assert.equal(storage.items.has(presetStorageKey(preset.id)), false);
  assert.notEqual(
    storage.items.get(deletedPresetStorageKey(preset.id)),
    undefined,
  );
});

test("delete retries cleanup if a preset appears after its first removal", async () => {
  const key = presetStorageKey(preset.id);
  const storage = new MemoryStorage({ [key]: JSON.stringify(preset) });
  let recreated = false;
  storage.afterRemove = (removedKey) => {
    if (removedKey === key && !recreated) {
      recreated = true;
      storage.items.set(key, JSON.stringify({ ...preset, name: "Stale edit" }));
    }
  };

  await deletePreset(preset.id, storage);
  assert.equal(storage.items.has(key), false);
  assert.equal(storage.removedKeys.filter((item) => item === key).length, 2);
});

test("authoritative run lookup rejects a preset deleted during its read", async () => {
  const key = presetStorageKey(preset.id);
  const deletedKey = deletedPresetStorageKey(preset.id);
  const storage = new MemoryStorage({ [key]: JSON.stringify(preset) });
  let deletionChecks = 0;
  storage.beforeGet = (requestedKey) => {
    if (requestedKey === deletedKey && ++deletionChecks === 2) {
      storage.items.set(deletedKey, Date.now());
      storage.items.delete(key);
    }
  };

  assert.equal(await loadPreset(preset.id, storage), undefined);
});
