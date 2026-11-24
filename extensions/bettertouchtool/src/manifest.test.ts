import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

interface ExtensionManifest {
  commands: Array<{ name: string; preferences?: Array<{ name: string }> }>;
  tools: Array<{ name: string }>;
  dependencies: Record<string, string>;
}

interface AiManifest {
  instructions: string;
  evals: Array<{ mocks: Record<string, unknown>; expected: unknown[] }>;
}

const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as ExtensionManifest;
const aiManifest = JSON.parse(readFileSync(join(process.cwd(), "ai.json"), "utf8")) as AiManifest;

describe("extension manifest", () => {
  it("exposes diagnostics as an action rather than a standalone command", () => {
    assert.deepEqual(
      manifest.commands.map((command) => command.name),
      ["trigger", "browse-triggers", "action", "variables", "clipboard-manager"],
    );
  });

  it("keeps the BetterTouchTool client pinned", () => {
    assert.equal(manifest.dependencies.bettertouchtool, "1.0.0-alpha.7");
  });

  it("allows custom terminal commands to be configured for the clipboard manager", () => {
    const clipboardCommand = manifest.commands.find((command) => command.name === "clipboard-manager");
    assert.deepEqual(
      clipboardCommand?.preferences?.map((preference) => preference.name),
      ["clipboardCommandWhitelist"],
    );
  });

  it("exposes the complete Raycast AI tool surface", () => {
    assert.deepEqual(
      manifest.tools.map((tool) => tool.name),
      ["search-named-triggers", "run-named-trigger", "search-actions", "run-action", "get-variable", "set-variable"],
    );
  });

  it("has eval coverage for every AI tool", () => {
    const mockedTools = new Set(aiManifest.evals.flatMap((evaluation) => Object.keys(evaluation.mocks)));
    assert.deepEqual([...mockedTools].sort(), manifest.tools.map((tool) => tool.name).sort());
    assert.match(aiManifest.instructions, /never invent identifiers/i);
  });
});
