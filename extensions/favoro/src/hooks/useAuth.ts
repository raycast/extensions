import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  authorize as oauthAuthorize,
  logout as oauthLogout,
  getAccessToken as oauthGetAccessToken,
  isAuthenticated as oauthIsAuthenticated,
} from "../lib/oauth";
import { clearCache } from "../lib/cache";
import type { UseAuthResult } from "../types";

/**
 * Hook for managing authentication state and actions.
 */
export function useAuth(): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Check authentication status on mount
  useEffect(() => {
    async function checkAuth(): Promise<void> {
      try {
        const authenticated = await oauthIsAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to check auth status"));
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const authorize = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(undefined);

    try {
      await oauthAuthorize();
      setIsAuthenticated(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: "Successfully connected to FAVORO",
      });
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Authorization failed");
      setError(authError);
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: authError.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(undefined);

    try {
      // Clear cache before logout to ensure no stale data remains
      await clearCache();
      await oauthLogout();
      setIsAuthenticated(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Disconnected",
        message: "Successfully disconnected from FAVORO",
      });
    } catch (err) {
      const logoutError = err instanceof Error ? err : new Error("Logout failed");
      setError(logoutError);
      await showToast({
        style: Toast.Style.Failure,
        title: "Disconnect Failed",
        message: logoutError.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      return await oauthGetAccessToken();
    } catch (err) {
      const tokenError = err instanceof Error ? err : new Error("Failed to get access token");
      setError(tokenError);
      setIsAuthenticated(false);
      throw tokenError;
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    authorize,
    logout,
    getAccessToken,
  };
}
