import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assert, test } from "./test-harness";

const packageJsonPath = resolve(process.cwd(), "package.json");
const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  commands?: Array<{ name: string; mode?: string }>;
  dependencies?: Record<string, string>;
};

test("apw command uses view mode", () => {
  const command = manifest.commands?.find((item) => item.name === "apw");

  assert.ok(command, "apw command should exist");
  assert.equal(command?.mode, "view");
});

test("clear-cache command exists", () => {
  const command = manifest.commands?.find((item) => item.name === "clear-cache");

  assert.ok(command, "clear-cache command should exist");
  assert.equal(command?.mode, "no-view");
});

test("sql.js dependency is declared", () => {
  assert.ok(manifest.dependencies?.["sql.js"], "expected sql.js to be declared");
});

test("sqlite3 native dependency is not declared", () => {
  assert.equal(Boolean(manifest.dependencies?.sqlite3), false, "sqlite3 should not be declared");
});
