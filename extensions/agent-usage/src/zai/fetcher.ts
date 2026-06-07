import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { ZaiUsage, ZaiError, ZaiLimitEntry, ZaiUsageDetail } from "./types";
import { httpFetch } from "../agents/http";
import { resolveZaiAuthTokens } from "./auth";
import { isOpenCodeActiveToken } from "../agents/opencode-active";
import { loadAccounts } from "../accounts/storage";
import type { AccountUsageState } from "../accounts/types";

const ZAI_OPENCODE_KEY = "zai-coding-plan";

type Preferences = Preferences.AgentUsage;

const ZAI_USAGE_API = "https://api.z.ai/api/monitor/usage/quota/limit";

async function fetchZaiUsage(token: string): Promise<{ usage: ZaiUsage | null; error: ZaiError | null }> {
  const { data, error } = await httpFetch({ url: ZAI_USAGE_API, token, headers: { Accept: "application/json" } });
  if (error) return { usage: null, error };
  return parseZaiApiResponse(data);
}

interface ZaiApiLimitEntry {
  type: string;
  unit: number;
  number: number;
  usage: number | null;
  currentValue: number | null;
  remaining: number | null;
  percentage: number;
  usageDetails?: Array<{ modelCode: string; usage: number }> | null;
  nextResetTime: number | null;
}

interface ZaiApiResponse {
  code: number;
  msg: string;
  success: boolean;
  data?: {
    limits?: ZaiApiLimitEntry[];
    planName?: string;
    plan?: string;
    plan_type?: string;
    packageName?: string;
  };
}

function unitToLabel(unit: number): string {
  switch (unit) {
    case 1:
      return "days";
    case 3:
      return "hours";
    case 5:
      return "minutes";
    default:
      return "units";
  }
}

function buildWindowDescription(unit: number, num: number): string {
  return `${num} ${unitToLabel(unit)}`;
}

function parseLimitEntry(entry: ZaiApiLimitEntry): ZaiLimitEntry {
  const usageDetails: ZaiUsageDetail[] = (entry.usageDetails ?? []).map((d) => ({
    modelCode: d.modelCode,
    usage: d.usage,
  }));

  const resetTime = entry.nextResetTime != null ? new Date(entry.nextResetTime).toISOString() : null;

  return {
    type: entry.type as "TOKENS_LIMIT" | "TIME_LIMIT",
    windowDescription: buildWindowDescription(entry.unit, entry.number),
    usage: entry.usage ?? null,
    currentValue: entry.currentValue ?? null,
    remaining: entry.remaining ?? null,
    percentage: entry.percentage,
    usageDetails,
    resetTime,
  };
}

function parseZaiApiResponse(data: unknown): { usage: ZaiUsage | null; error: ZaiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as ZaiApiResponse;

    if (response.success !== true || response.code !== 200) {
      return { usage: null, error: { type: "api_error", message: response.msg || "API returned an error" } };
    }

    const limits = response.data?.limits;

    if (!limits || !Array.isArray(limits)) {
      return { usage: null, error: { type: "parse_error", message: "No limits data found in API response" } };
    }

    const tokenEntry = limits.find((l) => l.type === "TOKENS_LIMIT");
    const timeEntry = limits.find((l) => l.type === "TIME_LIMIT");

    const planName =
      response.data?.planName ?? response.data?.plan ?? response.data?.plan_type ?? response.data?.packageName ?? null;

    const usage: ZaiUsage = {
      tokenLimit: tokenEntry ? parseLimitEntry(tokenEntry) : null,
      timeLimit: timeEntry ? parseLimitEntry(timeEntry) : null,
      planName,
    };

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}

export function useZaiUsage(enabled = true) {
  const [usage, setUsage] = useState<ZaiUsage | null>(null);
  const [error, setError] = useState<ZaiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const preferences = getPreferenceValues<Preferences>();
    const preferenceToken = preferences.zaiApiToken?.trim() || "";
    const { allTokens } = await resolveZaiAuthTokens({ preferenceToken });

    if (allTokens.length === 0) {
      setUsage(null);
      setError({
        type: "not_configured",
        message: "z.ai token not configured. Add it in extension settings (Cmd+,) or set up via CLI.",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    let lastError: ZaiError | null = null;
    let successUsage: ZaiUsage | null = null;

    for (const token of allTokens) {
      const result = await fetchZaiUsage(token);
      if (requestId !== requestIdRef.current) return;
      if (result.usage) {
        successUsage = result.usage;
        lastError = null;
        break;
      }
      lastError = result.error;
    }

    setUsage(successUsage);
    setError(lastError);
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

    if (!hasInitialFetch) {
      void fetchData();
    }
  }, [enabled, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    if (!enabled) {
      return;
    }

    await fetchData();
  }, [enabled, fetchData]);

  return {
    isLoading: enabled ? isLoading : false,
    usage: enabled ? usage : null,
    error: enabled ? error : null,
    revalidate,
  };
}

export function useZaiAccounts(enabled = true): AccountUsageState<ZaiUsage, ZaiError>[] {
  const [accountStates, setAccountStates] = useState<AccountUsageState<ZaiUsage, ZaiError>[]>([]);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const preferences = getPreferenceValues<Preferences>();
    const manualAccounts = await loadAccounts("zai");

    // Get all auto-detected tokens
    const preferenceToken = preferences.zaiApiToken?.trim() || "";
    const { allTokens: autoTokens } = await resolveZaiAuthTokens({ preferenceToken });

    // Build list of all accounts: manual + auto-detected (if not duplicate)
    const accounts = [...manualAccounts];

    // Add auto-detected tokens as separate accounts if not already present
    for (let i = 0; i < autoTokens.length; i++) {
      const token = autoTokens[i];
      if (!accounts.some((a) => a.token === token)) {
        const isManualPref = i === 0 && preferenceToken !== "";
        const id = isManualPref ? "zai-pref" : i === 0 ? "zai-auto" : `zai-auto-${i}`;
        const label = isManualPref ? "Manual" : "Auto-detected";
        accounts.push({ id, label, token });
      }
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
            message: "z.ai token not configured. Add an account via Manage Accounts or set ZAI_API_KEY in your shell.",
          },
          revalidate: async () => {
            await fetchAll();
          },
        },
      ]);
      return;
    }

    const results = await Promise.all(
      accounts.map(async (account) => {
        const result = await fetchZaiUsage(account.token);
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
        isOpenCodeActive: isOpenCodeActiveToken(account.token, ZAI_OPENCODE_KEY),
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
