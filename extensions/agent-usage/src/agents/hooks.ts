import { Cache } from "@raycast/api";
import type { AccountUsageState } from "../accounts/types";
import { isOpenCodeActiveToken } from "./opencode-active";

export const fetchTtlCache = new Cache({ namespace: "agent-usage-ttl" });
export function getTtlMs(): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getPreferenceValues } = require("@raycast/api") as typeof import("@raycast/api");
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPreferenceValues } = require("@raycast/api") as typeof import("@raycast/api");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCachedPromise } = require("@raycast/utils") as typeof import("@raycast/utils");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCallback } = require("react") as typeof import("react");

    const preferences = getPreferenceValues<Preferences>();
    const token = (preferences[preferenceKey] as string)?.trim() || "";

    const ttlKey = `ttl-${agentName}-${token}`;
    const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
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
        fetchTtlCache.set(ttlKey, String(Date.now()));
        return { ...result, timestamp: Date.now() };
      },
      [agentName, fetcher, ttlKey],
    );

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [agentName, token], {
      execute: enabled && isStale,
      keepPreviousData: true,
      initialData: { usage: null, error: null, timestamp: 0 },
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCachedPromise } = require("@raycast/utils") as typeof import("@raycast/utils");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCallback } = require("react") as typeof import("react");

    const ttlKey = `ttl-${agentName}`;
    const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
    const isStale = Date.now() - lastFetched > getTtlMs();

    const fetcherFn = useCallback(async () => {
      const result = await fetcher();
      fetchTtlCache.set(ttlKey, String(Date.now()));
      return { ...result, timestamp: Date.now() };
    }, [fetcher, ttlKey]);

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [agentName], {
      execute: enabled && isStale,
      keepPreviousData: true,
      initialData: { usage: null, error: null, timestamp: 0 },
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
  TAccount extends { id: string; label: string; token: string; accountId?: string },
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCallback } = require("react") as typeof import("react");

    const { data: accounts } = usePromise(options.getAccounts);

    const accountsHash = accounts ? JSON.stringify(accounts.map((a) => a.token)) : "loading";
    const ttlKey = `ttl-${options.agentName}-accounts-${accountsHash}`;
    const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
    const isStale = Date.now() - lastFetched > getTtlMs();

    const fetcherFn = useCallback(async () => {
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

      fetchTtlCache.set(ttlKey, String(Date.now()));
      return results;
    }, [accounts, options, ttlKey]);

    const { data, isLoading, mutate } = useCachedPromise(fetcherFn, [options.agentName, accountsHash], {
      execute: enabled && isStale && !!accounts,
      keepPreviousData: true,
      initialData: [],
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
