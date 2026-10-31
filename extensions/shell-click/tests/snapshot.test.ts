import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPaletteSnapshot, ToolCall } from "../src/snapshot";
const command = {
  id: "abc12345-1234-4234-8234-123456789abc",
  alias: "Fixture",
  command: "pwd",
  workingDirectory: "/tmp",
  workspaceIDs: [],
};
test("new helpers need only one batch request", async () => {
  let calls = 0;
  const result = await loadPaletteSnapshot(async () => {
    calls++;
    return {
      commands: [
        { ...command, state: { status: "idle", hasTerminalSession: false } },
      ],
      workspaces: [],
    };
  });
  assert.equal(calls, 1);
  assert.equal(result.commands[0].state?.status, "idle");
});
test("old helpers use existing bounded log/state calls", async () => {
  const calls: string[] = [];
  const call: ToolCall = async (name, args) => {
    calls.push(name);
    if (name === "list_commands")
      return { commands: [command], workspaces: [] };
    assert.equal(args?.maximumBytes, 1);
    assert.equal(args?.id, command.id);
    return {
      state: { status: "running", hasTerminalSession: true },
      detectedEndpoints: [{ scheme: "http", port: 3000 }],
    };
  };
  const result = await loadPaletteSnapshot(call);
  assert.deepEqual(calls, ["list_commands", "get_command_log"]);
  assert.equal(result.commands[0].state?.status, "running");
  assert.equal(result.commands[0].detectedEndpoints[0].port, 3000);
});
test("an unavailable runtime preserves commands and does not label them idle", async () => {
  const result = await loadPaletteSnapshot(async (name) => {
    if (name === "list_commands")
      return { commands: [command], workspaces: [] };
    throw new Error("tmux unavailable");
  });
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].state, undefined);
  assert.equal(result.commands[0].runtimeError, "tmux unavailable");
});
