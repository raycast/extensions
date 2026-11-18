import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteWord } from "./model";
import {
  clearFavoriteWords,
  exportFavoriteWords,
  readFavoriteWords,
  removeFavoriteWord,
  restoreFavoriteWords,
  restoreLegacyFavoriteWords,
  toggleFavoriteWord,
} from "./repository";

const runtime = vi.hoisted(() => ({
  storage: new Map<string, string | number | boolean>(),
  directory: "",
  failRead: false,
  failWrite: false,
  onRead: undefined as ((key: string) => void) | undefined,
}));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return runtime.directory;
    },
  },
  LocalStorage: {
    getItem: async (key: string) => {
      runtime.onRead?.(key);
      if (runtime.failRead) throw new Error("read failed");
      return runtime.storage.get(key);
    },
    setItem: async (key: string, value: string) => {
      if (runtime.failWrite) throw new Error("write failed");
      runtime.storage.set(key, value);
    },
  },
}));

const OLD_KEY = "favorite-words";
const NEW_KEY = "favorite-content-v1";
const info = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };
const favorite = (word = "hello"): FavoriteWord => ({ query: { ...info, word }, services: [], createdAt: 1 });
const legacy = (word = "hello") => ({ ...info, word, createdAt: 1, displaySections: [] });
const envelope = (favorites: FavoriteWord[]) => JSON.stringify({ version: 1, favorites });

beforeEach(async () => {
  runtime.storage.clear();
  runtime.failRead = false;
  runtime.failWrite = false;
  runtime.onRead = undefined;
  runtime.directory = await mkdtemp(join(tmpdir(), "easydict-favorites-test-"));
});
afterEach(async () => {
  await rm(runtime.directory, { recursive: true, force: true });
});

async function backupFile(contents: string): Promise<string> {
  const path = join(runtime.directory, "selected.json");
  await writeFile(path, contents, "utf8");
  return path;
}

async function favorites(): Promise<FavoriteWord[]> {
  const state = await readFavoriteWords();
  if (state.kind !== "ready") throw new Error(state.message);
  return state.favorites;
}

async function backedUpText(): Promise<string> {
  const directory = join(runtime.directory, "favorite-backups");
  const paths = await readdir(directory);
  expect(paths).toHaveLength(1);
  return readFile(join(directory, paths[0]), "utf8");
}

