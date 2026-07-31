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
  /** %-per-USD calibration factor; null when there is not enough in-window data */
  k: number | null;
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
  /** real observed samples inside this window */
  samples: Sample[];
  warnings: string[];
}
