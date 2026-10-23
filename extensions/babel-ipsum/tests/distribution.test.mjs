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
  assert.equal(read("assets/corpus-license.txt"), read("corpus/LICENSE.md"));
  assert.match(read("corpus/LICENSE.md"), /Creative Commons Attribution-ShareAlike 4\.0/);
});

test("a clean local build ships the corpus license and leaves no orphan maps", (t) => {
  mkdirSync(join(root, ".qa"), { recursive: true });
  const fixture = mkdtempSync(join(root, ".qa/license-distribution-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const path of ["package.json", "tsconfig.json", "src", "assets", "scripts/clean-build.mjs"]) {
    cpSync(join(root, path), join(fixture, path), { recursive: true });
  }
  symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
  mkdirSync(join(fixture, "dist"));
  writeFileSync(join(fixture, "dist/obsolete.js.map"), "{}");
  const build = spawnSync("npm", ["run", "build"], { cwd: fixture, encoding: "utf8", timeout: 120_000 });
  assert.equal(build.status, 0, build.error?.message ?? build.stdout + build.stderr);
  assert.equal(readFileSync(join(fixture, "dist/assets/corpus-license.txt"), "utf8"), read("corpus/LICENSE.md"));
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
