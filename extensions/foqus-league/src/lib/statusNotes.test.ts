import assert from "node:assert/strict";
import { test } from "node:test";
import { statusNotes } from "./statusNotes.ts";

const DOWN = { running: false };
const UP = { running: true };

const titles = (...args: Parameters<typeof statusNotes>) => statusNotes(...args).map((n) => n.title);

test("a healthy, empty install earns the empty note once loading is over, and not before", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 0, collector: UP }, true), []);
  assert.deepEqual(titles({ totalOnRecord: 0, collector: UP }, false), ["No sessions yet"]);
  assert.equal(statusNotes({ totalOnRecord: 0, collector: UP }, false)[0].kind, "empty");
});

test("nothing is claimed before the first load has finished", () => {
  assert.deepEqual(statusNotes(undefined), []);
  assert.deepEqual(
    statusNotes(undefined, false),
    [],
    "an unloaded view has not earned the right to say 'go and focus'",
  );
});

test("a failing log read is reported ahead of the record count, never behind it", () => {
  const notes = statusNotes({ syncError: "Could not read the log: timeout", totalOnRecord: 0 }, false);

  assert.equal(notes.length, 1, "a failed read must not be dressed up as a quiet week");
  assert.equal(notes[0].kind, "sync");
  assert.match(notes[0].title, /data unavailable/i);
  assert.match(notes[0].body, /timeout/);
  assert.match(notes[0].body, /may be incomplete/);
});

test("with a history on record, a failing read is about the new sessions only", () => {
  const notes = statusNotes({ syncError: "log: command not found", totalOnRecord: 40 }, false);

  assert.equal(notes.length, 1);
  assert.match(notes[0].body, /New sessions are not being read/);
  assert.match(notes[0].body, /log: command not found/);
});

test("a collector that is down is reported however the sync went", () => {
  assert.deepEqual(titles({ totalOnRecord: 40, collector: DOWN }), ["Not recording"]);
  assert.deepEqual(titles({ syncError: "boom", totalOnRecord: 40, collector: DOWN }), [
    "Data unavailable",
    "Not recording",
  ]);
});

test("an undefined collector is not treated as a broken one", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 40 }, false), []);
});

test("many records and no events is reported as a blind parser, not as a quiet week", () => {
  const data = { totalOnRecord: 0, collector: UP, log: { records: 40, parsed: 0 } };

  assert.deepEqual(
    titles(data, false),
    ["Cannot read Focus sessions"],
    "a board of zeros must not be blamed on the user",
  );
  assert.match(statusNotes(data, false)[0].body, /40 log entries found, none readable/);
});

test("no records at all is a quiet week and the view may say so", () => {
  const data = { totalOnRecord: 0, collector: UP, log: { records: 0, parsed: 0 } };
  assert.deepEqual(titles(data, false), ["No sessions yet"]);
});

test("records that did parse say nothing more, however few sessions came of them", () => {
  const data = { totalOnRecord: 0, collector: UP, log: { records: 12, parsed: 3 } };
  assert.deepEqual(titles(data, false), ["No sessions yet"]);
});

test("a single unread message is counted in the singular", () => {
  const notes = statusNotes({ totalOnRecord: 0, log: { records: 1, parsed: 0 } });
  assert.match(notes[0].body, /1 log entry found/);
});

test("stored history means the screen is not empty, so the blind note would only alarm", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 40, collector: UP, log: { records: 40, parsed: 0 } }, false), []);
});

test("a failed log read is still reported first: it is the one the user can act on", () => {
  const notes = statusNotes(
    { syncError: "boom", totalOnRecord: 0, collector: DOWN, log: { records: 9, parsed: 0 } },
    false,
  );
  assert.deepEqual(
    notes.map((n) => n.title),
    ["Data unavailable", "Cannot read Focus sessions", "Not recording"],
  );
});
