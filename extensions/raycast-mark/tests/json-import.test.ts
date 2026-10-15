import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { applyJsonImport, previewJsonImport } from "../src/import-export.ts";
import { DEFAULT_LOCATION, emptyCatalog } from "../src/model.ts";
import type { Bookmark } from "../src/model.ts";
import { configureDirectory, readLibrary } from "../src/repository.ts";

// No source icon should have to be downloaded before the bookmarks are committed.
test("Goose import preserves remote/text icons and persists embedded/file icons locally", async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "marks-import-"));
  try {
    const directory = await configureDirectory(undefined, parent);
    const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const outside = path.join(parent, "outside.svg");
    await fs.writeFile(outside, "do-not-import-this-file");
    const bookmarks: Bookmark[] = [
      { type: "remote", src: "https://example.test/favicon.ico" },
      { type: "text", value: "G", bgColor: "#112233" },
      {
        type: "custom",
        data: `data:image/svg+xml;base64,${bytes.toString("base64")}`,
      },
      { type: "file", path: outside },
    ].map((icon, index) => ({
      id: `b${index}`,
      title: `Bookmark ${index}`,
      url: `https://example.test/${index}`,
      tags: ["goose"],
      pinned: true,
      locations: [DEFAULT_LOCATION],
      createdAt: 100,
      updatedAt: 200,
      visits: index + 1,
      icon: icon as Bookmark["icon"],
    }));
    const catalog = emptyCatalog();
    for (const group of catalog.groups)
      for (const sub of group.children)
        sub.bookmarkIds =
          sub.id === DEFAULT_LOCATION.subGroupId
            ? bookmarks.map((bookmark) => bookmark.id)
            : [];
    const plan = previewJsonImport(
      JSON.stringify({
        groups: catalog.groups,
        bookmarks,
        settings: { apiKey: "source-only-secret" },
      }),
      await readLibrary(directory),
    );
    const result = await applyJsonImport(directory, plan, {});
    const persisted = await readLibrary(directory);
    assert.equal(persisted.status, "ready");
    assert.deepEqual(persisted.bookmarks, result.state.bookmarks);
    assert.equal(persisted.bookmarks.length, 4);
    const byId = (id: string) => persisted.bookmarks.find((b) => b.id === id)!;
    assert.deepEqual(byId("b0").icon, bookmarks[0].icon);
    assert.deepEqual(byId("b1").icon, bookmarks[1].icon);
    for (const id of ["b2", "b3"]) {
      assert.equal(byId(id).icon?.type, "file");
      assert.ok(byId(id).icon?.path?.startsWith(path.join(directory, "icons")));
    }
    assert.deepEqual(await fs.readFile(byId("b2").icon!.path!), bytes);
    assert.match(await fs.readFile(byId("b3").icon!.path!, "utf8"), /<svg/);
    assert.equal(await fs.readFile(outside, "utf8"), "do-not-import-this-file");
    for (const name of await fs.readdir(path.join(directory, "events"))) {
      const event = await fs.readFile(
        path.join(directory, "events", name),
        "utf8",
      );
      assert.ok(!event.includes("source-only-secret"));
    }
    for (const source of bookmarks) {
      const imported = byId(source.id);
      assert.equal(imported.visits, source.visits);
      assert.deepEqual(imported.locations, source.locations);
      assert.deepEqual(imported.tags, source.tags);
      assert.equal(imported.pinned, true);
    }
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});