describe("versioned favorite storage", () => {
  it("reads and converts the complete legacy collection without writing either key", async () => {
    const raw = JSON.stringify([legacy("one"), legacy("two")]);
    runtime.storage.set(OLD_KEY, raw);
    expect(await readFavoriteWords()).toMatchObject({
      kind: "ready",
      favorites: [favorite("one"), favorite("two")],
      source: { key: OLD_KEY, raw },
    });
    expect(runtime.storage.get(OLD_KEY)).toBe(raw);
    expect(runtime.storage.has(NEW_KEY)).toBe(false);
  });

  it("keeps an authoritative empty new collection from reviving legacy favorites", async () => {
    runtime.storage.set(OLD_KEY, JSON.stringify([legacy()]));
    const raw = envelope([]);
    runtime.storage.set(NEW_KEY, raw);
    expect(await readFavoriteWords()).toMatchObject({ kind: "ready", favorites: [], source: { key: NEW_KEY, raw } });
  });

  it.each([
    "{invalid",
    "{}",
    "null",
    "[]",
    42,
    JSON.stringify({ version: "1", favorites: [] }),
    JSON.stringify({ version: 1, favorites: [favorite(), { ...favorite(), services: "bad" }] }),
  ])("preserves malformed new data without falling back to legacy or allowing normal writes (%j)", async (raw) => {
    const old = JSON.stringify([legacy()]);
    runtime.storage.set(OLD_KEY, old);
    runtime.storage.set(NEW_KEY, raw);
    expect(await readFavoriteWords()).toMatchObject({ kind: "invalid", source: { key: NEW_KEY, raw } });
    await expect(toggleFavoriteWord(favorite())).rejects.toThrow();
    await expect(clearFavoriteWords()).rejects.toThrow();
    expect(runtime.storage.get(NEW_KEY)).toBe(raw);
    expect(runtime.storage.get(OLD_KEY)).toBe(old);
  });

  it("refuses to migrate a legacy collection with one malformed entry", async () => {
    const raw = JSON.stringify([legacy(), { ...legacy("bad"), displaySections: "bad" }]);
    runtime.storage.set(OLD_KEY, raw);
    await expect(toggleFavoriteWord(favorite("new"))).rejects.toThrow();
    expect(runtime.storage.get(OLD_KEY)).toBe(raw);
    expect(runtime.storage.has(NEW_KEY)).toBe(false);
  });

  it.each([OLD_KEY, NEW_KEY])(
    "exports an unknown version in %s verbatim but refuses every write or restore",
    async (key) => {
      const raw = '{ "version": 99, "future": [] }';
      runtime.storage.set(OLD_KEY, JSON.stringify([legacy()]));
      runtime.storage.set(key, raw);
      expect(await readFavoriteWords()).toMatchObject({ kind: "unsupported", source: { key, raw } });
      const path = await exportFavoriteWords();
      expect(await readFile(path, "utf8")).toBe(raw);
      await expect(restoreFavoriteWords(await backupFile("[]"))).rejects.toThrow("compatible");
      await expect(restoreLegacyFavoriteWords()).rejects.toThrow("compatible");
      await expect(toggleFavoriteWord(favorite())).rejects.toThrow("compatible");
      await expect(clearFavoriteWords()).rejects.toThrow("compatible");
      expect(runtime.storage.get(key)).toBe(raw);
    },
  );

  it("migrates all legacy entries on the first mutation and serializes overlapping updates", async () => {
    const old = JSON.stringify([legacy("one"), legacy("two")]);
    runtime.storage.set(OLD_KEY, old);
    await Promise.all([toggleFavoriteWord(favorite("alpha")), toggleFavoriteWord(favorite("beta"))]);
    expect((await favorites()).map((entry) => entry.query.word)).toEqual(["beta", "alpha", "one", "two"]);
    expect(runtime.storage.get(OLD_KEY)).toBe(old);
    expect(JSON.parse(String(runtime.storage.get(NEW_KEY))).version).toBe(1);
  });

  it.each(["remove", "clear"])(
    "keeps an empty envelope after %s so reopening does not restore legacy entries",
    async (operation) => {
      const old = JSON.stringify([legacy()]);
      runtime.storage.set(OLD_KEY, old);
      if (operation === "remove") await removeFavoriteWord(info);
      else await clearFavoriteWords();
      expect(runtime.storage.get(OLD_KEY)).toBe(old);
      expect(runtime.storage.get(NEW_KEY)).toBe(envelope([]));
      expect(await favorites()).toEqual([]);
    },
  );

  it("does not rewrite data when a read or initial migration write fails", async () => {
    const old = JSON.stringify([legacy()]);
    runtime.storage.set(OLD_KEY, old);
    runtime.failRead = true;
    expect(await readFavoriteWords()).toMatchObject({ kind: "error" });
    await expect(clearFavoriteWords()).rejects.toThrow("read failed");
    runtime.failRead = false;
    runtime.failWrite = true;
    await expect(clearFavoriteWords()).rejects.toThrow("write failed");
    expect(runtime.storage.get(OLD_KEY)).toBe(old);
    expect(runtime.storage.has(NEW_KEY)).toBe(false);
  });
});

