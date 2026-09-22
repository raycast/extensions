import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFilename, parseImport, serializeSessions } from "./transfer.ts";
import type { Session } from "./types.ts";

const T1 = Date.UTC(2026, 8, 16, 10, 0, 0);
const T2 = T1 + 3_600_000;

const SESSIONS: Session[] = [
  { start: T1, goal: "Deep work", duration: 25, source: "reported", blocks: 2, sites: { "youtube.com": 2 } },
  { start: T2, goal: "", duration: 40, source: "manual", notes: "by hand" },
];

test("an export round-trips through the importer unchanged", () => {
  assert.deepEqual(parseImport(serializeSessions(SESSIONS)), SESSIONS);
});

test("the export names its format and the day it was made", () => {
  const doc = JSON.parse(serializeSessions(SESSIONS, new Date(Date.UTC(2026, 8, 22, 12))));
  assert.equal(doc.foqus, 1);
  assert.equal(doc.exportedAt, "2026-09-22T12:00:00.000Z");
  assert.match(exportFilename(new Date(2026, 8, 22)), /^foqus-sessions-2026-09-22\.json$/);
});

test("a bare array and the on-disk sessions.jsonl are both readable", () => {
  assert.deepEqual(parseImport(JSON.stringify(SESSIONS)), SESSIONS);
  assert.deepEqual(parseImport(SESSIONS.map((s) => JSON.stringify(s)).join("\n") + "\n"), SESSIONS);
});

test("rows that are not sessions are dropped, not fatal", () => {
  const text = JSON.stringify({ foqus: 1, sessions: [SESSIONS[0], { start: "soon" }, null, 7] });
  assert.deepEqual(parseImport(text), [SESSIONS[0]]);
});

test("a file that is not an export at all is refused", () => {
  assert.throws(() => parseImport("hello"), /Not a Foqus export/);
  assert.throws(() => parseImport('{"version":1}'), /Not a Foqus export/);
  assert.throws(() => parseImport(""), /Not a Foqus export/);
});

test("an export with no sessions reads as empty rather than failing", () => {
  assert.deepEqual(parseImport(serializeSessions([])), []);
});
