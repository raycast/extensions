import type { LaunchType } from "@raycast/api";
import type { CompletionSoundSource } from "./sound-player.ts";
import type { SoundMode } from "./sound-policy.ts";

const DIAGNOSTICS_KEY = "dynamic-pomodoro-watchdog-diagnostics-v1";
const DIAGNOSTICS_EVENTS_KEY = "dynamic-pomodoro-watchdog-diagnostics-events-v1";
const MAX_DIAGNOSTICS_EVENTS = 100;

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

export type WatchdogDiagnostics = {
  lastArmAttemptAt?: number;
  lastArmLaunchType?: string;
  lastArmError?: string;
  lastRunAt?: number;
  lastRunLaunchType?: string;
  lastNotifyAttemptAt?: number;
  lastNotifyLaunchType?: string;
  lastNotifyChannel?: string;
  lastNotifyError?: string;
  lastNotifyFailureAt?: number;
  lastNotifyFailureChannel?: string;
  lastNotifyFailureError?: string;
  lastSoundAttemptAt?: number;
  lastSoundMode?: SoundMode;
  lastSoundSource?: CompletionSoundSource;
  lastSoundError?: string;
};

export type DiagnosticsTimelineEvent = {
  eventType: string;
  timestamp: number;
  status: "ok" | "error";
  detail?: string;
};

export type SoundAttemptDiagnostics = {
  attempted: boolean;
  attemptedAt?: number;
  mode: SoundMode;
  source: CompletionSoundSource;
  error?: string;
};

function normalizeDiagnostics(value: unknown): WatchdogDiagnostics {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return value as WatchdogDiagnostics;
}

function normalizeTimelineEvents(value: unknown): DiagnosticsTimelineEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const timestamp = Number(item.timestamp);
      const status = item.status === "error" ? "error" : "ok";
      const eventType = typeof item.eventType === "string" ? item.eventType : "unknown";
      const detail = typeof item.detail === "string" ? item.detail : undefined;

      return {
        eventType,
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
        status,
        detail,
      } satisfies DiagnosticsTimelineEvent;
    })
    .slice(0, MAX_DIAGNOSTICS_EVENTS);
}

export async function readWatchdogDiagnostics(): Promise<{ diagnostics: WatchdogDiagnostics; readable: boolean }> {
  try {
    const { LocalStorage } = require("@raycast/api");
    const raw = await LocalStorage.getItem<string>(DIAGNOSTICS_KEY);
    if (!raw) {
      return { diagnostics: {}, readable: true };
    }

    const parsed = JSON.parse(raw);
    return { diagnostics: normalizeDiagnostics(parsed), readable: true };
  } catch {
    return { diagnostics: {}, readable: false };
  }
}

export async function getWatchdogDiagnostics(): Promise<WatchdogDiagnostics> {
  const result = await readWatchdogDiagnostics();
  return result.diagnostics;
}

async function writeDiagnostics(value: WatchdogDiagnostics): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(value));
  } catch {
    // Diagnostics must never break timer flow.
  }
}

async function readTimelineEvents(): Promise<{ events: DiagnosticsTimelineEvent[]; readable: boolean }> {
  try {
    const { LocalStorage } = require("@raycast/api");
    const raw = await LocalStorage.getItem<string>(DIAGNOSTICS_EVENTS_KEY);
    if (!raw) {
      return { events: [], readable: true };
    }

    const parsed = JSON.parse(raw);
    return { events: normalizeTimelineEvents(parsed), readable: true };
  } catch {
    return { events: [], readable: false };
  }
}

async function writeTimelineEvents(events: DiagnosticsTimelineEvent[]): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.setItem(DIAGNOSTICS_EVENTS_KEY, JSON.stringify(events));
  } catch {
    // Diagnostics must never break timer flow.
  }
}

async function recordTimelineEvent(event: DiagnosticsTimelineEvent): Promise<void> {
  try {
    const previous = await readTimelineEvents();
    const next = [event, ...previous.events].slice(0, MAX_DIAGNOSTICS_EVENTS);
    await writeTimelineEvents(next);
  } catch {
    // Diagnostics must never break timer flow.
  }
}

