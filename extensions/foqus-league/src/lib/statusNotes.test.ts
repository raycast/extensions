import assert from "node:assert/strict";
import { test } from "node:test";
import { noteDetail, statusNotes } from "./statusNotes.ts";

const DOWN = { running: false };

const titles = (...args: Parameters<typeof statusNotes>) => statusNotes(...args).map((n) => n.title);

test("a healthy, empty install earns the empty note once loading is over, and not before", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 0, menuBarOff: false }, true), []);
  assert.deepEqual(titles({ totalOnRecord: 0, menuBarOff: false }, false), ["No sessions yet"]);
  assert.equal(statusNotes({ totalOnRecord: 0, menuBarOff: false }, false)[0].kind, "empty");
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
  assert.equal(notes[0].title, "Can't load your sessions");
  assert.match(notes[0].body, /timeout/);
  assert.match(notes[0].body, /may be missing/);
});

test("with a history on record, a failing read is about the new sessions only", () => {
  const notes = statusNotes({ syncError: "log: command not found", totalOnRecord: 40 }, false);

  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "Can't check for new sessions");
  assert.match(notes[0].body, /totals may be behind/);
  assert.match(notes[0].body, /log: command not found/);
});

test("Menu Bar Stats being off is reported however the sync went", () => {
  assert.deepEqual(titles({ totalOnRecord: 40, menuBarOff: true }), ["Menu Bar Stats is off"]);
  assert.deepEqual(titles({ syncError: "boom", totalOnRecord: 40, menuBarOff: true }), [
    "Can't check for new sessions",
    "Menu Bar Stats is off",
  ]);
});

test("an unknown menu bar state is not treated as off", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 40 }, false), []);
});

test("a fresh install with Menu Bar Stats off shows that one note, not 'No sessions yet'", () => {
  assert.deepEqual(titles({ totalOnRecord: 0, menuBarOff: true }, false), ["Menu Bar Stats is off"]);
});

test("a recorder that cannot start is reported while Menu Bar Stats is on", () => {
  assert.deepEqual(titles({ totalOnRecord: 40, menuBarOff: false, collector: DOWN }), ["Not recording"]);
  assert.equal(statusNotes({ totalOnRecord: 40, menuBarOff: false, collector: DOWN })[0].kind, "collector");
});

test("with Menu Bar Stats off, a stopped recorder adds no second note", () => {
  assert.deepEqual(titles({ totalOnRecord: 40, menuBarOff: true, collector: DOWN }), ["Menu Bar Stats is off"]);
});

test("an unknown recorder state is not treated as a stopped one", () => {
  assert.deepEqual(statusNotes({ totalOnRecord: 40, menuBarOff: false }, false), []);
});

test("many records and no events is reported as a blind parser, not as a quiet week", () => {
  const data = { totalOnRecord: 0, menuBarOff: false, log: { records: 40, parsed: 0 } };

  assert.deepEqual(
    titles(data, false),
    ["Can't read Focus sessions"],
    "a board of zeros must not be blamed on the user",
  );
  assert.match(statusNotes(data, false)[0].body, /Totals may be wrong/);
  assert.doesNotMatch(statusNotes(data, false)[0].body, /40/, "log lines are not sessions, so no count is shown");
});

test("no records at all is a quiet week and the view may say so", () => {
  const data = { totalOnRecord: 0, menuBarOff: false, log: { records: 0, parsed: 0 } };
  assert.deepEqual(titles(data, false), ["No sessions yet"]);
});

test("records that did parse say nothing more, however few sessions came of them", () => {
  const data = { totalOnRecord: 0, menuBarOff: false, log: { records: 12, parsed: 3 } };
  assert.deepEqual(titles(data, false), ["No sessions yet"]);
});

test("a single unreadable entry is enough to report a blind parser", () => {
  assert.deepEqual(titles({ totalOnRecord: 0, log: { records: 1, parsed: 0 } }), ["Can't read Focus sessions"]);
});

test("a parser that goes blind after a Raycast update is reported even with sessions on record", () => {
  assert.deepEqual(titles({ totalOnRecord: 40, menuBarOff: false, log: { records: 3, parsed: 0 } }, false), [
    "Can't read Focus sessions",
  ]);
});

test("a failed log read is still reported first: it is the one the user can act on", () => {
  const notes = statusNotes(
    { syncError: "boom", totalOnRecord: 0, menuBarOff: true, log: { records: 9, parsed: 0 } },
    false,
  );
  assert.deepEqual(
    notes.map((n) => n.title),
    ["Can't load your sessions", "Can't read Focus sessions", "Menu Bar Stats is off"],
  );
});

test("where the Return key can't be drawn, the note says in words what Return does", () => {
  const [menuBar] = statusNotes({ totalOnRecord: 0, menuBarOff: true }, false);
  assert.equal(menuBar.onReturn, "turn it on");
  assert.equal(noteDetail(menuBar), "Without it, your sessions aren't counted. Press Return to turn it on.");

  const [empty] = statusNotes({ totalOnRecord: 0, menuBarOff: false }, false);
  assert.equal(
    noteDetail(empty),
    "Start one from Raycast or Menu Bar Stats.",
    "a note with no key keeps its body as is",
  );
});
