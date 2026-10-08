import assert from "node:assert/strict";
import test from "node:test";
import {
  appleScriptCSV,
  appleScriptString,
  buildGivenClause,
  parseSerializedRecords,
} from "../src/busycal-script";

const recordSeparator = String.fromCharCode(30);
const fieldSeparator = String.fromCharCode(31);

test("parseSerializedRecords decodes multiple records and escaped values", () => {
  const rawText = [
    [
      "title=Team\\nSync",
      "location=Board Room",
      "notes=Line 1\\nLine 2",
    ].join(fieldSeparator),
    [
      "title=Quarterly Review",
      "location=HQ\\u001FWest",
      "notes=Brace\\\\Slash",
    ].join(fieldSeparator),
  ].join(recordSeparator);

  const records = parseSerializedRecords(rawText);

  assert.equal(records.length, 2);
  assert.deepEqual(records[0], {
    title: "Team\nSync",
    location: "Board Room",
    notes: "Line 1\nLine 2",
  });
  assert.deepEqual(records[1], {
    title: "Quarterly Review",
    location: `HQ${fieldSeparator}West`,
    notes: "Brace\\Slash",
  });
});

test("buildGivenClause skips missing parameters", () => {
  const givenClause = buildGivenClause([
    'title:"Planning"',
    undefined,
    'calendarID:"local"',
  ]);

  assert.equal(givenClause, 'title:"Planning", calendarID:"local"');
});

test("appleScriptString escapes quotes and backslashes", () => {
  assert.equal(
    appleScriptString('Board "A" \\ West'),
    `"Board \\"A\\" \\\\ West"`,
  );
});

test("appleScriptCSV joins values into one quoted string", () => {
  assert.equal(appleScriptCSV(["event", "task"]), '"event,task"');
  assert.equal(appleScriptCSV([]), undefined);
});
