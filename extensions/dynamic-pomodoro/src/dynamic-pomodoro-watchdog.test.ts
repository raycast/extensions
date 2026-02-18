import assert from "node:assert/strict";
import test from "node:test";
import { upsertPendingEvent, lockEventForDelivery, markEventFailed, type CompletionOutboxStore } from "./completion-outbox.ts";
import { INITIAL_STATE } from "./timer-state.ts";
import { runDynamicPomodoroWatchdog } from "./dynamic-pomodoro-watchdog.ts";

function createInMemoryStore(): CompletionOutboxStore {
  let raw: string | null = null;
  return {
    getRaw: async () => raw,
    setRaw: async (value: string) => {
      raw = value;
    },
  };
}

test("watchdog drains deliverable completion events from outbox", async () => {
  const store = createInMemoryStore();
  const delivered: number[] = [];
  const retried: number[] = [];
  const state = { ...INITIAL_STATE };

  await upsertPendingEvent({ completionId: 501, launchType: "background" }, { store, now: () => 1_000 });
  await lockEventForDelivery(501, { store, now: () => 1_100 });
  await markEventFailed(501, { store, now: () => 1_200, baseDelayMs: 100, maxDelayMs: 100 });

  await runDynamicPomodoroWatchdog({
    completionOutboxStore: store,
    now: () => 1_300,
    loadTimerState: async () => state,
    hydrateTimerAfterLoad: (stored) => stored,
    shouldNotifyFinishedAfterLoad: () => false,
    notifyTimerFinished: async () => {
      throw new Error("notifyTimerFinished should not run in this test");
    },
    saveTimerState: async () => {},
    recordWatchdogRun: async () => {},
    deliverCompletionEvent: async ({ completionId }) => {
      delivered.push(completionId);
      return { status: "delivered" };
    },
    recordRetryDrainAttempt: async ({ completionId }) => {
      retried.push(completionId);
    },
  });

  assert.deepEqual(delivered, [501]);
  assert.deepEqual(retried, [501]);
});

test("watchdog records retry diagnostics when retry delivery fails", async () => {
  const store = createInMemoryStore();
  const retryRecords: Array<{ completionId: number; error?: unknown }> = [];
  const state = { ...INITIAL_STATE };

  await upsertPendingEvent({ completionId: 777, launchType: "background" }, { store, now: () => 2_000 });
  await lockEventForDelivery(777, { store, now: () => 2_100 });
  await markEventFailed(777, { store, now: () => 2_200, baseDelayMs: 100, maxDelayMs: 100 });

  await runDynamicPomodoroWatchdog({
    completionOutboxStore: store,
    now: () => 2_300,
    loadTimerState: async () => state,
    hydrateTimerAfterLoad: (stored) => stored,
    shouldNotifyFinishedAfterLoad: () => false,
    notifyTimerFinished: async () => {},
    saveTimerState: async () => {},
    recordWatchdogRun: async () => {},
    deliverCompletionEvent: async () => {
      return { status: "failed" };
    },
    recordRetryDrainAttempt: async ({ completionId, error }) => {
      retryRecords.push({ completionId, error });
    },
  });

  assert.equal(retryRecords.length, 1);
  assert.equal(retryRecords[0]?.completionId, 777);
  assert.equal(String(retryRecords[0]?.error), "retry delivery failed");
});
