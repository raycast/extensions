import { getDataFreshness } from "../domain/freshness";
import type { ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { RequestTimeoutError } from "../utils/request-timeout";
import type { StatusCache } from "./status-cache";

const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const DEFAULT_CONCURRENCY = 6;

interface RefreshProviderOptions {
  cache: StatusCache;
  force?: boolean;
  isCurrent?(providerId: string): boolean;
  now?: () => number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface RefreshProvidersOptions extends RefreshProviderOptions {
  concurrency?: number;
}

export function recordFromCache(providerId: string, cache: StatusCache, now = Date.now()): ProviderStatusRecord {
  const snapshot = cache.getSnapshot(providerId);
  return {
    providerId,
    snapshot,
    freshness: getDataFreshness(snapshot, now),
    refreshState: "idle",
  };
}

export async function refreshProviderStatus(
  provider: ProviderDefinition,
  options: RefreshProviderOptions,
): Promise<ProviderStatusRecord> {
  const now = options.now ?? Date.now;
  const cachedSnapshot = options.cache.getSnapshot(provider.id);
  const cachedFreshness = getDataFreshness(cachedSnapshot, now());

  if (!options.force && cachedFreshness === "fresh") {
    return {
      providerId: provider.id,
      snapshot: cachedSnapshot,
      freshness: cachedFreshness,
      refreshState: "idle",
    };
  }

  const timeoutController = new AbortController();
  const abortFromParent = () => timeoutController.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abortFromParent, { once: true });
  if (options.signal?.aborted) abortFromParent();
  const timeout = setTimeout(
    () => timeoutController.abort(new RequestTimeoutError("Status request timed out")),
    options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  );

  try {
    const snapshot = await provider.adapter.fetch(timeoutController.signal);
    if (options.isCurrent?.(provider.id) !== false) options.cache.setSnapshot(snapshot);

    return {
      providerId: provider.id,
      snapshot,
      freshness: "fresh",
      refreshState: "idle",
    };
  } catch (error) {
    return {
      providerId: provider.id,
      snapshot: cachedSnapshot,
      freshness: getDataFreshness(cachedSnapshot, now()),
      refreshState: "failed",
      refreshError: errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromParent);
  }
}

export async function refreshProviderStatuses(
  providers: readonly ProviderDefinition[],
  options: RefreshProvidersOptions,
): Promise<ProviderStatusRecord[]> {
  if (providers.length === 0) return [];

  const results = new Array<ProviderStatusRecord>(providers.length);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, providers.length));
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < providers.length) {
      const index = nextIndex++;
      const provider = providers[index];
      const result = await refreshProviderStatus(provider, options);
      results[index] = result;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Could not retrieve provider status";
}
