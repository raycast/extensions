import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import { test } from "./test-harness";

const rootDir = process.cwd();
const runtimeFiles = ["src/apw.ts", "src/db.ts", "src/applepw.ts"];

test("runtime source files do not depend on import.meta.url", () => {
  for (const relativePath of runtimeFiles) {
    const source = readFileSync(resolve(rootDir, relativePath), "utf8");
    assert.equal(source.includes("import.meta.url"), false, `${relativePath} still depends on import.meta.url`);
  }
});

test("runtime db source does not depend on sqlite3 native bindings", () => {
  const source = readFileSync(resolve(rootDir, "src/db.ts"), "utf8");
  assert.equal(source.includes(`from "sqlite3"`), false, "src/db.ts still depends on sqlite3");
});

test("runtime db source does not depend on node sqlite built-ins", () => {
  const source = readFileSync(resolve(rootDir, "src/db.ts"), "utf8");
  assert.equal(source.includes(`from "node:sqlite"`), false, "src/db.ts still depends on node:sqlite");
});
