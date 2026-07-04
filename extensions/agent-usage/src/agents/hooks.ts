import { Cache, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import type { UsageState } from "./types";
import type { AccountUsageState } from "../accounts/types";
import { isOpenCodeActiveToken } from "./opencode-active";

export const fetchTtlCache = new Cache({ namespace: "agent-usage-ttl" });
export function getTtlMs(): number {
  const prefs = getPreferenceValues<{ cacheTtl?: string }>();
  const parsed = parseInt(prefs.cacheTtl || "180", 10);
  return (isNaN(parsed) ? 180 : parsed) * 1000;
}

type Preferences = Preferences.AgentUsage;

export function createTokenBasedHook<TUsage, TError extends { type: string; message: string }>(options: {
  preferenceKey: keyof Preferences;
  agentName: string;
  fetcher: (token: string) => Promise<{ usage: TUsage | null; error: TError | null }>;
}) {
  const { preferenceKey, agentName, fetcher } = options;

  return function useTokenBasedHook(enabled = true): UsageState<TUsage, TError> {
    const preferences = getPreferenceValues<Preferences>();
    const token = (preferences[preferenceKey] as string)?.trim() || "";

    const ttlKey = `ttl-${agentName}-${token}`;
    const cachedRaw = fetchTtlCache.get(ttlKey);
    let cachedData;
    let lastFetched = 0;
    if (cachedRaw) {
      if (cachedRaw.startsWith("{")) {
        try {
          cachedData = JSON.parse(cachedRaw);
          lastFetched = cachedData.timestamp || 0;
        } catch {
          /* fallback */
        }
      } else {
        lastFetched = Number(cachedRaw) || 0;
      }
    }
    const isStale = Date.now() - lastFetched > getTtlMs();

    const fetcherFn = useCallback(
      async (agent: string, t: string) => {
        if (!t) {
          return {
            usage: null,
            error: {
              type: "not_configured",
              message: `${agentName} token not configured. Please add it in extension settings (Cmd+,).`,
            } as TError,
            timestamp: Date.now(),
          };
        }
        const result = await fetcher(t);
        const newData = { ...result, timestamp: Date.now() };
        fetchTtlCache.set(ttlKey, JSON.stringify(newData));
        return newData;
      },
      [agentName, fetcher, ttlKey],
    );

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [agentName, token], {
      execute: enabled && isStale,
      keepPreviousData: true,
      initialData: (cachedData || { usage: null, error: null, timestamp: 0 }) as {
        usage: TUsage | null;
        error: TError | null;
        timestamp: number;
      },
    });

    return {
      isLoading: enabled ? (data?.usage ? false : isLoading) : false,
      usage: enabled && data ? data.usage : null,
      error: enabled && data ? data.error : null,
      revalidate: async () => {
        await mutate();
      },
      lastFetchedAt: data?.timestamp,
    };
  };
}

export function createSimpleHook<TUsage, TError>(options: {
  agentName: string;
  fetcher: () => Promise<{ usage: TUsage | null; error: TError | null }>;
}) {
  const { agentName, fetcher } = options;

  return function useSimpleHook(enabled = true): UsageState<TUsage, TError> {
    const ttlKey = `ttl-${agentName}`;
    const cachedRaw = fetchTtlCache.get(ttlKey);
    let cachedData;
    let lastFetched = 0;
    if (cachedRaw) {
      if (cachedRaw.startsWith("{")) {
        try {
          cachedData = JSON.parse(cachedRaw);
          lastFetched = cachedData.timestamp || 0;
        } catch {
          /* fallback */
        }
      } else {
        lastFetched = Number(cachedRaw) || 0;
      }
    }
    const isStale = Date.now() - lastFetched > getTtlMs();

    const fetcherFn = useCallback(
      async (_agentNameArg: string) => {
        void _agentNameArg;
        const result = await fetcher();
        const newData = { ...result, timestamp: Date.now() };
        fetchTtlCache.set(ttlKey, JSON.stringify(newData));
        return newData;
      },
      [fetcher, ttlKey],
    );

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [agentName], {
      execute: enabled && isStale,
      keepPreviousData: true,
      initialData: (cachedData || { usage: null, error: null, timestamp: 0 }) as {
        usage: TUsage | null;
        error: TError | null;
        timestamp: number;
      },
    });

    return {
      isLoading: enabled ? (data?.usage ? false : isLoading) : false,
      usage: enabled && data ? data.usage : null,
      error: enabled && data ? data.error : null,
      revalidate: async () => {
        await mutate();
      },
      lastFetchedAt: data?.timestamp,
    };
  };
}

export function createAccountsHook<
  TUsage,
  TError extends { type: string; message: string },
  TAccount extends { id: string; label: string; token: string; accountId?: string | null },
>(options: {
  agentName: string;
  getAccounts: () => Promise<TAccount[]>;
  fetcher: (account: TAccount) => Promise<{ usage: TUsage | null; error: TError | null }>;
  openCodeKey?: string;
  noAccountsError: TError;
}) {
  return function useAccountsHook(enabled = true): AccountUsageState<TUsage, TError>[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCachedPromise, usePromise } = require("@raycast/utils") as typeof import("@raycast/utils");

    const { data: accounts } = usePromise(options.getAccounts);

    const accountsHash = accounts ? JSON.stringify(accounts.map((a) => a.token)) : "loading";
    const ttlKey = `ttl-${options.agentName}-accounts-${accountsHash}`;
    const cachedRaw = fetchTtlCache.get(ttlKey);
    let cachedData;
    let lastFetched = 0;
    if (cachedRaw) {
      if (cachedRaw.startsWith("[")) {
        try {
          cachedData = JSON.parse(cachedRaw);
          lastFetched = cachedData[0]?.timestamp || 0;
        } catch {
          /* fallback */
        }
      } else {
        lastFetched = Number(cachedRaw) || 0;
      }
    }
    const isStale = Date.now() - lastFetched > getTtlMs();

    const fetcherFn = useCallback(
      async (_agentNameArg: string, _hashArg: string) => {
        void _agentNameArg;
        void _hashArg;
        const accs = accounts || [];
        if (accs.length === 0) {
          return [
            {
              accountId: "none",
              label: "Default",
              token: "",
              usage: null,
              error: options.noAccountsError,
              isOpenCodeActive: false,
              timestamp: Date.now(),
            },
          ];
        }

        const results = await Promise.all(
          accs.map(async (acc) => {
            const res = await options.fetcher(acc);
            return {
              accountId: acc.id,
              label: acc.label,
              token: acc.token,
              usage: res.usage,
              error: res.error,
              isOpenCodeActive: options.openCodeKey ? isOpenCodeActiveToken(acc.token, options.openCodeKey) : false,
              timestamp: Date.now(),
            };
          }),
        );

        fetchTtlCache.set(ttlKey, JSON.stringify(results));
        return results;
      },
      [accounts, options, ttlKey],
    );

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [options.agentName, accountsHash], {
      execute: enabled && isStale && !!accounts,
      keepPreviousData: true,
      initialData: (cachedData || []) as (TAccount & {
        usage: TUsage | null;
        error: TError | null;
        isOpenCodeActive: boolean;
        timestamp: number;
      })[],
    });

    const revalidate = async () => {
      await mutate();
    };

    return (data || []).map((item) => ({
      ...item,
      isLoading: enabled ? (item.usage ? false : isLoading) : false,
      revalidate,
      lastFetchedAt: item.timestamp,
    }));
  };
}
