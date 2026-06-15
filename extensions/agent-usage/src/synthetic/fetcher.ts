import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { UsageState } from "../agents/types";
import { SyntheticUsage, SyntheticError } from "./types";
import { resolveSyntheticToken } from "./auth";
import { httpFetch } from "../agents/http";
import { loadAccounts } from "../accounts/storage";
import type { AccountUsageState } from "../accounts/types";
import { readOpencodeAuthToken } from "../agents/opencode-auth";
import { isOpenCodeActiveToken } from "../agents/opencode-active";

const SYNTHETIC_OPENCODE_KEY = "synthetic";

const SYNTHETIC_QUOTAS_API = "https://api.synthetic.new/v2/quotas";

type AgentUsagePrefs = Preferences.AgentUsage;

interface QuotaBucketResponse {
  limit?: number;
  requests?: number;
  renewsAt?: string;
}

interface SyntheticApiResponse {
  subscription?: QuotaBucketResponse;
  search?: {
    hourly?: QuotaBucketResponse;
  };
  freeToolCalls?: QuotaBucketResponse;
}

function validateQuotaBucket(
  bucket: QuotaBucketResponse | undefined,
): bucket is { limit: number; requests: number; renewsAt: string } {
  return (
    !!bucket &&
    typeof bucket.limit === "number" &&
    typeof bucket.requests === "number" &&
    typeof bucket.renewsAt === "string"
  );
}

function parseSyntheticResponse(data: unknown): { usage: SyntheticUsage | null; error: SyntheticError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as SyntheticApiResponse;

    if (!validateQuotaBucket(response.subscription)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid subscription data from Synthetic API" },
      };
    }

    if (!response.search?.hourly || !validateQuotaBucket(response.search.hourly)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid search hourly data from Synthetic API" },
      };
    }

    if (!validateQuotaBucket(response.freeToolCalls)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid free tool calls data from Synthetic API" },
      };
    }

    return {
      usage: {
        subscription: response.subscription,
        search: {
          hourly: response.search.hourly,
        },
        freeToolCalls: response.freeToolCalls,
      },
      error: null,
    };
  } catch (err) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: err instanceof Error ? err.message : "Failed to parse API response",
      },
    };
  }
}

export async function fetchSyntheticUsage(
  token: string,
): Promise<{ usage: SyntheticUsage | null; error: SyntheticError | null }> {
  const { data, error } = await httpFetch({
    url: SYNTHETIC_QUOTAS_API,
    method: "GET",
    token,
    headers: { Accept: "application/json" },
  });
  if (error) return { usage: null, error };
  return parseSyntheticResponse(data);
}

export function useSyntheticUsage(enabled = true): UsageState<SyntheticUsage, SyntheticError> {
  const [usage, setUsage] = useState<SyntheticUsage | null>(null);
  const [error, setError] = useState<SyntheticError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const prefs = getPreferenceValues<AgentUsagePrefs>();
    const token = resolveSyntheticToken((prefs.syntheticApiToken as string | undefined)?.trim() || "");

    if (!token) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "Synthetic token not found. Login via OpenCode (synthetic) or add it in extension settings (Cmd+,).",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchSyntheticUsage(token);
    if (requestId !== requestIdRef.current) return;

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setUsage(null);
      setError(null);
      setIsLoading(false);
      setHasInitialFetch(false);
      return;
    }
    if (!hasInitialFetch) void fetchData();
  }, [enabled, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    if (!enabled) return;
    await fetchData();
  }, [enabled, fetchData]);

  return {
    isLoading: enabled ? isLoading : false,
    usage: enabled ? usage : null,
    error: enabled ? error : null,
    revalidate,
  };
}

/**
 * Returns one UsageState per named Synthetic account stored in LocalStorage.
 * Falls back to the preference/OpenCode token if no accounts are stored.
 *
 * Each entry in the returned array corresponds to one account.
 * The array is stable in order (matches LocalStorage order).
 */
export function useSyntheticAccounts(enabled = true): AccountUsageState<SyntheticUsage, SyntheticError>[] {
  const [accountStates, setAccountStates] = useState<AccountUsageState<SyntheticUsage, SyntheticError>[]>([]);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const prefs = getPreferenceValues<AgentUsagePrefs>();
    const manualAccounts = await loadAccounts("synthetic");

    // Get tokens from different sources
    const preferenceToken = (prefs.syntheticApiToken as string | undefined)?.trim() || "";
    const opencodeToken = readOpencodeAuthToken("synthetic");

    // Build list of all accounts: manual + auto-detected (if not duplicate)
    const accounts = [...manualAccounts];

    // Add preference token as "Manual" if different from manual accounts
    if (preferenceToken && !accounts.some((a) => a.token === preferenceToken)) {
      accounts.push({
        id: "synthetic-pref",
        label: "Manual",
        token: preferenceToken,
      });
    }

    // Add OpenCode token as "Auto-detected" if different from existing
    if (opencodeToken && !accounts.some((a) => a.token === opencodeToken)) {
      accounts.push({
        id: "synthetic-opencode",
        label: "Auto-detected",
        token: opencodeToken,
      });
    }

    // Fallback: if no accounts at all, show not configured
    if (accounts.length === 0) {
      setAccountStates([
        {
          accountId: "none",
          label: "Default",
          token: "",
          isLoading: false,
          usage: null,
          error: {
            type: "not_configured",
            message: "Synthetic token not found. Login via OpenCode (synthetic) or add an account via Manage Accounts.",
          },
          revalidate: async () => {
            await fetchAll();
          },
        },
      ]);
      return;
    }

    // Kick off all fetches in parallel
    const results = await Promise.all(
      accounts.map(async (account) => {
        const result = await fetchSyntheticUsage(account.token);
        return { account, result };
      }),
    );

    if (requestId !== requestIdRef.current) return;

    setAccountStates(
      results.map(({ account, result }) => ({
        accountId: account.id,
        label: account.label,
        token: account.token,
        isLoading: false,
        usage: result.usage,
        error: result.error,
        isOpenCodeActive: isOpenCodeActiveToken(account.token, SYNTHETIC_OPENCODE_KEY),
        revalidate: async () => {
          await fetchAll();
        },
      })),
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setAccountStates([]);
      return;
    }
    void fetchAll();
  }, [enabled, fetchAll]);

  // Set initial loading state only if no data exists
  useEffect(() => {
    if (!enabled) return;
    setAccountStates((prev) =>
      prev.length === 0 || prev.some((s) => s.accountId === "none")
        ? [
            {
              accountId: "loading",
              label: "Loading…",
              token: "",
              isLoading: true,
              usage: null,
              error: null,
              revalidate: async () => {
                await fetchAll();
              },
            },
          ]
        : prev,
    );
  }, [enabled, fetchAll]);

  return accountStates;
}
