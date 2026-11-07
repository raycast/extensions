import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commandSchema,
  commandURL,
  matchScore,
  searchCommands,
  snapshotSchema,
} from "../src/model";
const make = (
  alias: string,
  command: string,
  workingDirectory = "/tmp/project",
) =>
  commandSchema.parse({
    id: "abc12345-1234-4234-8234-123456789abc",
    alias,
    command,
    workingDirectory,
    workspaceIDs: [],
  });

test("search normalizes separators, case, accents and fuzzy subsequences", () => {
  assert.equal(matchScore("Live-Photo", "livepho"), 2);
  assert.equal(matchScore("Click", "clk"), 1);
  assert.equal(matchScore("Café", "cafe"), 3);
  assert.equal(matchScore("Click", "clz"), 0);
});
test("name matches outrank command text and ties preserve stored order", () => {
  const body = make("Another", "pnpm dev");
  const name = make("Dev", "pnpm run");
  const tie = make("Dev", "npm run");
  assert.deepEqual(searchCommands([body, name, tie], "dev"), [name, tie, body]);
});
test("all terms must match, including paths and detected ports", () => {
  const command = make("Web", "pnpm dev", "/tmp/project with spaces");
  command.detectedEndpoints = [{ scheme: "http", port: 6777 }];
  assert.deepEqual(searchCommands([command], "web 6777 spaces"), [command]);
  assert.deepEqual(searchCommands([command], "web 8000"), []);
});
test("empty search preserves ordering and invalid snapshot IDs are rejected", () => {
  const commands = [make("B", "pwd"), make("A", "pwd")];
  assert.deepEqual(searchCommands(commands, "  "), commands);
  assert.throws(() =>
    snapshotSchema.parse({
      commands: [{ ...commands[0], id: "bad" }],
      workspaces: [],
    }),
  );
  assert.throws(() => commandURL("open", "anything?command=rm"));
  assert.equal(
    commandURL("edit", commands[0].id),
    `shell-click://edit/${commands[0].id}`,
  );
});
