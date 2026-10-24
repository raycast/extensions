import assert from "node:assert/strict";
import test from "node:test";
import { newEntry, parseTable, renderNote, renderTable } from "../src/lib/markdown.ts";
import { initialStore } from "../src/lib/types.ts";
import { dateFromTime, normalizeTime, timeFromDate } from "../src/lib/time.ts";

const template = initialStore().templates[0];
test("all statuses render with exact column order and placeholders", () => {
  const present = newEntry("one", "One", template, "9:05 am");
  const out = { ...newEntry("two", "Two", template, "9:05 AM"), status: "clocked_out" as const, timeOut: "12:00 PM" };
  const absent = { ...newEntry("three", "Three", template, "9:05 AM"), status: "no_show" as const };
  assert.equal(
    renderTable([present, out, absent]),
    [
      "| Login | Name | Time in | Time out |",
      "| --- | --- | --- | --- |",
      "| one | One | 9:05 AM | — |",
      "| two | Two | 9:05 AM | 12:00 PM |",
      "| three | Three |  | No Show |",
    ].join("\n"),
  );
  const parsed = parseTable(renderTable([present, out, absent]), template);
  assert.deepEqual(
    parsed.map((entry) => entry.status),
    ["present", "clocked_out", "no_show"],
  );
});
test("pipes, backslashes, markdown, entities, and line breaks round trip", () => {
  for (const name of [
    "A | B",
    "A\\|B",
    "**Bold** _name_ [link] ~strike~ `code`",
    "<&amp;> <br>",
    "Two\nLines",
    "A\\\\B",
  ]) {
    const entry = newEntry("user|name", name, template, "");
    const result = parseTable(renderTable([entry]), template)[0];
    assert.equal(result.name, name);
    assert.equal(result.login, "user|name");
  }
});
test("selected row is bold, while copied table has no selection markup", () => {
  const a = newEntry("a", "Alice", template, "");
  const b = newEntry("b", "Bob", template, "");
  assert.match(renderTable([a, b], a.id), /\| \*\*a\*\* \| \*\*Alice\*\* \| \*\*—\*\* \| \*\*—\*\* \|/);
  assert.match(renderTable([a, b], a.id), /\| b \| Bob \| — \| — \|/);
  assert.equal(renderTable([a, b]).includes("**"), false);
  assert.equal(parseTable(renderTable([a], a.id), template)[0].name, "Alice");
});
test("rejects malformed tables, invalid times, and incomplete rows without changing originals", () => {
  const entry = newEntry("a", "Alice", template, "9:00 AM");
  const original = [entry];
  const snapshot = JSON.stringify(original);
  for (const table of [
    "",
    "not a table",
    renderTable(original).replace("Login | Name", "Name | Login"),
    renderTable(original).replace("---", "--"),
    renderTable(original).replace("9:00 AM", "13:00 AM"),
    renderTable(original) + "\n| missing | columns |",
    renderTable(original) + "\n\n| a | b | — | — |",
    renderTable(original).replace("| a |", "|  |"),
  ]) {
    assert.throws(() => parseTable(table, template, original));
    assert.equal(JSON.stringify(original), snapshot);
  }
});
test("imports preserve identity and template snapshots, and create new rows from selected template", () => {
  const entry = newEntry("a", "Alice", template, "");
  const selected = { id: "custom", label: "Custom", body: "Hello {{name}}" };
  const result = parseTable(renderTable([entry, newEntry("b", "Bob", selected, "")]), selected, [entry]);
  assert.equal(result[0].id, entry.id);
  assert.equal(result[0].templateBody, template.body);
  assert.equal(result[1].templateBody, selected.body);
  assert.equal(parseTable(renderTable([]), template).length, 0);
});
test("template notes replace every placeholder and preserve unrelated text", () => {
  const entry = newEntry(
    "ada",
    "Ada",
    { ...template, body: "Hi {{name}} / {{login}} / {{time_in}} / {{time_out}} / {{name}}" },
    "8:30 AM",
  );
  assert.equal(renderNote(entry), "Hi Ada / ada / 8:30 AM / — / Ada");
  assert.match(renderNote({ ...entry, status: "no_show" }), /No Show/);
});
test("time formatting handles noon, midnight, and leading zeros", () => {
  assert.equal(normalizeTime("09:05 am"), "9:05 AM");
  assert.equal(normalizeTime("—"), "");
  for (const value of ["12:00 AM", "12:00 PM", "1:15 PM", "11:59 PM"])
    assert.equal(timeFromDate(dateFromTime(value)), value);
  for (const value of ["24:00", "0:00 AM", "1:60 PM", "9 AM", "tomorrow", "12:00 PM extra"])
    assert.throws(() => normalizeTime(value));
});
