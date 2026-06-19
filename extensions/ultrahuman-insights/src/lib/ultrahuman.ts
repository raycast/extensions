import { DailyMetrics, DailyMetricsRange } from "./types";
import { getApiToken } from "./prefs";

const BASE_URL = "https://partner.ultrahuman.com/api/v1/partner";
const FETCH_TIMEOUT_MS = 10_000;

const REDACTED = "<redacted>";
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
function sanitize(s: string): string {
  return s.replace(JWT_PATTERN, REDACTED).slice(0, 200);
}

export class UltrahumanError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    const safe = sanitize(body);
    super(`Ultrahuman API ${status}: ${safe}`);
    this.body = safe;
    this.name = "UltrahumanError";
  }
  body: string;
}

export class MissingTokenError extends Error {
  constructor() {
    super("Ultrahuman API token is not set");
    this.name = "MissingTokenError";
  }
}

// ---------------------------------------------------------------------------
// Raw wire-format types
// ---------------------------------------------------------------------------

interface RawMetricEntry {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: Record<string, any>;
}

interface RawSleepObject {
  sleep_score?: { score?: number };
  total_sleep?: { minutes?: number };
  sleep_efficiency?: { percentage?: number };
  rem_sleep?: { minutes?: number };
  deep_sleep?: { minutes?: number };
  light_sleep?: { minutes?: number };
  restorative_sleep?: { percentage?: number };
  temperature_deviation?: { celsius?: number };
  hr_drop?: { value?: number } | null | undefined;
  average_body_temperature?: { celsius?: number };
  full_sleep_cycles?: { cycles?: number };
  tosses_and_turns?: { count?: number };
  movements?: { count?: number };
  morning_alertness?: { minutes?: number };
}

interface RawApiResponse {
  data: {
    metrics: Record<string, RawMetricEntry[]>;
    latest_time_zone?: string;
  };
  error: string | null;
  status?: string;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

function normalizeOne(date: string, entries: RawMetricEntry[]): DailyMetrics {
  const byType = Object.fromEntries(entries.map((e) => [e.type, e.object]));

  const sleep: RawSleepObject = byType["sleep"] ?? {};

  const result: DailyMetrics = {
    date,
    // Sleep object (nested scalars)
    sleep_score: sleep.sleep_score?.score,
    total_sleep: sleep.total_sleep?.minutes,
    sleep_efficiency: sleep.sleep_efficiency?.percentage,
    rem_sleep: sleep.rem_sleep?.minutes,
    deep_sleep: sleep.deep_sleep?.minutes,
    light_sleep: sleep.light_sleep?.minutes,
    restorative_sleep: sleep.restorative_sleep?.percentage,
    temperature_deviation: sleep.temperature_deviation?.celsius,
    hr_drop: sleep.hr_drop?.value,
    avg_body_temperature: sleep.average_body_temperature?.celsius,
    sleep_cycles: sleep.full_sleep_cycles?.cycles,
    tosses_turns: sleep.tosses_and_turns?.count,
    movements: sleep.movements?.count,
    morning_alertness: sleep.morning_alertness?.minutes,
    // Top-level scalars
    hrv: byType["hrv"]?.avg,
    hr: byType["hr"]?.last_reading,
    night_rhr: byType["night_rhr"]?.avg,
    // The API's `spo2.avg` includes zero-padded time slots (no-reading intervals
    // are stored as 0), making the average meaningless (e.g. avg=1 for a night
    // with only two actual readings of 97% and 94%). Instead we compute the
    // average of non-zero values from the values array, which are real % readings.
    spo2: (() => {
      const readings: number[] = (byType["spo2"]?.values ?? [])
        .map((v: { value: number }) => v.value)
        .filter((v: number) => v > 0);
      if (readings.length === 0) return undefined;
      return Math.round(
        readings.reduce((a: number, b: number) => a + b, 0) / readings.length,
      );
    })(),
    steps: byType["steps"]?.total,
    recovery_index: byType["recovery_index"]?.value,
    movement_index: byType["movement_index"]?.value,
    vo2_max: byType["vo2_max"]?.value,
    active_minutes: byType["active_minutes"]?.value,
    temp: byType["temp"]?.last_reading,
  };

  // Reject empty/unrecognized responses — don't cache garbage
  const hasData = Object.entries(result).some(
    ([k, v]) => k !== "date" && v !== undefined,
  );
  if (!hasData) {
    throw new UltrahumanError(0, "Empty or unrecognized response");
  }

  return result;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function call(
  params: Record<string, string | number>,
): Promise<RawApiResponse> {
  const token = getApiToken();
  if (!token) throw new MissingTokenError();

  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {}),
  );
  const url = `${BASE_URL}/daily_metrics?${query.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Authorization: token },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new UltrahumanError(0, "Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new UltrahumanError(res.status, body);
  }

  const json = (await res.json()) as RawApiResponse;

  if (json.error != null) {
    throw new UltrahumanError(0, json.error);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch all metrics for a single date (YYYY-MM-DD). */
export async function fetchDay(date: string): Promise<DailyMetrics> {
  const raw = await call({ date });
  const metrics = raw.data.metrics;
  const dateKey = Object.keys(metrics)[0] ?? date;
  const entries = metrics[dateKey] ?? [];
  return normalizeOne(dateKey, entries);
}

/** Fetch metrics across an epoch range. Ultrahuman caps the window at 7 days. */
export async function fetchRange(
  startEpoch: number,
  endEpoch: number,
): Promise<DailyMetricsRange> {
  const raw = await call({ start_epoch: startEpoch, end_epoch: endEpoch });
  return Object.entries(raw.data.metrics)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, entries]) => normalizeOne(d, entries));
}
