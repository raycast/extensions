import assert from "node:assert/strict";
import test from "node:test";
import { newEntry, renderAttendance, renderAttendanceEditor, renderTable } from "../src/lib/markdown.ts";
import { saveAttendanceMarkdown } from "../src/lib/roster.ts";
import { initialStore } from "../src/lib/types.ts";

test("full markdown edits update heading, notes, and roster together without affecting another template", () => {
  const store = initialStore();
  store.templates[0] = { ...store.templates[0], heading: "Before", notes: "Old notes", defaultTimeIn: "9:00 AM" };
  store.templates.push({ id: "other", label: "Other", body: "{{name}}", heading: "Other heading" });
  store.entries = [
    newEntry("ada", "Ada", store.templates[0], "9:00 AM"),
    newEntry("bob", "Bob", store.templates[1], ""),
  ];
  const document = renderAttendanceEditor(store.templates[0], [store.entries[0]])
    .replace("# Before", "# After")
    .replace("Old notes", "New **notes**\n\n- Bring a badge")
    .replace("| Ada |", "| Ada Updated |");
  const next = saveAttendanceMarkdown(store, "default", document);
  assert.equal(next.templates[0].heading, "After");
  assert.equal(next.templates[0].notes, "New **notes**\n\n- Bring a badge");
  assert.equal(next.templates[0].body, store.templates[0].body);
  assert.equal(next.templates[0].defaultTimeIn, "9:00 AM");
  assert.deepEqual(next.templates[1], store.templates[1]);
  assert.deepEqual(
    next.entries.find((entry) => entry.templateId === "other"),
    store.entries[1],
  );
  const edited = next.entries.find((entry) => entry.templateId === "default")!;
  assert.equal(edited.id, store.entries[0].id);
  assert.equal(edited.name, "Ada Updated");
  assert.ok(renderAttendance(next.templates[0], [edited]).startsWith("# After\n\nNew **notes**"));
});

test("invalid table edits cannot partially save heading or notes", () => {
  const store = initialStore();
  store.templates[0].heading = "Original";
  store.entries = [newEntry("ada", "Ada", store.templates[0], "9:00 AM")];
  const before = JSON.stringify(store);
  const document = renderAttendanceEditor(store.templates[0], store.entries).replace("Original", "Changed");
  for (const broken of [
    document.replace("9:00 AM", "invalid"),
    document.replace("Time out", "Wrong column"),
    "# Changed\n\nNotes only",
  ]) {
    assert.throws(() => saveAttendanceMarkdown(store, "default", broken));
    assert.equal(JSON.stringify(store), before);
  }
});

test("empty headings, markdown notes and escaped heading characters round trip", () => {
  for (const heading of ["", "A | B & <C> **literal**"]) {
    const store = initialStore();
    store.templates[0] = {
      ...store.templates[0],
      heading,
      notes: "# Notes heading\n\n| Item | Info |\n| --- | --- |\n| One | Two |",
    };
    const next = saveAttendanceMarkdown(store, "default", renderAttendanceEditor(store.templates[0], []));
    assert.equal(next.templates[0].heading, heading);
    assert.equal(next.templates[0].notes, store.templates[0].notes);
    assert.deepEqual(next.entries, []);
  }
});

test("removing heading and notes clears them and keeps a valid table", () => {
  const store = initialStore();
  store.templates[0] = { ...store.templates[0], heading: "Old", notes: "Remove me" };
  const next = saveAttendanceMarkdown(store, "default", renderTable([]));
  assert.equal(next.templates[0].heading, "");
  assert.equal(next.templates[0].notes, "");
});

test("attendance preserves saved notes including ordinary checklist markdown", () => {
  const template = {
    ...initialStore().templates[0],
    heading: "Morning",
    notes: "Bring a badge.\n\n- [ ] Check in\n- [x] Collect forms",
  };
  const shown = renderAttendance(template, []);
  assert.ok(shown.includes("Bring a badge."));
  assert.ok(shown.includes("| Login | Name |"));
  assert.ok(shown.includes("- [ ] Check in"));
  assert.ok(shown.includes("- [x] Collect forms"));
  assert.ok(!shown.includes("raycast://"));
  assert.ok(renderAttendanceEditor(template, []).includes("- [ ] Check in"));
});
