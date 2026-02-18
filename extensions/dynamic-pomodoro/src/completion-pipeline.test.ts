import assert from "node:assert/strict";
import test from "node:test";
import { getCompletionEvent, type CompletionOutboxStore } from "./completion-outbox.ts";
import { deliverCompletionEvent } from "./completion-pipeline.ts";

function createInMemoryStore(): CompletionOutboxStore {
  let raw: string | null = null;
  return {
    getRaw: async () => raw,
    setRaw: async (value: string) => {
      raw = value;
    },
  };
}

test("pipeline delivers pending event and marks it delivered", async () => {
  const store = createInMemoryStore();
  const channels: string[] = [];

  const result = await deliverCompletionEvent(
    { completionId: 100, launchType: "background" },
    {
      store,
      now: () => 1_000,
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        channels.push("system-notification");
      },
      showHud: async () => {
        channels.push("hud");
      },
      showSuccessToast: async () => {
        channels.push("toast");
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.equal(result.status, "delivered");
  assert.deepEqual(channels, ["system-notification"]);
  const event = await getCompletionEvent(100, { store });
  assert.equal(event?.status, "delivered");
});

test("pipeline does not deliver already delivered completionId", async () => {
  const store = createInMemoryStore();
  let sendCount = 0;

  await deliverCompletionEvent(
    { completionId: 101, launchType: "background" },
    {
      store,
      now: () => 1_000,
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        sendCount += 1;
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  await deliverCompletionEvent(
    { completionId: 101, launchType: "background" },
    {
      store,
      now: () => 2_000,
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        sendCount += 1;
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  assert.equal(sendCount, 1);
});

test("pipeline falls back to next channel when first channel fails", async () => {
  const store = createInMemoryStore();
  const channels: string[] = [];

  const result = await deliverCompletionEvent(
    { completionId: 102, launchType: "background" },
    {
      store,
      now: () => 3_000,
      buildPlan: () => ({ channels: ["hud", "system-notification", "toast"] }),
      showHud: async () => {
        channels.push("hud");
        throw new Error("hud down");
      },
      sendSystemNotification: async () => {
        channels.push("system-notification");
      },
      showSuccessToast: async () => {
        channels.push("toast");
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.equal(result.status, "delivered");
  assert.deepEqual(channels, ["hud", "system-notification"]);
});

test("pipeline marks failed with retry when all channels fail", async () => {
  const store = createInMemoryStore();

  const result = await deliverCompletionEvent(
    { completionId: 103, launchType: "background" },
    {
      store,
      now: () => 10_000,
      buildPlan: () => ({ channels: ["hud", "system-notification", "toast"] }),
      showHud: async () => {
        throw new Error("hud failed");
      },
      sendSystemNotification: async () => {
        throw new Error("system failed");
      },
      showSuccessToast: async () => {
        throw new Error("toast failed");
      },
      recordNotifyAttempt: async () => {},
      retryBaseDelayMs: 2_000,
      retryMaxDelayMs: 10_000,
    },
  );

  assert.equal(result.status, "failed");
  const event = await getCompletionEvent(103, { store });
  assert.equal(event?.status, "failed");
  assert.equal(event?.retries, 1);
  assert.equal(event?.nextRetryAt, 12_000);
});
