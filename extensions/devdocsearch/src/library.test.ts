import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beginSnapshot, listCollections, renameCollection, searchLibrary } from "./library";

test("saves each page to disk, searches it, and keeps the published snapshot after a failed refresh", async () => {
  const base = await mkdtemp(join(tmpdir(), "docsearch-"));
  const root = "https://example.com/docs";
  try {
    const first = await beginSnapshot(root, base);
    await first.addPage({ url: `${root}/install`, title: "Install", markdown: "Install with Vite", fetchedAt: "2026-01-01" });
    const published = await first.publish([], false, [`${root}/missing: HTTP 404`]);
    assert.equal((await listCollections(base))[0]?.pageCount, 1);
    assert.deepEqual((await listCollections(base))[0]?.skipped, [`${root}/missing: HTTP 404`]);
    assert.equal((await searchLibrary("vite", base))[0]?.page.url, `${root}/install`);
    const savedFiles = await readdir(join(first.snapshotDir, "pages"));
    assert.equal(savedFiles.length, 1);
    assert.match(await readFile(join(first.snapshotDir, "pages", savedFiles[0]), "utf8"), /Install with Vite/);

    const failed = await beginSnapshot(root, base);
    await failed.addPage({ url: `${root}/other`, title: "Other", markdown: "Incomplete refresh", fetchedAt: "2026-01-02" });
    await failed.abandon("simulated error");
    assert.equal((await listCollections(base))[0]?.snapshot, published.snapshot);
    assert.equal((await searchLibrary("vite", base))[0]?.page.title, "Install");
    assert.deepEqual(await searchLibrary("incomplete", base), []);

    await renameCollection(published, "Tailwind Guide", base);
    assert.equal((await listCollections(base))[0]?.title, "Tailwind Guide");
    assert.equal((await searchLibrary("vite", base))[0]?.page.title, "Install");
  } finally { await rm(base, { recursive: true, force: true }); }
});
