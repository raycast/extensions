import { test, mock } from "node:test";
import fs from "node:fs/promises";
import { strict as assert } from "node:assert";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { targetPath, writeJson } from "../src/export";

test("export does not overwrite without approval and leaves no temporary file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-kit-"));
  try {
    const path = targetPath(directory, "data.json");
    await writeFile(path, "old");
    await assert.rejects(writeJson(path, "new", false), { code: "EEXIST" });
    assert.equal(await readFile(path, "utf8"), "old");
    assert.deepEqual(await readdir(directory), ["data.json"]);
    await writeJson(path, '{"x":1}', true);
    assert.equal(await readFile(path, "utf8"), '{"x":1}');
    assert.throws(() => targetPath(directory, "../data.json"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("exports on filesystems without hard links without overwriting", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-kit-no-link-"));
  const link = mock.method(fs, "link", async () => {
    throw Object.assign(new Error("unsupported"), { code: "ENOTSUP" });
  });
  try {
    const path = targetPath(directory, "data.json");
    await writeJson(path, "first", false);
    assert.equal(await readFile(path, "utf8"), "first");
    await assert.rejects(writeJson(path, "second", false), { code: "EEXIST" });
    assert.equal(await readFile(path, "utf8"), "first");
    assert.deepEqual(await readdir(directory), ["data.json"]);
  } finally {
    link.mock.restore();
    await rm(directory, { recursive: true, force: true });
  }
});
