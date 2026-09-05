export interface LimitWindow {
  /** 0-100 */
  utilization: number;
  /** epoch ms */
  resetsAt: number | null;
}

export interface RateLimits {
  fiveHour: LimitWindow | null;
  weekly: LimitWindow | null;
  weeklyOpus: LimitWindow | null;
  weeklySonnet: LimitWindow | null;
  /** "normal" | "warning" | "exceeded" as reported by the API for the weekly group */
  weeklySeverity: string | null;
  subscriptionType?: string | null;
  rateLimitTier?: string | null;
  fetchedAt: number;
}

/** One real observation of the weekly utilization, persisted so we can show a true actual line. */
export interface Sample {
  /** epoch ms */
  t: number;
  /** weekly utilization 0-100 */
  weekly: number;
  /** five hour utilization 0-100 */
  fiveHour: number;
  /** epoch ms of the weekly reset this sample belongs to — identifies the week */
  resetsAt: number | null;
}

/** Token counts, split the way the API reports them. */
export interface Tokens {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

export interface CostBucket {
  /** local calendar date, YYYY-MM-DD */
  date: string;
  /** derived cost in USD — used only as a *relative* usage weight */
  cost: number;
  tokens: Tokens;
}

/** Per-hour cost, keyed by epoch ms of the hour start. Used to rebuild the in-week curve. */
export type HourlyCost = Map<number, number>;

export interface UsageHistory {
  /** local-date -> cost */
  daily: Map<string, number>;
  hourly: HourlyCost;
  /** earliest record timestamp seen (epoch ms) */
  firstSeen: number | null;
  /** number of jsonl files read fresh this run (rest came from cache) */
  filesScanned: number;
  filesTotal: number;
}

export interface ForecastPoint {
  t: number;
  pct: number;
}

export interface Forecast {
  /** true utilization right now, straight from the API */
  pctNow: number;
  /** start/end of the current weekly window (epoch ms) */
  windowStart: number;
  windowEnd: number;
  /** %-per-USD calibration factor over the whole window; null when there is not enough in-window data */
  k: number | null;
  /**
   * %-per-USD from the *completed* days of this window, used for every day
   * after today so today's own burn rate cannot rescale the rest of the week.
   * Falls back to `k` when there is no closed segment or no sample to price it.
   */
  kBase: number | null;
  /**
   * %-per-USD today has actually been charged at, used for what is left of
   * today. Falls back to `kBase` until today has moved enough percent to read.
   */
  kToday: number | null;
  /** cost incurred inside the current window before today started */
  costBeforeToday: number;
  /** real percentage points today has consumed, null when unmeasurable */
  pctToday: number | null;
  /** cost incurred inside the current window so far */
  costSoFar: number;
  /** rebuilt actual curve for the window so far */
  actual: ForecastPoint[];
  /** projection from now to window end */
  projected: ForecastPoint[];
  /** projected utilization at reset */
  pctAtReset: number;
  /** epoch ms when 100% is predicted to be crossed, null if not this week */
  hitsLimitAt: number | null;
  /** mean cost per local weekday, index 0 = Sunday */
  dowProfile: number[];
  /** normalized weight of usage per hour of day, sums to 1 */
  hourProfile: number[];
  /** how many calendar days of history fed the profile */
  profileDays: number;
  /** the weekday prior for today, before any live correction */
  todayPrior: number;
  /** full-day weight now expected for today, after blending the prior with today's pace */
  todayIntensity: number;
  /**
   * Full-day weight today's own pace alone implies, already bounded by `todayCap`.
   * Null when there was no usable pace signal, in which case `todayIntensity`
   * is just `todayPrior`.
   */
  todayPaced: number | null;
  /** how strongly today's own pace drove todayIntensity, 0-1 */
  todayWeight: number;
  /** cost already incurred today, inside this window */
  todayActual: number;
  /** share of today's usual usage mass that has already elapsed, 0-1 */
  elapsedMass: number;
  /**
   * Ceiling actually applied to today: `dayCap`, or what today already spent when
   * that is higher — a day past the cap is evidence, not noise. Null when unbounded.
   */
  todayCap: number | null;
  /** multiplier applied to the weekday prior for days after today */
  weekFactor: number;
  /** completed days inside this window that fed weekFactor */
  weekDaysDone: number;
  /** ceiling on any single day's weight, null when history is too thin to bound one */
  dayCap: number | null;
  /** real observed samples inside this window */
  samples: Sample[];
  warnings: string[];
}
