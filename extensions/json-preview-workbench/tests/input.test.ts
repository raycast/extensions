import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInput, readClipboardInput } from "../src/lib/input";
import { pathToFileURL } from "node:url";

test("reads local file paths and leaves JSON text intact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-preview-test-"));
  try {
    const file = join(directory, "sample.json");
    await writeFile(file, '{"city":"天津"}');
    assert.equal((await readInput(file)).text, '{"city":"天津"}');
    assert.equal((await readInput('{"a":1}')).text, '{"a":1}');
    await assert.rejects(readInput(directory), /directory/);
    await assert.rejects(readInput(join(directory, "missing.json")), /does not exist/);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("reads percent-encoded file URLs and preserves slash-prefixed JSON5 documents", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-preview-url-"));
  try {
    const file = join(directory, "sample # 中文.json");
    await writeFile(file, '{"url":true}');
    assert.equal((await readInput(pathToFileURL(file).href)).text, '{"url":true}');
    for (const text of ['/* note */ {"a":1}', '// note\n{"a":1}']) {
      assert.equal((await readInput(text)).text, text);
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("clipboard fallback requires a separate valid document and preserves the file error for filenames", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-clipboard-test-"));
  try {
    const file = join(directory, "123");
    const url = pathToFileURL(file).href;
    for (const text of ["123", url, "sample.json", ""]) {
      await assert.rejects(readClipboardInput(url, text), /does not exist/);
    }
    assert.equal(await readClipboardInput(url, '{"fallback":true}'), '{"fallback":true}');
    await writeFile(file, '{"file":true}');
    assert.equal(await readClipboardInput(url, '{"fallback":true}'), '{"file":true}');
    assert.equal(await readClipboardInput(undefined, "editable invalid input"), "editable invalid input");
  } finally {
    await rm(directory, { recursive: true });
  }
});
