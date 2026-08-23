import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Session } from "../types";
import { normalizeInstanceUrl } from "../lib/url";

export function useAuthSession() {
  const prefs = getPreferenceValues<Preferences>();
  const [sessionData, setSessionData] = useCachedState<Session | null>("auth-session", null);
  const [lastToken, setLastToken] = useCachedState<string | null>("auth-last-token", null);
  // isLoading/error are ephemeral request state, not persisted state — using useCachedState here
  // would leave isLoading stuck at true if Raycast is closed mid-request, with no way to recover.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidToken = !!prefs.apiToken;
  const tokenChanged = hasValidToken && prefs.apiToken !== lastToken;

  const fetchSession = async (apiToken: string | null) => {
    if (!apiToken) {
      setSessionData(null);
      setLastToken(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${normalizeInstanceUrl(prefs.instanceUrl)}/api/auth/get-session`, {
        headers: {
          "x-api-key": apiToken,
        },
      });

      if (response.status === 401) {
        throw new Error("Unauthorized: invalid or expired API token");
      }
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const session = (await response.json()) as Session;

      setSessionData(session);
      setLastToken(apiToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setSessionData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Side effects must run in an effect, never during render — calling the
  // cached-state setters inline caused a "setState while rendering" loop.
  useEffect(() => {
    if (tokenChanged) {
      fetchSession(prefs.apiToken || null);
    } else if (!hasValidToken && lastToken !== null) {
      setSessionData(null);
      setLastToken(null);
      setError(null);
    }
  }, [prefs.apiToken]);

  const revalidate = () => {
    fetchSession(prefs.apiToken || null);
  };

  return {
    session: sessionData,
    isLoading,
    error,
    revalidate,
    hasValidToken,
    tokenChanged,
    clearSession: () => {
      setSessionData(null);
      setLastToken(null);
      setError(null);
    },
  };
}
