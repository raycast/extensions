import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { searchSQL } from "./sql.ts";

test("every word must match, and quotes and wildcards are literal", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE clips (id INTEGER PRIMARY KEY, kind INT, text TEXT, source_app TEXT, created_at INT,
             pinned INT, deleted INT, copied_by TEXT, copied_on TEXT);
           CREATE TABLE peers (id TEXT, name TEXT);
           INSERT INTO peers VALUES ('other', 'Air');`);
  const add = db.prepare(
    "INSERT INTO clips (kind, text, created_at, pinned, deleted, copied_by, copied_on) VALUES (0, ?, ?, ?, ?, ?, ?)",
  );
  add.run("ssh 10.0.0.1", 1, 0, 0, "me", "Pro");
  add.run("it's 100% done_now", 2, 0, 0, "other", "Air");
  add.run("ssh pinned", 3, 1, 0, null, null);
  add.run("ssh gone", 4, 0, 1, null, null);

  const texts = (q: string) =>
    db
      .prepare(searchSQL(q))
      .all()
      .map((r) => r.text);
  assert.deepEqual(texts(""), ["ssh pinned", "it's 100% done_now", "ssh 10.0.0.1"]);
  assert.deepEqual(texts("ssh 10.0"), ["ssh 10.0.0.1"]);
  assert.deepEqual(texts("it's 0%"), ["it's 100% done_now"]);
  assert.deepEqual(texts("e_n"), ["it's 100% done_now"]);
  assert.deepEqual(texts("1%0"), []);
  assert.deepEqual(texts("x' OR 1=1 --"), []);
  assert.deepEqual(texts("\\"), []);
  assert.deepEqual(
    db
      .prepare(searchSQL(""))
      .all()
      .map((r) => r.device),
    [null, "Air", null],
  );
});
