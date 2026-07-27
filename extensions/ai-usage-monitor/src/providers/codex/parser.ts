import { UsageWindow, WindowKind } from "../../core/models";
import { sortWindows } from "../claude/parser";

interface RateWindow {
  used_percent?: number;
  limit_window_seconds?: number;
  reset_after_seconds?: number;
  reset_at?: number;
}

interface RateLimit {
  primary_window?: RateWindow | null;
  secondary_window?: RateWindow | null;
}

interface AdditionalRateLimit {
  limit_name?: string;
  metered_feature?: string;
  rate_limit?: RateLimit | null;
}

export interface CodexUsageResponse {
  plan_type?: string;
  rate_limit?: RateLimit | null;
  additional_rate_limits?: AdditionalRateLimit[] | null;
}

/** A day. Anything at or above this is a "weekly"-style window, below it a session window. */
const WEEKLY_THRESHOLD_SECONDS = 86_400;

function clampPercent(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

/**
 * `reset_at` is unix *seconds* here, unlike Claude's ISO-8601 strings.
 * `reset_after_seconds` is used as a fallback when the absolute stamp is absent.
 */
function resolveReset(window: RateWindow, now: Date): Date | null {
  if (typeof window.reset_at === "number" && Number.isFinite(window.reset_at)) {
    return new Date(window.reset_at * 1000);
  }
  if (typeof window.reset_after_seconds === "number" && Number.isFinite(window.reset_after_seconds)) {
    return new Date(now.getTime() + window.reset_after_seconds * 1000);
  }
  return null;
}

function classify(window: RateWindow): { kind: WindowKind; label: string } {
  const seconds = window.limit_window_seconds;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return { kind: "session", label: "Session" };
  }
  return seconds >= WEEKLY_THRESHOLD_SECONDS
    ? { kind: "weekly", label: "Weekly" }
    : { kind: "session", label: "Session" };
}

export function parseCodexUsage(response: CodexUsageResponse, now: Date = new Date()): UsageWindow[] {
  const windows: UsageWindow[] = [];

  // Position is not meaningful: `primary_window` is weekly on some plans and
  // 5-hourly on others, so each window is classified by its own duration.
  for (const raw of [response.rate_limit?.primary_window, response.rate_limit?.secondary_window]) {
    if (!raw) continue;
    const percent = clampPercent(raw.used_percent);
    if (percent === null) continue;

    const { kind, label } = classify(raw);
    // Two windows of the same class would collide on id; keep the first.
    if (windows.some((existing) => existing.id === kind)) continue;

    windows.push({ id: kind, label, kind, usedPercent: percent, resetsAt: resolveReset(raw, now), isPrimary: true });
  }

  const seenNames = new Map<string, number>();
  for (const additional of response.additional_rate_limits ?? []) {
    const name = additional.limit_name?.trim() || additional.metered_feature?.trim();
    if (!name) continue;

    const raw = additional.rate_limit?.primary_window ?? additional.rate_limit?.secondary_window;
    if (!raw) continue;
    const percent = clampPercent(raw.used_percent);
    if (percent === null) continue;

    const seen = seenNames.get(name) ?? 0;
    seenNames.set(name, seen + 1);
    const id = seen === 0 ? `scoped:${name}` : `scoped:${name}:${seen}`;

    windows.push({
      id,
      label: name,
      kind: "scoped",
      usedPercent: percent,
      resetsAt: resolveReset(raw, now),
      isPrimary: false,
    });
  }

  return sortWindows(windows);
}

export function formatPlan(planType: string | undefined): string | undefined {
  if (!planType) return undefined;
  const trimmed = planType.trim();
  if (!trimmed) return undefined;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
