import assert from "node:assert/strict";
import test from "node:test";
import { parseQuickAdd } from "../src/utils/quickAddParser.ts";

const now = new Date(2026, 7, 20, 14, 30);
const projects = [
  { id: "inbox", name: "Inbox" },
  { id: "client-work", name: "Client Work" },
];
type ParsedPriority = "0" | "1" | "3" | "5";

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

test("uses the first date and preserves later date expressions like TickTick", () => {
  const parsed = parseQuickAdd("today tomorrow ~Inbox !high", projects, now);

  assert.equal(parsed.title, "tomorrow");
  assert.equal(parsed.projectId, "inbox");
  assert.equal(parsed.priority, "5");
  assert.deepEqual(parsed.dueDate, new Date(2026, 7, 20));
});

test("parses bare weekdays in titles like TickTick", () => {
  const cases: Array<[string, string, Date]> = [
    ["Monday report", "report", new Date(2026, 7, 24)],
    ["Friday deployment checklist", "deployment checklist", new Date(2026, 7, 21)],
    ["Prepare Monday report for Friday", "Prepare report for Friday", new Date(2026, 7, 24)],
    ["Move Tuesday meeting to Thursday", "Move meeting to Thursday", new Date(2026, 7, 25)],
  ];

  for (const [input, expectedTitle, expectedDate] of cases) {
    const parsed = parseQuickAdd(input, projects, now);
    assert.equal(parsed.title, expectedTitle, input);
    assert.deepEqual(parsed.dueDate, expectedDate, input);
  }
});

test("uses the first project without consuming later project metadata", () => {
  const parsed = parseQuickAdd("today ~Client Work ~Inbox !high !low", projects, now);

  assert.equal(parsed.title, "~Inbox");
  assert.equal(parsed.projectId, "client-work");
  assert.equal(parsed.priority, "1");
});

test("supports TickTick priority syntax", () => {
  const cases: Array<[string, ParsedPriority]> = [
    ["!1", "5"],
    ["!high", "5"],
    ["!2", "3"],
    ["!medium", "3"],
    ["!3", "1"],
    ["!low", "1"],
    ["!none", "0"],
  ];

  for (const [token, expectedPriority] of cases) {
    const parsed = parseQuickAdd(`Task ${token}`, projects, now);
    assert.equal(parsed.title, "Task", token);
    assert.equal(parsed.priority, expectedPriority, token);
  }
});

test("does not parse unsupported priority aliases", () => {
  for (const token of ["!", "!!", "!!!", "!0", "!med"]) {
    const parsed = parseQuickAdd(`Task ${token}`, projects, now);
    assert.equal(parsed.title, `Task ${token}`, token);
    assert.equal(parsed.priority, undefined, token);
  }
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
