import assert from "node:assert/strict";
import test from "node:test";
import { claimRedaction, localDay, remainingRedactions } from "./usage";
import { FREE_DAILY_REDACTIONS } from "./plan";

const DAY = "2026-09-17";
const LIMIT = 2;

test("the free plan allows five files and blocks the sixth until tomorrow", () => {
  assert.equal(FREE_DAILY_REDACTIONS, 5);
  let record;
  for (let i = 0; i < FREE_DAILY_REDACTIONS; i++) {
    const claim = claimRedaction(record, String(i), DAY, FREE_DAILY_REDACTIONS);
    assert.equal(claim.allowed, true);
    assert.equal(claim.remaining, 4 - i);
    record = claim.record;
  }
  assert.equal(
    claimRedaction(record, "sixth", DAY, FREE_DAILY_REDACTIONS).allowed,
    false,
  );
  assert.equal(
    claimRedaction(record, "0", DAY, FREE_DAILY_REDACTIONS).allowed,
    true,
  );
  assert.equal(
    claimRedaction(record, "sixth", "2026-09-18", FREE_DAILY_REDACTIONS)
      .allowed,
    true,
  );
});

test("allows the daily limit of different files", () => {
  const first = claimRedaction(undefined, "a", DAY, LIMIT);
  const second = claimRedaction(first.record, "b", DAY, LIMIT);
  const third = claimRedaction(second.record, "c", DAY, LIMIT);

  assert.deepEqual([first.allowed, first.remaining], [true, 1]);
  assert.deepEqual([second.allowed, second.remaining], [true, 0]);
  assert.deepEqual([third.allowed, third.remaining], [false, 0]);
  assert.deepEqual(third.record.files, ["a", "b"]);
});

test("reopening a file on the same day does not use another redaction", () => {
  const first = claimRedaction(undefined, "a", DAY, LIMIT);
  const second = claimRedaction(first.record, "b", DAY, LIMIT);
  const reopened = claimRedaction(second.record, "a", DAY, LIMIT);

  assert.equal(reopened.allowed, true);
  assert.deepEqual(reopened.record.files, ["a", "b"]);
});

test("the allowance resets on a new day", () => {
  const yesterday = { day: "2026-09-16", files: ["a", "b"] };

  assert.equal(remainingRedactions(yesterday, DAY, LIMIT), 2);
  const claim = claimRedaction(yesterday, "a", DAY, LIMIT);
  assert.deepEqual(claim.record, { day: DAY, files: ["a"] });
});

test("formats the local calendar day", () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});
