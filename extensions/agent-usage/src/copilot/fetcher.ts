import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveCopilotAuthTokens, shouldFallbackToPreferenceToken } from "./auth";
import type { CopilotError, CopilotUsage } from "./types";

const COPILOT_USAGE_API = "https://api.github.com/copilot_internal/user";

type Preferences = Preferences.AgentUsage;

interface CopilotQuotaSnapshot {
  percent_remaining?: number | string;
  entitlement?: number | string;
  remaining?: number | string;
}

interface CopilotResponse {
  copilot_plan?: string;
  quota_reset_date?: string;
  quota_snapshots?: {
    premium_interactions?: CopilotQuotaSnapshot;
    chat?: CopilotQuotaSnapshot;
  };
  monthly_quotas?: {
    completions?: number | string;
    chat?: number | string;
  };
  limited_user_quotas?: {
    completions?: number | string;
    chat?: number | string;
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPlan(plan: string | undefined): string {
  const normalized = (plan || "Unknown").trim();
  if (!normalized) return "Unknown";
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPercentRemaining(snapshot?: CopilotQuotaSnapshot): number | null {
  if (!snapshot) return null;

  const directPercent = toNumber(snapshot.percent_remaining);
  if (directPercent !== null) {
    return clampPercent(directPercent);
  }

  const entitlement = toNumber(snapshot.entitlement);
  const remaining = toNumber(snapshot.remaining);
  if (entitlement && entitlement > 0 && remaining !== null) {
    return clampPercent((remaining / entitlement) * 100);
  }

  return null;
}

function deriveFromMonthlyAndLimited(monthly?: number | string, limited?: number | string): number | null {
  const monthlyNum = toNumber(monthly);
  const limitedNum = toNumber(limited);
  if (!monthlyNum || monthlyNum <= 0 || limitedNum === null) return null;
  // `limited_user_quotas` behaves like the remaining amount for the month, not the used amount.
  // This matches CodexBar's Copilot model fallback, which derives percentRemaining from
  // limited / monthly when `quota_snapshots` is missing.
  return clampPercent((limitedNum / monthlyNum) * 100);
}

function parseCopilotResponse(data: unknown): { usage: CopilotUsage | null; error: CopilotError | null } {
  if (!data || typeof data !== "object") {
    return { usage: null, error: { type: "parse_error", message: "Invalid Copilot API response format" } };
  }

  const response = data as CopilotResponse;

  const premiumRemaining =
    getPercentRemaining(response.quota_snapshots?.premium_interactions) ??
    deriveFromMonthlyAndLimited(response.monthly_quotas?.completions, response.limited_user_quotas?.completions);

  const chatRemaining =
    getPercentRemaining(response.quota_snapshots?.chat) ??
    deriveFromMonthlyAndLimited(response.monthly_quotas?.chat, response.limited_user_quotas?.chat);

  if (premiumRemaining === null && chatRemaining === null) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: "Copilot usage response does not contain usable quota data.",
      },
    };
  }

  return {
    usage: {
      plan: formatPlan(response.copilot_plan),
      premiumRemaining,
      chatRemaining,
      quotaResetDate: response.quota_reset_date || null,
    },
    error: null,
  };
}

async function fetchCopilotUsage(token: string): Promise<{ usage: CopilotUsage | null; error: CopilotError | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(COPILOT_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: `token ${token.trim()}`,
        Accept: "application/json",
        "Editor-Version": "vscode/1.96.2",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
        "User-Agent": "GitHubCopilotChat/0.26.7",
        "X-Github-Api-Version": "2025-04-01",
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Copilot token expired or invalid. Please update it in extension settings.",
        },
      };
    }

    if (!response.ok) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const data = await response.json();
    return parseCopilotResponse(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: { type: "network_error", message: "Request timeout. Please check your network connection." },
      };
    }

    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useCopilotUsage(enabled = true) {
  const [usage, setUsage] = useState<CopilotUsage | null>(null);
  const [error, setError] = useState<CopilotError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const preferences = getPreferenceValues<Preferences>();
    const preferenceToken = preferences.copilotAuthToken?.trim() || "";
    const {
      primaryToken,
      localToken,
      preferenceToken: cleanedPreferenceToken,
    } = await resolveCopilotAuthTokens({
      preferenceToken,
    });

    if (!primaryToken) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setUsage(null);
      setError({
        type: "not_configured",
        message: "Copilot is not configured. Set GH_TOKEN/GITHUB_TOKEN or add a token in extension settings (Cmd+,).",
      });
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    let result = await fetchCopilotUsage(primaryToken);
    if (requestId !== requestIdRef.current) {
      return;
    }

    if (
      cleanedPreferenceToken &&
      shouldFallbackToPreferenceToken({
        localToken,
        preferenceToken: cleanedPreferenceToken,
        errorType: result.error?.type,
      })
    ) {
      result = await fetchCopilotUsage(cleanedPreferenceToken);
      if (requestId !== requestIdRef.current) {
        return;
      }
    }

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
