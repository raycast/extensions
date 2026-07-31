import { launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { shouldRefreshQuote } from "./market-format";
import { MarketRequestError } from "./market-http";
import { assetFromId } from "./market-ids";
import {
  getCachedQuotes,
  getQuoteStatuses,
  getWatchlist,
  saveCachedQuotes,
  saveQuoteStatuses,
} from "./market-storage";
import { Asset, RefreshFailure, RefreshReport } from "./market-types";
import { fetchQuote } from "./providers";

const REFRESH_LOCK_KEY = "refresh-lock.v1";

const PROVIDER_TTLS_MS: Record<Asset["kind"], number> = {
  stock: 2 * 60_000,
  crypto: 5 * 60_000,
  token: 2 * 60_000,
  polymarket: 2 * 60_000,
  binance: 60_000,
  binanceperp: 60_000,
};

export async function refreshQuotes(
  ids?: string[],
  options: { force?: boolean } = {},
): Promise<RefreshReport> {
  return withRefreshLock(() => refreshQuotesUnlocked(ids, options));
}

async function refreshQuotesUnlocked(
  ids?: string[],
  options: { force?: boolean } = {},
): Promise<RefreshReport> {
  const watchlist = ids ?? (await getWatchlist());
  const cached = await getCachedQuotes();
  const statuses = await getQuoteStatuses();
  const now = Date.now();
  const dueIds = watchlist.filter((id) => {
    const asset = assetFromId(id);
    return asset
      ? shouldRefreshQuote(
          cached[id],
          statuses[id],
          PROVIDER_TTLS_MS[asset.kind],
          options.force,
          now,
        )
      : false;
  });
  const skippedIds = watchlist.filter((id) => !dueIds.includes(id));
  const results = await allSettledWithConcurrency(dueIds, 8, fetchQuote);

  const next =
    ids === undefined
      ? Object.fromEntries(
          watchlist.flatMap((id) => (cached[id] ? [[id, cached[id]]] : [])),
        )
      : { ...cached };
  const failures: RefreshFailure[] = [];
  const updatedIds: string[] = [];
  const nextStatuses =
    ids === undefined
      ? Object.fromEntries(
          watchlist.flatMap((id) => (statuses[id] ? [[id, statuses[id]]] : [])),
        )
      : { ...statuses };

  results.forEach((result, index) => {
    const id = dueIds[index];
    const asset = assetFromId(id);
    const attemptedAt = new Date().toISOString();
    if (result.status === "fulfilled" && result.value) {
      next[id] = {
        ...result.value,
        lastAttemptAt: attemptedAt,
        lastSuccessAt: attemptedAt,
        error: undefined,
        retryAfterAt: undefined,
      };
      nextStatuses[id] = {
        lastAttemptAt: attemptedAt,
        lastSuccessAt: attemptedAt,
      };
      updatedIds.push(id);
      return;
    }

    const error =
      result.status === "rejected"
        ? normalizeRefreshError(result.reason)
        : { message: "No quote returned" };
    failures.push({
      id,
      provider: asset?.provider ?? "Unknown provider",
      message: error.message,
      status: error.status,
    });
    const retryAfterAt = new Date(
      now + (error.retryAfterMs ?? failureCooldownMs(error.status)),
    ).toISOString();
    nextStatuses[id] = {
      ...nextStatuses[id],
      lastAttemptAt: attemptedAt,
      error: error.message,
      retryAfterAt,
    };
    if (next[id]) {
      next[id] = {
        ...next[id],
        lastAttemptAt: attemptedAt,
        error: error.message,
        retryAfterAt,
      };
    }
  });

  await saveCachedQuotes(next);
  await saveQuoteStatuses(nextStatuses);
  return { quotes: next, updatedIds, failures, skippedIds };
}

// Force the menu-bar command to re-render after a mutation instead of waiting
// for its one-minute interval. Disabled menu-bar commands are a safe no-op.
export async function refreshMenuBar(options?: { renderOnly?: boolean }) {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
      context: options?.renderOnly ? { renderOnly: true } : undefined,
    });
  } catch {
    // The menu-bar command is disabled or has not been activated yet.
  }
}

async function withRefreshLock<Value>(work: () => Promise<Value>) {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await LocalStorage.getItem<string>(REFRESH_LOCK_KEY);
    const [currentOwner, expiresRaw] = current?.split("|") ?? [];
    const expiresAt = Number(expiresRaw);
    if (
      !currentOwner ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      await LocalStorage.setItem(
        REFRESH_LOCK_KEY,
        `${owner}|${Date.now() + 15_000}`,
      );
      const confirmed = await LocalStorage.getItem<string>(REFRESH_LOCK_KEY);
      if (confirmed?.startsWith(`${owner}|`)) {
        try {
          return await work();
        } finally {
          const latest = await LocalStorage.getItem<string>(REFRESH_LOCK_KEY);
          if (latest?.startsWith(`${owner}|`)) {
            await LocalStorage.removeItem(REFRESH_LOCK_KEY);
          }
        }
      }
    }
    await wait(50);
  }
  throw new Error("Another Ticker Bar refresh is already running");
}

function normalizeRefreshError(error: unknown): {
  message: string;
  status?: number;
  retryAfterMs?: number;
} {
  if (error instanceof MarketRequestError) {
    return {
      message: error.message,
      status: error.status,
      retryAfterMs: error.retryAfterMs,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Unknown refresh error",
  };
}

function failureCooldownMs(status?: number) {
  if (status === 429) return 5 * 60_000;
  if (status && status >= 500) return 2 * 60_000;
  return 10 * 60_000;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function allSettledWithConcurrency<Input, Output>(
  values: Input[],
  concurrency: number,
  load: (value: Input) => Promise<Output>,
): Promise<PromiseSettledResult<Output>[]> {
  const results = new Array<PromiseSettledResult<Output>>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = {
          status: "fulfilled",
          value: await load(values[index]),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}
