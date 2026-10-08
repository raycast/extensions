import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(__dirname, "../../../package.json"), "utf8"),
);

describe("manifest shape", () => {
  it("has exactly 6 view-mode commands", () => {
    assert.strictEqual(manifest.commands.length, 6);
    for (const cmd of manifest.commands) {
      assert.strictEqual(
        cmd.mode,
        "view",
        `command ${cmd.name} must be mode view`,
      );
    }
  });

  it("has exactly one preference named yerdPath", () => {
    assert.strictEqual(manifest.preferences.length, 1);
    assert.strictEqual(manifest.preferences[0].name, "yerdPath");
    assert.strictEqual(manifest.preferences[0].type, "textfield");
    assert.strictEqual(manifest.preferences[0].required, false);
  });
});
