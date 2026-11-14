import assert from "node:assert/strict";
import test from "node:test";
import {
  memberDirectoryFailureBackoffMs,
  memberDirectoryFreshMs,
  memberDirectoryMaxAgeMs,
  planMemberDirectoryRead,
} from "./memberDirectoryRefresh";

const now = 1_000_000;
const staleAge = memberDirectoryFreshMs + 1;
const failedLoad = { finished: true, failedAt: now - 1_000 };

test("a fresh snapshot does not start a scan", () => {
  assert.deepEqual(planMemberDirectoryRead({ hasSnapshot: true, snapshotAgeMs: 0, load: undefined, now }), {
    serve: "fresh",
    startLoad: false,
    discardFailedLoad: false,
  });
});

test("a failed scan with a usable snapshot does not rescan until the backoff elapses", () => {
  assert.deepEqual(planMemberDirectoryRead({ hasSnapshot: true, snapshotAgeMs: staleAge, load: failedLoad, now }), {
    serve: "stale",
    startLoad: false,
    discardFailedLoad: false,
  });

  const cooledDown = { finished: true, failedAt: now - memberDirectoryFailureBackoffMs };
  assert.deepEqual(planMemberDirectoryRead({ hasSnapshot: true, snapshotAgeMs: staleAge, load: cooledDown, now }), {
    serve: "stale",
    startLoad: true,
    discardFailedLoad: true,
  });
});

test("a failed scan without a snapshot is reused until the backoff elapses", () => {
  assert.deepEqual(
    planMemberDirectoryRead({
      hasSnapshot: false,
      snapshotAgeMs: Number.POSITIVE_INFINITY,
      load: failedLoad,
      now,
    }),
    { serve: "live", startLoad: false, discardFailedLoad: false },
  );
});

test("an in-progress scan is not started again", () => {
  assert.deepEqual(
    planMemberDirectoryRead({
      hasSnapshot: true,
      snapshotAgeMs: staleAge,
      load: { finished: false },
      now,
    }),
    { serve: "stale", startLoad: false, discardFailedLoad: false },
  );
});

test("a missing snapshot starts a scan", () => {
  assert.deepEqual(
    planMemberDirectoryRead({
      hasSnapshot: false,
      snapshotAgeMs: Number.POSITIVE_INFINITY,
      load: undefined,
      now,
    }),
    { serve: "live", startLoad: true, discardFailedLoad: false },
  );
});

test("a snapshot older than a day is not served", () => {
  assert.equal(
    planMemberDirectoryRead({
      hasSnapshot: true,
      snapshotAgeMs: memberDirectoryMaxAgeMs,
      load: undefined,
      now,
    }).serve,
    "live",
  );
});
