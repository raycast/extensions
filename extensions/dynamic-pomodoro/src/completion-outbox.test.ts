import assert from "node:assert/strict";
import test from "node:test";
import {
  getCompletionEvent,
  getDeliverableEvents,
  isLockOwner,
  lockEventForDelivery,
  markEventDelivered,
  markEventFailed,
  upsertPendingEvent,
  type CompletionOutboxStore,
} from "./completion-outbox.ts";

function createInMemoryStore(): CompletionOutboxStore {
  let raw: string | null = null;
  return {
    getRaw: async () => raw,
    setRaw: async (value: string) => {
      raw = value;
    },
  };
}

test("upsertPendingEvent creates pending event with retries = 0", async () => {
  const store = createInMemoryStore();

  await upsertPendingEvent({ completionId: 42, launchType: "background" }, { store, now: () => 1_000 });
  const event = await getCompletionEvent(42, { store });

  assert.ok(event);
  assert.equal(event?.status, "pending");
  assert.equal(event?.retries, 0);
  assert.equal(event?.launchType, "background");
  assert.equal(event?.createdAt, 1_000);
});

test("markEventDelivered is final and idempotent", async () => {
  const store = createInMemoryStore();

  await upsertPendingEvent({ completionId: 7 }, { store, now: () => 1_000 });
  await lockEventForDelivery(7, { store, now: () => 2_000 });
  await markEventDelivered(7, { store, now: () => 3_000 });
  await markEventDelivered(7, { store, now: () => 4_000 });

  const event = await getCompletionEvent(7, { store });
  assert.ok(event);
  assert.equal(event?.status, "delivered");
  assert.equal(event?.deliveredAt, 3_000);
  assert.equal(event?.retries, 0);
});

test("markEventFailed applies retry backoff and schedules nextRetryAt", async () => {
  const store = createInMemoryStore();

  await upsertPendingEvent({ completionId: 99 }, { store, now: () => 10_000 });
  await lockEventForDelivery(99, { store, now: () => 11_000 });
  await markEventFailed(99, { store, now: () => 12_000, baseDelayMs: 2_000, maxDelayMs: 10_000 });

  const event = await getCompletionEvent(99, { store });
  assert.ok(event);
  assert.equal(event?.status, "failed");
  assert.equal(event?.retries, 1);
  assert.equal(event?.nextRetryAt, 14_000);

  const immediate = await getDeliverableEvents({ store, now: () => 13_999 });
  assert.equal(immediate.length, 0);

  const retryReady = await getDeliverableEvents({ store, now: () => 14_000 });
  assert.equal(retryReady.length, 1);
  assert.equal(retryReady[0]?.completionId, 99);
});

test("markEventDelivered ignores stale lock owner", async () => {
  const store = createInMemoryStore();

  await upsertPendingEvent({ completionId: 77 }, { store, now: () => 1_000 });
  const locked = await lockEventForDelivery(77, { store, now: () => 2_000 });
  assert.ok(locked?.lockId);
  const owner = await isLockOwner(77, locked?.lockId, { store });
  assert.equal(owner, true);

  const staleResult = await markEventDelivered(77, { store, now: () => 3_000, expectedLockId: "stale-lock" });
  assert.equal(staleResult, undefined);
  const eventAfterStale = await getCompletionEvent(77, { store });
  assert.equal(eventAfterStale?.status, "delivering");

  const delivered = await markEventDelivered(77, { store, now: () => 4_000, expectedLockId: locked?.lockId });
  assert.equal(delivered?.status, "delivered");
});
