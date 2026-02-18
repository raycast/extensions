import type { WatchdogDiagnostics } from "./dynamic-pomodoro-watchdog-diagnostics.ts";

const WATCHDOG_ERROR_MAX_LENGTH = 240;
const TIMELINE_LIMIT = 20;
const SOUND_COOLDOWN_MS = 10_000;

export type DiagnosticsPrivacyMode = "safe" | "full";

export type DiagnosticsEvent = {
  eventType: string;
  relativeTime: string;
  status: "ok" | "error";
  detail?: string;
};

export type DiagnosticsMeta = {
  reportVersion: "2";
  generatedAtRelative: string;
  appVersion: string;
  commandContext: {
    commandName: string;
    launchType: string;
  };
  metaPartial: boolean;
  privacyMode: DiagnosticsPrivacyMode;
};

export type DiagnosticsTimerSnapshot = {
  isRunning: boolean;
  minutes: number;
  remainingMs: number;
  isFinished: boolean;
  needsCompletionDecision: boolean;
  selectedPreset: number | null;
};

type DiagnosticsWatchdog = {
  arm: {
    at: string;
    type: string;
    error: string;
  };
  run: {
    at: string;
    type: string;
  };
  notify: {
    at: string;
    type: string;
    channel: string;
    error: string;
    failureChannel: string;
    failureError: string;
  };
  sound: {
    at: string;
    mode: string;
    source: string;
    error: string;
  };
};

type DiagnosticsIntegrity = {
  storageReadable: boolean;
  diagnosticsReadable: boolean;
  notificationAvailable: boolean;
  soundConfigured: boolean;
  cooldownActiveAtLastAttempt: boolean;
};

type DiagnosticsReproductionTemplate = {
  steps: string;
  expected: string;
  actual: string;
  frequency: string;
};

export type DiagnosticsReportV2 = {
  meta: DiagnosticsMeta;
  timerSnapshot: DiagnosticsTimerSnapshot;
  watchdog: DiagnosticsWatchdog;
  timeline: DiagnosticsEvent[];
  integrity: DiagnosticsIntegrity;
  reproduction: DiagnosticsReproductionTemplate;
};

type DiagnosticsBuildInput = {
  now: number;
  appVersion: string;
  commandName: string;
  launchType: string | undefined;
  timerSnapshot: DiagnosticsTimerSnapshot;
  watchdogDiagnostics: WatchdogDiagnostics;
  timeline: DiagnosticsEvent[];
  integrity: DiagnosticsIntegrity;
  reproductionTemplate: DiagnosticsReproductionTemplate;
};

type BuildOptions = {
  privacyMode: DiagnosticsPrivacyMode;
  includeTimeline: boolean;
};

export function sanitizeDiagnosticsText(value: string, privacyMode: DiagnosticsPrivacyMode): string {
  const normalized = String(value);
  if (privacyMode === "full") {
    return normalized.slice(0, WATCHDOG_ERROR_MAX_LENGTH);
  }

  return normalized
    .replace(/\/Users\/[^\s/:]+/g, "/Users/[user]")
    .replace(/(?:\/Users\/[^\s]+|\/var\/folders\/[^\s]+|\/home\/[^\s]+|[A-Za-z]:\\[^\s]+)/g, "[path]")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, "[host]")
    .slice(0, WATCHDOG_ERROR_MAX_LENGTH);
}

