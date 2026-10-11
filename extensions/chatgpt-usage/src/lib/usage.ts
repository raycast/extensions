export const dashboardUrl = "https://chatgpt.com/settings/usage?tab=overview";

export type DisplayMode = "both" | "five-hour" | "weekly" | "icon";

export interface UsageWindow {
  id: string;
  label: string;
  shortLabel: string;
  usedPercent: number;
  remainingPercent: number;
  durationMinutes: number | null;
  resetsAt: number | null;
}

export interface UsageSnapshot {
  windows: UsageWindow[];
  planType: string | null;
  fetchedAt: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function windowLabels(minutes: number | null, id: string): [string, string] {
  if (minutes === 300) return ["5-hour limit", "5h"];
  if (minutes === 10080) return ["Weekly limit", "W"];
  if (minutes !== null) {
    if (minutes % 1440 === 0) return [`${minutes / 1440}-day limit`, `${minutes / 1440}d`];
    if (minutes % 60 === 0) return [`${minutes / 60}-hour limit`, `${minutes / 60}h`];
    return [`${minutes}-minute limit`, `${minutes}m`];
  }
  return id === "primary" ? ["Primary limit", "P"] : ["Secondary limit", "S"];
}

export function parseUsage(payload: unknown, planType: string | null, fetchedAt = Date.now()): UsageSnapshot {
  if (!isRecord(payload)) throw new Error("Codex returned an invalid usage response. Try updating Codex.");

  const buckets = payload.rateLimitsByLimitId;
  const bucket = isRecord(buckets) && isRecord(buckets.codex) ? buckets.codex : payload.rateLimits;
  if (!isRecord(bucket)) throw new Error("Shared plan usage is unavailable for this account.");

  const windows: UsageWindow[] = [];
  for (const id of ["primary", "secondary"]) {
    const window = bucket[id];
    if (window === null || window === undefined) continue;
    if (!isRecord(window) || !finiteNumber(window.usedPercent)) {
      throw new Error("Codex returned an invalid quota window. Try updating Codex.");
    }
    const durationMinutes =
      finiteNumber(window.windowDurationMins) && window.windowDurationMins > 0 ? window.windowDurationMins : null;
    const usedPercent = Math.min(100, Math.max(0, window.usedPercent));
    const [label, shortLabel] = windowLabels(durationMinutes, id);
    windows.push({
      id,
      label,
      shortLabel,
      usedPercent,
      remainingPercent: Math.round(100 - usedPercent),
      durationMinutes,
      resetsAt: finiteNumber(window.resetsAt) && window.resetsAt > 0 ? window.resetsAt : null,
    });
  }

  return { windows, planType: typeof bucket.planType === "string" ? bucket.planType : planType, fetchedAt };
}

export function resetPassed(window: UsageWindow, now = Date.now()): boolean {
  return window.resetsAt !== null && window.resetsAt * 1000 <= now;
}

export function formatReset(resetsAt: number | null, now = Date.now()): string {
  if (resetsAt === null) return "Reset time unavailable";
  const minutes = Math.ceil((resetsAt * 1000 - now) / 60000);
  if (minutes <= 0) return "Reset passed · refresh to confirm";
  if (minutes < 60) return `Resets in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Resets in ${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  const days = Math.floor(hours / 24);
  return `Resets in ${days}d${hours % 24 ? ` ${hours % 24}h` : ""}`;
}

export function formatUpdated(fetchedAt: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - fetchedAt) / 60000));
  if (minutes === 0) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  if (minutes < 1440) return `Updated ${Math.floor(minutes / 60)}h ago`;
  return `Updated ${Math.floor(minutes / 1440)}d ago`;
}

export function formatProgressBar(remainingPercent: number, segments = 10): string {
  const filled = Math.round((remainingPercent / 100) * segments);
  return `${"▰".repeat(filled)}${"▱".repeat(segments - filled)}`;
}

export function menuBarTitle(snapshot: UsageSnapshot | undefined, mode: DisplayMode, stale = false, now = Date.now()) {
  if (mode === "icon") return undefined;
  if (!snapshot) return stale ? "Usage unavailable" : "Usage…";
  const windows = snapshot.windows.filter((window) => {
    if (mode === "five-hour") return window.durationMinutes === 300;
    if (mode === "weekly") return window.durationMinutes === 10080;
    return true;
  });
  if (windows.length === 0) return stale ? "Usage !" : "Usage —";
  const title = windows
    .map((window) => `${window.shortLabel} ${resetPassed(window, now) ? "—" : `${window.remainingPercent}%`}`)
    .join(" · ");
  return stale ? `${title} !` : title;
}
