import assert from "node:assert/strict";
import { test } from "node:test";
import {
  duplicateKeys,
  findEntry,
  findLayerClash,
  normalizeEntry,
  normalizeKey,
  normalizeLayer,
  quicklinkName,
  slugify,
} from "../src/schema";
import type { Layer } from "../src/types";

test("slugify produces url-safe ids", () => {
  assert.equal(slugify("Obsidian Vault"), "obsidian-vault");
  assert.equal(slugify("  Apps  &  Windows "), "apps-windows");
  assert.equal(slugify("!!!"), "layer");
});

test("findLayerClash matches name (case-insensitive) and derived id", () => {
  const existing: Layer[] = [
    { id: "apps", name: "Apps", entries: [] },
    { id: "obsidian", name: "Obsidian", entries: [] },
  ];
  assert.equal(findLayerClash(existing, "apps")?.id, "apps");
  assert.equal(findLayerClash(existing, "APPS")?.id, "apps");
  assert.equal(findLayerClash(existing, "Apps!")?.id, "apps");
  assert.equal(findLayerClash(existing, "Todoist"), undefined);
  assert.equal(findLayerClash(existing, "Apps", "apps"), undefined);
});

test("normalizeKey keeps one character, case-sensitive", () => {
  assert.equal(normalizeKey(" D "), "D");
  assert.equal(normalizeKey("abc"), "a");
  assert.equal(normalizeKey(undefined), "");
});

test("normalizeKey takes one code point", () => {
  assert.equal(normalizeKey("ab"), "a");
  assert.equal(normalizeKey("🎹"), "🎹");
  assert.equal([...normalizeKey("🎹")].length, 1);
});

test("normalizeEntry keeps file paths verbatim and trims other targets", () => {
  assert.equal(normalizeEntry({ key: "x", title: "Path", kind: "file", value: "/tmp/name " }).value, "/tmp/name ");
  assert.equal(normalizeEntry({ key: "x", title: "URL", kind: "url", value: " https://a " }).value, "https://a");
});

test("normalizeEntry keeps a chosen icon and drops a blank one", () => {
  assert.equal(normalizeEntry({ key: "x", title: "T", kind: "url", value: "x://d", icon: " 🎵 " }).icon, "🎵");
  assert.equal(normalizeEntry({ key: "x", title: "T", kind: "url", value: "x://d", icon: "  " }).icon, undefined);
  assert.equal(normalizeEntry({ key: "x", title: "T", kind: "url", value: "x://d" }).icon, undefined);
});

test("normalizeEntry fills defaults", () => {
  const entry = normalizeEntry({ key: "N", title: "New note", value: "obsidian://new" });
  assert.equal(entry.key, "N");
  assert.equal(entry.kind, "url");
  assert.ok(entry.id.length > 0);
});

test("normalizeEntry maps the retired raycast kind to url", () => {
  const entry = normalizeEntry({ key: "r", title: "Run", kind: "raycast", value: "raycast://x" });
  assert.equal(entry.kind, "url");
});

test("duplicateKeys treats case as distinct", () => {
  const entries = [
    normalizeEntry({ id: "1", key: "d", title: "Daily" }),
    normalizeEntry({ id: "2", key: "d", title: "Dup" }),
    normalizeEntry({ id: "3", key: "D", title: "Upper" }),
  ];
  assert.deepEqual(duplicateKeys(entries), ["d"]);
});

test("findEntry is case-sensitive", () => {
  const entries = [
    normalizeEntry({ id: "1", key: "d", title: "Daily" }),
    normalizeEntry({ id: "2", key: "D", title: "Upper" }),
  ];
  assert.equal(findEntry(entries, "d")?.title, "Daily");
  assert.equal(findEntry(entries, "D")?.title, "Upper");
  assert.equal(findEntry(entries, "x"), undefined);
});

test("quicklinkName appends Layer unless already present", () => {
  assert.equal(quicklinkName("Obsidian"), "Obsidian Layer");
  assert.equal(quicklinkName("Apps"), "Apps Layer");
  assert.equal(quicklinkName("Obsidian Layer"), "Obsidian Layer");
  assert.equal(quicklinkName("My layers"), "My layers");
  assert.equal(quicklinkName("Layered"), "Layered Layer");
});

test("normalizeLayer keeps an optional key color", () => {
  assert.equal(normalizeLayer({ name: "Apps", color: "#b5e0b5" }).color, "#b5e0b5");
  assert.equal(normalizeLayer({ name: "Apps" }).color, undefined);
});
