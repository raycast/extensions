import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFileName, layersToJson, mergeLayers, parseLayersJson } from "../src/transfer";
import type { Layer } from "../src/types";

test("parseLayersJson accepts an array or a single object", () => {
  const one = parseLayersJson('{"name":"Obsidian"}');
  assert.equal(one.length, 1);
  assert.equal(one[0].id, "obsidian");

  const many = parseLayersJson('[{"name":"Apps"},{"name":"Todoist"}]');
  assert.deepEqual(
    many.map((l) => l.id),
    ["apps", "todoist"],
  );
});

test("parseLayersJson rejects nameless or empty payloads", () => {
  assert.throws(() => parseLayersJson('[{"entries":[]}]'), /Row 1: layer is missing a name/);
  assert.throws(() => parseLayersJson("[]"), /No layers found in JSON/);
});

test("parseLayersJson rejects duplicate layer ids", () => {
  assert.throws(
    () => parseLayersJson('[{"name":"Apps"},{"name":"apps"}]'),
    /Rows 1 and 2: duplicate layer id "apps"/,
  );
});

test("parseLayersJson rejects duplicate keys within a layer", () => {
  const json = '[{"name":"Obsidian","entries":[{"key":"d","title":"Daily"},{"key":"d","title":"Again"}]}]';
  assert.throws(() => parseLayersJson(json), /Layer "Obsidian": duplicate key "d" \(actions 1 and 2\)/);
});

test("parseLayersJson rejects actions without a key", () => {
  const json = '[{"name":"Obsidian","entries":[{"key":"","title":"No key"}]}]';
  assert.throws(() => parseLayersJson(json), /action 1 \("No key"\) has no key/);
});

test("parseLayersJson replaces supplied action ids", () => {
  const json =
    '[{"name":"Apps","entries":[{"id":"same","key":"g","title":"G"},{"id":"same","key":"b","title":"B"}]}]';
  const ids = parseLayersJson(json)[0].entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, 2);
  assert.ok(ids.every((id) => id !== "same"));
});

test("mergeLayers appends new layers and merges actions by key", () => {
  const existing: Layer[] = [
    {
      id: "apps",
      name: "Apps",
      entries: [{ id: "1", key: "g", title: "Ghostty", kind: "app", value: "/Applications/Ghostty.app" }],
    },
  ];
  const incoming: Layer[] = [
    {
      id: "apps",
      name: "Apps (import)",
      entries: [
        { id: "x", key: "g", title: "Ghostty dup", kind: "app", value: "/other" },
        { id: "y", key: "b", title: "Browser", kind: "app", value: "/Applications/Zen.app" },
      ],
    },
    { id: "obsidian", name: "Obsidian", entries: [{ id: "z", key: "d", title: "Daily", kind: "url", value: "x://d" }] },
  ];

  const result = mergeLayers(existing, incoming);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  assert.equal(result.addedEntries, 2);
  assert.equal(result.skippedEntries, 1);

  const apps = result.layers.find((l) => l.id === "apps");
  assert.ok(apps);
  assert.deepEqual(
    apps.entries.map((e) => e.key),
    ["g", "b"],
  );
  assert.equal(apps.name, "Apps");
  assert.equal(apps.entries[0].title, "Ghostty");
});

test("mergeLayers skips keyless incoming actions", () => {
  const existing: Layer[] = [{ id: "apps", name: "Apps", entries: [] }];
  const incoming: Layer[] = [
    { id: "apps", name: "Apps", entries: [{ id: "n", key: "", title: "No key", kind: "url", value: "x://" }] },
  ];
  const result = mergeLayers(existing, incoming);
  assert.equal(result.skippedEntries, 1);
  assert.equal(result.updated, 0);
  assert.equal(result.addedEntries, 0);
});

test("exportFileName includes a local timestamp", () => {
  assert.equal(
    exportFileName(new Date(2026, 9, 12, 16, 5, 9)),
    "shortcut-layers-2026-10-12-160509.json",
  );
});

test("layersToJson omits internal entry ids (key is the identity)", () => {
  const layers: Layer[] = [
    {
      id: "apps",
      name: "Apps",
      entries: [{ id: "internal-1", key: "g", title: "Ghostty", kind: "app", value: "/Applications/Ghostty.app" }],
    },
  ];
  const parsed = JSON.parse(layersToJson(layers));
  assert.equal(parsed[0].id, "apps");
  assert.equal(parsed[0].entries[0].id, undefined);
  assert.equal(parsed[0].entries[0].key, "g");
});
