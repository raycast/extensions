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
    await assert.rejects(readdir(failed.snapshotDir), { code: "ENOENT" });

    await renameCollection(published, "Tailwind Guide", base);
    assert.equal((await listCollections(base))[0]?.title, "Tailwind Guide");
    assert.equal((await searchLibrary("vite", base))[0]?.page.title, "Install");
  } finally { await rm(base, { recursive: true, force: true }); }
});


test("removes superseded snapshots only after publishing and leaves concurrent imports intact", async () => {
  const base = await mkdtemp(join(tmpdir(), "docsearch-retention-"));
  const root = "https://example.com/docs";
  try {
    const first = await beginSnapshot(root, base);
    await first.addPage({ url: root, title: "Old", markdown: "Original", fetchedAt: "2026-01-01" });
    const old = await first.publish([], false);
    await renameCollection(old, "My docs", base);
    const pending = await beginSnapshot(root, base);
    const replacement = await beginSnapshot(root, base);
    await replacement.addPage({ url: root, title: "New", markdown: "Replacement", fetchedAt: "2026-01-02" });
    assert.equal((await searchLibrary("original", base)).length, 1);
    const current = await replacement.publish([], false);
    await assert.rejects(readdir(first.snapshotDir), { code: "ENOENT" });
    await readdir(pending.snapshotDir);
    assert.equal(current.title, "My docs");
    assert.equal((await searchLibrary("replacement", base)).length, 1);
    // A caller's later failure must not delete an already published snapshot.
    await replacement.abandon("post-publication failure");
    assert.equal((await searchLibrary("replacement", base)).length, 1);
    await pending.abandon("cancelled");
  } finally { await rm(base, { recursive: true, force: true }); }
});
