import { MIN_STALE_AFTER_MS, SESSION_MINUTES, WEEK_MINUTES } from "./constants";
import { clampPercent, cocoaDate } from "./format";
import { ExtraUsage, LimitWindow, ProfileUsage } from "./types";

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Per-model weekly limits, in display order. The app adds new ones as Anthropic introduces them. */
const MODEL_WINDOWS: { key: string; title: string }[] = [
  { key: "opus", title: "Opus Weekly" },
  { key: "sonnet", title: "Sonnet Weekly" },
  { key: "fable", title: "Fable Weekly" },
  { key: "design", title: "Design Weekly" },
];

function parseWindows(usage: Json): LimitWindow[] {
  const updatedAt = cocoaDate(usage.lastUpdated);
  const windows: LimitWindow[] = [];

  const sessionUsed = number(usage.sessionPercentage);
  if (sessionUsed !== undefined) {
    let resetsAt = cocoaDate(usage.sessionResetTime);
    // With no session running the app stores "last update + 5h" as a placeholder reset time.
    const placeholder =
      sessionUsed === 0 &&
      resetsAt !== undefined &&
      updatedAt !== undefined &&
      Math.abs(resetsAt.getTime() - updatedAt.getTime() - SESSION_MINUTES * 60_000) < 5_000;
    if (placeholder) resetsAt = undefined;
    windows.push({
      id: "session",
      title: "5-Hour Session",
      usedPercent: clampPercent(sessionUsed),
      resetsAt,
      windowMinutes: SESSION_MINUTES,
    });
  }

  const weeklyReset = cocoaDate(usage.weeklyResetTime);
  const weeklyUsed = number(usage.weeklyPercentage);
  if (weeklyUsed !== undefined) {
    windows.push({
      id: "weekly",
      title: "Weekly",
      usedPercent: clampPercent(weeklyUsed),
      resetsAt: weeklyReset,
      windowMinutes: WEEK_MINUTES,
    });
  }

  for (const model of MODEL_WINDOWS) {
    const used = number(usage[`${model.key}WeeklyPercentage`]);
    const ownReset = cocoaDate(usage[`${model.key}WeeklyResetTime`]);
    // Limits that do not apply to the plan are stored as 0 with no reset time of their own.
    if (used === undefined || (used <= 0 && !ownReset)) continue;
    windows.push({
      id: `${model.key}-weekly`,
      title: model.title,
      usedPercent: clampPercent(used),
      resetsAt: ownReset ?? weeklyReset,
      windowMinutes: WEEK_MINUTES,
    });
  }
  return windows;
}

function parseExtra(usage: Json): ExtraUsage | undefined {
  const limit = number(usage.costLimit);
  if (limit === undefined || limit <= 0) return undefined;
  // Amounts are stored in minor units (cents).
  return {
    used: (number(usage.costUsed) ?? 0) / 100,
    limit: limit / 100,
    currency: typeof usage.costCurrency === "string" && usage.costCurrency ? usage.costCurrency : "USD",
  };
}

/** Only the plan name is taken from the account blob; it also holds the email, which is never read. */
function parsePlan(accountJson: unknown): string | undefined {
  if (typeof accountJson !== "string") return undefined;
  try {
    const account: unknown = JSON.parse(accountJson);
    if (!isObject(account)) return undefined;
    return typeof account.planDisplayName === "string" && account.planDisplayName ? account.planDisplayName : undefined;
  } catch {
    return undefined;
  }
}

/** Maps the decoded `profiles_v3` array to what the commands display. */
export function parseProfiles(json: unknown, activeProfileId?: string): ProfileUsage[] {
  if (json === undefined) return [];
  if (!Array.isArray(json)) throw new Error("Unexpected profile data saved by Claude Usage");
  const profiles: ProfileUsage[] = [];
  json.forEach((raw: unknown, index) => {
    if (!isObject(raw) || typeof raw.id !== "string") return;
    const usage = isObject(raw.claudeUsage) ? raw.claudeUsage : undefined;
    profiles.push({
      profile: raw.id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Profile ${index + 1}`,
      plan: parsePlan(raw.oauthAccountJSON),
      active: activeProfileId ? raw.id === activeProfileId : raw.isSelectedForDisplay === true,
      windows: usage ? parseWindows(usage) : [],
      extra: usage ? parseExtra(usage) : undefined,
      updatedAt: usage ? cocoaDate(usage.lastUpdated) : undefined,
      refreshInterval: number(raw.refreshInterval),
    });
  });
  // The active profile first, the rest in the app's own order.
  return [...profiles.filter((p) => p.active), ...profiles.filter((p) => !p.active)];
}

export class NoUsageDataError extends Error {
  constructor(readonly appInstalled: boolean) {
    super(appInstalled ? "Claude Usage has not saved any usage yet" : "Claude Usage is not installed");
    this.name = "NoUsageDataError";
  }
}

/** Data exists whenever a profile was read; without any, say whether the app is missing altogether. */
export function requireProfiles(profiles: ProfileUsage[], appInstalled: boolean): ProfileUsage[] {
  if (profiles.length === 0) throw new NoUsageDataError(appInstalled);
  return profiles;
}

/**
 * The app rewrites its reading on every refresh, so an old one means it is not running
 * (or cannot reach Claude) and the numbers on screen may no longer be true.
 */
export function isStale(usage: ProfileUsage, now: Date = new Date()): boolean {
  if (!usage.updatedAt) return usage.windows.length > 0;
  const staleAfter = Math.max(MIN_STALE_AFTER_MS, (usage.refreshInterval ?? 0) * 3 * 1000);
  return now.getTime() - usage.updatedAt.getTime() > staleAfter;
}

export function staleProfiles(usage: ProfileUsage[], now: Date = new Date()): ProfileUsage[] {
  return usage.filter((entry) => isStale(entry, now));
}

/** The window closest to running out, used for one-line summaries. */
export function tightestWindow(usage: ProfileUsage): LimitWindow | undefined {
  return usage.windows.reduce<LimitWindow | undefined>(
    (worst, window) => (!worst || window.usedPercent > worst.usedPercent ? window : worst),
    undefined,
  );
}
