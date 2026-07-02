import { getPreferenceValues } from "@raycast/api";

/**
 * Typed client for the Anthropic Admin API (organization usage & cost reports).
 *
 * Endpoints:
 *  - Usage report:  GET /v1/organizations/usage_report/messages
 *  - Cost report:   GET /v1/organizations/cost_report
 *
 * Auth: `x-api-key: <admin key>` + `anthropic-version: 2023-06-01`.
 * The admin key is read from the (Keychain-backed) `adminApiKey` preference and
 * is NEVER logged or surfaced.
 *
 * Everything here is defensive: the API shape is loosely guaranteed, so every
 * field is read through a guarded accessor and missing data degrades to 0/null
 * rather than throwing. The only thrown values are typed `AdminApiError`s, which
 * the UI maps to friendly states.
 */

const BASE = "https://api.anthropic.com/v1/organizations";
const ANTHROPIC_VERSION = "2023-06-01";
const USAGE_PATH = "/usage_report/messages";
const COST_PATH = "/cost_report";
/** Safety valve so a misbehaving `has_more` can never loop forever. */
const MAX_PAGES = 50;

/** Discriminated error kinds the UI can branch on. */
export type AdminApiErrorKind =
  "not_configured" | "auth" | "http" | "network" | "parse";

export class AdminApiError extends Error {
  readonly kind: AdminApiErrorKind;
  readonly status?: number;

  constructor(kind: AdminApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AdminApiError";
    this.kind = kind;
    this.status = status;
  }
}

/** A breakdown of token counts by type, plus a derived total. */
export type TokenBreakdown = {
  uncachedInput: number;
  cacheRead: number;
  cacheCreation5m: number;
  cacheCreation1h: number;
  output: number;
  total: number;
};

/** One model's tokens and (optional) cost within a period. */
export type ModelRow = {
  model: string;
  tokens: TokenBreakdown;
  /** USD cost for this model, or `null` if the cost report did not attribute one. */
  usd: number | null;
};

/** Aggregated usage + cost for a single time period (today / month-to-date). */
export type PeriodUsage = {
  total: { tokens: TokenBreakdown; usd: number | null };
  models: ModelRow[];
};

export type DateRange = {
  /** RFC3339 / ISO8601 UTC timestamp. */
  startingAt: string;
  /** RFC3339 / ISO8601 UTC timestamp. */
  endingAt: string;
};

// --- small guarded helpers -------------------------------------------------

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function emptyTokens(): TokenBreakdown {
  return {
    uncachedInput: 0,
    cacheRead: 0,
    cacheCreation5m: 0,
    cacheCreation1h: 0,
    output: 0,
    total: 0,
  };
}

function addTokens(into: TokenBreakdown, from: TokenBreakdown): void {
  into.uncachedInput += from.uncachedInput;
  into.cacheRead += from.cacheRead;
  into.cacheCreation5m += from.cacheCreation5m;
  into.cacheCreation1h += from.cacheCreation1h;
  into.output += from.output;
  into.total += from.total;
}

// --- date-range helpers ----------------------------------------------------

function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/** The current UTC day: [today 00:00Z, tomorrow 00:00Z). */
export function todayRange(now: Date = new Date()): DateRange {
  const start = utcMidnight(now);
  const end = new Date(start.getTime() + 86_400_000);
  return { startingAt: start.toISOString(), endingAt: end.toISOString() };
}

/** From the first of the current UTC month through the end of today (UTC). */
export function monthToDateRange(now: Date = new Date()): DateRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(utcMidnight(now).getTime() + 86_400_000);
  return { startingAt: start.toISOString(), endingAt: end.toISOString() };
}

// --- HTTP / pagination -----------------------------------------------------

function getAdminApiKey(): string {
  let key: string | undefined;
  try {
    key = getPreferenceValues<Preferences>().adminApiKey;
  } catch {
    key = undefined;
  }
  if (!key || !key.trim()) {
    throw new AdminApiError(
      "not_configured",
      "No Anthropic Admin API key configured.",
    );
  }
  return key.trim();
}

/**
 * GET a report endpoint, following `has_more`/`next_page` pagination, and
 * return every `data` bucket across all pages. Throws a typed `AdminApiError`.
 */
