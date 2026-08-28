import assert from "node:assert/strict";
import test from "node:test";
import { getClaudeSpawnSpec } from "../src/lib/claude-process-core.ts";

test("rejects unresolved Windows batch shims", () => {
  const args = [
    "-p",
    "fix $(whoami); 100% 'quoted' 你好",
    "--output-format",
    "json",
  ];
  assert.throws(
    () =>
      getClaudeSpawnSpec(
        "C:\\Users\\Me\\AppData\\Roaming\\npm\\claude.cmd",
        args,
        "win32",
      ),
    /could not be resolved/i,
  );
});

test("runs legacy npm JavaScript entry points through Node", () => {
  const script = "C:\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js";
  assert.deepEqual(getClaudeSpawnSpec(script, ["--version"], "win32"), {
    command: process.execPath,
    args: [script, "--version"],
  });
});

test("spawns native binaries directly", () => {
  assert.deepEqual(
    getClaudeSpawnSpec(
      "C:\\Users\\Me\\.local\\bin\\claude.exe",
      ["--version"],
      "win32",
    ),
    {
      command: "C:\\Users\\Me\\.local\\bin\\claude.exe",
      args: ["--version"],
    },
  );
});
