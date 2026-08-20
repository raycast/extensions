import assert from "node:assert/strict";
import test from "node:test";
import { parseQuickAdd } from "../src/utils/quickAddParser.ts";

const now = new Date(2026, 7, 20, 14, 30);
const projects = [
  { id: "inbox", name: "Inbox" },
  { id: "client-work", name: "Client Work" },
];

test("parses natural-language dates, multi-word lists, and priorities", () => {
  const parsed = parseQuickAdd("Send proposal at 9 tomorrow ~Client Work !high", projects, now);

  assert.equal(parsed.title, "Send proposal");
  assert.equal(parsed.projectId, "client-work");
  assert.equal(parsed.priority, "5");
  assert.equal(parsed.isAllDay, false);
  assert.deepEqual(parsed.dueDate, new Date(2026, 7, 21, 9));
});

test("parses explicit all-day dates and the legacy list marker", () => {
  const parsed = parseQuickAdd("Renew registration *next Monday !2 ^Inbox", projects, now);

  assert.equal(parsed.title, "Renew registration");
  assert.equal(parsed.projectId, "inbox");
  assert.equal(parsed.priority, "3");
  assert.equal(parsed.isAllDay, true);
  assert.deepEqual(parsed.dueDate, new Date(2026, 7, 24));
});

test("treats a time without a date as today", () => {
  const cases: Array<[string, Date]> = [
    ["Call client at 9", new Date(2026, 7, 20, 9)],
    ["Call client 9am", new Date(2026, 7, 20, 9)],
    ["Call client *4:15pm", new Date(2026, 7, 20, 16, 15)],
  ];

  for (const [input, expectedDate] of cases) {
    const parsed = parseQuickAdd(input, projects, now);
    assert.equal(parsed.title, "Call client", input);
    assert.equal(parsed.isAllDay, false, input);
    assert.deepEqual(parsed.dueDate, expectedDate, input);
  }
});

test("does not treat ordinary numbers or month names as dates", () => {
  for (const title of [
    "Buy 2 apples",
    "Plan May launch",
    "Investigate regression 5-7 in staging",
    "Deploy versions 5/7",
  ]) {
    const parsed = parseQuickAdd(title, projects, now);
    assert.equal(parsed.title, title);
    assert.equal(parsed.dueDate, undefined);
  }
});

test("requires a marker for ambiguous short numeric dates", () => {
  const parsed = parseQuickAdd("Submit report *5/7", projects, now);

  assert.equal(parsed.title, "Submit report");
  assert.equal(parsed.isAllDay, true);
  assert.deepEqual(parsed.dueDate, new Date(2027, 4, 7));
});

test("exposes an empty title when the input contains only metadata", () => {
  const parsed = parseQuickAdd("tomorrow ~Inbox !high", projects, now);

  assert.equal(parsed.title, "");
  assert.equal(parsed.projectId, "inbox");
  assert.equal(parsed.priority, "5");
  assert.deepEqual(parsed.dueDate, new Date(2026, 7, 21));
});

test("consumes additional date metadata instead of treating it as a title", () => {
  const parsed = parseQuickAdd("today tomorrow ~Inbox !high", projects, now);

  assert.equal(parsed.title, "");
  assert.equal(parsed.projectId, "inbox");
  assert.equal(parsed.priority, "5");
  assert.deepEqual(parsed.dueDate, new Date(2026, 7, 20));
});

test("consumes repeated project and priority metadata in input order", () => {
  const parsed = parseQuickAdd("today ~Client Work ~Inbox !high !low", projects, now);

  assert.equal(parsed.title, "");
  assert.equal(parsed.projectId, "client-work");
  assert.equal(parsed.priority, "5");
});

test("parses documented ISO and zero-padded numeric dates and times", () => {
  const cases: Array<[string, Date]> = [
    ["Submit report *2026-08-25", new Date(2026, 7, 25)],
    ["Submit report *05/07", new Date(2027, 4, 7)],
    ["Submit report *08-25-2026", new Date(2026, 7, 25)],
    ["Call client 09:30am", new Date(2026, 7, 20, 9, 30)],
  ];

  for (const [input, expectedDate] of cases) {
    const parsed = parseQuickAdd(input, projects, now);
    assert.equal(parsed.title, input.startsWith("Submit") ? "Submit report" : "Call client", input);
    assert.deepEqual(parsed.dueDate, expectedDate, input);
  }
});

test("does not partially parse malformed explicit metadata", () => {
  for (const title of ["Task *tomorrowland", "Task *next weekday", "Task *September 3rdfoo"]) {
    const parsed = parseQuickAdd(title, projects, now);
    assert.equal(parsed.title, title);
    assert.equal(parsed.dueDate, undefined);
  }
});

test("preserves spacing before unrecognized exclamation text", () => {
  const parsed = parseQuickAdd("Task !highly", projects, now);

  assert.equal(parsed.title, "Task !highly");
  assert.equal(parsed.priority, undefined);
});
