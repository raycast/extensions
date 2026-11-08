import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { emptyState } from "../models/folder.ts";
import { moveApplication, prepareApplications } from "../services/application-model.ts";
import {
  folderPreview,
  folderPreviewEntries,
  folderPreviewKey,
  renderFolderPreview,
} from "../services/folder-previews.ts";
import { createFolder } from "../utils/hierarchy.ts";

function solidPNG(red: number, green: number, blue: number, alpha = 255) {
  const png = new PNG({ width: 32, height: 32 });
  for (let offset = 0; offset < png.data.length; offset += 4) png.data.set([red, green, blue, alpha], offset);
  return PNG.sync.write(png);
}

function pixel(png: PNG, x: number, y: number): number[] {
  return [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];
}

test("folder previews use stable grid ordering, prioritize direct apps, and cap the preview at nine", () => {
  let state = createFolder(emptyState(), "parent", "Parent", null);
  state = createFolder(state, "child", "Child", "parent");
  const apps = prepareApplications(
    Array.from({ length: 12 }, (_, i) => ({
      name: `App ${i}`,
      path: `/Applications/App ${i}.app`,
      bundleId: `app.${i}`,
    })),
  );
  for (const [index, app] of apps.entries()) {
    state = moveApplication(state, app, index < 2 ? "child" : "parent");
  }
  const preview = folderPreviewEntries("parent", apps, state);
  assert.equal(preview.length, 9);
  assert.equal(preview[0].appPath, apps[2].path);
  assert.equal(preview[8].appPath, apps[10].path);
  assert.deepEqual(folderPreviewEntries("missing", apps, state), []);
});

test("nested-only previews include descendants and change when apps move or disappear", () => {
  let state = createFolder(emptyState(), "parent", "Parent", null);
  state = createFolder(state, "child", "Child", "parent");
  const [app] = prepareApplications([{ name: "Editor", path: "/Applications/Editor.app", bundleId: "editor" }]);
  state = moveApplication(state, app, "child");
  const entries = folderPreviewEntries("parent", [app], state);
  assert.deepEqual(entries, [{ appPath: app.path }]);
  assert.deepEqual(folderPreviewEntries("parent", [], state), []);
  assert.deepEqual(folderPreviewEntries("parent", [app], moveApplication(state, app, null)), []);
  assert.notEqual(folderPreviewKey(entries), folderPreviewKey([{ appPath: app.path, iconPath: "/cache/new.png" }]));
});

test("compositing produces a transparent 512px rounded folder and places icons in the correct cells", () => {
  const png = PNG.sync.read(renderFolderPreview([solidPNG(255, 0, 0), solidPNG(0, 255, 0), solidPNG(0, 0, 255)]));
  assert.equal(png.width, 512);
  assert.equal(png.height, 512);
  assert.equal(pixel(png, 0, 0)[3], 0);
  assert.equal(pixel(png, 25, 25)[3], 0);
  assert.deepEqual(pixel(png, 120, 120), [255, 0, 0, 255]);
  assert.deepEqual(pixel(png, 256, 120), [0, 255, 0, 255]);
  assert.deepEqual(pixel(png, 392, 120), [0, 0, 255, 255]);
  assert.ok(pixel(png, 256, 256)[3] > 0);
  assert.notDeepEqual(pixel(png, 256, 256), [255, 0, 0, 255]);
});

test("alpha compositing and unreadable app images keep the preview usable", () => {
  const transparent = PNG.sync.read(renderFolderPreview([solidPNG(255, 0, 0, 0)]));
  const base = PNG.sync.read(renderFolderPreview([]));
  assert.deepEqual(pixel(transparent, 120, 120), pixel(base, 120, 120));
  const partial = PNG.sync.read(renderFolderPreview([solidPNG(255, 0, 0, 128)]));
  assert.ok(pixel(partial, 120, 120)[0] > pixel(base, 120, 120)[0]);
  const fallback = PNG.sync.read(renderFolderPreview([undefined, Buffer.from("bad PNG")]));
  assert.notDeepEqual(pixel(fallback, 120, 120), pixel(base, 120, 120));
  assert.ok(pixel(fallback, 256, 120)[3] > 0);
});

test("preview caching reuses composites, deduplicates concurrent renders, repairs corruption, and handles unwritable storage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "appsolutely-folder-previews-"));
  try {
    const icon = join(directory, "app.png");
    await writeFile(icon, solidPNG(0, 120, 240));
    const entries = [{ appPath: "/Applications/App.app", iconPath: icon }];
    const cache = join(directory, "previews");
    assert.equal(await folderPreview([], cache), undefined);
    const [first, duplicate] = await Promise.all([folderPreview(entries, cache), folderPreview(entries, cache)]);
    assert.ok(first);
    assert.equal(duplicate, first);
    const timestamp = (await stat(first)).mtimeMs;
    assert.equal(await folderPreview(entries, cache), first);
    assert.equal((await stat(first)).mtimeMs, timestamp);
    await writeFile(first, "broken cache");
    assert.equal(await folderPreview(entries, cache), first);
    assert.equal(PNG.sync.read(await readFile(first)).width, 512);
    const blocked = join(directory, "not-a-directory");
    await writeFile(blocked, "blocked");
    assert.equal(await folderPreview(entries, blocked), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("leaving large view prevents a queued folder preview from loading icons or writing an image", async () => {
  const directory = await mkdtemp(join(tmpdir(), "appsolutely-cancelled-preview-"));
  try {
    const controller = new AbortController();
    const preview = folderPreview(
      [{ appPath: "/Applications/Editor.app" }],
      join(directory, "previews"),
      join(directory, "icons"),
      controller.signal,
    );
    controller.abort();
    assert.equal(await preview, undefined);
    await assert.rejects(stat(join(directory, "icons")), { code: "ENOENT" });
    await assert.rejects(stat(join(directory, "previews")), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a slow icon lookup does not block another folder preview", async () => {
  const directory = await mkdtemp(join(tmpdir(), "appsolutely-parallel-previews-"));
  try {
    const icon = join(directory, "app.png");
    await writeFile(icon, solidPNG(0, 120, 240));
    let finish!: (icons: ReadonlyMap<string, string | undefined>) => void;
    const resolveIcons = (paths: string[]) =>
      paths[0] === "slow"
        ? new Promise<ReadonlyMap<string, string | undefined>>((resolve) => (finish = resolve))
        : Promise.resolve(new Map([[paths[0], icon]]));
    const slow = folderPreview([{ appPath: "slow" }], directory, directory, undefined, resolveIcons);
    const fast = folderPreview([{ appPath: "fast" }], directory, directory, undefined, resolveIcons);
    assert.ok(await fast);
    finish(new Map([["slow", icon]]));
    assert.ok(await slow);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
