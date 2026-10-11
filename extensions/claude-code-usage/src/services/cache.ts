import { Cache } from "@raycast/api";
import { Usage } from "../types";
import { CACHE_KEY_AUTH, CACHE_KEY_USAGE } from "../utils/constants";
import { removeStoredTokens } from "./oauth";

const cache = new Cache();

export function getCachedAuthState(): string | undefined {
  return cache.get(CACHE_KEY_AUTH);
}

export function setCachedAuthState(
  state: "authenticated" | "unauthenticated",
): void {
  cache.set(CACHE_KEY_AUTH, state);
}

export function getCachedUsage(): Usage | null {
  const raw = cache.get(CACHE_KEY_USAGE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Usage>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      spend: parsed.spend
        ? {
            ...parsed.spend,
            resetsAt: parsed.spend.resetsAt ?? null,
          }
        : null,
      rateLimits: parsed.rateLimits ?? {
        fiveHour: null,
        sevenDay: null,
        sevenDaySonnet: null,
      },
      plan: parsed.plan ?? null,
      organization: parsed.organization ?? null,
      rateLimitTier: parsed.rateLimitTier ?? null,
      email: parsed.email ?? null,
      fetchedAt: parsed.fetchedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function setCachedUsage(usage: Usage): void {
  cache.set(CACHE_KEY_USAGE, JSON.stringify(usage));
}

export function clearCache(): void {
  cache.remove(CACHE_KEY_USAGE);
  cache.remove(CACHE_KEY_AUTH);
}

export function subscribeToUsageCache(onChange: () => void): () => void {
  return cache.subscribe((key) => {
    if (key === CACHE_KEY_USAGE || key === CACHE_KEY_AUTH) {
      onChange();
    }
  });
}

export async function logout(): Promise<void> {
  await removeStoredTokens();
  clearCache();
}
