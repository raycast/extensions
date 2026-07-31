import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

test("resolveClaudeCredentialsPaths prefers CLAUDE_CONFIG_DIR and keeps the default fallback", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: "/tmp/custom-claude" }), [
    path.resolve("/tmp/custom-claude", ".credentials.json"),
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});

test("resolveClaudeCredentialsPaths uses the default Claude config dir when CLAUDE_CONFIG_DIR is blank", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: "   " }), [
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});

test("resolveClaudeCredentialsPaths de-duplicates CLAUDE_CONFIG_DIR when it matches the default dir", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: path.join(os.homedir(), ".claude/") }), [
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});
