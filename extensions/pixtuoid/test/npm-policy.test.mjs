import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const npmrc = new Set(readFileSync(new URL(".npmrc", root), "utf8").split(/\r?\n/).filter(Boolean));

test("install scripts fail closed", () => {
  assert.ok(npmrc.has("strict-allow-scripts=true"));
});

test("install-script permissions stay at least privilege", () => {
  assert.deepEqual(manifest.allowScripts, { "esbuild@0.28.1": true });
});
