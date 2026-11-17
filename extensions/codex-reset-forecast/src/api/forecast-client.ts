import { parseSourceResponses, timestampSchema, type ForecastResponse } from "./forecast-schema";

export const WEBSITE_URL = "https://codex-reset.com/";
export const FORECAST_URL = `${WEBSITE_URL}api/forecast`;
export const TIMELINE_URL = `${WEBSITE_URL}api/timeline`;
export const SOURCE_CREDIT = "Data: codex-reset.com";
export const USER_AGENT = "codex-reset-forecast/1.0 (+https://github.com/Astatine-213-Tian/raycast)";
const MIN_REFRESH_MILLISECONDS = 60_000;

export type ForecastSnapshot = {
  response: ForecastResponse;
  lastSuccessfulRequestAt: string;
};
export type RefreshState = { nextRequestAt: string; error?: string };
export interface ForecastStore {
  read(): ForecastSnapshot | undefined;
  write(snapshot: ForecastSnapshot): void;
  readRefreshState(): RefreshState | undefined;
  writeRefreshState(state: RefreshState): void;
}
type FetchForecastOptions = {
  store: ForecastStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
  onCacheFallback?: (error: Error) => void | Promise<void>;
};
function retryTime(value: string | null, now: number): number {
  if (!value) return now + MIN_REFRESH_MILLISECONDS;
  const time = /^\d+$/.test(value) ? now + Number(value) * 1000 : Date.parse(value);
  return Number.isFinite(time) ? Math.max(time, now + MIN_REFRESH_MILLISECONDS) : now + MIN_REFRESH_MILLISECONDS;
}

const inFlight = new WeakMap<ForecastStore, Promise<ForecastSnapshot>>();

export function fetchForecast(options: FetchForecastOptions): Promise<ForecastSnapshot> {
  const pending = inFlight.get(options.store);
  if (pending) return pending;
  const request = refreshForecast(options).finally(() => inFlight.delete(options.store));
  inFlight.set(options.store, request);
  return request;
}

async function refreshForecast({
  store,
  fetchImpl = fetch,
  now = () => new Date(),
  timeoutMilliseconds = 15_000,
  onCacheFallback,
}: FetchForecastOptions): Promise<ForecastSnapshot> {
  const startedAt = now().getTime();
  const refresh = store.readRefreshState();
  if (refresh && Date.parse(refresh.nextRequestAt) > startedAt) {
    let cached = store.read();
    let sharedError = refresh.error;
    // Another command runtime may own the first request. Wait for its shared
    // cache write without spending another request, bounded in case it exits.
    const waitUntil = Date.now() + Math.min(timeoutMilliseconds, Date.parse(refresh.nextRequestAt) - startedAt);
    while (!cached && !sharedError && Date.now() < waitUntil) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, waitUntil - Date.now())));
      cached = store.read();
      sharedError = store.readRefreshState()?.error;
    }
    if (cached) {
      if (sharedError) await onCacheFallback?.(new Error(sharedError));
      return cached;
    }
    throw new Error(sharedError ?? "The source allows one refresh per minute. Try again shortly.");
  }
  let nextRequestAt = new Date(startedAt + MIN_REFRESH_MILLISECONDS).toISOString();
  store.writeRefreshState({ nextRequestAt });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const results = await Promise.allSettled(
      [FORECAST_URL, TIMELINE_URL].map((url) =>
        fetchImpl(url, {
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
          signal: controller.signal,
        }),
      ),
    );
    const responses = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    const limited = responses.filter((response) => response.status === 429);
    if (limited.length) {
      nextRequestAt = new Date(
        Math.max(...limited.map((response) => retryTime(response.headers.get("Retry-After"), now().getTime()))),
      ).toISOString();
      throw new Error(
        `codex-reset.com is rate limiting requests. Retry after ${new Date(nextRequestAt).toLocaleTimeString()}.`,
      );
    }
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected) throw rejected.reason;
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`codex-reset.com returned HTTP ${failed.status}.`);
    let parsed: ForecastResponse;
    try {
      const [forecast, timeline] = await Promise.all(responses.map((response) => response.json()));
      parsed = parseSourceResponses(forecast, timeline);
    } catch {
      throw new Error("codex-reset.com returned unreadable forecast or timeline data. Try refreshing later.");
    }
    const expiries = responses
      .map((response) => timestampSchema.safeParse(response.headers.get("x-published-expires-at")))
      .filter((result) => result.success)
      .map((result) => Date.parse(result.data!));
    if (expiries.length) parsed.publishedExpiresAt = new Date(Math.min(...expiries)).toISOString();
    // Never replace either half of the shared snapshot with an older published copy.
    const current = store.read();
    if (
      current &&
      (Date.parse(current.response.updatedAt) > Date.parse(parsed.updatedAt) ||
        Date.parse(current.response.timelineUpdatedAt) > Date.parse(parsed.timelineUpdatedAt))
    )
      return current;
    const snapshot = { response: parsed, lastSuccessfulRequestAt: now().toISOString() };
    store.write(snapshot);
    return snapshot;
  } catch (error) {
    const warning = controller.signal.aborted
      ? "The request timed out. Try refreshing."
      : error instanceof Error
        ? error.message
        : "codex-reset.com could not be reached.";
    store.writeRefreshState({ nextRequestAt, error: warning });
    const cached = store.read();
    if (cached) {
      await onCacheFallback?.(new Error(warning));
      return cached;
    }
    throw new Error(warning);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
