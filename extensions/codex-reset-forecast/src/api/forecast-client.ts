import { parseForecastResponse, type ForecastResponse } from "./forecast-schema";

export const FORECAST_URL = "https://www.willcodexquotareset.com/api/forecast";

export type ForecastSnapshot = {
  response: ForecastResponse;
  etag?: string;
  lastSuccessfulRequestAt: string;
};

export interface ForecastStore {
  read(): ForecastSnapshot | undefined;
  readLastSuccessfulRequestAt(snapshot: ForecastSnapshot): string | undefined;
  write(snapshot: ForecastSnapshot): void;
  writeLastSuccessfulRequestAt(snapshot: ForecastSnapshot, timestamp: string): void;
}

type ForecastLoadResult = {
  response: ForecastResponse;
  lastSuccessfulRequestAt: string;
  isStale: boolean;
  warning?: string;
};

type FetchForecastOptions = {
  store: ForecastStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
  url?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchForecast({
  store,
  fetchImpl = fetch,
  now = () => new Date(),
  timeoutMilliseconds = 10_000,
  url = FORECAST_URL,
}: FetchForecastOptions): Promise<ForecastLoadResult> {
  const cached = store.read();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const headers = new Headers({ Accept: "application/json" });
    if (cached?.etag) headers.set("If-None-Match", cached.etag);

    const response = await fetchImpl(url, { headers, signal: controller.signal });

    if (response.status === 304) {
      if (!cached) throw new Error("Forecast API returned 304 without cached data");

      // A 304 carries no representation and must never rewrite the shared snapshot.
      // Only a 200 response owns the cached forecast and ETag.
      store.writeLastSuccessfulRequestAt(cached, now().toISOString());
      const latest = store.read() ?? cached;
      return {
        response: latest.response,
        lastSuccessfulRequestAt: store.readLastSuccessfulRequestAt(latest) ?? latest.lastSuccessfulRequestAt,
        isStale: false,
      };
    }

    if (!response.ok) throw new Error(`Forecast API returned ${response.status}`);

    const parsed = parseForecastResponse(await response.json());
    const lastSuccessfulRequestAt = now().toISOString();
    const snapshot: ForecastSnapshot = {
      response: parsed,
      etag: response.headers.get("etag") ?? undefined,
      lastSuccessfulRequestAt,
    };
    store.write(snapshot);
    store.writeLastSuccessfulRequestAt(snapshot, lastSuccessfulRequestAt);

    return {
      response: parsed,
      lastSuccessfulRequestAt,
      isStale: false,
    };
  } catch (error) {
    if (!cached) throw error;

    const latest = store.read() ?? cached;

    return {
      response: latest.response,
      lastSuccessfulRequestAt: store.readLastSuccessfulRequestAt(latest) ?? latest.lastSuccessfulRequestAt,
      isStale: true,
      warning: errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
