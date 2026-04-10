import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { UsageState } from "../agents/types";
import { KimiUsage, KimiError } from "./types";
import { httpFetch } from "../agents/http";
import { readOpencodeAuthToken } from "../agents/opencode-auth";
import { isOpenCodeActiveToken } from "../agents/opencode-active";
import { loadAccounts } from "../accounts/storage";
import type { AccountUsageState } from "../accounts/types";

const KIMI_OPENCODE_KEY = "kimi-for-coding";

const KIMI_USAGE_API = "https://api.kimi.com/coding/v1/usages";

type AgentUsagePrefs = Preferences.AgentUsage;

// --- API response interfaces ---

interface KimiApiUsageDetail {
  limit: number | string;
  used: number | string;
  remaining: number | string;
  resetTime: string;
}

interface KimiApiResponse {
  usage?: KimiApiUsageDetail;
  limits?: Array<{
    window: { duration: number; timeUnit: string };
    detail: KimiApiUsageDetail;
  }>;
}

// --- Helpers ---

function toInt(value: number | string): number {
  return typeof value === "number" ? value : parseInt(value, 10);
}

function toWindowMinutes(duration: number, timeUnit: string): number {
  if (timeUnit === "TIME_UNIT_HOUR") return duration * 60;
  if (timeUnit === "TIME_UNIT_DAY") return duration * 1440;
  return duration; // TIME_UNIT_MINUTE or unknown
}

// --- Parser ---

function parseKimiApiResponse(data: unknown): { usage: KimiUsage | null; error: KimiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as KimiApiResponse;

    if (!response.usage) {
      return { usage: null, error: { type: "parse_error", message: "No usage field in API response" } };
    }

    const u = response.usage;
    const firstLimit = response.limits?.[0];

    const usage: KimiUsage = {
      limit: toInt(u.limit),
      used: toInt(u.used),
      remaining: toInt(u.remaining),
      resetTime: u.resetTime,
      rateLimit: firstLimit
        ? {
            windowMinutes: toWindowMinutes(firstLimit.window.duration, firstLimit.window.timeUnit),
            limit: toInt(firstLimit.detail.limit),
            used: toInt(firstLimit.detail.used),
            remaining: toInt(firstLimit.detail.remaining),
            resetTime: firstLimit.detail.resetTime,
          }
        : undefined,
    };

    return { usage, error: null };
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

// --- Core fetcher ---

async function fetchKimiUsage(token: string): Promise<{ usage: KimiUsage | null; error: KimiError | null }> {
  const { data, error } = await httpFetch({
    url: KIMI_USAGE_API,
    method: "GET",
    token,
    headers: { Accept: "application/json" },
  });
  if (error) return { usage: null, error };
  return parseKimiApiResponse(data);
}

function resolveKimiTokens(prefs: AgentUsagePrefs): string {
  // Slot 1: manual preference → OpenCode auto-detect
  const pref1 = (prefs.kimiAuthToken as string | undefined)?.trim() || "";
  return pref1 || readOpencodeAuthToken("kimi-for-coding") || "";
}

// --- Dual-source auth hook ---

export function useKimiUsage(enabled = true): UsageState<KimiUsage, KimiError> {
  const [usage, setUsage] = useState<KimiUsage | null>(null);
  const [error, setError] = useState<KimiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const prefs = getPreferenceValues<AgentUsagePrefs>();
    const token = resolveKimiTokens(prefs);

    if (!token) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "Kimi token not found. Login via OpenCode (kimi-for-coding) or add it in extension settings (Cmd+,).",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchKimiUsage(token);
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
 * Returns one UsageState per named Kimi account stored in LocalStorage.
 * Falls back to the preference/OpenCode token if no accounts are stored.
 *
 * Each entry in the returned array corresponds to one account.
 * The array is stable in order (matches LocalStorage order).
 */
export function useKimiAccounts(enabled = true): AccountUsageState<KimiUsage, KimiError>[] {
  // We store per-account state in parallel arrays indexed by accountId.
  // Because hooks can't be called in loops, we fetch all accounts up front
  // and manage state as a single Record keyed by accountId.

  const [accountStates, setAccountStates] = useState<AccountUsageState<KimiUsage, KimiError>[]>([]);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const prefs = getPreferenceValues<AgentUsagePrefs>();
    const manualAccounts = await loadAccounts("kimi");

    // Get auto-detected token from OpenCode
    const autoToken = readOpencodeAuthToken("kimi-for-coding");
    const prefToken = (prefs.kimiAuthToken as string | undefined)?.trim() || "";

    // Build list of all accounts: manual + auto-detected (if not duplicate)
    const accounts = [...manualAccounts];

    // Add preference token as "Manual" if different from manual accounts
    if (prefToken && !accounts.some((a) => a.token === prefToken)) {
      accounts.push({
        id: "kimi-pref",
        label: "Manual",
        token: prefToken,
      });
    }

    // Add auto-detected token as "Auto-detected" if different from existing
    if (autoToken && !accounts.some((a) => a.token === autoToken)) {
      accounts.push({
        id: "kimi-opencode",
        label: "Auto-detected",
        token: autoToken,
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
            message:
              "Kimi token not found. Login via OpenCode (kimi-for-coding) or add an account via Manage Accounts.",
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
        const result = await fetchKimiUsage(account.token);
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
        isOpenCodeActive: isOpenCodeActiveToken(account.token, KIMI_OPENCODE_KEY),
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
