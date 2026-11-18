import assert from "node:assert/strict";
import { test } from "node:test";
import { describeSearchesLeft, formatWait, getRemaining, parseRateLimit } from "./rate-limit";

test("parses Savee's RateLimit header", () => {
  const limits = parseRateLimit('"burst";r=59;t=60, "search-weekly";r=180;t=432000');
  assert.deepEqual(limits, [
    { policy: "burst", remaining: 59, resetSeconds: 60 },
    { policy: "search-weekly", remaining: 180, resetSeconds: 432000 },
  ]);
  assert.equal(getRemaining(limits, "search-weekly"), 180);
  assert.deepEqual(parseRateLimit(null), []);
});

test("describes what's left and how long to wait", () => {
  assert.equal(describeSearchesLeft(1), "1 search left this week");
  assert.equal(describeSearchesLeft(180), "180 searches left this week");
  assert.equal(describeSearchesLeft(undefined), undefined);
  assert.equal(formatWait(30), "in 30s");
  assert.equal(formatWait(600), "in 10 min");
  assert.equal(formatWait(7200), "in 2h");
});
