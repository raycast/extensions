import type { LaunchType } from "@raycast/api";
import { deliverCompletionEvent as deliverCompletionEventViaPipeline } from "./completion-pipeline.ts";
import { getCompletionEvent } from "./completion-outbox.ts";
import type { CompletionOutboxStore } from "./completion-outbox.ts";
import { getLastCompletionSoundAt, isCompletionSoundCooldownActive, setLastCompletionSoundAt } from "./sound-cooldown.ts";
import { playCompletionSound, type CompletionSoundResult } from "./sound-player.ts";
import { markCompletionDecisionPending } from "./completion-decision.ts";
import { getSystemSoundById } from "./sound-settings.ts";
import { shouldPlaySound, type SoundMode } from "./sound-policy.ts";
import { sendMacOSNotification } from "./system-notifications.ts";
import { buildTimerFinishedNotificationPlan } from "./timer-notification-policy.ts";
import { recordNotifyAttempt, recordSoundAttempt, type SoundAttemptDiagnostics } from "./dynamic-pomodoro-watchdog-diagnostics.ts";
import { type PomodoroStyle } from "./timer-state.ts";

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

type NotifyTimerFinishedOptions = {
  launchType?: LaunchType;
  completionId?: number;
  pomodoroStyle?: PomodoroStyle;
};

const COMPLETION_SOUND_COOLDOWN_MS = 10_000;
const COMPLETION_SOUND_DEFAULT_MAX_SECONDS = 5;
const COMPLETION_SOUND_MIN_SECONDS = 1;
const COMPLETION_SOUND_MAX_SECONDS = 15;

type SoundPreferences = {
  mode: SoundMode;
  customPath?: string;
  maxDurationSeconds: number;
};

type NotifyTimerFinishedDeps = {
  completionOutboxStore?: CompletionOutboxStore;
  now: () => number;
  getLastCompletionSoundAt: () => Promise<number | undefined>;
  setLastCompletionSoundAt: (timestamp: number) => Promise<void>;
  getSoundPreferences: () => Promise<SoundPreferences>;
  playCompletionSound: (options: {
    mode: SoundMode;
    launchType: LaunchType | string | undefined;
    customPath?: string;
    maxDurationSeconds?: number;
  }) => Promise<CompletionSoundResult>;
  recordSoundAttempt: (attempt: SoundAttemptDiagnostics) => Promise<void>;
  buildPlan: typeof buildTimerFinishedNotificationPlan;
  sendSystemNotification: typeof sendMacOSNotification;
  showHud: (title: string) => Promise<void>;
  showSuccessToast: (params: { title: string; message: string }) => Promise<void>;
  showFailureToast: (params: { title: string; message: string }) => Promise<void>;
  recordNotifyAttempt: (params: { launchType: LaunchType | string | undefined; channel: string; error?: unknown }) => Promise<void>;
  deliverCompletionEvent: typeof deliverCompletionEventViaPipeline;
  markCompletionDecisionPending: () => Promise<void>;
  getCompletionEvent: typeof getCompletionEvent;
};

const defaultDeps: NotifyTimerFinishedDeps = {
  now: () => Date.now(),
  getLastCompletionSoundAt,
  setLastCompletionSoundAt,
  getSoundPreferences: async () => getSoundPreferences(),
  playCompletionSound,
  recordSoundAttempt,
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
  showFailureToast: async ({ title, message }) => {
    const raycastApi = require("@raycast/api");
    await raycastApi.showToast({
      style: raycastApi.Toast.Style.Failure,
      title,
      message,
    });
  },
  recordNotifyAttempt: async ({ launchType, channel, error }) => {
    await recordNotifyAttempt({
      launchType: launchType as LaunchType | undefined,
      channel,
      error,
    });
  },
  deliverCompletionEvent: deliverCompletionEventViaPipeline,
  markCompletionDecisionPending,
  getCompletionEvent,
};

function normalizeMaxDurationSeconds(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return COMPLETION_SOUND_DEFAULT_MAX_SECONDS;
  }

  const rounded = Math.round(parsed);
  return Math.min(COMPLETION_SOUND_MAX_SECONDS, Math.max(COMPLETION_SOUND_MIN_SECONDS, rounded));
}

function getSoundPreferences(): SoundPreferences {
  const raycastApi = require("@raycast/api");
  const preferences = raycastApi.getPreferenceValues<Preferences>();
  const selectedSystemSound = getSystemSoundById(preferences.completionSoundId);

  return {
    mode: "always",
    customPath: selectedSystemSound?.path,
    maxDurationSeconds: normalizeMaxDurationSeconds(preferences.completionSoundMaxSeconds),
  };
}

