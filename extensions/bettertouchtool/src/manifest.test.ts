import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

interface ExtensionManifest {
  commands: Array<{ name: string }>;
  dependencies: Record<string, string>;
}

const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as ExtensionManifest;

describe("extension manifest", () => {
  it("exposes diagnostics as an action rather than a standalone command", () => {
    assert.deepEqual(
      manifest.commands.map((command) => command.name),
      ["trigger", "action", "variables"],
    );
  });

  it("keeps the BetterTouchTool client pinned", () => {
    assert.equal(manifest.dependencies.bettertouchtool, "1.0.0-alpha.7");
  });
});
