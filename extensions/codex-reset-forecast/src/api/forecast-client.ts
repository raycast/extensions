import { parseSnapshotPayload, type ForecastResponse } from "./forecast-schema";

// Public GET function used by the codexreset.org homepage. See .github/DESIGN.md
// for the observed wire contract and the live contract check when upstream changes.
export const FORECAST_URL =
  "https://codexreset.org/_serverFn/265792b9fbf2f0d07fea84fe2c15432450c2afaf3552f5e75c04dc9540f99dbf";

export type ForecastSnapshot = {
  response: ForecastResponse;
  lastSuccessfulRequestAt: string;
};

export interface ForecastStore {
  read(): ForecastSnapshot | undefined;
  write(snapshot: ForecastSnapshot): void;
}

type FetchForecastOptions = {
  store: ForecastStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
};

function snapshotTime(response: ForecastResponse): number {
  return Math.max(Date.parse(response.updatedAt), Date.parse(response.ingestion?.completedAt ?? response.updatedAt));
}

export async function fetchForecast({
  store,
  fetchImpl = fetch,
  now = () => new Date(),
  timeoutMilliseconds = 15_000,
}: FetchForecastOptions): Promise<ForecastSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetchImpl(FORECAST_URL, {
      headers: { Accept: "application/json", "x-tsr-serverFn": "true" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Codex Reset Monitor returned HTTP ${response.status}.`);

    let parsed: ForecastResponse;
    try {
      parsed = parseSnapshotPayload(await response.json());
    } catch {
      throw new Error("Codex Reset Monitor returned an unreadable snapshot. Try refreshing later.");
    }

    // A slower request must not replace a newer snapshot from the other command.
    const current = store.read();
    if (current && snapshotTime(current.response) > snapshotTime(parsed)) return current;

    const snapshot: ForecastSnapshot = { response: parsed, lastSuccessfulRequestAt: now().toISOString() };
    store.write(snapshot);
    return snapshot;
  } catch (error) {
    // A failed refresh does not invalidate a successful snapshot or its check time.
    const cached = store.read();
    if (cached) return cached;
    const warning = controller.signal.aborted
      ? "The request timed out. Try refreshing."
      : error instanceof Error
        ? error.message
        : "The reset monitor could not be reached.";
    throw new Error(warning);
  } finally {
    clearTimeout(timeout);
  }
}