function shouldWaitForSoundTask(launchType: LaunchType | string | undefined): boolean {
  return String(launchType) === "background";
}

function getBreakReadyCopy(style: PomodoroStyle | undefined): { title: string; message: string } {
  if (style === "flow") {
    return {
      title: "Break is ready",
      message: "In flow? Extend 5 min.",
    };
  }
  return {
    title: "Break is ready",
    message: "Continue with selected preset.",
  };
}

export async function notifyTimerFinished(
  { launchType, completionId, pomodoroStyle }: NotifyTimerFinishedOptions = {},
  deps: Partial<NotifyTimerFinishedDeps> = {},
): Promise<void> {
  const mergedDeps: NotifyTimerFinishedDeps = {
    ...defaultDeps,
    ...deps,
  };
  const soundPreferences = await mergedDeps.getSoundPreferences();
  const now = mergedDeps.now();
  const lastCompletionSoundAt = await mergedDeps.getLastCompletionSoundAt();
  const isCooldownActive = isCompletionSoundCooldownActive({
    now,
    lastPlayedAt: lastCompletionSoundAt,
    cooldownMs: COMPLETION_SOUND_COOLDOWN_MS,
  });
  const willAttemptSound = shouldPlaySound({ soundMode: soundPreferences.mode, launchType });
  const waitForSoundTask = shouldWaitForSoundTask(launchType);
  const effectiveCompletionId = completionId ?? now;
  const breakReadyCopy = getBreakReadyCopy(pomodoroStyle);

  const soundTask = (async () => {
    if (isCooldownActive && willAttemptSound) {
      await mergedDeps.recordSoundAttempt({
        attempted: false,
        mode: soundPreferences.mode,
        source: "none",
      });
      return;
    }

    try {
      const soundResult = await mergedDeps.playCompletionSound({
        mode: soundPreferences.mode,
        launchType,
        customPath: soundPreferences.customPath,
        maxDurationSeconds: soundPreferences.maxDurationSeconds,
      });

      if (soundResult.played) {
        await mergedDeps.setLastCompletionSoundAt(soundResult.attemptedAt ?? now);
      }

      await mergedDeps.recordSoundAttempt(soundResult);
    } catch (error) {
      const attempted = willAttemptSound;
      await mergedDeps.recordSoundAttempt({
        attempted,
        attemptedAt: attempted ? mergedDeps.now() : undefined,
        mode: soundPreferences.mode,
        source: attempted ? "beep" : "none",
        error: String(error),
      });
    }
  })();
  let deliveryStatus: "delivered" | "failed" | "skipped" = "skipped";
  try {
    const deliveryResult = await mergedDeps.deliverCompletionEvent(
      {
        completionId: effectiveCompletionId,
        launchType,
        notificationTitle: breakReadyCopy.title,
        notificationMessage: breakReadyCopy.message,
      },
      {
        store: mergedDeps.completionOutboxStore,
        now: mergedDeps.now,
        buildPlan: mergedDeps.buildPlan,
        sendSystemNotification: mergedDeps.sendSystemNotification,
        showHud: mergedDeps.showHud,
        showSuccessToast: mergedDeps.showSuccessToast,
        recordNotifyAttempt: mergedDeps.recordNotifyAttempt,
      },
    );
    deliveryStatus = deliveryResult.status;
    if (deliveryStatus === "delivered") {
      await mergedDeps.markCompletionDecisionPending();
    }
  } catch (error) {
    await mergedDeps.recordNotifyAttempt({ launchType, channel: "pipeline", error });
    deliveryStatus = "failed";
  }

  if (deliveryStatus === "failed") {
    try {
      await mergedDeps.showFailureToast({
        title: "Couldn't show timer completion notification",
        message: "All notification channels failed.",
      });
    } catch {
      // Best-effort final fallback.
    }
  }

  if (deliveryStatus === "skipped") {
    const completionEvent = await mergedDeps.getCompletionEvent(effectiveCompletionId, {
      store: mergedDeps.completionOutboxStore,
      now: mergedDeps.now,
    });
    const alreadyDelivered = completionEvent?.status === "delivered";
    if (!alreadyDelivered) {
      try {
        await mergedDeps.showFailureToast({
          title: "Couldn't show timer completion notification",
          message: "Notification delivery is waiting for retry.",
        });
      } catch {
        // Best-effort final fallback.
      }
    }
  }

  if (waitForSoundTask) {
    await soundTask;
    return;
  }

  void soundTask;
}
