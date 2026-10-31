const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const extension = join(__dirname, "..");
const published = join(extension, "node_modules/codex-report");
const sources = (directory) =>
  readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".js"))
    .sort();

// The Store must ship exactly the pinned npm release, not unreleased changes from `npm run sync-cli-dev`.
test("bundled CLI matches the pinned codex-report release", () => {
  const hint = "Run npm run sync-cli";
  const cli = readFileSync(join(published, "bin/codex-report.js"), "utf8").replaceAll('"../lib/', '"./lib/');
  assert.equal(readFileSync(join(extension, "assets/codex-report.mjs"), "utf8"), cli, hint);
  const library = sources(join(published, "lib"));
  assert.deepEqual(sources(join(extension, "assets/lib")), library, hint);
  for (const file of library)
    assert.equal(
      readFileSync(join(extension, "assets/lib", file), "utf8"),
      readFileSync(join(published, "lib", file), "utf8"),
      `${file}: ${hint}`,
    );
});
