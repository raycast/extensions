import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Session } from "../types";

export function useAuthSession() {
  const prefs = getPreferenceValues<Preferences>();
  const [sessionData, setSessionData] = useCachedState<Session | null>("auth-session", null);
  const [lastToken, setLastToken] = useCachedState<string | null>("auth-last-token", null);
  const [isLoading, setIsLoading] = useCachedState<boolean>("auth-loading", false);
  const [error, setError] = useCachedState<string | null>("auth-error", null);

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
      const response = await fetch(`${prefs.instanceUrl}/api/auth/get-session`, {
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

  if (tokenChanged) {
    fetchSession(prefs.apiToken || null);
  }

  const revalidate = () => {
    fetchSession(prefs.apiToken || null);
  };

  if (!hasValidToken && lastToken !== null) {
    setSessionData(null);
    setLastToken(null);
    setError(null);
  }

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
