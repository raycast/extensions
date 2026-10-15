import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  loadConfiguredLibrary,
  refreshVisibleLibrary,
} from "../src/library-source.ts";
import { DEFAULT_LOCATION, emptyCatalog } from "../src/model.ts";
import { commit, readLibrary } from "../src/repository.ts";
import {
  setSharedJsonStorage,
  sharedJsonPath,
} from "../src/shared-json-storage.ts";

async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "marks-source-"));
  const values = new Map<string, string>();
  setSharedJsonStorage({
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  } as Parameters<typeof setSharedJsonStorage>[0]);
  try {
    await run(directory);
  } finally {
    setSharedJsonStorage();
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function json(title = "Imported Bookmark") {
  const catalog = emptyCatalog();
  for (const group of catalog.groups)
    for (const sub of group.children)
      sub.bookmarkIds =
        sub.id === DEFAULT_LOCATION.subGroupId ? ["selected-file"] : [];
  return JSON.stringify({
    groups: catalog.groups,
    bookmarks: [
      {
        id: "selected-file",
        title,
        url: "https://example.test/",
        tags: [],
        locations: [DEFAULT_LOCATION],
        createdAt: 100,
        updatedAt: 200,
      },
    ],
    settings: { apiKey: "not-a-raycast-preference" },
  });
}

test("extension preferences choose a JSON file separately from the advanced event directory", async () => {
  const manifest = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.preferences[0].name, "dataFile");
  assert.equal(manifest.preferences[0].type, "file");
  assert.equal(
    manifest.preferences.find(
      (item: { name: string }) => item.name === "dataDirectory",
    ).type,
    "directory",
  );
});

test("selected JSON loads immediately, survives reopening, and follows source changes without rewriting it", async () =>
  fixture(async (support) => {
    const file = path.join(support, "goose-marks.json");
    const original = json();
    await fs.writeFile(file, original);
    const first = await loadConfiguredLibrary({ dataFile: file }, support);
    assert.equal(first.state.bookmarks[0]?.title, "Imported Bookmark");
    assert.equal(await sharedJsonPath(), file);
    assert.equal(await fs.readFile(file, "utf8"), original);
    assert.deepEqual(
      (await loadConfiguredLibrary({ dataFile: file }, support)).state,
      first.state,
    );
    await fs.writeFile(file, json("Changed in Goose"));
    const refreshed = await refreshVisibleLibrary(first.root, first.state);
    assert.equal(refreshed.bookmarks[0]?.title, "Changed in Goose");
    assert.equal(await fs.readFile(file, "utf8"), json("Changed in Goose"));
    assert.equal(await refreshVisibleLibrary(first.root, refreshed), refreshed);
  }));

test("an import committed outside the current view becomes visible without a shared source", async () =>
  fixture(async (support) => {
    const first = await loadConfiguredLibrary({}, support);
    assert.equal(first.state.bookmarks.length, 0);
    await commit(first.root, {
      expectedHeads: first.state.heads,
      mutations: [
        {
          entity: "bookmark",
          entityId: "new",
          baseHeads: [],
          value: {
            id: "new",
            title: "Newly imported",
            url: "https://example.test/",
            tags: [],
            locations: [DEFAULT_LOCATION],
            createdAt: 100,
            updatedAt: 200,
          },
        },
      ],
    });
    const visible = await refreshVisibleLibrary(first.root, first.state);
    assert.equal(visible.bookmarks[0]?.title, "Newly imported");
    assert.equal(await refreshVisibleLibrary(first.root, visible), visible);
    await commit(first.root, {
      expectedHeads: visible.heads,
      mutations: [],
      visits: [{ bookmarkId: "new", usedAt: 400 }],
    });
    assert.equal(
      (await refreshVisibleLibrary(first.root, visible)).bookmarks[0]?.lastUsed,
      400,
    );
  }));

test("invalid or missing selected JSON reports failure and keeps the existing library", async () =>
  fixture(async (support) => {
    const first = await loadConfiguredLibrary({}, support);
    const invalid = path.join(support, "invalid.json");
    await fs.writeFile(invalid, "not json");
    for (const dataFile of [
      invalid,
      path.join(support, "missing.json"),
      support,
    ])
      await assert.rejects(loadConfiguredLibrary({ dataFile }, support));
    assert.deepEqual(await readLibrary(first.root), first.state);
    assert.equal(await sharedJsonPath(), "");
  }));
