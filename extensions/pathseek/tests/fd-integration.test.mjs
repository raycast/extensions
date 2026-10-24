import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ACTIVE_INDEX_FILENAME,
  openIndexDataStream,
  prepareIndex,
  publishIndex,
  readIndexHeader,
} from "../src/lib/index-files.ts";

const execFileAsync = promisify(execFile);

async function indexFilePaths(dir) {
  const stream = await openIndexDataStream(path.join(dir, ACTIVE_INDEX_FILENAME));
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const payload = Buffer.concat(chunks);
  assert.equal(payload.at(-1), 0);
  return payload.toString("utf8").slice(0, -1).split("\0");
}

test("real fd NUL output produces a usable v2 index with Unicode and newline filenames", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "pathseek-fd-test-"));
  try {
    const root = path.join(temp, "documents");
    const indexDirectory = path.join(temp, "index");
    await mkdir(root);
    await mkdir(indexDirectory);
    await mkdir(path.join(root, "nested"));
    await writeFile(path.join(root, "中文文件.pdf"), "A");
    await writeFile(path.join(root, "a\nline.txt"), "B");
    await writeFile(path.join(root, "nested", "sample.ts"), "C");
    await writeFile(path.join(root, "hidden.tmp"), "excluded");

    // Execute the same fd flags used by Rebuild Index, including one exclude.
    const { stdout } = await execFileAsync(
      "fd",
      ["--absolute-path", "--print0", "--exclude", "hidden.tmp", ".", root],
      { encoding: "buffer", maxBuffer: 1024 * 1024 },
    );
    const paths = stdout.toString("utf8").split("\0").filter(Boolean);
    assert.ok(paths.length >= 4, "expected files and nested directory");
    assert.ok(paths.some((p) => p.endsWith("中文文件.pdf")));
    assert.ok(paths.some((p) => p.endsWith("a\nline.txt")));
    assert.ok(!paths.some((p) => p.endsWith("hidden.tmp")));

    const raw = path.join(indexDirectory, "index-test.paths.tmp");
    const staged = path.join(indexDirectory, "index-test.nul.tmp");
    await writeFile(raw, stdout);
    await prepareIndex(raw, staged, {
      version: 2,
      createdAt: "2026-10-24T09:00:00.000Z",
      count: paths.length,
      roots: [root],
    });
    await publishIndex(staged, indexDirectory);
    const header = await readIndexHeader(path.join(indexDirectory, ACTIVE_INDEX_FILENAME));
    assert.equal(header.count, paths.length);
    assert.deepEqual(await indexFilePaths(indexDirectory), paths);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("failed fd invocation does not damage an already published index", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pathseek-fd-fail-test-"));
  try {
    const raw = path.join(dir, "good.paths.tmp");
    const staged = path.join(dir, "good.nul.tmp");
    await writeFile(raw, Buffer.from("/test/stable\0"));
    await prepareIndex(raw, staged, {
      version: 2, createdAt: new Date().toISOString(), count: 1, roots: ["/test"],
    });
    await publishIndex(staged, dir);

    await assert.rejects(
      execFileAsync("fd", ["--absolute-path", "--print0", ".", path.join(dir, "does-not-exist")]),
    );
    assert.deepEqual(await indexFilePaths(dir), ["/test/stable"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
