import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R, listScript, parseRecords, quote, runSelect } from "../../src/lib/tabs/applescript.ts";
import { TabGoneError } from "../../src/lib/tabs/model.ts";
import { fakePlatform } from "./fake-platform.ts";

test("parses separator-delimited records, dropping blanks and AppleScript's missing value", () => {
  assert.deepEqual(parseRecords(`a${F}b${R}c${F}missing value${R}\n`, 2), [
    ["a", "b"],
    ["c", ""],
  ]);
  assert.deepEqual(parseRecords("", 2), []);
});

test("pads short rows so parsers never see undefined", () => {
  assert.deepEqual(parseRecords(`ok${R}`, 3), [["ok", "", ""]]);
});

test("quotes AppleScript strings", () => {
  assert.equal(quote(`say "hi" \\ bye`), `"say \\"hi\\" \\\\ bye"`);
});

test("list scripts never launch the app", () => {
  assert.match(listScript("com.x", "body"), /^if application id "com\.x" is not running then return ""/);
});

test("a select script that doesn't return ok means the tab is gone", async () => {
  await runSelect(fakePlatform({ runAppleScript: async () => "ok" }), "com.x", "body");
  await assert.rejects(
    runSelect(fakePlatform({ runAppleScript: async () => "missing" }), "com.x", "body"),
    TabGoneError,
  );
});