describe("favorite recovery", () => {
  it.each([
    { source: OLD_KEY, backup: JSON.stringify([legacy("restored")]) },
    { source: NEW_KEY, backup: envelope([favorite("restored")]) },
  ])(
    "validates a backup, saves the current raw bytes, and restores only the new key ($source)",
    async ({ source, backup }) => {
      const original = "{ malformed original\n";
      runtime.storage.set(source, original);
      const previous = await restoreFavoriteWords(await backupFile(backup));
      expect(previous).toBeDefined();
      expect(await readFile(previous!, "utf8")).toBe(original);
      expect(await favorites()).toEqual([favorite("restored")]);
      expect(JSON.parse(String(runtime.storage.get(NEW_KEY))).version).toBe(1);
      if (source === OLD_KEY) expect(runtime.storage.get(OLD_KEY)).toBe(original);
    },
  );

  it.each(['{"version":99}', "[null]", '{"version":1,"favorites":[null]}'])(
    "rejects invalid selected files before creating a backup (%s)",
    async (raw) => {
      runtime.storage.set(NEW_KEY, "broken current");
      await expect(restoreFavoriteWords(await backupFile(raw))).rejects.toThrow("not a valid");
      expect(await readdir(runtime.directory)).toEqual(["selected.json"]);
      expect(runtime.storage.get(NEW_KEY)).toBe("broken current");
    },
  );

  it("does not overwrite original data when backup creation fails", async () => {
    runtime.storage.set(NEW_KEY, "broken current");
    await writeFile(join(runtime.directory, "favorite-backups"), "not a directory");
    await expect(restoreFavoriteWords(await backupFile("[]"))).rejects.toThrow();
    expect(runtime.storage.get(NEW_KEY)).toBe("broken current");
  });

  it("retains the original and its backup when the final storage write fails", async () => {
    runtime.storage.set(NEW_KEY, "broken current");
    runtime.failWrite = true;
    await expect(restoreFavoriteWords(await backupFile("[]"))).rejects.toThrow("write failed");
    expect(await backedUpText()).toBe("broken current");
    expect(runtime.storage.get(NEW_KEY)).toBe("broken current");
  });

  it.each(["same key changed", "new key appeared with identical raw"])(
    "refuses replacement when the authoritative source changes after backup I/O (%s)",
    async (change) => {
      const source = change === "same key changed" ? NEW_KEY : OLD_KEY;
      runtime.storage.set(source, "broken current");
      let reads = 0;
      runtime.onRead = (key) => {
        if (key === NEW_KEY && ++reads === 2)
          runtime.storage.set(
            NEW_KEY,
            change === "same key changed" ? envelope([favorite("remote")]) : "broken current",
          );
      };
      await expect(restoreFavoriteWords(await backupFile("[]"))).rejects.toThrow("Favorites changed");
      expect(await backedUpText()).toBe("broken current");
      expect(runtime.storage.get(NEW_KEY)).toBe(
        change === "same key changed" ? envelope([favorite("remote")]) : "broken current",
      );
    },
  );

  it("rechecks absence before restoring into an empty store", async () => {
    let reads = 0;
    runtime.onRead = (key) => {
      if (key === NEW_KEY && ++reads === 2) runtime.storage.set(NEW_KEY, envelope([favorite("remote")]));
    };
    await expect(restoreFavoriteWords(await backupFile("[]"))).rejects.toThrow("Favorites changed");
    expect(runtime.storage.get(NEW_KEY)).toBe(envelope([favorite("remote")]));
    expect(await readdir(runtime.directory)).toEqual(["selected.json"]);
  });

  it("restores into an empty store without manufacturing a previous collection backup", async () => {
    const path = await backupFile(envelope([favorite("restored")]));
    expect(await restoreFavoriteWords(path)).toBeUndefined();
    expect(await favorites()).toEqual([favorite("restored")]);
    expect(runtime.storage.has(OLD_KEY)).toBe(false);
    expect(await readdir(runtime.directory)).toEqual(["selected.json"]);
  });

  it.each([undefined, "broken", '{"version":99}'])(
    "rejects absent or invalid previous-version data before backing up current data (%j)",
    async (old) => {
      runtime.storage.set(NEW_KEY, "broken current");
      if (old !== undefined) runtime.storage.set(OLD_KEY, old);
      await expect(restoreLegacyFavoriteWords()).rejects.toThrow();
      expect(await readdir(runtime.directory)).toEqual([]);
      expect(runtime.storage.get(NEW_KEY)).toBe("broken current");
    },
  );

  it.each([{ entries: [] }, { entries: [legacy("one"), legacy("two")] }])(
    "explicitly restores a valid previous-version collection, including an empty one ($entries)",
    async ({ entries }) => {
      const old = JSON.stringify(entries);
      runtime.storage.set(OLD_KEY, old);
      runtime.storage.set(NEW_KEY, "broken current");
      await restoreLegacyFavoriteWords();
      expect(await backedUpText()).toBe("broken current");
      expect((await favorites()).map((entry) => entry.query.word)).toEqual(entries.map((entry) => entry.word));
      expect(runtime.storage.get(OLD_KEY)).toBe(old);
    },
  );
});
