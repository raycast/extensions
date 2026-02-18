import assert from "node:assert/strict";
import test from "node:test";
import type { CompletionOutboxStore } from "./completion-outbox.ts";
import { notifyTimerFinished } from "./timer-notifications.ts";

function createInMemoryStore(): CompletionOutboxStore {
  let raw: string | null = null;
  return {
    getRaw: async () => raw,
    setRaw: async (value: string) => {
      raw = value;
    },
  };
}

test("notifyTimerFinished continues visual notifications when sound layer fails", async () => {
  const notifyChannels: string[] = [];
  const soundCalls: string[] = [];
  let timestampWrites = 0;

  await notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always", customPath: "/tmp/a.wav" }),
      setLastCompletionSoundAt: async () => {
        timestampWrites += 1;
      },
      playCompletionSound: async () => {
        soundCalls.push("sound");
        throw new Error("sound failed");
      },
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
      },
      showHud: async () => {
        notifyChannels.push("hud");
      },
      showSuccessToast: async () => {
        notifyChannels.push("toast");
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(soundCalls, ["sound"]);
  assert.deepEqual(notifyChannels, ["system-notification"]);
  assert.equal(timestampWrites, 0);
});

test("notifyTimerFinished does not wait for long sound before visual notification", async () => {
  const notifyChannels: string[] = [];
  let resolveSound:
    | ((value: { attempted: true; attemptedAt: number; mode: "always"; source: "beep"; played: true }) => void)
    | undefined;

  const notifyPromise = notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always", customPath: "/tmp/long.m4r" }),
      playCompletionSound: async () =>
        await new Promise<{ attempted: true; attemptedAt: number; mode: "always"; source: "beep"; played: true }>((resolve) => {
          resolveSound = resolve;
        }),
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  const state = await Promise.race([
    notifyPromise.then(() => "done"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 150)),
  ]);

  assert.equal(state, "done");
  assert.deepEqual(notifyChannels, ["system-notification"]);
  resolveSound?.({ attempted: true, attemptedAt: 1000, mode: "always", source: "beep", played: true });
});

test("notifyTimerFinished waits for sound completion in background launch", async () => {
  const notifyChannels: string[] = [];
  let resolveSound:
    | ((value: { attempted: true; attemptedAt: number; mode: "always"; source: "beep"; played: true }) => void)
    | undefined;

  const notifyPromise = notifyTimerFinished(
    { launchType: "background" as any },
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always", customPath: "/tmp/long.m4r" }),
      playCompletionSound: async () =>
        await new Promise<{ attempted: true; attemptedAt: number; mode: "always"; source: "beep"; played: true }>((resolve) => {
          resolveSound = resolve;
        }),
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  const stateBeforeSoundResolved = await Promise.race([
    notifyPromise.then(() => "done"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 150)),
  ]);

  assert.equal(stateBeforeSoundResolved, "timeout");
  assert.deepEqual(notifyChannels, ["system-notification"]);

  resolveSound?.({ attempted: true, attemptedAt: 1000, mode: "always", source: "beep", played: true });
  const finalState = await Promise.race([
    notifyPromise.then(() => "done"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 150)),
  ]);
  assert.equal(finalState, "done");
});

