import test from "node:test";
import assert from "node:assert/strict";
import { newId, parseSaved, remove, upsert, type SavedCommand } from "./saved.ts";

const a: SavedCommand = { id: "a", name: "Tests", command: "npm test", enter: true };
const b: SavedCommand = { id: "b", name: "Status", command: "git status", enter: false };

test("parses a saved list and defaults enter to true", () => {
  const json = JSON.stringify([a, { id: "c", name: "Plain", command: "ls" }]);
  assert.deepEqual(parseSaved(json), [a, { id: "c", name: "Plain", command: "ls", enter: true }]);
});

test("drops entries that are not complete", () => {
  const json = JSON.stringify([a, null, 3, { id: "x", name: "No command" }, { name: "No id", command: "ls" }]);
  assert.deepEqual(parseSaved(json), [a]);
});

test("a broken or non-list file is an empty list", () => {
  assert.deepEqual(parseSaved("not json"), []);
  assert.deepEqual(parseSaved("{}"), []);
  assert.deepEqual(parseSaved(""), []);
});

test("upsert appends a new id and replaces an existing one in place", () => {
  assert.deepEqual(upsert([a], b), [a, b]);
  const edited = { ...a, command: "npm run build" };
  assert.deepEqual(upsert([a, b], edited), [edited, b]);
});

test("remove drops one id and leaves the rest", () => {
  assert.deepEqual(remove([a, b], "a"), [b]);
  assert.deepEqual(remove([a], "missing"), [a]);
});

test("ids differ", () => {
  assert.notEqual(newId(), newId());
});
