import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { ZaiUsage, ZaiError } from "./types";
import { parseZaiApiResponse } from "./parser";
import { httpFetch } from "../agents/http";
import { resolveZaiAuthTokens } from "./auth";

import { loadAccounts } from "../accounts/storage";

import { createAccountsHook } from "../agents/hooks";

const ZAI_OPENCODE_KEY = "zai-coding-plan";

type Preferences = Preferences.AgentUsage;

const ZAI_USAGE_API = "https://api.z.ai/api/monitor/usage/quota/limit";

async function fetchZaiUsage(token: string): Promise<{ usage: ZaiUsage | null; error: ZaiError | null }> {
  const { data, error } = await httpFetch({ url: ZAI_USAGE_API, token, headers: { Accept: "application/json" } });
  if (error) return { usage: null, error };
  return parseZaiApiResponse(data);
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

export const useZaiAccounts = createAccountsHook<ZaiUsage, ZaiError, { id: string; label: string; token: string }>({
  agentName: "zai",
  getAccounts: async () => {
    const preferences = getPreferenceValues<Preferences>();
    const manualAccounts = await loadAccounts("zai");
    const preferenceToken = preferences.zaiApiToken?.trim() || "";
    const { allTokens: autoTokens } = await resolveZaiAuthTokens({ preferenceToken });
    const accounts = [...manualAccounts];
    for (let i = 0; i < autoTokens.length; i++) {
      const token = autoTokens[i];
      if (!accounts.some((a) => a.token === token)) {
        const isManualPref = i === 0 && preferenceToken !== "";
        const id = isManualPref ? "zai-pref" : i === 0 ? "zai-auto" : `zai-auto-${i}`;
        const label = isManualPref ? "Manual" : "Auto-detected";
        accounts.push({ id, label, token });
      }
    }
    return accounts;
  },
  fetcher: async (acc) => fetchZaiUsage(acc.token),
  openCodeKey: ZAI_OPENCODE_KEY,
  noAccountsError: {
    type: "not_configured",
    message: "z.ai token not configured. Add an account via Manage Accounts or set ZAI_API_KEY in your shell.",
  },
});
