import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInput } from "../src/lib/input";

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
