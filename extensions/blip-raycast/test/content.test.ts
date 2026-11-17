import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentKind, contentLocation, contentScreenTitle, contentTitle } from "../src/lib/content";

const dir = mkdtempSync(join(tmpdir(), "blip-content-"));
mkdirSync(join(dir, "bu"));
writeFileSync(join(dir, "notes.pdf"), "x");

test("a single Finder item is named and typed", () => {
  const folder = { kind: "files" as const, paths: [join(dir, "bu")], source: "Selected in Finder" };
  assert.equal(contentTitle(folder), "“bu”");
  assert.equal(contentKind(folder), "Folder");
  assert.equal(contentLocation(folder), dir);
  const file = { kind: "files" as const, paths: [join(dir, "notes.pdf")], source: "Clipboard" };
  assert.equal(contentKind(file), "File");
});

test("several items are counted by type", () => {
  const mixed = { kind: "files" as const, paths: [join(dir, "bu"), join(dir, "notes.pdf")], source: "Chosen files" };
  assert.equal(contentTitle(mixed), "2 Items");
  assert.equal(contentKind(mixed), "1 File, 1 Folder");
});

test("counts are pluralised", () => {
  const two = { kind: "files" as const, paths: [join(dir, "bu"), join(dir, "bu")], source: "Chosen files" };
  assert.equal(contentKind(two), "2 Folders");
});

test("hidden text from a password manager is never shown", () => {
  const secret = { kind: "text" as const, text: "hunter2", concealed: true, source: "Clipboard" };
  assert.equal(contentTitle(secret), "Hidden Text");
  assert.equal(contentKind(secret).includes("hunter2"), false);
});

test("text is quoted on one line and truncated", () => {
  const text = { kind: "text" as const, text: "Hello\nthere, this is a fairly long message to send", source: "Clipboard" };
  assert.equal(contentTitle(text), "“Hello there, this is a fairly long mess…”");
  assert.equal(contentKind(text), `Text · ${text.text.length} characters`);
});

test("screen titles don't depend on file names or text", () => {
  assert.equal(contentScreenTitle({ kind: "files", paths: [join(dir, "bu")], source: "x" }), "Send Folder");
  assert.equal(contentScreenTitle({ kind: "files", paths: [join(dir, "notes.pdf")], source: "x" }), "Send File");
  assert.equal(contentScreenTitle({ kind: "text", text: "a very long message ".repeat(20), source: "x" }), "Send Text");
});
