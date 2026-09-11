import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCurrentModeRecord,
  importedHistoryItemWasCreated,
  parseHistoryItems,
  parseInstalledModels,
  parseImportedHistoryId,
  parsePackageRecord,
  stripImportedHistoryHeader,
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

test("parseInstalledModels extracts ids, names, sizes, and current state", () => {
  const output = [
    "* small (Small)\t487601967 bytes\tcurrent",
    "  distil-large-v3.5-q8_0 (English - Large)\t818305955 bytes",
  ].join("\n");

  const models = parseInstalledModels(output);

  assert.deepEqual(models, [
    {
      id: "small",
      name: "Small",
      size: "487601967 bytes",
      current: true,
      raw: "* small (Small)\t487601967 bytes\tcurrent",
    },
    {
      id: "distil-large-v3.5-q8_0",
      name: "English - Large",
      size: "818305955 bytes",
      current: false,
      raw: "  distil-large-v3.5-q8_0 (English - Large)\t818305955 bytes",
    },
  ]);
});

test("parseCurrentModeRecord extracts the active mode fields", () => {
  const record = parseCurrentModeRecord(
    ["id: standard", "name: Standard", "live: true"].join("\n"),
  );

  assert.equal(record.id, "standard");
  assert.equal(record.name, "Standard");
  assert.equal(record.live, "true");
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

test("stripImportedHistoryHeader removes the import metadata line", () => {
  const output = [
    "Imported as transcript #608.",
    "Here is the imported result.",
    "Second line.",
  ].join("\n");

  assert.equal(
    stripImportedHistoryHeader(output),
    "Here is the imported result.\nSecond line.",
  );
  assert.equal(
    stripImportedHistoryHeader("No import header present"),
    "No import header present",
  );
});