export async function readDiagnosticsTimeline(limit = 20): Promise<{ events: DiagnosticsTimelineEvent[]; readable: boolean }> {
  const result = await readTimelineEvents();
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.round(limit), MAX_DIAGNOSTICS_EVENTS) : 20;
  return {
    events: result.events.slice(0, safeLimit),
    readable: result.readable,
  };
}

export async function getDiagnosticsTimeline(limit = 20): Promise<DiagnosticsTimelineEvent[]> {
  const result = await readDiagnosticsTimeline(limit);
  return result.events;
}

export async function recordWatchdogArmAttempt({
  launchType,
  error,
}: {
  launchType: LaunchType;
  error?: unknown;
}): Promise<void> {
  try {
    const now = Date.now();
    const previous = await getWatchdogDiagnostics();
    await writeDiagnostics({
      ...previous,
      lastArmAttemptAt: now,
      lastArmLaunchType: String(launchType),
      lastArmError: error ? String(error) : undefined,
    });
    await recordTimelineEvent({
      eventType: "watchdog-arm",
      timestamp: now,
      status: error ? "error" : "ok",
      detail: error ? String(error) : undefined,
    });
  } catch {
    // Diagnostics must never break timer flow.
  }
}

export async function recordWatchdogRun(launchType: LaunchType | undefined): Promise<void> {
  try {
    const now = Date.now();
    const previous = await getWatchdogDiagnostics();
    await writeDiagnostics({
      ...previous,
      lastRunAt: now,
      lastRunLaunchType: launchType ? String(launchType) : undefined,
    });
    await recordTimelineEvent({
      eventType: "watchdog-run",
      timestamp: now,
      status: "ok",
      detail: launchType ? String(launchType) : undefined,
    });
  } catch {
    // Diagnostics must never break timer flow.
  }
}

export async function recordNotifyAttempt({
  launchType,
  channel,
  error,
}: {
  launchType: LaunchType | undefined;
  channel: string;
  error?: unknown;
}): Promise<void> {
  try {
    const now = Date.now();
    const previous = await getWatchdogDiagnostics();
    const next: WatchdogDiagnostics = {
      ...previous,
      lastNotifyAttemptAt: now,
      lastNotifyLaunchType: launchType ? String(launchType) : undefined,
      lastNotifyChannel: channel,
      lastNotifyError: error ? String(error) : undefined,
    };

    if (error) {
      next.lastNotifyFailureAt = now;
      next.lastNotifyFailureChannel = channel;
      next.lastNotifyFailureError = String(error);
    }

    await writeDiagnostics({
      ...next,
    });
    await recordTimelineEvent({
      eventType: "notify",
      timestamp: now,
      status: error ? "error" : "ok",
      detail: error ? String(error) : channel,
    });
  } catch {
    // Diagnostics must never break timer flow.
  }
}

export async function recordRetryDrainAttempt({
  launchType,
  completionId,
  error,
}: {
  launchType: LaunchType | undefined;
  completionId: number;
  error?: unknown;
}): Promise<void> {
  const suffix = Number.isFinite(completionId) ? String(completionId) : "unknown";
  await recordNotifyAttempt({
    launchType,
    channel: `outbox-retry:${suffix}`,
    error,
  });
}

export function applySoundAttemptToDiagnostics(
  previous: WatchdogDiagnostics,
  attempt: SoundAttemptDiagnostics,
): WatchdogDiagnostics {
  return {
    ...previous,
    lastSoundAttemptAt: attempt.attempted ? attempt.attemptedAt : undefined,
    lastSoundMode: attempt.mode,
    lastSoundSource: attempt.source,
    lastSoundError: attempt.error,
  };
}

export async function recordSoundAttempt(attempt: SoundAttemptDiagnostics): Promise<void> {
  try {
    const previous = await getWatchdogDiagnostics();
    await writeDiagnostics(applySoundAttemptToDiagnostics(previous, attempt));
    await recordTimelineEvent({
      eventType: "sound",
      timestamp: attempt.attemptedAt ?? Date.now(),
      status: attempt.error ? "error" : "ok",
      detail: attempt.error ?? `${attempt.mode}:${attempt.source}`,
    });
  } catch {
    // Diagnostics must never break timer flow.
  }
}
