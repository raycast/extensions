import test from "node:test";
import assert from "node:assert/strict";
import {
  importedHistoryItemWasCreated,
  parseHistoryItems,
  parseImportedHistoryId,
  parsePackageRecord,
} from "../src/output-parsers";

test("parseHistoryItems keeps continuation lines on the current item", () => {
  const output = [
    "#463 [2026-05-16 18:05] (PR/text) Implemented text reprocessing.",
    "Extra detail on the same history item.",
    "#462 [2026-05-16 18:03] (Standard/text) Processed another item.",
  ].join("\n");

  const items = parseHistoryItems(output);

  assert.equal(items.length, 2);
  assert.equal(
    items[0]?.summary,
    "Implemented text reprocessing.\nExtra detail on the same history item.",
  );
  assert.equal(items[1]?.id, "462");
});

test("parsePackageRecord keeps colon-prefixed lines inside multiline prompts", () => {
  const output = [
    "id: erdiegoant-pr-defaults",
    "name: Pull Request Defaults",
    "author: Abyssion",
    "version: 1.0.0",
    "enabled: true",
    "mode_id: community-erdiegoant-pr-defaults",
    "mode_name: PR",
    "language: global",
    "translate: false",
    'prompt: "You are a senior developer.',
    "System: Keep only markdown output.",
    "Test Plan: Include manual verification.",
    'Return only the Markdown."',
    "vocabulary: 3 entries",
    "replacements: 0",
    "app_bindings: 0",
  ].join("\n");

  const record = parsePackageRecord(output);

  assert.match(record.prompt, /System: Keep only markdown output\./);
  assert.match(record.prompt, /Test Plan: Include manual verification\./);
  assert.equal("System" in record.metadata, false);
  assert.equal("Test Plan" in record.metadata, false);
});

test("importedHistoryItemWasCreated ignores matching baseline duplicates", () => {
  const importedText = "Repeated text already present in history.";
  const output = [
    "#500 [2026-05-16 18:05] (Standard/text) Repeated text already present in history.",
    "#499 [2026-05-16 18:03] (Standard/text) Something else.",
  ].join("\n");

  const parsedItems = parseHistoryItems(output);

  assert.equal(
    importedHistoryItemWasCreated(importedText, parsedItems, ["500", "499"]),
    false,
  );
});

test("importedHistoryItemWasCreated requires a new matching history id", () => {
  const importedText = "Repeated text already present in history.";
  const output = [
    "#501 [2026-05-16 18:06] (Standard/text) Repeated text already present in history.",
    "#500 [2026-05-16 18:05] (Standard/text) Repeated text already present in history.",
    "#499 [2026-05-16 18:03] (Standard/text) Something else.",
  ].join("\n");

  const parsedItems = parseHistoryItems(output);

  assert.equal(
    importedHistoryItemWasCreated(importedText, parsedItems, ["500", "499"]),
    true,
  );
});

test("parseImportedHistoryId extracts the returned history id", () => {
  assert.equal(parseImportedHistoryId("Imported history item #463"), "463");
  assert.equal(parseImportedHistoryId("history id: 99"), "99");
  assert.equal(parseImportedHistoryId("No id present"), undefined);
});
