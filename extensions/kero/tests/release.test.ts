import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(__dirname, "..");

test("the npm prepublish guard fails locally and directs users to the Raycast publish script", () => {
  // Execute only the guard, never npm publish (not even its dry-run mode).
  const result = spawnSync("npm", ["run", "prepublishOnly"], { cwd: root, encoding: "utf8", timeout: 10_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use npm run publish for the Raycast Store/);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(manifest.scripts.publish, "npx @raycast/api@latest publish");
});

test("changelog release headings follow Raycast's bracketed title and date format", () => {
  const headings = readFileSync(join(root, "CHANGELOG.md"), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("## "));
  assert.ok(headings.length > 0);
  for (const heading of headings) {
    assert.match(heading, /^## \[[^\]]+\] - (?:\{PR_MERGE_DATE\}|\d{4}-\d{2}-\d{2})$/);
  }
});
