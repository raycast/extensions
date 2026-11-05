import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { createPreviewImage } from "../src/lib/screenshots";

test("preview files are private and removed when the request is cancelled or refreshed", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "gh-preview-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const controller = new AbortController();
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const image = await createPreviewImage(bytes, controller.signal, root);
  assert.deepEqual(await readFile(image.file), bytes);
  assert.equal((await stat(image.file)).mode & 0o777, 0o600);
  controller.abort();
  await image.dispose();
  assert.deepEqual(await readdir(root), []);
});

test("a cancelled preview never leaves an image file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "gh-preview-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(createPreviewImage(Buffer.from("image"), controller.signal, root), { name: "AbortError" });
  assert.deepEqual(await readdir(root), []);
});
