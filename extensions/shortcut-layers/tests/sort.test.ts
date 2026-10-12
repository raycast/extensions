import assert from "node:assert/strict";
import { test } from "node:test";
import { sortEntries, sortLayers } from "../src/sort";
import type { Entry, Layer } from "../src/types";

const entries: Entry[] = [
  { id: "1", key: "n", title: "New note", kind: "url", value: "x://n" },
  { id: "2", key: "d", title: "Daily note", kind: "url", value: "x://d" },
  { id: "3", key: "f", title: "Search notes", kind: "url", value: "x://f" },
];

test("sortEntries by title", () => {
  assert.deepEqual(
    sortEntries(entries, "title-asc").map((e) => e.title),
    ["Daily note", "New note", "Search notes"],
  );
  assert.deepEqual(
    sortEntries(entries, "title-desc").map((e) => e.title),
    ["Search notes", "New note", "Daily note"],
  );
});

test("sortEntries by key", () => {
  assert.deepEqual(
    sortEntries(entries, "key-asc").map((e) => e.key),
    ["d", "f", "n"],
  );
  assert.deepEqual(
    sortEntries(entries, "key-desc").map((e) => e.key),
    ["n", "f", "d"],
  );
});

test("sortEntries does not mutate the input", () => {
  const input = [...entries];
  sortEntries(input, "key-desc");
  assert.deepEqual(
    input.map((e) => e.key),
    ["n", "d", "f"],
  );
});

const layers: Layer[] = [
  { id: "todoist", name: "Todoist", entries: [] },
  { id: "apps", name: "Apps", entries: [] },
  { id: "obsidian", name: "Obsidian", entries: [] },
];

test("sortLayers by name", () => {
  assert.deepEqual(
    sortLayers(layers, "name-asc").map((l) => l.name),
    ["Apps", "Obsidian", "Todoist"],
  );
  assert.deepEqual(
    sortLayers(layers, "name-desc").map((l) => l.name),
    ["Todoist", "Obsidian", "Apps"],
  );
});
