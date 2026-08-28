export const CLAUDE_USAGE_ENDPOINT =
  "https://api.anthropic.com/api/oauth/usage";
export const SUBSCRIPTION_CACHE_TTL_MS = 10 * 60 * 1000;
export const SUBSCRIPTION_HISTORY_DAYS = 70;
export const MAX_SUBSCRIPTION_SNAPSHOTS = 5_000;

const OAUTH_BETA_HEADER = "oauth-2025-04-20";
const DEFAULT_NETWORK_TIMEOUT_MS = 10_000;
const SNAPSHOT_DEDUPE_MS = 2 * 60 * 1000;
const FORECAST_MIN_SAMPLES = 24;
const FORECAST_MIN_INTERVALS = 12;
const FORECAST_MIN_SPAN_MS = 48 * 60 * 60 * 1000;
const FORECAST_MAX_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FORECAST_MIN_INTERVAL_MS = 60 * 1000;
const RESET_MATCH_TOLERANCE_MS = 60 * 1000;
const RECENCY_HALF_LIFE_DAYS = 21;

export interface SubscriptionUsageWindow {
  usedPercent: number;
  resetsAt?: string;
}

export interface ScopedSubscriptionUsage {
  label: string;
  window: SubscriptionUsageWindow;
}

export interface ClaudeSubscriptionUsage {
  fiveHour?: SubscriptionUsageWindow;
  weekly?: SubscriptionUsageWindow;
  weeklyOpus?: SubscriptionUsageWindow;
  weeklySonnet?: SubscriptionUsageWindow;
  scopedWeekly: ScopedSubscriptionUsage[];
  fetchedAt: string;
  warnings: string[];
}

export interface SubscriptionUsageSnapshot {
  capturedAt: string;
  weeklyUsedPercent: number;
  weeklyResetsAt: string;
  fiveHourUsedPercent?: number;
  fiveHourResetsAt?: string;
}

export type ForecastConfidence = "Low" | "Medium" | "High";

export interface SubscriptionUsageForecast {
  available: boolean;
  reason?: string;
  method: string;
  confidence?: ForecastConfidence;
  sampleCount: number;
  intervalCount: number;
  observedDays: number;
  averageUsedPercentPerHour?: number;
  projectedUsedPercentAtReset?: number;
  exhaustsAt?: string;
}

export interface SubscriptionUsageResult {
  usage?: ClaudeSubscriptionUsage;
  forecast: SubscriptionUsageForecast;
  stale: boolean;
  error?: string;
}

export async function resolveSubscriptionCredential(
  credential: string | undefined,
  provider?: () => Promise<string | undefined>,
): Promise<{ credential?: string; error?: string }> {
  const configured = credential?.trim();
  if (configured) return { credential: configured };
  if (!provider) return {};
  try {
    return { credential: (await provider())?.trim() || undefined };
  } catch (error) {
    if (error instanceof Error && error.name === "ClaudeOAuthCredentialError") {
      return { error: error.message };
    }
    return { error: "Claude Subscription Usage Credential Discovery Failed" };
  }
}

export function buildSubscriptionUsageResult(
  usage: ClaudeSubscriptionUsage,
  snapshots: SubscriptionUsageSnapshot[],
  options: { stale?: boolean; error?: string; now?: Date } = {},
): SubscriptionUsageResult {
  const now = options.now ?? new Date();
  return {
    usage,
    forecast: buildSubscriptionUsageForecast(snapshots, usage, now.getTime()),
    stale: options.stale ?? false,
    error: options.error,
  };
}

export function formatSubscriptionTimestamp(
  value: string | undefined,
  options: { locale?: string; timeZone?: string } = {},
): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unavailable";
  return new Intl.DateTimeFormat(options.locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  }).format(new Date(value));
}

export interface FetchResponseLike {
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  input: string,
  init: {
    method: "GET";
    headers: Record<string, string>;
    signal: AbortSignal;
  },
) => Promise<FetchResponseLike>;

