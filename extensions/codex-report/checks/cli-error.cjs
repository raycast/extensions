const assert = require("node:assert/strict");
const test = require("node:test");
const { cliErrorMessage } = require("../.test-build/cli-error.js");

test("CLI errors show the CLI's message without progress, usage, stack or Node lines", () => {
  const handled = "Cache hit: using 4 cached session files.\nEACCES: permission denied, scandir '/x'\nUsage: codex-report [--agent codex|claude|all] [--json]\n";
  assert.equal(cliErrorMessage(handled), "EACCES: permission denied, scandir '/x'");
  const crash = "file:///a.mjs:3\n  throw new Error('boom');\n  ^\n\nError: boom\n    at main (file:///a.mjs:3:9)\n\nNode.js v22.23.4\n";
  assert.equal(cliErrorMessage(crash), "Error: boom");
  assert.equal(cliErrorMessage(""), "Could not read local sessions.");
});
