import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { UsageState } from "../agents/types";
import { SyntheticUsage, SyntheticError } from "./types";

import { createAccountsHook } from "../agents/hooks";
import { resolveSyntheticToken } from "./auth";
import { httpFetch } from "../agents/http";
import { loadAccounts } from "../accounts/storage";

import { readOpencodeAuthToken } from "../agents/opencode-auth";

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

export const useSyntheticAccounts = createAccountsHook<
  SyntheticUsage,
  SyntheticError,
  { id: string; label: string; token: string }
>({
  agentName: "synthetic",
  getAccounts: async () => {
    const prefs = getPreferenceValues<AgentUsagePrefs>();
    const manualAccounts = await loadAccounts("synthetic");
    const preferenceToken = (prefs.syntheticApiToken as string | undefined)?.trim() || "";
    const opencodeToken = readOpencodeAuthToken("synthetic");
    const accounts = [...manualAccounts];
    if (preferenceToken && !accounts.some((a) => a.token === preferenceToken)) {
      accounts.push({ id: "synthetic-pref", label: "Manual", token: preferenceToken });
    }
    if (opencodeToken && !accounts.some((a) => a.token === opencodeToken)) {
      accounts.push({ id: "synthetic-opencode", label: "Auto-detected", token: opencodeToken });
    }
    return accounts;
  },
  fetcher: async (acc) => fetchSyntheticUsage(acc.token),
  openCodeKey: SYNTHETIC_OPENCODE_KEY,
  noAccountsError: {
    type: "not_configured",
    message: "Synthetic token not found. Login via OpenCode (synthetic) or add an account via Manage Accounts.",
  },
});
