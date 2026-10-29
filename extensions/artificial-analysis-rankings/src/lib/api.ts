import { finiteMetric, isRecord, type LeaderboardSnapshot, type Model } from "./models";

export const MODELS_ENDPOINT = "https://artificialanalysis.ai/api/v2/language/models/free";
export const LEADERBOARD_URL = "https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index";
export const API_KEY_URL = "https://artificialanalysis.ai/api-key-management-redirect";
export const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 100;
const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000;

export type ErrorKind =
  "authentication" | "forbidden" | "rate-limit" | "network" | "timeout" | "invalid-data" | "server";

export class LeaderboardError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = "LeaderboardError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof LeaderboardError ? error.message : "Could not load model rankings. Try refreshing.";
}

function invalidData(): LeaderboardError {
  return new LeaderboardError(
    "invalid-data",
    "Artificial Analysis returned incomplete or unexpected data. Try refreshing.",
  );
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw invalidData();
  return value.trim();
}

function optionalObject(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (!isRecord(value)) throw invalidData();
  return value;
}

function parseModel(value: unknown): Model {
  if (!isRecord(value) || !isRecord(value.model_creator) || !isRecord(value.evaluations)) throw invalidData();
  const pricing = optionalObject(value.pricing);
  const performance = optionalObject(value.performance);
  return {
    id: requiredText(value.id),
    name: requiredText(value.name),
    slug: requiredText(value.slug),
    creator: requiredText(value.model_creator.name),
    creatorId: requiredText(value.model_creator.id),
    intelligence: finiteMetric(value.evaluations.artificial_analysis_intelligence_index),
    coding: finiteMetric(value.evaluations.artificial_analysis_coding_index),
    inputPrice: finiteMetric(pricing.price_1m_input_tokens),
    outputPrice: finiteMetric(pricing.price_1m_output_tokens),
    speed: finiteMetric(performance.median_output_tokens_per_second),
    latency: finiteMetric(performance.median_time_to_first_token_seconds),
  };
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parsePage(value: unknown, expectedPage: number) {
  if (!isRecord(value) || !isRecord(value.pagination) || !Array.isArray(value.data)) throw invalidData();
  const { page, page_size: pageSize, total_pages: totalPages, has_more: hasMore } = value.pagination;
  const indexVersion = finiteMetric(value.intelligence_index_version);
  if (
    page !== expectedPage ||
    !positiveInteger(pageSize) ||
    typeof totalPages !== "number" ||
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0 ||
    totalPages > MAX_PAGES ||
    page > Math.max(1, totalPages) ||
    hasMore !== page < totalPages ||
    value.data.length > pageSize ||
    (totalPages > 1 && value.data.length === 0) ||
    (totalPages === 0 && value.data.length !== 0) ||
    indexVersion === null ||
    indexVersion <= 0
  ) {
    throw invalidData();
  }
  return { models: value.data.map(parseModel), pageSize, totalPages, hasMore, indexVersion };
}

function retryTime(headers: Headers, now: number): number {
  const candidates: number[] = [];
  const retryAfter = headers.get("Retry-After");
  if (retryAfter?.trim()) {
    const seconds = Number(retryAfter);
    candidates.push(Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1000 : Date.parse(retryAfter));
  }
  const reset = headers.get("X-RateLimit-Reset");
  if (reset?.trim()) candidates.push(Number(reset) * 1000);
  const valid = candidates.filter((time) => Number.isFinite(time) && time >= now);
  return valid.length ? Math.max(...valid) : now + DEFAULT_COOLDOWN_MS;
}

function rateLimitError(retryAt: number): LeaderboardError {
  return new LeaderboardError("rate-limit", "Artificial Analysis's request limit has been reached.", retryAt);
}

export interface FetchResult {
  snapshot: LeaderboardSnapshot;
  retryAt?: number;
}

export interface FetchOptions {
  fetcher?: typeof fetch;
  now?: () => number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function fetchLeaderboard(apiKey: string, options: FetchOptions = {}): Promise<FetchResult> {
  const key = apiKey.trim();
  if (!key)
    throw new LeaderboardError("authentication", "Add your Artificial Analysis API key in extension preferences.");
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const models: Model[] = [];
  const ids = new Set<string>();
  let firstPage: ReturnType<typeof parsePage> | undefined;

  for (let page = 1; ; page++) {
    options.signal?.throwIfAborted();
    const timeoutController = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;
    try {
      const url = new URL(MODELS_ENDPOINT);
      url.searchParams.set("page", String(page));
      const response = await fetcher(url, { headers: { "x-api-key": key, Accept: "application/json" }, signal });
      if (response.status === 401) {
        throw new LeaderboardError("authentication", "Your API key was rejected. Update it in extension preferences.");
      }
      if (response.status === 403) {
        throw new LeaderboardError(
          "forbidden",
          "This key cannot access the free models endpoint. Check your API account.",
        );
      }
      if (response.status === 429) throw rateLimitError(retryTime(response.headers, now()));
      if (!response.ok) {
        throw new LeaderboardError(
          "server",
          `Artificial Analysis returned HTTP ${response.status}. Try refreshing later.`,
        );
      }
      const body: unknown = await response.json().catch(() => {
        throw invalidData();
      });
      const result = parsePage(body, page);
      if (
        firstPage &&
        (result.indexVersion !== firstPage.indexVersion ||
          result.totalPages !== firstPage.totalPages ||
          result.pageSize !== firstPage.pageSize)
      ) {
        throw invalidData();
      }
      firstPage ??= result;
      for (const model of result.models) {
        if (ids.has(model.id)) throw invalidData();
        ids.add(model.id);
        models.push(model);
      }
      const quotaExhausted = response.headers.get("X-RateLimit-Remaining")?.trim() === "0";
      const retryAt = quotaExhausted ? retryTime(response.headers, now()) : undefined;
      if (!result.hasMore) {
        options.signal?.throwIfAborted();
        return { snapshot: { models, indexVersion: result.indexVersion, fetchedAt: now() }, retryAt };
      }
      if (retryAt !== undefined) throw rateLimitError(retryAt);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (timedOut)
        throw new LeaderboardError("timeout", "Artificial Analysis took too long to respond. Try refreshing.");
      if (error instanceof LeaderboardError) throw error;
      throw new LeaderboardError("network", "Could not reach Artificial Analysis. Check your internet connection.");
    } finally {
      clearTimeout(timer);
    }
  }
}
