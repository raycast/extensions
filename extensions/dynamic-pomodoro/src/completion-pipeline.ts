import type { LaunchType } from "@raycast/api";
import {
  isLockOwner,
  lockEventForDelivery,
  markEventDelivered,
  markEventFailed,
  upsertPendingEvent,
  type CompletionOutboxStore,
} from "./completion-outbox.ts";
import { buildTimerFinishedNotificationPlan } from "./timer-notification-policy.ts";
import { sendMacOSNotification } from "./system-notifications.ts";

type DeliverCompletionInput = {
  completionId: number;
  launchType?: LaunchType | string;
  notificationTitle?: string;
  notificationMessage?: string;
};

type DeliverCompletionDeps = {
  store?: CompletionOutboxStore;
  now?: () => number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  buildPlan?: typeof buildTimerFinishedNotificationPlan;
  sendSystemNotification?: typeof sendMacOSNotification;
  showHud?: (title: string) => Promise<void>;
  showSuccessToast?: (params: { title: string; message: string }) => Promise<void>;
  recordNotifyAttempt?: (params: { launchType: LaunchType | string | undefined; channel: string; error?: unknown }) => Promise<void>;
};

type DeliverCompletionResult = {
  status: "delivered" | "failed" | "skipped";
};

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

const USER_INITIATED_LAUNCH_TYPE = "user-initiated";

const defaultDeps: Required<
  Pick<DeliverCompletionDeps, "buildPlan" | "sendSystemNotification" | "showHud" | "showSuccessToast" | "recordNotifyAttempt">
> = {
  buildPlan: buildTimerFinishedNotificationPlan,
  sendSystemNotification: sendMacOSNotification,
  showHud: async (title) => {
    const raycastApi = require("@raycast/api");
    await raycastApi.showHUD(title);
  },
  showSuccessToast: async ({ title, message }) => {
    const raycastApi = require("@raycast/api");
    await raycastApi.showToast({
      style: raycastApi.Toast.Style.Success,
      title,
      message,
    });
  },
  recordNotifyAttempt: async () => {},
};

export async function deliverCompletionEvent(
  input: DeliverCompletionInput,
  deps: DeliverCompletionDeps = {},
): Promise<DeliverCompletionResult> {
  const mergedDeps = {
    ...defaultDeps,
    ...deps,
  };

  await upsertPendingEvent(
    { completionId: input.completionId, launchType: input.launchType ? String(input.launchType) : undefined },
    { store: deps.store, now: deps.now },
  );

  const lockedEvent = await lockEventForDelivery(input.completionId, { store: deps.store, now: deps.now });
  if (!lockedEvent) {
    return { status: "skipped" };
  }
  if (lockedEvent.status === "delivered") {
    return { status: "skipped" };
  }
  if (!(await isLockOwner(input.completionId, lockedEvent.lockId, { store: deps.store, now: deps.now }))) {
    return { status: "skipped" };
  }

  const plan = mergedDeps.buildPlan({
    isUserInitiatedLaunch: String(input.launchType) === USER_INITIATED_LAUNCH_TYPE,
  });
  const title = input.notificationTitle ?? "Timer finished";
  const message = input.notificationMessage ?? "Time is up.";

  for (const channel of plan.channels) {
    try {
      if (channel === "hud") {
        await mergedDeps.showHud(title);
      } else if (channel === "system-notification") {
        await mergedDeps.sendSystemNotification({ title, message });
      } else {
        await mergedDeps.showSuccessToast({ title, message });
      }

      await mergedDeps.recordNotifyAttempt({
        launchType: input.launchType,
        channel,
      });
      await markEventDelivered(input.completionId, { store: deps.store, now: deps.now, expectedLockId: lockedEvent.lockId });
      return { status: "delivered" };
    } catch (error) {
      await mergedDeps.recordNotifyAttempt({
        launchType: input.launchType,
        channel,
        error,
      });
    }
  }

  await markEventFailed(input.completionId, {
    store: deps.store,
    now: deps.now,
    baseDelayMs: deps.retryBaseDelayMs,
    maxDelayMs: deps.retryMaxDelayMs,
    error: "all notification channels failed",
    expectedLockId: lockedEvent.lockId,
  });
  return { status: "failed" };
}
