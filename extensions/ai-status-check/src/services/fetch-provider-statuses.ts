import { getDataFreshness } from "../domain/freshness";
import { assertProviderSnapshot } from "../domain/snapshot-validation";
import type { ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { RequestTimeoutError } from "../utils/request-timeout";
import type { StatusCache } from "./status-cache";

const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;

interface RefreshProviderOptions {
  cache: StatusCache;
  force?: boolean;
  isCurrent?(providerId: string): boolean;
  now?: () => number;
  signal?: AbortSignal;
  timeoutMs?: number;
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
    options.signal?.throwIfAborted();
    assertProviderSnapshot(snapshot, provider.id);
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

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Could not retrieve provider status";
}
