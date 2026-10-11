import assert from "node:assert/strict";
import test from "node:test";
import { initialStore } from "../src/lib/types.ts";
import { newEntry, parseTable, renderTable, timeInLabel } from "../src/lib/markdown.ts";
import { excelClipboard } from "../src/lib/excel.ts";
import {
  defaultTimeIn,
  deleteEntry,
  replaceTemplateEntries,
  setTemplateTimeIn,
  templateEntries,
} from "../src/lib/roster.ts";

function fixture() {
  const store = initialStore();
  store.templates.push({ id: "second", label: "Second", body: "{{name}}", defaultTimeIn: "2:00 PM" });
  store.sharedTimeIn = "9:00 AM";
  store.entries = [
    newEntry("same-login", "Morning", store.templates[0], "9:00 AM"),
    newEntry("same-login", "Afternoon", store.templates[1], "2:00 PM"),
  ];
  return store;
}

test("switching templates isolates copied names and retains both rosters", () => {
  const store = fixture();
  assert.equal(templateEntries(store, "default").length, 1);
  const first = excelClipboard(templateEntries(store, "default")).text;
  assert.ok(first.includes("Morning"));
  assert.ok(!first.includes("Afternoon"));
  const second = excelClipboard(templateEntries(store, "second")).text;
  assert.ok(second.includes("Afternoon"));
  assert.ok(!second.includes("Morning"));
  assert.equal(store.entries.length, 2);
});

test("individual deletion and clearing one template retain the other roster and settings", () => {
  const store = fixture();
  const deleted = deleteEntry(store, store.entries[0].id);
  assert.deepEqual(deleted.entries, [store.entries[1]]);
  const cleared = replaceTemplateEntries(store, "default", []);
  assert.deepEqual(cleared.entries, [store.entries[1]]);
  assert.deepEqual(cleared.templates, store.templates);
  assert.equal(store.entries.length, 2);
});

test("markdown replacement cannot steal identities or entries from another template", () => {
  const store = fixture();
  const imported = parseTable(
    renderTable(templateEntries(store, "default")).replace("Morning", "Updated"),
    store.templates[0],
    templateEntries(store, "default"),
  );
  const next = replaceTemplateEntries(store, "default", imported);
  assert.equal(templateEntries(next, "default")[0].id, store.entries[0].id);
  assert.equal(templateEntries(next, "default")[0].name, "Updated");
  assert.deepEqual(templateEntries(next, "second"), [store.entries[1]]);
  assert.throws(() => replaceTemplateEntries(store, "default", [store.entries[1]]));
});

test("template defaults update only that roster and no-shows have no displayed time", () => {
  const store = fixture();
  const absent = { ...newEntry("absent", "Absent", store.templates[0], "9:00 AM"), status: "no_show" as const };
  store.entries.push(absent);
  const next = setTemplateTimeIn(store, "default", "10:15 am");
  assert.equal(next.entries[0].timeIn, "10:15 AM");
  assert.equal(next.entries[1].timeIn, "2:00 PM");
  assert.equal(next.entries[2].timeIn, "9:00 AM");
  assert.equal(timeInLabel(next.entries[2]), "");
  assert.equal(defaultTimeIn(next, "default"), "10:15 AM");
  assert.equal(defaultTimeIn(next, "second"), "2:00 PM");
  const added = newEntry("new", "New", next.templates[0], defaultTimeIn(next, "default"));
  assert.equal(added.timeIn, "10:15 AM");
  assert.ok(excelClipboard([next.entries[2]]).text.endsWith("absent\tAbsent\t\tNo Show"));
});

test("legacy shared times remain available and explicit blank defaults stay blank", () => {
  const store = fixture();
  assert.equal(defaultTimeIn(store, "default"), "9:00 AM");
  assert.equal(defaultTimeIn(setTemplateTimeIn(store, "default", ""), "default"), "");
  assert.throws(() => setTemplateTimeIn(store, "default", "invalid"));
});