async function fetchAllBuckets(
  path: string,
  range: DateRange,
  apiKey: string,
): Promise<Record<string, unknown>[]> {
  const buckets: Record<string, unknown>[] = [];
  let page: string | undefined;

  for (let i = 0; i < MAX_PAGES; i++) {
    const params = new URLSearchParams();
    params.set("starting_at", range.startingAt);
    params.set("ending_at", range.endingAt);
    params.set("bucket_width", "1d");
    params.append("group_by[]", "model");
    params.set("limit", "31");
    if (page) params.set("page", page);

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}?${params.toString()}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
      });
    } catch (err) {
      throw new AdminApiError(
        "network",
        `Could not reach the Anthropic API. Check your connection. (${
          (err as Error).message ?? "network error"
        })`,
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new AdminApiError(
        "auth",
        "The API key was rejected (401/403). Make sure it is a valid Organization Admin key (sk-ant-admin01-…) and that you are an org admin.",
        res.status,
      );
    }
    if (!res.ok) {
      const detail = await readErrorMessage(res);
      throw new AdminApiError(
        "http",
        `Anthropic API error ${res.status}${detail ? `: ${detail}` : ""}.`,
        res.status,
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new AdminApiError(
        "parse",
        "The Anthropic API returned a response that could not be parsed as JSON.",
      );
    }

    const root = asRecord(json) ?? {};
    for (const item of asArray(root.data)) {
      const rec = asRecord(item);
      if (rec) buckets.push(rec);
    }

    const hasMore = root.has_more === true;
    const next =
      typeof root.next_page === "string" ? root.next_page : undefined;
    if (!hasMore || !next) break;
    page = next;
  }

  return buckets;
}

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    const rec = asRecord(body);
    const errRec = asRecord(rec?.error);
    const msg = errRec?.message ?? rec?.message;
    return typeof msg === "string" ? msg : undefined;
  } catch {
    return undefined;
  }
}

// --- parsing ---------------------------------------------------------------

function parseTokenResult(result: Record<string, unknown>): TokenBreakdown {
  const cacheCreation = asRecord(result.cache_creation);
  const tokens: TokenBreakdown = {
    uncachedInput: num(result.uncached_input_tokens),
    cacheRead: num(result.cache_read_input_tokens),
    cacheCreation5m: num(cacheCreation?.ephemeral_5m_input_tokens),
    cacheCreation1h: num(cacheCreation?.ephemeral_1h_input_tokens),
    output: num(result.output_tokens),
    total: 0,
  };
  tokens.total =
    tokens.uncachedInput +
    tokens.cacheRead +
    tokens.cacheCreation5m +
    tokens.cacheCreation1h +
    tokens.output;
  return tokens;
}

function modelOf(result: Record<string, unknown>): string {
  const model = result.model;
  return typeof model === "string" && model.length > 0 ? model : "Unknown";
}

/**
 * Fetch + aggregate the usage report into per-model token breakdowns.
 * Buckets (per day) are summed together; results within a bucket are keyed
 * by model.
 */
export async function getUsage(
  range: DateRange,
  apiKey: string,
): Promise<Map<string, TokenBreakdown>> {
  const buckets = await fetchAllBuckets(USAGE_PATH, range, apiKey);
  const byModel = new Map<string, TokenBreakdown>();

  for (const bucket of buckets) {
    for (const result of asArray(bucket.results)) {
      const rec = asRecord(result);
      if (!rec) continue;
      const model = modelOf(rec);
      const tokens = parseTokenResult(rec);
      const existing = byModel.get(model) ?? emptyTokens();
      addTokens(existing, tokens);
      byModel.set(model, existing);
    }
  }

  return byModel;
}

/**
 * Fetch + aggregate the cost report into per-model USD amounts.
 *
 * The cost report returns `amount` as a decimal string in **cents** (USD), so
 * we divide by 100 to get dollars. Cost grouping by model is best-effort: if a
 * result has no `model`, it is attributed to `Unknown`.
 */
export async function getCost(
  range: DateRange,
  apiKey: string,
): Promise<Map<string, number>> {
  const buckets = await fetchAllBuckets(COST_PATH, range, apiKey);
  const byModel = new Map<string, number>();

  for (const bucket of buckets) {
    for (const result of asArray(bucket.results)) {
      const rec = asRecord(result);
      if (!rec) continue;
      const model = modelOf(rec);
      const cents = num(rec.amount);
      const dollars = cents / 100;
      byModel.set(model, (byModel.get(model) ?? 0) + dollars);
    }
  }

  return byModel;
}

/**
 * Load a full period: usage (tokens) and cost (USD), fetched in parallel and
 * merged per model. Returns models sorted by total tokens descending.
 *
 * Reads + validates the admin key up front so a `not_configured` error is
 * raised before any network call.
 */
export async function getPeriodUsage(range: DateRange): Promise<PeriodUsage> {
  const apiKey = getAdminApiKey();

  const [tokensByModel, costByModel] = await Promise.all([
    getUsage(range, apiKey),
    getCost(range, apiKey).catch((err) => {
      // The cost report is daily-only and can lag; if it fails for a non-auth
      // reason, still show tokens rather than failing the whole view.
      if (err instanceof AdminApiError && err.kind === "auth") throw err;
      return new Map<string, number>();
    }),
  ]);

  const models = new Set<string>([
    ...tokensByModel.keys(),
    ...costByModel.keys(),
  ]);

  const rows: ModelRow[] = [];
  const total = { tokens: emptyTokens(), usd: null as number | null };
  let sawCost = false;

  for (const model of models) {
    const tokens = tokensByModel.get(model) ?? emptyTokens();
    const usd = costByModel.has(model)
      ? (costByModel.get(model) as number)
      : null;
    if (usd != null) sawCost = true;
    rows.push({ model, tokens, usd });
    addTokens(total.tokens, tokens);
  }

  if (sawCost) {
    total.usd = rows.reduce((sum, r) => sum + (r.usd ?? 0), 0);
  }

  rows.sort((a, b) => b.tokens.total - a.tokens.total);

  return { total, models: rows };
}
