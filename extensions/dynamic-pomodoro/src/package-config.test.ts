import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("package.json declares module type for Node test runner", () => {
  const packageJsonPath = resolve(import.meta.dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    type?: string;
  };

  assert.equal(packageJson.type, "module");
});
