import { test } from "node:test";
import assert from "node:assert/strict";
import { immutableUri, isCantOpen } from "../../src/lib/platform/sqlite.ts";

test("only sqlite3's cannot-open failure falls back to an immutable read", () => {
  const cantOpen = new Error(
    "Command failed: /usr/bin/sqlite3 -readonly -json /Users/me/.codex/state_5.sqlite select 1\n" +
      "Parse error in 3rd command line argument: unable to open database file (14)\n",
  );
  assert.equal(isCantOpen(cantOpen), true);
  assert.equal(isCantOpen(new Error("Parse error near line 1: no such column: title")), false);
  assert.equal(isCantOpen(new Error("database is locked (5)")), false);
  assert.equal(isCantOpen("unable to open database file"), false);
});

test("the immutable URI is read-only and escapes what SQLite URIs reserve", () => {
  assert.equal(immutableUri("/Users/me/.codex/state_5.sqlite"), "file:/Users/me/.codex/state_5.sqlite?mode=ro&immutable=1");
  assert.equal(
    immutableUri("/Users/me/Library/Application Support/A#1 %20?/db.sqlite"),
    "file:/Users/me/Library/Application%20Support/A%231%20%2520%3F/db.sqlite?mode=ro&immutable=1",
  );
});
