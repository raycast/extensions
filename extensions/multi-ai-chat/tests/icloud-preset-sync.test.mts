import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";
import test, { type TestContext } from "node:test";
import {
  deletedPresetStorageKey,
  deserializePreset,
  presetStorageKey,
  storedPresetUpdatedAt,
  updatedPresetStorageKey,
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

const { synchronizePresetsWithICloud } =
  await import("../src/lib/icloud-preset-sync.ts");

type StoredValue = string | number | boolean;

class MemoryStorage {
  readonly items = new Map<string, StoredValue>();

  constructor(items: Record<string, StoredValue> = {}) {
    for (const [key, value] of Object.entries(items))
      this.items.set(key, value);
  }

  async allItems() {
    return Object.fromEntries(this.items);
  }

  async setItem(key: string, value: StoredValue) {
    this.items.set(key, value);
  }

  async removeItem(key: string) {
    this.items.delete(key);
  }
}

const preset: PromptPreset = {
  id: "preset-id",
  name: "Current preset",
  template: "Explain {topic}",
  serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
};

async function syncDirectory(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "multi-ai-chat-sync-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("uploads a local prompt and restores it on another machine", async (t) => {
  const directory = await syncDirectory(t);
  const firstMachine = new MemoryStorage({
    [presetStorageKey(preset.id)]: JSON.stringify(preset),
  });

  await synchronizePresetsWithICloud(firstMachine, {
    directory,
    now: () => 100,
  });

  assert.equal(
    storedPresetUpdatedAt(firstMachine.items.get(presetStorageKey(preset.id))),
    100,
  );
  assert.equal(
    firstMachine.items.has(updatedPresetStorageKey(preset.id)),
    false,
  );
  const remote = JSON.parse(
    await readFile(
      join(directory, `${encodeURIComponent(preset.id)}.json`),
      "utf8",
    ),
  );
  assert.deepEqual(remote, {
    version: 1,
    id: preset.id,
    updatedAt: 100,
    preset,
  });

  const secondMachine = new MemoryStorage();
  await synchronizePresetsWithICloud(secondMachine, {
    directory,
    now: () => 200,
  });
  assert.deepEqual(
    deserializePreset(secondMachine.items.get(presetStorageKey(preset.id))),
    preset,
  );
  assert.equal(
    storedPresetUpdatedAt(secondMachine.items.get(presetStorageKey(preset.id))),
    100,
  );
});

test("merges independently created prompts instead of replacing the directory", async (t) => {
  const directory = await syncDirectory(t);
  const secondPreset = { ...preset, id: "second", name: "Second" };
  const firstMachine = new MemoryStorage({
    [presetStorageKey(preset.id)]: JSON.stringify(preset),
  });
  const secondMachine = new MemoryStorage({
    [presetStorageKey(secondPreset.id)]: JSON.stringify(secondPreset),
  });

  await synchronizePresetsWithICloud(firstMachine, {
    directory,
    now: () => 100,
  });
  await synchronizePresetsWithICloud(secondMachine, {
    directory,
    now: () => 200,
  });
  await synchronizePresetsWithICloud(firstMachine, {
    directory,
    now: () => 300,
  });

  assert.deepEqual(
    deserializePreset(
      firstMachine.items.get(presetStorageKey(secondPreset.id)),
    ),
    secondPreset,
  );
  assert.deepEqual(
    deserializePreset(secondMachine.items.get(presetStorageKey(preset.id))),
    preset,
  );
});

test("uses the established iCloud copy when old local data has no revision", async (t) => {
  const directory = await syncDirectory(t);
  const cloudPreset = { ...preset, name: "Cloud edit" };
  await writeFile(
    join(directory, `${encodeURIComponent(preset.id)}.json`),
    JSON.stringify({
      version: 1,
      id: preset.id,
      updatedAt: 100,
      preset: cloudPreset,
    }),
  );
  const oldMachine = new MemoryStorage({
    [presetStorageKey(preset.id)]: JSON.stringify({
      ...preset,
      name: "Old local edit",
    }),
  });

  await synchronizePresetsWithICloud(oldMachine, {
    directory,
    now: () => 200,
  });

  assert.deepEqual(
    deserializePreset(oldMachine.items.get(presetStorageKey(preset.id))),
    cloudPreset,
  );
  assert.equal(
    storedPresetUpdatedAt(oldMachine.items.get(presetStorageKey(preset.id))),
    100,
  );
});

test("keeps a deletion when iCloud also contains a newer stale edit", async (t) => {
  const directory = await syncDirectory(t);
  await writeFile(
    join(directory, "active.json"),
    JSON.stringify({ version: 1, id: preset.id, updatedAt: 500, preset }),
  );
  await writeFile(
    join(directory, "deleted conflict.json"),
    JSON.stringify({
      version: 1,
      id: preset.id,
      updatedAt: 100,
      deletedAt: 100,
    }),
  );

  const storage = new MemoryStorage();
  await synchronizePresetsWithICloud(storage, { directory });

  assert.equal(storage.items.has(presetStorageKey(preset.id)), false);
  assert.equal(storage.items.get(deletedPresetStorageKey(preset.id)), 100);
  const canonical = JSON.parse(
    await readFile(
      join(directory, `${encodeURIComponent(preset.id)}.json`),
      "utf8",
    ),
  );
  assert.equal(canonical.deletedAt, 100);
});

test("chooses the newest valid iCloud conflict copy", async (t) => {
  const directory = await syncDirectory(t);
  await writeFile(
    join(directory, "older.json"),
    JSON.stringify({ version: 1, id: preset.id, updatedAt: 100, preset }),
  );
  const newerPreset = { ...preset, name: "Newer edit" };
  await writeFile(
    join(directory, "newer conflict.json"),
    JSON.stringify({
      version: 1,
      id: preset.id,
      updatedAt: 200,
      preset: newerPreset,
    }),
  );

  const storage = new MemoryStorage();
  await synchronizePresetsWithICloud(storage, { directory });

  assert.deepEqual(
    deserializePreset(storage.items.get(presetStorageKey(preset.id))),
    newerPreset,
  );
});

test("preserves local data when an iCloud prompt file is malformed", async (t) => {
  const directory = await syncDirectory(t);
  await writeFile(join(directory, "malformed.json"), "not json");
  const storage = new MemoryStorage({
    [presetStorageKey(preset.id)]: JSON.stringify(preset),
  });

  await assert.rejects(
    synchronizePresetsWithICloud(storage, { directory }),
    /could not read icloud prompt file: malformed\.json/i,
  );

  assert.deepEqual(
    deserializePreset(storage.items.get(presetStorageKey(preset.id))),
    preset,
  );
  await assert.rejects(
    readFile(join(directory, `${encodeURIComponent(preset.id)}.json`), "utf8"),
    { code: "ENOENT" },
  );
});
