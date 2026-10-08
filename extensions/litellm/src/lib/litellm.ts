import { getPreferenceValues } from "@raycast/api";

export interface DailyMetrics {
  spend: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  api_requests: number;
}

/**
 * A per-model (or per-provider/key) breakdown entry.
 *
 * LiteLLM nests the actual numbers under `metrics` (e.g.
 * `breakdown.models["gpt-5.5"].metrics.spend`), but some versions expose the
 * fields at the top level. We accept both shapes and normalise on read.
 */
export interface ModelBreakdown {
  metrics?: {
    spend?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    api_requests?: number;
  };
  spend?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  api_requests?: number;
}

export interface DailyActivityResult {
  date: string;
  metrics: DailyMetrics;
  breakdown?: {
    models?: Record<string, ModelBreakdown>;
    providers?: Record<string, ModelBreakdown>;
    api_keys?: Record<string, ModelBreakdown>;
  };
}

export interface DailyActivityMetadata {
  total_spend: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens?: number;
  total_api_requests: number;
  page?: number;
  total_pages?: number;
  has_more?: boolean;
}

export interface DailyActivityResponse {
  results: DailyActivityResult[];
  metadata: DailyActivityMetadata;
}

/** Aggregated numbers for an arbitrary window, plus a merged per-model breakdown. */
export interface UsageTotals {
  spend: number;
  totalTokens: number;
  apiRequests: number;
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const { baseUrl, apiKey } = getPreferenceValues<Preferences>();
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

// Retry transient failures (network blips, timeouts, 5xx) a couple of times with
// short linear backoff. Auth/config errors (401/403/4xx) are never retried.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}${path}`;

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      // Bail out after 15s so an unreachable/slow proxy can't hang the command.
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      // Network error or timeout — retry, then give up with a friendly message.
      if (attempt < MAX_RETRIES) {
        console.error(`Request to ${url} failed (attempt ${attempt + 1}), retrying:`, error);
        await delay(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      console.error(`Request to ${url} failed after ${attempt + 1} attempts:`, error);
      throw new Error(`Could not reach ${baseUrl}. Check the Base URL in preferences.`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized. Check your Virtual Key and Base URL in preferences.");
    }
    // Server errors are usually transient — retry before surfacing them.
    if (response.status >= 500 && attempt < MAX_RETRIES) {
      console.error(`${url} returned ${response.status} (attempt ${attempt + 1}), retrying`);
      await delay(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      throw new Error(`LiteLLM returned ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }
}

/** Local-time date formatted as YYYY-MM-DD. */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Monday of the current calendar week at local midnight. */
export function startOfWeek(): Date {
  const now = new Date();
  const diff = (now.getDay() + 6) % 7; // days since Monday (Sun=0 → 6)
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}

/** Parse the optional monthly budget preference. Empty or invalid → undefined (no % shown). */
export function getMonthlyBudget(): number | undefined {
  const { monthlyBudget } = getPreferenceValues<Preferences>();
  if (!monthlyBudget) return undefined;
  const n = Number(monthlyBudget.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Fetch daily activity across the user's keys.
 *
 * The endpoint paginates the raw daily rows (one per date × key × model) *before*
 * grouping them into `results`, so a single page under-counts spend and per-model
 * totals. We page through every page and concatenate the rows — duplicate dates
 * across page boundaries are fine since all downstream aggregation sums them.
 */
export async function fetchDailyActivity(startDate: string, endDate: string): Promise<DailyActivityResponse> {
  const pageSize = 1000;
  const maxPages = 100; // safety valve against a misbehaving `has_more`
  const results: DailyActivityResult[] = [];
  let metadata: DailyActivityMetadata | undefined;

  for (let page = 1; page <= maxPages; page++) {
    const query = `start_date=${startDate}&end_date=${endDate}&page=${page}&page_size=${pageSize}`;
    const response = await request<DailyActivityResponse>(`/user/daily/activity?${query}`);
    results.push(...(response.results ?? []));
    metadata = response.metadata;

    const totalPages = response.metadata?.total_pages ?? 1;
    const hasMore = response.metadata?.has_more ?? page < totalPages;
    if (!hasMore) break;
  }

  return {
    results,
    metadata: metadata ?? {
      total_spend: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_api_requests: 0,
    },
  };
}

/** Sum the given result rows and normalise total tokens (which some versions omit). */
export function sumResults(results: DailyActivityResult[]): UsageTotals {
  return results.reduce<UsageTotals>(
    (acc, r) => {
      const m = r.metrics;
      const total = m.total_tokens || (m.prompt_tokens ?? 0) + (m.completion_tokens ?? 0);
      acc.spend += m.spend ?? 0;
      acc.totalTokens += total;
      acc.apiRequests += m.api_requests ?? 0;
      return acc;
    },
    { spend: 0, totalTokens: 0, apiRequests: 0 },
  );
}

/** Merge per-model breakdowns across result rows, sorted by spend descending. */
export function mergeModelBreakdown(results: DailyActivityResult[]): Array<{ model: string } & UsageTotals> {
  const merged = new Map<string, UsageTotals>();
  for (const r of results) {
    const models = r.breakdown?.models ?? {};
    for (const [model, b] of Object.entries(models)) {
      // Numbers live under `metrics` on newer LiteLLM, at the top level on older ones.
      const m = b.metrics ?? b;
      const total = m.total_tokens || (m.prompt_tokens ?? 0) + (m.completion_tokens ?? 0);
      const current = merged.get(model) ?? { spend: 0, totalTokens: 0, apiRequests: 0 };
      current.spend += m.spend ?? 0;
      current.totalTokens += total;
      current.apiRequests += m.api_requests ?? 0;
      merged.set(model, current);
    }
  }
  // Most expensive first: by spend, then request count as a tie-breaker.
  return Array.from(merged.entries())
    .map(([model, totals]) => ({ model, ...totals }))
    .sort((a, b) => b.spend - a.spend || b.apiRequests - a.apiRequests);
}

export function formatUSD(amount: number): string {
  // Show more precision for very small amounts so tiny spend is still visible.
  const digits = amount > 0 && amount < 0.01 ? 4 : 2;
  return `$${amount.toFixed(digits)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

export function getBaseUrl(): string {
  return getConfig().baseUrl;
}