test("notifyTimerFinished prefers HUD channel when available", async () => {
  const notifyChannels: string[] = [];

  await notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always" }),
      playCompletionSound: async () => ({ attempted: true, attemptedAt: 1_000, mode: "always", source: "beep", played: true }),
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["hud", "system-notification", "toast"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
      },
      showHud: async () => {
        notifyChannels.push("hud");
      },
      showSuccessToast: async () => {
        notifyChannels.push("toast");
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(notifyChannels, ["hud"]);
});

test("notifyTimerFinished skips sound when cooldown is active but keeps visual notification", async () => {
  const notifyChannels: string[] = [];
  const soundCalls: string[] = [];
  const soundAttempts: unknown[] = [];
  let timestampWrites = 0;

  await notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      now: () => 10_000,
      getLastCompletionSoundAt: async () => 5_001,
      setLastCompletionSoundAt: async () => {
        timestampWrites += 1;
      },
      getSoundPreferences: async () => ({ mode: "always", maxDurationSeconds: 5 }),
      playCompletionSound: async () => {
        soundCalls.push("sound");
        return { attempted: true, attemptedAt: 10_000, mode: "always", source: "beep", played: true };
      },
      recordSoundAttempt: async (attempt) => {
        soundAttempts.push(attempt);
      },
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(soundCalls, []);
  assert.equal(timestampWrites, 0);
  assert.equal(soundAttempts.length, 1);
  assert.deepEqual(notifyChannels, ["system-notification"]);
});

test("notifyTimerFinished plays sound when cooldown boundary is reached", async () => {
  const soundCalls: Array<{ maxDurationSeconds: number | undefined }> = [];
  const soundAttempts: unknown[] = [];
  const savedTimestamps: number[] = [];

  await notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      now: () => 20_000,
      getLastCompletionSoundAt: async () => 10_000,
      setLastCompletionSoundAt: async (timestamp) => {
        savedTimestamps.push(timestamp);
      },
      getSoundPreferences: async () => ({ mode: "always", maxDurationSeconds: 5 }),
      playCompletionSound: async ({ maxDurationSeconds }) => {
        soundCalls.push({ maxDurationSeconds });
        return { attempted: true, attemptedAt: 20_000, mode: "always", source: "beep", played: true };
      },
      recordSoundAttempt: async (attempt) => {
        soundAttempts.push(attempt);
      },
      buildPlan: () => ({ channels: ["hud"] }),
      sendSystemNotification: async () => {},
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(savedTimestamps, [20_000]);
  assert.deepEqual(soundCalls, [{ maxDurationSeconds: 5 }]);
  assert.equal(soundAttempts.length, 1);
});

test("notifyTimerFinished uses failure toast when all channels fail", async () => {
  const notifyChannels: string[] = [];

  await notifyTimerFinished(
    {},
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always" }),
      playCompletionSound: async () => ({ attempted: true, attemptedAt: 1_000, mode: "always", source: "beep", played: true }),
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["hud", "system-notification", "toast"] }),
      sendSystemNotification: async () => {
        notifyChannels.push("system-notification");
        throw new Error("system notification unavailable");
      },
      showHud: async () => {
        notifyChannels.push("hud");
        throw new Error("hud unavailable");
      },
      showSuccessToast: async () => {
        notifyChannels.push("toast");
        throw new Error("toast unavailable");
      },
      showFailureToast: async () => {
        notifyChannels.push("failure-toast");
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(notifyChannels, ["hud", "system-notification", "toast", "failure-toast"]);
});

test("notifyTimerFinished deduplicates repeated completionId", async () => {
  const notifyChannels: string[] = [];
  const outboxStore = createInMemoryStore();
  let failureToastCount = 0;
  let markCompletionDecisionPendingCount = 0;

  const deps = {
    completionOutboxStore: outboxStore,
    getSoundPreferences: async () => ({ mode: "always" as const }),
    getLastCompletionSoundAt: async () => undefined,
    setLastCompletionSoundAt: async () => {},
    playCompletionSound: async () => ({ attempted: true, attemptedAt: 1000, mode: "always" as const, source: "beep" as const, played: true }),
    recordSoundAttempt: async () => {},
    buildPlan: () => ({ channels: ["system-notification"] as const }),
    sendSystemNotification: async () => {
      notifyChannels.push("system-notification");
    },
    showHud: async () => {},
    showSuccessToast: async () => {},
    showFailureToast: async () => {
      failureToastCount += 1;
    },
    recordNotifyAttempt: async () => {},
    markCompletionDecisionPending: async () => {
      markCompletionDecisionPendingCount += 1;
    },
  };

  await notifyTimerFinished({ completionId: 1234 }, deps);
  await notifyTimerFinished({ completionId: 1234 }, deps);

  assert.deepEqual(notifyChannels, ["system-notification"]);
  assert.equal(failureToastCount, 0);
  assert.equal(markCompletionDecisionPendingCount, 1);
});

test("notifyTimerFinished handles pipeline error and keeps flow alive", async () => {
  let failureToastCount = 0;

  await notifyTimerFinished(
    { completionId: 4321 },
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always" }),
      playCompletionSound: async () => ({ attempted: true, attemptedAt: 1_000, mode: "always", source: "beep", played: true }),
      recordSoundAttempt: async () => {},
      deliverCompletionEvent: async () => {
        throw new Error("pipeline exploded");
      },
      showFailureToast: async () => {
        failureToastCount += 1;
      },
      recordNotifyAttempt: async () => {},
    },
  );

  assert.equal(failureToastCount, 1);
});