function toRelativeTime(timestamp: number | undefined, now: number): string {
  if (!Number.isFinite(timestamp)) {
    return "never";
  }

  const deltaMs = Math.max(0, now - Number(timestamp));
  if (deltaMs < 5_000) {
    return "just now";
  }
  const seconds = Math.floor(deltaMs / 1_000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeText(value: string | undefined, fallback: string, privacyMode: DiagnosticsPrivacyMode): string {
  if (!value) {
    return fallback;
  }
  return sanitizeDiagnosticsText(value, privacyMode) || fallback;
}

export function buildDiagnosticsPayloadV2(input: DiagnosticsBuildInput, options: BuildOptions): DiagnosticsReportV2 {
  const d = input.watchdogDiagnostics;
  const timeline = options.includeTimeline
    ? input.timeline.slice(0, TIMELINE_LIMIT).map((event) => ({
        ...event,
        detail: event.detail ? sanitizeDiagnosticsText(event.detail, options.privacyMode) : undefined,
      }))
    : [];

  return {
    meta: {
      reportVersion: "2",
      generatedAtRelative: "just now",
      appVersion: input.appVersion || "unknown",
      commandContext: {
        commandName: input.commandName,
        launchType: input.launchType ?? "unknown",
      },
      metaPartial: !Boolean(input.appVersion),
      privacyMode: options.privacyMode,
    },
    timerSnapshot: input.timerSnapshot,
    watchdog: {
      arm: {
        at: toRelativeTime(d.lastArmAttemptAt, input.now),
        type: d.lastArmLaunchType ?? "n/a",
        error: normalizeText(d.lastArmError, "none", options.privacyMode),
      },
      run: {
        at: toRelativeTime(d.lastRunAt, input.now),
        type: d.lastRunLaunchType ?? "n/a",
      },
      notify: {
        at: toRelativeTime(d.lastNotifyAttemptAt, input.now),
        type: d.lastNotifyLaunchType ?? "n/a",
        channel: d.lastNotifyChannel ?? "n/a",
        error: normalizeText(d.lastNotifyError, "none", options.privacyMode),
        failureChannel: d.lastNotifyFailureChannel ?? "n/a",
        failureError: normalizeText(d.lastNotifyFailureError, "none", options.privacyMode),
      },
      sound: {
        at: toRelativeTime(d.lastSoundAttemptAt, input.now),
        mode: d.lastSoundMode ?? "n/a",
        source: d.lastSoundSource ?? "n/a",
        error: normalizeText(d.lastSoundError, "none", options.privacyMode),
      },
    },
    timeline,
    integrity: {
      ...input.integrity,
      cooldownActiveAtLastAttempt:
        input.integrity.cooldownActiveAtLastAttempt ||
        (!!d.lastSoundAttemptAt && input.now - d.lastSoundAttemptAt < SOUND_COOLDOWN_MS),
    },
    reproduction: input.reproductionTemplate,
  };
}

export function buildDiagnosticsChatSummary(payload: DiagnosticsReportV2): string {
  const timelineBlock = payload.timeline.length
    ? payload.timeline.map((event) => `- ${event.relativeTime} • ${event.eventType} • ${event.status}${event.detail ? ` • ${event.detail}` : ""}`).join("\n")
    : "- none";

  return [
    "[Dynamic Pomodoro Diagnostics v2]",
    `Meta: app=${payload.meta.appVersion} command=${payload.meta.commandContext.commandName} launch=${payload.meta.commandContext.launchType} mode=${payload.meta.privacyMode}`,
    `Timer: running=${payload.timerSnapshot.isRunning} minutes=${payload.timerSnapshot.minutes} remainingMs=${payload.timerSnapshot.remainingMs} finished=${payload.timerSnapshot.isFinished} needsDecision=${payload.timerSnapshot.needsCompletionDecision}`,
    `Watchdog: arm=${payload.watchdog.arm.at}/${payload.watchdog.arm.type} run=${payload.watchdog.run.at}/${payload.watchdog.run.type}`,
    `Notify: at=${payload.watchdog.notify.at} channel=${payload.watchdog.notify.channel} error=${payload.watchdog.notify.error}`,
    `Sound: at=${payload.watchdog.sound.at} mode=${payload.watchdog.sound.mode} source=${payload.watchdog.sound.source} error=${payload.watchdog.sound.error}`,
    `Integrity: storageReadable=${payload.integrity.storageReadable} diagnosticsReadable=${payload.integrity.diagnosticsReadable} notificationAvailable=${payload.integrity.notificationAvailable} soundConfigured=${payload.integrity.soundConfigured} cooldownActive=${payload.integrity.cooldownActiveAtLastAttempt}`,
    "Timeline:",
    timelineBlock,
    "Reproduction:",
    payload.reproduction.steps,
    payload.reproduction.expected,
    payload.reproduction.actual,
    payload.reproduction.frequency,
  ].join("\n");
}

export function buildDiagnosticsIssueTemplate(payload: DiagnosticsReportV2): string {
  const summary = buildDiagnosticsChatSummary(payload);
  return [
    "## Summary",
    summary,
    "",
    "## Reproduction",
    payload.reproduction.steps,
    payload.reproduction.expected,
    payload.reproduction.actual,
    payload.reproduction.frequency,
    "",
    "## Diagnostics JSON",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}
