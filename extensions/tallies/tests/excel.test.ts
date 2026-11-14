import assert from "node:assert/strict";
import test from "node:test";
import { excelClipboard } from "../src/lib/excel.ts";
import { newEntry, parseTable, renderNote, renderTable } from "../src/lib/markdown.ts";
import { initialStore } from "../src/lib/types.ts";

const template = initialStore().templates[0];

test("Excel clipboard has four columns and no markdown separator row", () => {
  const present = newEntry("0012", "A | B", template, "9:00 AM");
  const clockedOut = {
    ...newEntry("bob", "Bob", template, "9:00 AM"),
    status: "clocked_out" as const,
    timeOut: "5:00 PM",
  };
  const noShow = { ...newEntry("cat", "Cat", template, "9:00 AM"), status: "no_show" as const };
  const { html, text } = excelClipboard([present, clockedOut, noShow]);
  assert.equal(
    text,
    "Login\tName\tTime in\tTime out\r\n0012\tA | B\t9:00 AM\t—\r\nbob\tBob\t9:00 AM\t5:00 PM\r\ncat\tCat\t\tNo Show",
  );
  assert.equal((html.match(/<tr>/g) ?? []).length, 4);
  assert.equal((html.match(/<td /g) ?? []).length, 12);
  assert.equal((html.match(/<th /g) ?? []).length, 4);
  assert.ok(html.includes("mso-number-format:'\\@'"));
  assert.ok(!text.includes("---"));
});

test("HTML escapes content and TSV quotes tabs, newlines, and quotes within cells", () => {
  const entry = newEntry("<user>&", 'A\tB\n"C"', template, "");
  const { html, text } = excelClipboard([entry]);
  assert.ok(html.includes("&lt;user&gt;&amp;"));
  assert.ok(!html.includes("<user>"));
  assert.ok(html.includes("A\tB<br>&quot;C&quot;"));
  assert.ok(text.includes('"A\tB\n""C"""'));
  assert.equal(excelClipboard([]).text, "Login\tName\tTime in\tTime out");
});

test("TSV protects spreadsheet formula prefixes in pasted values", () => {
  const entry = newEntry("=2+2", "@mention", template, "");
  assert.ok(excelClipboard([entry]).text.includes("'=2+2\t'@mention"));
});

test("heading and notes are saved with new entries and rendered above the existing table body", () => {
  const custom = {
    ...template,
    heading: "Attendance for {{name}}",
    notes: "Remember **your badge**.",
    body: "{{login}} / {{time_in}}",
  };
  const entry = newEntry("ada", "Ada", custom, "9:00 AM");
  assert.equal(renderNote(entry), "# Attendance for Ada\n\nRemember **your badge**.\n\nada / 9:00 AM");
  const imported = parseTable(renderTable([entry]), template, [entry])[0];
  assert.equal(imported.templateHeading, custom.heading);
  assert.equal(imported.templateNotes, custom.notes);
  assert.equal(renderNote(imported), renderNote(entry));
});

test("legacy templates and entry snapshots remain readable without heading and notes", () => {
  const entry = newEntry("ada", "Ada", template, "9:00 AM");
  delete entry.templateHeading;
  delete entry.templateNotes;
  assert.equal(renderNote(entry), "**Login:** ada\n**Name:** Ada\n**Time in:** 9:00 AM\n**Time out:** —");
});