export class SubscriptionUsageError extends Error {
  readonly reason:
    | "Missing Credential"
    | "Unauthorized"
    | "Rate Limited"
    | "Network"
    | "Invalid Response"
    | "Cancelled";

  constructor(
    message: string,
    reason:
      | "Missing Credential"
      | "Unauthorized"
      | "Rate Limited"
      | "Network"
      | "Invalid Response"
      | "Cancelled",
  ) {
    super(message);
    this.name = "SubscriptionUsageError";
    this.reason = reason;
  }
}

export function validateSubscriptionCredential(value: string): string {
  const token = value.trim();
  if (token.length < 20 || token.length > 10_000 || /\s/.test(token)) {
    throw new SubscriptionUsageError(
      "The Subscription Usage OAuth Token Is Invalid",
      "Missing Credential",
    );
  }
  return token;
}

export function parseClaudeSubscriptionUsage(
  value: unknown,
  fetchedAt = new Date(),
): ClaudeSubscriptionUsage {
  if (!isObject(value)) {
    throw new SubscriptionUsageError(
      "Claude Subscription Usage Returned An Invalid Response",
      "Invalid Response",
    );
  }
  const warnings: string[] = [];
  const limits = parseCurrentLimits(value.limits, warnings);
  const fiveHour =
    limits.fiveHour ?? parseUsageWindow(value.five_hour, "Five-Hour", warnings);
  const weekly =
    limits.weekly ?? parseUsageWindow(value.seven_day, "Weekly", warnings);
  const legacyWeeklyOpus = parseUsageWindow(
    value.seven_day_opus,
    "Weekly Opus",
    warnings,
  );
  const legacyWeeklySonnet = parseUsageWindow(
    value.seven_day_sonnet,
    "Weekly Sonnet",
    warnings,
  );
  const weeklyOpus =
    limits.scopedWeekly.find((item) =>
      item.label.toLocaleLowerCase().includes("opus"),
    )?.window ?? legacyWeeklyOpus;
  const weeklySonnet =
    limits.scopedWeekly.find((item) =>
      item.label.toLocaleLowerCase().includes("sonnet"),
    )?.window ?? legacyWeeklySonnet;
  if (!fiveHour && !weekly && !weeklyOpus && !weeklySonnet) {
    throw new SubscriptionUsageError(
      "Claude Subscription Usage Did Not Include A Valid Limit Window",
      "Invalid Response",
    );
  }
  return {
    fiveHour,
    weekly,
    weeklyOpus,
    weeklySonnet,
    scopedWeekly: limits.scopedWeekly,
    fetchedAt: fetchedAt.toISOString(),
    warnings,
  };
}

