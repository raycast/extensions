import { Cache, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useRef } from "react";
import type { UsageState } from "./types";
import type { AccountsState, AccountUsageState } from "../accounts/types";
import { isOpenCodeActiveToken } from "./opencode-active";
import {
  allAccountRowsSucceeded,
  hashAuthKey,
  hashAccountAuthKeys,
  isPayloadFresh,
  parseCachedPayload,
  parseTtlSeconds,
  stripAccountTokens,
} from "./usage-cache";
import type { CachedUsagePayload } from "./usage-cache";

// Versioned namespace: bump the suffix whenever the persisted payload shape
// changes so entries written by older extension versions read as cache misses.
const usageCache = new Cache({ namespace: "agent-usage-ttl-v2" });

function getTtlMs(): number {
  const prefs = getPreferenceValues<{ cacheTtl?: string }>();
  return parseTtlSeconds(prefs.cacheTtl) * 1000;
}

function readPayload<TUsage, TError>(agentId: string): CachedUsagePayload<TUsage, TError> | undefined {
  return parseCachedPayload<TUsage, TError>(usageCache.get(agentId));
}

type ErrorLike = { type: string; message: string };

type FetchResult<TUsage, TError> = { usage: TUsage | null; error: TError | null };

/**
 * Factory for provider usage hooks backed by the shared TTL cache.
 *
 * Every mount runs the (cheap, local) auth resolution; the remote fetch only
 * happens when the cached payload is stale, was recorded under different auth
 * material, or was an error. Only successful fetches are persisted, so
 * failures are retried on the next launch. `revalidate` always bypasses the
 * TTL — it only runs on explicit user refresh.
 *
 * A mount renders nothing until the current fetch resolves: the cached payload
 * is consulted inside the fetcher rather than shown synchronously, so a
 * background refresh never flashes the stale previous state before the new one.
 */
export function createUsageHook<TUsage, TError extends ErrorLike>(options: {
  agentId: string;
  fetcher: () => Promise<FetchResult<TUsage, TError>>;
  /** Local auth material (tokens, cookies). A change invalidates the cached payload. */
  resolveAuthKey?: () => Promise<string>;
}) {
  const { agentId, fetcher, resolveAuthKey } = options;

  return function useUsage(enabled = true): UsageState<TUsage, TError> {
    const forceRef = useRef(false);

    const fetcherFn = useCallback(async (): Promise<CachedUsagePayload<TUsage, TError>> => {
      const force = forceRef.current;
      forceRef.current = false;

      const authHash = hashAuthKey(resolveAuthKey ? await resolveAuthKey() : "");
      const cached = readPayload<TUsage, TError>(agentId);
      if (!force && cached && isPayloadFresh(cached, Date.now(), getTtlMs(), authHash)) {
        return cached;
      }

      const result = await fetcher();
      const payload = { ...result, timestamp: Date.now(), authHash };
      if (result.usage !== null && result.error === null) {
        usageCache.set(agentId, JSON.stringify(payload));
      }
      return payload;
    }, []);

    const { data, isLoading, revalidate } = usePromise(fetcherFn, [], { execute: enabled });
    const payload = data;
    const hasContent = Boolean(payload && (payload.usage !== null || payload.error !== null));

    return {
      isLoading: enabled && !hasContent ? isLoading : false,
      usage: enabled && payload ? payload.usage : null,
      error: enabled && payload ? payload.error : null,
      revalidate: async () => {
        if (!enabled) return;
        forceRef.current = true;
        await revalidate();
      },
      lastFetchedAt: payload?.timestamp || undefined,
    };
  };
}

/** Account row shape persisted to the cache — same as the live row minus the token. */
type PersistedAccountRow<TUsage, TError> = {
  accountId: string;
  label: string;
  usage: TUsage | null;
  error: TError | null;
  isOpenCodeActive: boolean;
};

/**
 * Factory for multi-account usage hooks. Same caching rules as
 * `createUsageHook`; the auth material is the ordered account identity list,
 * and rows are persisted without their tokens (the cache is unencrypted on
 * disk) — tokens are re-joined from the freshly resolved accounts on every
 * mount.
 */
export function createAccountsHook<
  TUsage,
  TError extends ErrorLike,
  TAccount extends { id: string; label: string; token: string },
>(options: {
  agentId: string;
  getAccounts: () => Promise<TAccount[]>;
  fetcher: (account: TAccount) => Promise<FetchResult<TUsage, TError>>;
  resolveAccountAuthKey?: (account: TAccount) => string;
  openCodeKey?: string;
  noAccountsError: TError;
}) {
  const { agentId, getAccounts, fetcher, resolveAccountAuthKey, openCodeKey, noAccountsError } = options;
  const cacheKey = `${agentId}-accounts`;

  type Row = PersistedAccountRow<TUsage, TError> & { token: string };
  type Payload = CachedUsagePayload<Row[], TError>;

  return function useAccounts(enabled = true): AccountsState<TUsage, TError> {
    const forceRef = useRef(false);

    const fetcherFn = useCallback(async (): Promise<Payload> => {
      const force = forceRef.current;
      forceRef.current = false;

      const accounts = await getAccounts();
      const authHash = hashAccountAuthKeys(accounts, resolveAccountAuthKey);

      const cached = readPayload<PersistedAccountRow<TUsage, TError>[], TError>(cacheKey);
      if (!force && cached && isPayloadFresh(cached, Date.now(), getTtlMs(), authHash)) {
        const tokensById = new Map(accounts.map((account) => [account.id, account.token]));
        return {
          ...cached,
          usage: (cached.usage ?? []).map((row) => ({ ...row, token: tokensById.get(row.accountId) ?? "" })),
        };
      }

      if (accounts.length === 0) {
        // Not-configured is recomputed on every mount (no network involved), never cached.
        const rows: Row[] = [
          {
            accountId: "none",
            label: "Default",
            token: "",
            usage: null,
            error: noAccountsError,
            isOpenCodeActive: false,
          },
        ];
        return { usage: rows, error: null, timestamp: Date.now(), authHash };
      }

      const rows: Row[] = await Promise.all(
        accounts.map(async (account) => {
          const result = await fetcher(account);
          return {
            accountId: account.id,
            label: account.label,
            token: account.token,
            usage: result.usage,
            error: result.error,
            isOpenCodeActive: openCodeKey ? isOpenCodeActiveToken(account.token, openCodeKey) : false,
          };
        }),
      );

      const payload: Payload = { usage: rows, error: null, timestamp: Date.now(), authHash };
      if (allAccountRowsSucceeded(rows)) {
        usageCache.set(cacheKey, JSON.stringify({ ...payload, usage: stripAccountTokens(rows) }));
      }
      return payload;
    }, []);

    const { data, isLoading, revalidate } = usePromise(fetcherFn, [], { execute: enabled });
    const payload = data;
    const rows = enabled ? (payload?.usage ?? []) : [];

    const revalidateAll = async () => {
      if (!enabled) return;
      forceRef.current = true;
      await revalidate();
    };

    const accounts: AccountUsageState<TUsage, TError>[] = rows.map((row) => ({
      accountId: row.accountId,
      label: row.label,
      token: row.token,
      usage: row.usage,
      error: row.error,
      isOpenCodeActive: row.isOpenCodeActive,
      isLoading: false,
      revalidate: revalidateAll,
      lastFetchedAt: payload?.timestamp || undefined,
    }));

    return {
      accounts,
      isLoading: enabled && rows.length === 0 ? isLoading : false,
      revalidate: revalidateAll,
    };
  };
}
