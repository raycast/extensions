import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import test, { type TestContext } from "node:test";
import {
  deletedPresetStorageKey,
  deserializePreset,
  presetStorageKey,
  serializeStoredPreset,
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

const { synchronizePresetsWithICloud, SyncLocalStorageError } =
  await import("../src/lib/icloud-preset-sync.ts");
const { deletePreset, loadPreset, loadPresets, upsertPreset } =
  await import("../src/lib/preset-storage.ts");
const { preparePresetExecution } =
  await import("../src/lib/preset-execution.ts");
type StoredValue = string | number | boolean;

class MemoryStorage {
  readonly items = new Map<string, StoredValue>();
  beforeSet?: (key: string, value: StoredValue) => Promise<void> | void;
  beforeAllItems?: () => void;

  constructor(items: Record<string, StoredValue> = {}) {
    for (const [key, value] of Object.entries(items))
      this.items.set(key, value);
  }
  async allItems() {
    this.beforeAllItems?.();
    return Object.fromEntries(this.items);
  }
  async getItem(key: string) {
    return this.items.get(key);
  }
  async setItem(key: string, value: StoredValue) {
    await this.beforeSet?.(key, value);
    this.items.set(key, value);
  }
  async removeItem(key: string) {
    this.items.delete(key);
  }
}

const preset: PromptPreset = {
  id: "preset-id",
  name: "Original",
  template: "Explain {topic}",
  serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
};

async function context(
  t: TestContext,
  items: Record<string, StoredValue> = {},
) {
  const base = await mkdtemp(join(tmpdir(), "multi-ai-chat-composition-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const directory = join(base, "cloud");
  const lockDirectory = join(base, "local.lock");
  await mkdir(directory);
  const storage = new MemoryStorage(items);
  const errors: Error[] = [];
  const options = {
    lockDirectory,
    now: () => 300,
    synchronize: (local: MemoryStorage) =>
      synchronizePresetsWithICloud(local, {
        directory,
        lockDirectory,
        now: () => 300,
      }),
    onSyncError: (error: Error) => errors.push(error),
  };
  const canonical = join(directory, `${encodeURIComponent(preset.id)}.json`);
  const remote = (body: PromptPreset, updatedAt: number) =>
    writeFile(
      canonical,
      JSON.stringify({ version: 1, id: body.id, updatedAt, preset: body }),
    );
  return { storage, options, errors, base, directory, canonical, remote };
}

async function waitForContender(base: string) {
  const deadline = performance.now() + 2_000;
  while (
    !(await readdir(base)).some((name) => name.startsWith("local.lock.owner-"))
  ) {
    assert.ok(performance.now() < deadline, "save never reached the lock");
    await setTimeout(5);
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("a paused sync cannot run behind and overwrite an acknowledged save", async (t) => {
  const key = presetStorageKey(preset.id);
  const ctx = await context(t, { [key]: serializeStoredPreset(preset, 100) });
  const cloud = { ...preset, name: "Cloud revision" };
  const saved = { ...preset, name: "Acknowledged edit" };
  await ctx.remote(cloud, 200);
  const paused = deferred();
  const resume = deferred();
  ctx.storage.beforeSet = async (_key, value) => {
    if (deserializePreset(value)?.name === cloud.name) {
      ctx.storage.beforeSet = undefined;
      paused.resolve();
      await resume.promise;
    }
  };
  const syncing = ctx.options.synchronize(ctx.storage);
  await paused.promise;
  let saveReads = 0;
  ctx.storage.beforeAllItems = () => {
    saveReads++;
  };
  let completed = false;
  const saving = upsertPreset(saved, ctx.storage, ctx.options).then(() => {
    completed = true;
  });
  await waitForContender(ctx.base);
  assert.equal(
    completed,
    false,
    "save must wait for the in-flight sync snapshot",
  );
  assert.equal(
    saveReads,
    0,
    "the contender must not read stale snapshots while the sync holds the lock",
  );
  resume.resolve();
  await syncing;
  await saving;
  assert.deepEqual(
    await loadPreset(preset.id, ctx.storage, ctx.options),
    saved,
  );
  assert.equal(storedPresetUpdatedAt(ctx.storage.items.get(key)), 300);
  assert.deepEqual(
    JSON.parse(await readFile(ctx.canonical, "utf8")).preset,
    saved,
  );
});

test("a failed local save never publishes its revision with the previous body", async (t) => {
  const key = presetStorageKey(preset.id);
  const ctx = await context(t, {
    [key]: JSON.stringify(preset),
    [updatedPresetStorageKey(preset.id)]: 100,
  });
  const edit = { ...preset, name: "Uncommitted edit" };
  ctx.storage.beforeSet = (_key, value) => {
    if (deserializePreset(value)?.name === edit.name)
      throw new Error("local write failed");
  };
  await assert.rejects(
    upsertPreset(edit, ctx.storage, ctx.options),
    /local write failed/,
  );
  assert.equal(storedPresetUpdatedAt(ctx.storage.items.get(key)), 100);
  assert.deepEqual(deserializePreset(ctx.storage.items.get(key)), preset);
  assert.equal(
    ctx.storage.items.has(updatedPresetStorageKey(preset.id)),
    false,
  );
  ctx.storage.beforeSet = undefined;
  const otherMachine = { ...preset, name: "Valid remote edit" };
  await ctx.remote(otherMachine, 200);
  assert.deepEqual(
    await loadPreset(preset.id, ctx.storage, ctx.options),
    otherMachine,
  );
  assert.deepEqual(
    JSON.parse(await readFile(ctx.canonical, "utf8")).preset,
    otherMachine,
  );
  assert.deepEqual(ctx.errors, []);
});

test("a failed sync import preserves the previous coherent local record", async (t) => {
  const key = presetStorageKey(preset.id);
  const original = serializeStoredPreset(preset, 100);
  const ctx = await context(t, { [key]: original });
  await ctx.remote({ ...preset, name: "Remote edit" }, 200);
  ctx.storage.beforeSet = () => {
    throw new Error("cache write failed");
  };
  await assert.rejects(
    loadPresets(ctx.storage, ctx.options),
    SyncLocalStorageError,
  );
  assert.equal(ctx.storage.items.get(key), original);
});

test("new saves advance observed cloud revisions while the wall clock moves backwards", async (t) => {
  const ctx = await context(t);
  await ctx.remote(preset, 1_000);
  let clock = 150;
  const options = { ...ctx.options, now: () => clock };
  const edit = { ...preset, name: "Kept local edit" };
  await upsertPreset(edit, ctx.storage, options);
  assert.deepEqual(await loadPreset(preset.id, ctx.storage, options), edit);
  assert.equal(
    JSON.parse(await readFile(ctx.canonical, "utf8")).updatedAt,
    1_001,
  );
  clock = 100;
  await upsertPreset({ ...edit, name: "Second edit" }, ctx.storage, options);
  assert.equal(
    JSON.parse(await readFile(ctx.canonical, "utf8")).updatedAt,
    1_002,
  );
});

test("malformed cloud data still permits cached listing, execution, saving and deletion", async (t) => {
  const key = presetStorageKey(preset.id);
  const ctx = await context(t, { [key]: serializeStoredPreset(preset, 100) });
  await writeFile(join(ctx.directory, "malformed.json"), "not json");
  assert.deepEqual(await loadPresets(ctx.storage, ctx.options), [preset]);
  assert.deepEqual(
    await loadPreset(preset.id, ctx.storage, ctx.options),
    preset,
  );
  const prepared = await preparePresetExecution(
    preset,
    { topic: "offline" },
    (id) => loadPreset(id, ctx.storage, ctx.options),
  );
  assert.equal(prepared.status, "ready");
  const edit = { ...preset, name: "Offline edit" };
  await upsertPreset(edit, ctx.storage, ctx.options);
  assert.deepEqual(deserializePreset(ctx.storage.items.get(key)), edit);
  await deletePreset(preset.id, ctx.storage, ctx.options);
  assert.equal(ctx.storage.items.has(key), false);
  assert.equal(ctx.storage.items.has(deletedPresetStorageKey(preset.id)), true);
  assert.equal(
    ctx.errors.length,
    5,
    "one unresolved warning per successful operation",
  );
  assert.ok(ctx.errors.every((error) => /malformed.json/.test(error.message)));
});

test("failed cloud publication reports local success and a retry keeps one preset", async (t) => {
  const ctx = await context(t);
  await mkdir(ctx.canonical);
  await upsertPreset(preset, ctx.storage, ctx.options);
  assert.equal(ctx.errors.length, 1);
  assert.deepEqual(
    deserializePreset(ctx.storage.items.get(presetStorageKey(preset.id))),
    preset,
  );
  await rm(ctx.canonical, { recursive: true });
  await upsertPreset(preset, ctx.storage, ctx.options);
  assert.deepEqual(await loadPresets(ctx.storage, ctx.options), [preset]);
  assert.deepEqual(
    JSON.parse(await readFile(ctx.canonical, "utf8")).preset,
    preset,
  );
});

test("an unavailable cloud directory leaves local reads, writes and deletion available", async (t) => {
  const key = presetStorageKey(preset.id);
  const ctx = await context(t, { [key]: serializeStoredPreset(preset, 100) });
  await rm(ctx.directory, { recursive: true });
  await writeFile(ctx.directory, "cloud path is unavailable");
  assert.deepEqual(await loadPresets(ctx.storage, ctx.options), [preset]);
  const edit = { ...preset, name: "Offline edit" };
  await upsertPreset(edit, ctx.storage, ctx.options);
  assert.deepEqual(await loadPreset(preset.id, ctx.storage, ctx.options), edit);
  await deletePreset(preset.id, ctx.storage, ctx.options);
  assert.equal(ctx.storage.items.has(key), false);
  assert.equal(ctx.storage.items.has(deletedPresetStorageKey(preset.id)), true);
  assert.equal(ctx.errors.length, 4);
});

test("a recovered initial sync failure does not leave a pending-sync warning", async (t) => {
  const ctx = await context(t);
  let attempts = 0;
  const options = {
    ...ctx.options,
    synchronize: async (local: MemoryStorage) => {
      if (++attempts === 1) throw new Error("temporary cloud failure");
      await ctx.options.synchronize(local);
    },
  };
  await upsertPreset(preset, ctx.storage, options);
  assert.deepEqual(ctx.errors, []);
  assert.deepEqual(
    JSON.parse(await readFile(ctx.canonical, "utf8")).preset,
    preset,
  );
});

test("a cache-read error only in postcommit sync does not reject the committed save", async (t) => {
  const ctx = await context(t);
  let reads = 0;
  ctx.storage.beforeAllItems = () => {
    if (++reads === 3) throw new Error("postcommit cache read failed");
  };
  await upsertPreset(preset, ctx.storage, ctx.options);
  assert.deepEqual(
    deserializePreset(ctx.storage.items.get(presetStorageKey(preset.id))),
    preset,
  );
  assert.equal(ctx.errors.length, 1);
  assert.ok(ctx.errors[0] instanceof SyncLocalStorageError);
});

test("sync-warning callbacks cannot reject a local commit, while local writes still reject", async (t) => {
  const ctx = await context(t);
  const options = {
    ...ctx.options,
    synchronize: async () => {
      throw new Error("cloud unavailable");
    },
    onSyncError: () => {
      throw new Error("notification failed");
    },
  };
  await upsertPreset(preset, ctx.storage, options);
  ctx.storage.beforeSet = () => {
    throw new Error("local persistence failed");
  };
  await assert.rejects(
    upsertPreset({ ...preset, name: "Unwritten" }, ctx.storage, options),
    /local persistence failed/,
  );
  assert.deepEqual(
    deserializePreset(ctx.storage.items.get(presetStorageKey(preset.id))),
    preset,
  );
});

for (const deleted of [false, true]) {
  test(`an undownloaded cloud ${deleted ? "deletion" : "edit"} blocks publication until it can be read`, async (t) => {
    const key = presetStorageKey(preset.id);
    const ctx = await context(t, { [key]: serializeStoredPreset(preset, 100) });
    const placeholder = join(ctx.directory, `.${preset.id}.json.icloud`);
    await writeFile(placeholder, "download pending");

    assert.deepEqual(await loadPresets(ctx.storage, ctx.options), [preset]);
    assert.equal(ctx.errors.length, 1);
    assert.match(ctx.errors[0].message, /not downloaded|download pending/i);
    assert.equal(await readFile(placeholder, "utf8"), "download pending");
    await assert.rejects(readFile(ctx.canonical), { code: "ENOENT" });

    const remoteEdit = { ...preset, name: "Downloaded edit" };
    await writeFile(
      ctx.canonical,
      JSON.stringify(
        deleted
          ? { version: 1, id: preset.id, updatedAt: 1_000, deletedAt: 1_000 }
          : { version: 1, id: preset.id, updatedAt: 1_000, preset: remoteEdit },
      ),
    );
    await rm(placeholder);
    assert.deepEqual(
      await loadPresets(ctx.storage, ctx.options),
      deleted ? [] : [remoteEdit],
    );
    const remoteRecord = JSON.parse(await readFile(ctx.canonical, "utf8"));
    assert.equal(remoteRecord.updatedAt, 1_000);
    if (deleted) assert.equal(remoteRecord.deletedAt, 1_000);
    else assert.deepEqual(remoteRecord.preset, remoteEdit);
  });
}

test("a placeholder appearing after the cloud scan still prevents publishing stale content", async (t) => {
  const key = presetStorageKey(preset.id);
  const ctx = await context(t, {
    [key]: JSON.stringify(preset),
    [updatedPresetStorageKey(preset.id)]: 100,
  });
  const placeholder = join(ctx.directory, `.${preset.id}.json.icloud`);
  ctx.storage.beforeSet = async () => {
    ctx.storage.beforeSet = undefined;
    await writeFile(placeholder, "download pending");
  };
  assert.deepEqual(await loadPresets(ctx.storage, ctx.options), [preset]);
  assert.equal(ctx.errors.length, 1);
  assert.match(ctx.errors[0].message, /not downloaded|download pending/i);
  await assert.rejects(readFile(ctx.canonical), { code: "ENOENT" });
  assert.equal(await readFile(placeholder, "utf8"), "download pending");
});

test("an earlier upload failure cannot hide a later remote revision from an offline save", async (t) => {
  const first = { ...preset, id: "first", name: "First" };
  const ctx = await context(t, {
    [presetStorageKey(first.id)]: serializeStoredPreset(first, 100),
    [presetStorageKey(preset.id)]: serializeStoredPreset(preset, 100),
  });
  const blockedUpload = join(ctx.directory, `${first.id}.json`);
  await mkdir(blockedUpload);
  await ctx.remote({ ...preset, name: "New remote revision" }, 1_000);

  const edit = { ...preset, name: "Acknowledged offline edit" };
  await upsertPreset(edit, ctx.storage, ctx.options);
  assert.deepEqual(
    deserializePreset(ctx.storage.items.get(presetStorageKey(preset.id))),
    edit,
  );
  assert.equal(
    storedPresetUpdatedAt(ctx.storage.items.get(presetStorageKey(preset.id))),
    1_001,
  );
  assert.equal(ctx.errors.length, 1);

  await rm(blockedUpload, { recursive: true });
  assert.deepEqual(await loadPreset(preset.id, ctx.storage, ctx.options), edit);
  const remoteRecord = JSON.parse(await readFile(ctx.canonical, "utf8"));
  assert.deepEqual(remoteRecord.preset, edit);
  assert.equal(remoteRecord.updatedAt, 1_001);
});

test("an earlier upload failure cannot hide a later remote deletion from a save", async (t) => {
  const first = { ...preset, id: "first", name: "First" };
  const ctx = await context(t, {
    [presetStorageKey(first.id)]: serializeStoredPreset(first, 100),
    [presetStorageKey(preset.id)]: serializeStoredPreset(preset, 100),
  });
  await mkdir(join(ctx.directory, `${first.id}.json`));
  await writeFile(
    ctx.canonical,
    JSON.stringify({
      version: 1,
      id: preset.id,
      updatedAt: 1_000,
      deletedAt: 1_000,
    }),
  );
  await assert.rejects(
    upsertPreset({ ...preset, name: "Stale edit" }, ctx.storage, ctx.options),
    /deleted/,
  );
  assert.equal(ctx.storage.items.has(presetStorageKey(preset.id)), false);
  assert.equal(
    ctx.storage.items.get(deletedPresetStorageKey(preset.id)),
    1_000,
  );
});
