import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";

import type { AccountsState, AccountUsageState } from "../accounts/types.ts";
import { isOpenCodeActiveToken } from "./opencode-active.ts";
import type { UsageState } from "./types.ts";
import {
  allAccountRowsSucceeded,
  hashAuthKey,
  hashAccountAuthKeys,
  isPayloadFresh,
  cacheReadTtl,
  parseCachedPayload,
  parseTtlSeconds,
  stripAccountTokens,
} from "./usage-cache.ts";
import type { CachedUsagePayload } from "./usage-cache.ts";

// Versioned namespace: bump the suffix whenever the persisted payload shape
// changes so entries written by older extension versions read as cache misses.
const usageCache = new Cache({ namespace: "agent-usage-ttl-v3" });

function getTtlMs(background: boolean): number {
  const prefs = getPreferenceValues<{ cacheTtl?: string; backgroundRefreshInterval?: string }>();
  return cacheReadTtl(
    parseTtlSeconds(prefs.cacheTtl) * 1000,
    Number(prefs.backgroundRefreshInterval ?? "1") * 60_000,
    background,
  );
}

function readPayload<TUsage, TError>(agentId: string): CachedUsagePayload<TUsage, TError> | undefined {
  return parseCachedPayload<TUsage, TError>(usageCache.get(agentId));
}

// Display snapshots include unavailable providers and partial account results.
// They never decide whether a request can be skipped; the success cache does.
function readDisplayPayload<TUsage, TError>(key: string): CachedUsagePayload<TUsage, TError> | undefined {
  return readPayload<TUsage, TError>(`${key}-display`) ?? readPayload<TUsage, TError>(key);
}

type ErrorLike = { type: string; message: string };

type FetchResult<TUsage, TError> = { usage: TUsage | null; error: TError | null };

/**
 * The view displays cached provider state while checking local credentials.
 * Scheduled refreshes apply the configured interval; manual refresh bypasses it.
 * The loader is also exposed for the no-view background command.
 */
export function createUsageHook<TUsage, TError extends ErrorLike>(options: {
  agentId: string;
  fetcher: (authKey: string) => Promise<FetchResult<TUsage, TError>>;
  /** Local auth material (tokens, cookies). A change invalidates the cached payload. */
  resolveAuthKey?: () => Promise<string>;
}) {
  const { agentId, fetcher, resolveAuthKey } = options;

  async function resolve(force: boolean, background: boolean): Promise<CachedUsagePayload<TUsage, TError>> {
    const authKey = resolveAuthKey ? await resolveAuthKey() : "";
    const authHash = hashAuthKey(authKey);
    const cached = readPayload<TUsage, TError>(agentId);
    if (!force && cached && isPayloadFresh(cached, Date.now(), getTtlMs(background), authHash)) {
      return cached;
    }

    const result = await fetcher(authKey);
    const payload = { ...result, timestamp: Date.now(), authHash };
    if (result.usage !== null && result.error === null) {
      usageCache.set(agentId, JSON.stringify(payload));
    }
    return payload;
  }

  async function load(force = false, background = true): Promise<CachedUsagePayload<TUsage, TError>> {
    const payload = await resolve(force, background);
    usageCache.set(`${agentId}-display`, JSON.stringify(payload));
    return payload;
  }

  function useUsage(enabled = true): UsageState<TUsage, TError> {
    const forceRef = useRef(false);
    // Shell-based credential discovery can take seconds. Show the last result
    // while validating credentials, then replace it with the resolved result.
    // Scheduled commands must still wait for their refresh to finish.
    const [initialPayload] = useState(() =>
      enabled && environment.commandName === "agent-usage" && getTtlMs(false) > 0
        ? readDisplayPayload<TUsage, TError>(agentId)
        : undefined,
    );

    const fetcherFn = useCallback(async (): Promise<CachedUsagePayload<TUsage, TError>> => {
      const force = forceRef.current;
      forceRef.current = false;
      return load(force, environment.commandName !== "agent-usage");
    }, []);

    const { data, isLoading, revalidate } = usePromise(fetcherFn, [], { execute: enabled });
    const payload = data ?? initialPayload;
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
  }

  return Object.assign(useUsage, { refresh: load });
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

  async function resolve(force: boolean, background: boolean): Promise<Payload> {
    const accounts = await getAccounts();
    const authHash = hashAccountAuthKeys(accounts, (account) =>
      JSON.stringify([account.id, resolveAccountAuthKey ? resolveAccountAuthKey(account) : account.token]),
    );

    const cached = readPayload<PersistedAccountRow<TUsage, TError>[], TError>(cacheKey);
    if (!force && cached && isPayloadFresh(cached, Date.now(), getTtlMs(background), authHash)) {
      const accountsById = new Map(accounts.map((account) => [account.id, account]));
      return {
        ...cached,
        usage: (cached.usage ?? []).map((row) => {
          const account = accountsById.get(row.accountId);
          const token = account?.token ?? "";
          return {
            ...row,
            label: account?.label ?? row.label,
            token,
            isOpenCodeActive: openCodeKey ? isOpenCodeActiveToken(token, openCodeKey) : false,
          };
        }),
      };
    }

    if (accounts.length === 0) {
      // Recheck missing accounts on every launch, even when their display row is cached.
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
  }

  async function load(force = false, background = true): Promise<Payload> {
    const payload = await resolve(force, background);
    usageCache.set(
      `${cacheKey}-display`,
      JSON.stringify({ ...payload, usage: payload.usage ? stripAccountTokens(payload.usage) : null }),
    );
    return payload;
  }

  function useAccounts(enabled = true): AccountsState<TUsage, TError> {
    const forceRef = useRef(false);
    const [initialPayload] = useState(() => {
      if (!enabled || environment.commandName !== "agent-usage" || getTtlMs(false) <= 0) return undefined;
      const cached = readDisplayPayload<PersistedAccountRow<TUsage, TError>[], TError>(cacheKey);
      if (!cached) return undefined;
      // Only display metadata is cached. Credential actions become available
      // once discovery has supplied current tokens.
      return { ...cached, usage: cached.usage?.map((row) => ({ ...row, token: "" })) ?? null };
    });

    const fetcherFn = useCallback(async (): Promise<Payload> => {
      const force = forceRef.current;
      forceRef.current = false;
      return load(force, environment.commandName !== "agent-usage");
    }, []);

    const { data, isLoading, revalidate } = usePromise(fetcherFn, [], { execute: enabled });
    const payload = data ?? initialPayload;
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
  }

  return Object.assign(useAccounts, { refresh: load });
}