test("notifyTimerFinished shows failure toast when delivery is skipped but event is not delivered", async () => {
  const store = createInMemoryStore();
  let failureToastCount = 0;
  let nowMs = 10_000;

  const deps = {
    completionOutboxStore: store,
    now: () => nowMs,
    getSoundPreferences: async () => ({ mode: "always" as const }),
    getLastCompletionSoundAt: async () => undefined,
    setLastCompletionSoundAt: async () => {},
    playCompletionSound: async () => ({ attempted: true, attemptedAt: nowMs, mode: "always" as const, source: "beep" as const, played: true }),
    recordSoundAttempt: async () => {},
    buildPlan: () => ({ channels: ["hud", "system-notification", "toast"] as const }),
    showHud: async () => {
      throw new Error("hud unavailable");
    },
    sendSystemNotification: async () => {
      throw new Error("system notification unavailable");
    },
    showSuccessToast: async () => {
      throw new Error("toast unavailable");
    },
    showFailureToast: async () => {
      failureToastCount += 1;
    },
    recordNotifyAttempt: async () => {},
  };

  await notifyTimerFinished({ completionId: 9001 }, deps);
  nowMs = 10_500;
  await notifyTimerFinished({ completionId: 9001 }, deps);

  assert.equal(failureToastCount, 2);
});

test("notifyTimerFinished uses flow-specific break-ready copy", async () => {
  const messages: Array<{ title: string; message: string }> = [];

  await notifyTimerFinished(
    { completionId: 44, pomodoroStyle: "flow" },
    {
      completionOutboxStore: createInMemoryStore(),
      getSoundPreferences: async () => ({ mode: "always" }),
      playCompletionSound: async () => ({ attempted: true, attemptedAt: 1_000, mode: "always", source: "beep", played: true }),
      recordSoundAttempt: async () => {},
      buildPlan: () => ({ channels: ["system-notification"] }),
      sendSystemNotification: async (payload) => {
        messages.push(payload);
      },
      showHud: async () => {},
      showSuccessToast: async () => {},
      recordNotifyAttempt: async () => {},
    },
  );

  assert.deepEqual(messages, [{ title: "Break is ready", message: "In flow? Extend 5 min." }]);
});

test("notifyTimerFinished retries completionId after failed delivery", async () => {
  const store = createInMemoryStore();
  let shouldFailPrimaryChannel = true;
  let systemNotificationCalls = 0;
  let nowMs = 10_000;

  const deps = {
    completionOutboxStore: store,
    now: () => nowMs,
    getSoundPreferences: async () => ({ mode: "off" as const }),
    getLastCompletionSoundAt: async () => undefined,
    setLastCompletionSoundAt: async () => {},
    playCompletionSound: async () => ({ attempted: false, mode: "off" as const, source: "none" as const }),
    recordSoundAttempt: async () => {},
    buildPlan: () => ({ channels: ["system-notification"] as const }),
    sendSystemNotification: async () => {
      systemNotificationCalls += 1;
      if (shouldFailPrimaryChannel) {
        throw new Error("system notification unavailable");
      }
    },
    showHud: async () => {},
    showSuccessToast: async () => {},
    showFailureToast: async () => {},
    recordNotifyAttempt: async () => {},
  };

  await notifyTimerFinished({ completionId: 5678 }, deps);
  nowMs = 10_500;
  await notifyTimerFinished({ completionId: 5678 }, deps);
  shouldFailPrimaryChannel = false;
  nowMs = 12_100;
  await notifyTimerFinished({ completionId: 5678 }, deps);

  assert.equal(systemNotificationCalls, 2);
});
