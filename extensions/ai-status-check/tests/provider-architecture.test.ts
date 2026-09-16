import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { PROVIDERS } from "../src/providers/registry";

test("each catalog module supplies exactly one registered provider", async () => {
  const files = (await readdir("src/providers/catalog")).filter((file) => file.endsWith(".ts"));
  const registered = new Set<unknown>(PROVIDERS);
  assert.equal(files.length, registered.size);
  for (const file of files) {
    const url = pathToFileURL(resolve(__dirname, "../src/providers/catalog", file.replace(/\.ts$/, ".js")));
    const exports = (await import(url.href)) as Record<string, unknown>;
    const providers = Object.values(exports).filter((value) => registered.has(value));
    assert.equal(providers.length, 1, `${file} must export one registered provider`);
  }
});
