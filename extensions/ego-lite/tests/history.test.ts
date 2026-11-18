import assert from "node:assert/strict";
import test from "node:test";

import { buildHistoryQuery, escapeSqlLike } from "../src/lib/history";

test("escapes quotes and LIKE metacharacters", () => {
  assert.equal(escapeSqlLike("50%_off\\it's"), "50\\%\\_off\\\\it''s");
});

test("does not filter zero or one character queries", () => {
  const sql = buildHistoryQuery("a");
  assert.doesNotMatch(sql, /title LIKE/);
  assert.doesNotMatch(sql, /url LIKE '%a%'/);
});

test("requires every multi-word term to match title or URL", () => {
  const sql = buildHistoryQuery("ray cast");
  assert.match(sql, /title LIKE '%ray%'/);
  assert.match(sql, /title LIKE '%cast%'/);
  assert.match(sql, /\) AND \(/);
});

test("limits empty search to 100 recent URLs", () => {
  const sql = buildHistoryQuery("");
  assert.match(sql, /url LIKE 'http:\/\/%'/);
  assert.match(sql, /url LIKE 'https:\/\/%'/);
  assert.match(sql, /GROUP BY url/);
  assert.match(sql, /ORDER BY last_visit_time DESC/);
  assert.match(sql, /LIMIT 100/);
});

test("clamps invalid result limits to one", () => {
  assert.match(buildHistoryQuery("", 0), /LIMIT 1/);
});
