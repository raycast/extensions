import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, utimes } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { download, pruneFolders, reservePath } from "../src/lib/files";

test("two saves that start together get different files", async () => {
  const folder = await mkdtemp(join(tmpdir(), "wiro-files-"));
  try {
    const paths = await Promise.all([reservePath(folder, "0.png"), reservePath(folder, "0.png")]);
    assert.notEqual(paths[0], paths[1]);
    assert.deepEqual((await readdir(folder)).sort(), ["0-2.png", "0.png"]);
    assert.equal(await reservePath(folder, "0.png"), join(folder, "0-3.png"));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("a download streams to disk and leaves no temporary file", async () => {
  const body = Buffer.alloc(3 * 1024 * 1024, 7);
  const server = createServer((request, response) => {
    if (request.url === "/missing") {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const folder = await mkdtemp(join(tmpdir(), "wiro-files-"));
  try {
    const targets = [join(folder, "a.bin"), join(folder, "b.bin"), join(folder, "c.bin")];
    await Promise.all(targets.map((target) => download(`http://127.0.0.1:${port}/file`, target)));
    for (const target of targets) assert.equal((await readFile(target)).length, body.length);
    await assert.rejects(download(`http://127.0.0.1:${port}/missing`, join(folder, "d.bin")), /HTTP 404/);
    assert.deepEqual((await readdir(folder)).sort(), ["a.bin", "b.bin", "c.bin"]);
  } finally {
    server.close();
    await rm(folder, { recursive: true, force: true });
  }
});

test("cached folders older than the limit are removed", async () => {
  const root = await mkdtemp(join(tmpdir(), "wiro-cache-"));
  try {
    await mkdir(join(root, "old"));
    await mkdir(join(root, "new"));
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await utimes(join(root, "old"), fourDaysAgo, fourDaysAgo);
    assert.deepEqual(await pruneFolders(root, 3 * 24 * 60 * 60 * 1000), ["old"]);
    assert.deepEqual(await readdir(root), ["new"]);
    assert.deepEqual(await pruneFolders(join(root, "absent"), 1), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
