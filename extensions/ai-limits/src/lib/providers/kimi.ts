import { Deps } from "../deps";
import { asArray, asNumber, asRecord, asString, asTimestamp, clampPercent, requestJson } from "../http";
import { ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

// Kimi serves the Code API on two hosts. kimi.com is tried first. kimi.ai is only tried when kimi.com refuses the key or
// doesn't have the route, which is how international accounts are reached.
const PRIMARY_URL = "https://api.kimi.com/coding/v1/usages";
const FALLBACK_URL = "https://api.kimi.ai/coding/v1/usages";
export const CREATE_KEY_URL = "https://www.kimi.com/code/console";
const AUTH_HINT =
  "Choose Connect Kimi Code from this item's actions to enter a new key, or check the key in the extension preferences";
// Used when the key comes from the preferences. Connect is hidden then, so the hint doesn't name it.
const PREFERENCE_AUTH_HINT = "Check the Kimi Code API key in the extension preferences";
const FIVE_HOUR_MINUTES = 300;
const WEEKLY_MINUTES = 7 * 24 * 60;
const MONTHLY_MINUTES = 30 * 24 * 60;

const MINUTES_PER_TIME_UNIT: Record<string, number> = {
  TIME_UNIT_MINUTE: 1,
  TIME_UNIT_HOUR: 60,
  TIME_UNIT_DAY: 24 * 60,
};
// Plan names for the membership levels Kimi reports.
const PLAN_NAMES: Record<string, string> = {
  LEVEL_FREE: "Adagio",
  LEVEL_TRIAL: "Andante",
  LEVEL_BASIC: "Moderato",
  LEVEL_INTERMEDIATE: "Allegretto",
  LEVEL_ADVANCED: "Allegro",
};

interface SizedWindow {
  // Used to sort shortest first. Undefined sorts last.
  minutes?: number;
  window: UsageWindow;
}

export async function fetchKimiUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const apiKey = settings.kimiApiKey?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "not-connected",
      "No Kimi Code API key",
      "Choose Connect Kimi Code from this item's actions.\n" +
        `Or add your Kimi Code API key in the extension preferences. Create one at ${CREATE_KEY_URL}`,
    );
  }

  const authHint = settings.kimiApiKeySource === "preference" ? PREFERENCE_AUTH_HINT : AUTH_HINT;
  const options = { provider: "Kimi Code", headers: { Authorization: `Bearer ${apiKey}` }, authHint };
  let json: unknown;
  try {
    json = await requestJson(deps, PRIMARY_URL, options);
  } catch (error) {
    if (!shouldTryFallback(error)) {
      throw error;
    }
    try {
      json = await requestJson(deps, FALLBACK_URL, options);
    } catch {
      // Both hosts failed. The first error is the one that matches the host most users have.
      throw error;
    }
  }
  return parseKimiUsage(json, deps.now());
}

function shouldTryFallback(error: unknown): boolean {
  return error instanceof ProviderError && (error.kind === "auth" || error.status === 404);
}

export function parseKimiUsage(json: unknown, fetchedAt: number): ProviderUsage {
  const root = asRecord(json);
  if (!root) {
    throw new ProviderError("parse", "Kimi Code returned an unexpected response");
  }

  const sized: SizedWindow[] = [];
  const pools = asRecord(root.usages);
  // Newer accounts report ratio pools instead of request counts.
  addPool(sized, "5-Hour", FIVE_HOUR_MINUTES, pools?.limit_5h);
  addPool(sized, "Weekly", WEEKLY_MINUTES, pools?.limit_7d);
  addPool(sized, "Monthly", MONTHLY_MINUTES, pools?.limit_month_total);

  for (const item of asArray(root.limits)) {
    const entry = asRecord(item);
    const window = asRecord(entry?.window);
    const duration = asNumber(window?.duration);
    const perUnit = MINUTES_PER_TIME_UNIT[asString(window?.timeUnit) ?? ""];
    const minutes = duration !== undefined && duration > 0 && perUnit !== undefined ? duration * perUnit : undefined;
    const built = requestWindow(asRecord(entry?.detail), minutes !== undefined ? windowLabel(minutes) : "Rate Limit");
    if (built) {
      sized.push({ minutes, window: built });
    }
  }

  // The top-level usage is the weekly quota. Skip it when a weekly pool already gave one.
  const weekly = requestWindow(asRecord(root.usage), "Weekly");
  if (weekly && !sized.some((item) => item.window.label === "Weekly")) {
    sized.push({ minutes: WEEKLY_MINUTES, window: weekly });
  }

  const windows = sized
    .sort((a, b) => (a.minutes ?? Number.MAX_SAFE_INTEGER) - (b.minutes ?? Number.MAX_SAFE_INTEGER))
    .map((item) => item.window);
  if (windows.length === 0) {
    throw new ProviderError("parse", "Kimi Code returned no usable quota windows");
  }

  return {
    provider: "kimi",
    plan: planName(root),
    windows,
    balances: [],
    notes: [],
    source: "API key",
    fetchedAt,
  };
}

function addPool(sized: SizedWindow[], label: string, minutes: number, raw: unknown): void {
  const pool = asRecord(raw);
  const usedRatio = asNumber(pool?.used_ratio);
  if (usedRatio === undefined || usedRatio < 0) {
    return;
  }
  sized.push({
    minutes,
    window: { label, usedPercent: clampPercent(usedRatio * 100), resetsAt: asTimestamp(pool?.reset_time) },
  });
}

// Builds a window from a { limit, used, remaining, resetTime } record. Numbers may arrive as strings.
function requestWindow(detail: Record<string, unknown> | undefined, label: string): UsageWindow | undefined {
  const limit = asNumber(detail?.limit);
  if (!detail || limit === undefined || limit <= 0) {
    return undefined;
  }
  const remaining = asNumber(detail.remaining);
  let used = asNumber(detail.used);
  if (used === undefined && remaining !== undefined) {
    used = limit - remaining;
  }
  if (used === undefined) {
    return undefined;
  }
  const resetRaw = detail.resetTime ?? detail.resetAt ?? detail.reset_time ?? detail.reset_at;
  return {
    label,
    usedPercent: clampPercent((used / limit) * 100),
    resetsAt: asTimestamp(resetRaw),
    detail: `${used} / ${limit} requests`,
  };
}

function windowLabel(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    return `${minutes / (24 * 60)}-Day`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}-Hour`;
  }
  return `${minutes}-Minute`;
}

function planName(root: Record<string, unknown>): string | undefined {
  const level = asString(asRecord(asRecord(asRecord(root.user)?.membership))?.level);
  if (!level || level === "LEVEL_UNSPECIFIED") {
    return undefined;
  }
  // Plan names only apply to the V1 goods catalog. Other versions show the raw level.
  const version = asString(root.version);
  if (version !== undefined && version !== "GOODS_VERSION_V1") {
    return level;
  }
  return PLAN_NAMES[level] ?? level;
}
