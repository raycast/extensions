import assert from "node:assert/strict";
import test from "node:test";
import { exportBackup, importBackup } from "../src/lib/backup.ts";
import { initialStore } from "../src/lib/types.ts";
import { newEntry } from "../src/lib/markdown.ts";
function fixture() {
  const data = initialStore();
  data.templates[0] = { ...data.templates[0], heading: "Team", notes: "Notes | ☑", defaultTimeIn: "9:00 AM" };
  data.entries = [newEntry("jane", "Jane | Doe", data.templates[0], "9:00 AM")];
  return data;
}
test("backup round trip preserves templates, entries, notes, and times", () => {
  const store = fixture();
  assert.deepEqual(JSON.parse(exportBackup(importBackup(exportBackup(store)))), JSON.parse(exportBackup(store)));
});
test("exports Tallies backups and imports backups made before the rename", () => {
  const store = fixture();
  const backup = JSON.parse(exportBackup(store));
  assert.equal(backup.format, "tallies-backup");
  backup.format = "tally-backup";
  assert.deepEqual(JSON.parse(exportBackup(importBackup(JSON.stringify(backup)))), JSON.parse(exportBackup(store)));
  backup.format = "unrelated-backup";
  assert.throws(() => importBackup(JSON.stringify(backup)));
});
test("rejects invalid backups, duplicate identities, broken references, and times", () => {
  for (const change of [
    (b: any) => {
      b.version = 2;
    },
    (b: any) => {
      b.data.templates.push(b.data.templates[0]);
    },
    (b: any) => {
      b.data.entries.push(b.data.entries[0]);
    },
    (b: any) => {
      b.data.entries[0].templateId = "missing";
    },
    (b: any) => {
      b.data.selectedTemplateId = "missing";
    },
    (b: any) => {
      b.data.entries[0].timeIn = "25:00";
    },
    (b: any) => {
      b.data.entries[0].status = "invalid";
    },
    (b: any) => {
      b.data.entries[0].status = "clocked_out";
    },
    (b: any) => {
      b.data.templates[0].notes = 1;
    },
  ]) {
    const original = fixture();
    const raw = exportBackup(original);
    const backup = JSON.parse(raw);
    change(backup);
    assert.throws(() => importBackup(JSON.stringify(backup)));
    assert.equal(exportBackup(original), raw);
  }
  assert.throws(() => importBackup("invalid JSON"));
});
