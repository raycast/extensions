/**
 * Authentication hook for 42 API
 * Manages access token state and authentication flow
 */

import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { ensureAuthenticated } from "../lib/auth";
import { AuthState } from "../lib/types";

export interface UseAuthReturn extends AuthState {
  authenticate: () => Promise<void>;
  clearToken: () => void;
}

export function useAuth(): UseAuthReturn {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const authenticate = useCallback(async () => {
    try {
      setIsAuthenticating(true);
      setError(null);
      const token = await ensureAuthenticated();
      setAccessToken(token);
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Failed to authenticate");
      setError(authError);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: authError.message,
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    setAccessToken(null);
  }, []);

  // Authenticate on mount
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return {
    accessToken,
    isAuthenticating,
    error,
    authenticate,
    clearToken,
  };
}
