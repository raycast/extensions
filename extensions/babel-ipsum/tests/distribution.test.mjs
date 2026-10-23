import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

test("source assets retain the project grant and separate corpus license", () => {
  assert.match(read("LICENSE"), /MIT License/);
  assert.match(read("assets/corpus-license.txt"), /Creative Commons Attribution-ShareAlike 4\.0/);
  assert.match(read("NOTICE.md"), /Books and sources/);
});

test("isolated source generates declarations, typechecks, and ships unchanged licensed assets", (t) => {
  mkdirSync(join(root, ".qa"), { recursive: true });
  const fixture = mkdtempSync(join(root, ".qa/license-distribution-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const path of [
    "package.json",
    "tsconfig.json",
    "src",
    "assets",
    "scripts/clean-build.mjs",
    "LICENSE",
    "NOTICE.md",
  ]) {
    cpSync(join(root, path), join(fixture, path), { recursive: true });
  }
  symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
  mkdirSync(join(fixture, "dist"));
  writeFileSync(join(fixture, "dist/obsolete.js.map"), "{}");
  const build = spawnSync("npm", ["run", "typecheck"], { cwd: fixture, encoding: "utf8", timeout: 120_000 });
  assert.equal(build.status, 0, build.error?.message ?? build.stdout + build.stderr);
  assert.equal(
    readFileSync(join(fixture, "dist/assets/corpus-license.txt"), "utf8"),
    read("assets/corpus-license.txt"),
  );
  for (const asset of ["corpus.db", "extension-icon.png"]) {
    assert.deepEqual(readFileSync(join(fixture, "dist/assets", asset)), readFileSync(join(root, "assets", asset)));
  }
  const output = readdirSync(join(fixture, "dist"));
  assert.ok(!output.includes("obsolete.js.map"));
  const manifest = JSON.parse(readFileSync(join(fixture, "dist/package.json"), "utf8"));
  for (const command of manifest.commands) {
    assert.ok(output.includes(command.name + ".js"));
  }
  for (const file of output.filter((name) => name.endsWith(".js.map"))) {
    assert.ok(output.includes(file.slice(0, -4)), file);
  }
});