export async function fetchClaudeSubscriptionUsage(
  credential: string,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    fetchImpl?: FetchLike;
    now?: Date;
  } = {},
): Promise<ClaudeSubscriptionUsage> {
  const token = validateSubscriptionCredential(credential);
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (typeof fetchImpl !== "function") {
    throw new SubscriptionUsageError(
      "Network Requests Are Unavailable In This Raycast Runtime",
      "Network",
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS,
  );
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await fetchImpl(CLAUDE_USAGE_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new SubscriptionUsageError(
        "Claude Rejected The Subscription Usage OAuth Token",
        "Unauthorized",
      );
    }
    if (response.status === 429) {
      throw new SubscriptionUsageError(
        "Claude Subscription Usage Is Temporarily Rate Limited",
        "Rate Limited",
      );
    }
    if (response.status !== 200) {
      throw new SubscriptionUsageError(
        `Claude Subscription Usage Returned HTTP ${response.status}`,
        "Network",
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SubscriptionUsageError(
        "Claude Subscription Usage Returned Invalid JSON",
        "Invalid Response",
      );
    }
    return parseClaudeSubscriptionUsage(payload, options.now ?? new Date());
  } catch (error: unknown) {
    if (error instanceof SubscriptionUsageError) throw error;
    if (controller.signal.aborted) {
      throw new SubscriptionUsageError(
        options.signal?.aborted
          ? "Claude Subscription Usage Refresh Was Cancelled"
          : "Claude Subscription Usage Request Timed Out",
        "Cancelled",
      );
    }
    throw new SubscriptionUsageError(
      "Claude Subscription Usage Could Not Reach Anthropic",
      "Network",
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export function makeSubscriptionUsageSnapshot(
  usage: ClaudeSubscriptionUsage,
): SubscriptionUsageSnapshot | null {
  const weekly = usage.weekly;
  if (!weekly?.resetsAt) return null;
  return {
    capturedAt: usage.fetchedAt,
    weeklyUsedPercent: weekly.usedPercent,
    weeklyResetsAt: weekly.resetsAt,
    fiveHourUsedPercent: usage.fiveHour?.usedPercent,
    fiveHourResetsAt: usage.fiveHour?.resetsAt,
  };
}

export function appendSubscriptionSnapshot(
  snapshots: SubscriptionUsageSnapshot[],
  next: SubscriptionUsageSnapshot,
  now = Date.now(),
): SubscriptionUsageSnapshot[] {
  const cutoff = now - SUBSCRIPTION_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const valid = snapshots
    .map(validateSubscriptionSnapshot)
    .filter((snapshot): snapshot is SubscriptionUsageSnapshot => {
      if (!snapshot) return false;
      const captured = Date.parse(snapshot.capturedAt);
      return captured >= cutoff && captured <= now + 60_000;
    })
    .sort(
      (left, right) =>
        Date.parse(left.capturedAt) - Date.parse(right.capturedAt),
    );
  const normalizedNext = validateSubscriptionSnapshot(next);
  if (!normalizedNext) return valid.slice(-MAX_SUBSCRIPTION_SNAPSHOTS);
  const last = valid.at(-1);
  if (last && sameSnapshot(last, normalizedNext)) {
    return valid.slice(-MAX_SUBSCRIPTION_SNAPSHOTS);
  }
  valid.push(normalizedNext);
  return valid.slice(-MAX_SUBSCRIPTION_SNAPSHOTS);
}

export function buildSubscriptionUsageForecast(
  snapshots: SubscriptionUsageSnapshot[],
  usage: ClaudeSubscriptionUsage,
  now = Date.now(),
): SubscriptionUsageForecast {
  const method = "Recent Local Weekday And Hour Usage Rates";
  const weekly = usage.weekly;
  if (!weekly?.resetsAt) {
    return unavailableForecast(method, "Weekly Reset Time Is Unavailable");
  }
  const resetsAt = Date.parse(weekly.resetsAt);
  if (
    !Number.isFinite(resetsAt) ||
    resetsAt <= now ||
    resetsAt - now > 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000
  ) {
    return unavailableForecast(method, "Weekly Reset Time Is Invalid");
  }

  const valid = snapshots
    .map(validateSubscriptionSnapshot)
    .filter((snapshot): snapshot is SubscriptionUsageSnapshot => {
      if (!snapshot) return false;
      const captured = Date.parse(snapshot.capturedAt);
      return (
        captured <= now &&
        captured >= now - SUBSCRIPTION_HISTORY_DAYS * 86_400_000
      );
    })
    .sort(
      (left, right) =>
        Date.parse(left.capturedAt) - Date.parse(right.capturedAt),
    );
  const observedDays = observedCalendarDays(valid);
  if (valid.length < FORECAST_MIN_SAMPLES) {
    return unavailableForecast(
      method,
      `Need At Least ${FORECAST_MIN_SAMPLES} Usage Snapshots`,
      valid.length,
      0,
      observedDays,
    );
  }
  const span =
    Date.parse(valid.at(-1)!.capturedAt) - Date.parse(valid[0].capturedAt);
  if (span < FORECAST_MIN_SPAN_MS) {
    return unavailableForecast(
      method,
      "Need At Least 48 Hours Of Usage History",
      valid.length,
      0,
      observedDays,
    );
  }

  const exact = createRateBuckets(7 * 24);
  const byHour = createRateBuckets(24);
  const byWeekday = createRateBuckets(7);
  let totalWeightedUse = 0;
  let totalWeightedHours = 0;
  let intervalCount = 0;

  for (let index = 1; index < valid.length; index++) {
    const previous = valid[index - 1];
    const current = valid[index];
    if (!sameResetWindow(previous.weeklyResetsAt, current.weeklyResetsAt)) {
      continue;
    }
    const start = Date.parse(previous.capturedAt);
    const end = Date.parse(current.capturedAt);
    const durationMs = end - start;
    const delta = current.weeklyUsedPercent - previous.weeklyUsedPercent;
    if (
      durationMs < FORECAST_MIN_INTERVAL_MS ||
      durationMs > FORECAST_MAX_INTERVAL_MS ||
      delta < -0.001
    ) {
      continue;
    }
    const midpoint = start + durationMs / 2;
    const date = new Date(midpoint);
    const hours = durationMs / 3_600_000;
    const ageDays = (now - midpoint) / 86_400_000;
    const weight = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    const weightedHours = hours * weight;
    const weightedUse = Math.max(0, delta) * weight;
    addRateObservation(
      exact[date.getDay() * 24 + date.getHours()],
      weightedUse,
      weightedHours,
    );
    addRateObservation(byHour[date.getHours()], weightedUse, weightedHours);
    addRateObservation(byWeekday[date.getDay()], weightedUse, weightedHours);
    totalWeightedUse += weightedUse;
    totalWeightedHours += weightedHours;
    intervalCount++;
  }

  if (intervalCount < FORECAST_MIN_INTERVALS || totalWeightedHours <= 0) {
    return unavailableForecast(
      method,
      `Need At Least ${FORECAST_MIN_INTERVALS} Comparable Usage Intervals`,
      valid.length,
      intervalCount,
      observedDays,
    );
  }

  const overallRate = totalWeightedUse / totalWeightedHours;
  let projected = weekly.usedPercent;
  let cursor = now;
  let exhaustsAt: number | undefined;
  while (cursor < resetsAt) {
    const nextHour = new Date(cursor);
    nextHour.setMinutes(60, 0, 0);
    const end = Math.min(resetsAt, nextHour.getTime());
    const date = new Date(cursor);
    const rate = resolveForecastRate(
      exact[date.getDay() * 24 + date.getHours()],
      byHour[date.getHours()],
      byWeekday[date.getDay()],
      overallRate,
      totalWeightedHours,
      totalWeightedUse,
    );
    const hours = (end - cursor) / 3_600_000;
    const before = projected;
    projected += rate * hours;
    if (
      exhaustsAt === undefined &&
      before < 100 &&
      projected >= 100 &&
      rate > 0
    ) {
      exhaustsAt = cursor + ((100 - before) / rate) * 3_600_000;
    }
    cursor = end;
  }

  const confidence: ForecastConfidence =
    intervalCount >= 168 && observedDays >= 7
      ? "High"
      : intervalCount >= 72 && observedDays >= 4
        ? "Medium"
        : "Low";
  return {
    available: true,
    method,
    confidence,
    sampleCount: valid.length,
    intervalCount,
    observedDays,
    averageUsedPercentPerHour: overallRate,
    projectedUsedPercentAtReset: Math.max(0, projected),
    exhaustsAt:
      exhaustsAt !== undefined ? new Date(exhaustsAt).toISOString() : undefined,
  };
}

export function validateCachedSubscriptionUsage(
  value: unknown,
): ClaudeSubscriptionUsage | null {
  if (!isObject(value)) return null;
  const fetchedAt = parseDateString(value.fetchedAt);
  if (!fetchedAt || !Array.isArray(value.warnings)) return null;
  const warnings = value.warnings.filter(
    (warning): warning is string => typeof warning === "string",
  );
  const fiveHour = validateWindow(value.fiveHour);
  const weekly = validateWindow(value.weekly);
  const weeklyOpus = validateWindow(value.weeklyOpus);
  const weeklySonnet = validateWindow(value.weeklySonnet);
  const scopedWeekly = Array.isArray(value.scopedWeekly)
    ? value.scopedWeekly
        .map(validateScopedWindow)
        .filter((item): item is ScopedSubscriptionUsage => item !== null)
    : [];
  if (!fiveHour && !weekly && !weeklyOpus && !weeklySonnet) return null;
  return {
    fiveHour,
    weekly,
    weeklyOpus,
    weeklySonnet,
    scopedWeekly,
    fetchedAt,
    warnings,
  };
}

export function validateSubscriptionSnapshot(
  value: unknown,
): SubscriptionUsageSnapshot | null {
  if (!isObject(value)) return null;
  const capturedAt = parseDateString(value.capturedAt);
  const weeklyResetsAt = parseDateString(value.weeklyResetsAt);
  if (
    !capturedAt ||
    !weeklyResetsAt ||
    !validPercent(value.weeklyUsedPercent)
  ) {
    return null;
  }
  const result: SubscriptionUsageSnapshot = {
    capturedAt,
    weeklyUsedPercent: value.weeklyUsedPercent,
    weeklyResetsAt,
  };
  if (validPercent(value.fiveHourUsedPercent)) {
    result.fiveHourUsedPercent = value.fiveHourUsedPercent;
  }
  const fiveHourResetsAt = parseDateString(value.fiveHourResetsAt);
  if (fiveHourResetsAt) result.fiveHourResetsAt = fiveHourResetsAt;
  return result;
}

function parseUsageWindow(
  value: unknown,
  label: string,
  warnings: string[],
): SubscriptionUsageWindow | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isObject(value) || !validPercent(value.utilization)) {
    warnings.push(`${label} Usage Was Invalid`);
    return undefined;
  }
  const result: SubscriptionUsageWindow = {
    usedPercent: value.utilization,
  };
  if (value.resets_at !== undefined && value.resets_at !== null) {
    const resetsAt = parseDateString(value.resets_at);
    if (resetsAt) result.resetsAt = resetsAt;
    else warnings.push(`${label} Reset Time Was Invalid`);
  }
  return result;
}

function parseCurrentLimits(
  value: unknown,
  warnings: string[],
): {
  fiveHour?: SubscriptionUsageWindow;
  weekly?: SubscriptionUsageWindow;
  scopedWeekly: ScopedSubscriptionUsage[];
} {
  if (value === undefined || value === null) return { scopedWeekly: [] };
  if (!Array.isArray(value)) {
    warnings.push("Current Limit Entries Were Invalid");
    return { scopedWeekly: [] };
  }
  let fiveHour: SubscriptionUsageWindow | undefined;
  let weekly: SubscriptionUsageWindow | undefined;
  const scopedWeekly: ScopedSubscriptionUsage[] = [];
  const seenLabels = new Set<string>();
  for (const item of value) {
    if (!isObject(item) || typeof item.kind !== "string") continue;
    const window = parsePercentWindow(item, `Limit ${item.kind}`, warnings);
    if (!window) continue;
    if (item.kind === "session" && !fiveHour) {
      fiveHour = window;
    } else if (item.kind === "weekly_all" && !weekly) {
      weekly = window;
    } else if (item.kind === "weekly_scoped") {
      const label = scopedModelLabel(item);
      const identity = label.toLocaleLowerCase();
      if (seenLabels.has(identity)) continue;
      seenLabels.add(identity);
      scopedWeekly.push({ label, window });
    }
  }
  scopedWeekly.sort((left, right) => left.label.localeCompare(right.label));
  return { fiveHour, weekly, scopedWeekly };
}

function parsePercentWindow(
  value: Record<string, unknown>,
  label: string,
  warnings: string[],
): SubscriptionUsageWindow | undefined {
  if (!validPercent(value.percent)) {
    warnings.push(`${label} Usage Was Invalid`);
    return undefined;
  }
  const result: SubscriptionUsageWindow = { usedPercent: value.percent };
  if (value.resets_at !== undefined && value.resets_at !== null) {
    const resetsAt = parseDateString(value.resets_at);
    if (resetsAt) result.resetsAt = resetsAt;
    else warnings.push(`${label} Reset Time Was Invalid`);
  }
  return result;
}

function scopedModelLabel(value: Record<string, unknown>): string {
  const scope = isObject(value.scope) ? value.scope : undefined;
  const model = scope && isObject(scope.model) ? scope.model : undefined;
  const displayName = model?.display_name;
  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim().slice(0, 100)
    : "Model";
}

function validateWindow(value: unknown): SubscriptionUsageWindow | undefined {
  if (!isObject(value) || !validPercent(value.usedPercent)) return undefined;
  const result: SubscriptionUsageWindow = { usedPercent: value.usedPercent };
  const resetsAt = parseDateString(value.resetsAt);
  if (resetsAt) result.resetsAt = resetsAt;
  return result;
}

function validateScopedWindow(value: unknown): ScopedSubscriptionUsage | null {
  if (!isObject(value) || typeof value.label !== "string") return null;
  const label = value.label.trim();
  const window = validateWindow(value.window);
  if (!label || label.length > 100 || !window) return null;
  return { label, window };
}

function unavailableForecast(
  method: string,
  reason: string,
  sampleCount = 0,
  intervalCount = 0,
  observedDays = 0,
): SubscriptionUsageForecast {
  return {
    available: false,
    reason,
    method,
    sampleCount,
    intervalCount,
    observedDays,
  };
}

interface RateBucket {
  used: number;
  hours: number;
}

function createRateBuckets(count: number): RateBucket[] {
  return Array.from({ length: count }, () => ({ used: 0, hours: 0 }));
}

function addRateObservation(
  bucket: RateBucket,
  used: number,
  hours: number,
): void {
  bucket.used += used;
  bucket.hours += hours;
}

function resolveForecastRate(
  exact: RateBucket,
  hour: RateBucket,
  weekday: RateBucket,
  overallRate: number,
  totalHours: number,
  totalUsed: number,
): number {
  if (exact.hours >= 2) return exact.used / exact.hours;
  const fallbackHours = totalHours * 0.25;
  const numerator = hour.used + weekday.used + totalUsed * 0.25;
  const denominator = hour.hours + weekday.hours + fallbackHours;
  return denominator > 0 ? numerator / denominator : overallRate;
}

function observedCalendarDays(snapshots: SubscriptionUsageSnapshot[]): number {
  return new Set(
    snapshots.map((snapshot) => {
      const date = new Date(snapshot.capturedAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  ).size;
}

function sameSnapshot(
  left: SubscriptionUsageSnapshot,
  right: SubscriptionUsageSnapshot,
): boolean {
  return (
    Math.abs(Date.parse(left.capturedAt) - Date.parse(right.capturedAt)) <
      SNAPSHOT_DEDUPE_MS &&
    sameResetWindow(left.weeklyResetsAt, right.weeklyResetsAt) &&
    left.weeklyUsedPercent === right.weeklyUsedPercent &&
    left.fiveHourUsedPercent === right.fiveHourUsedPercent &&
    left.fiveHourResetsAt === right.fiveHourResetsAt
  );
}

function sameResetWindow(left: string, right: string): boolean {
  return (
    Math.abs(Date.parse(left) - Date.parse(right)) <= RESET_MATCH_TOLERANCE_MS
  );
}

function parseDateString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
}

function validPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
