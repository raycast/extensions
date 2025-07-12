import { useEffect, useState } from "react";
import { provider } from "../api/oauth";
import { setSpotifyClient } from "../helpers/withSpotifyClient";
import { showToast, Toast } from "@raycast/api";

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  lastAuthError: string | null;
  reAuthenticate: () => Promise<void>;
}

export function useAuthState(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsInitializing(true);
        // Try to authorize - this will use existing token if available
        await provider.authorize();
        setIsAuthenticated(true);
        setLastAuthError(null);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        setLastAuthError(error instanceof Error ? error.message : "Authentication failed");
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const reAuthenticate = async () => {
    try {
      setIsInitializing(true);
      setLastAuthError(null);

      // Force re-authentication
      await setSpotifyClient();

      setIsAuthenticated(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully reconnected to Spotify",
        message: "You can now use the extension normally.",
      });
    } catch (error) {
      console.error("Re-authentication failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Re-authentication failed";
      setLastAuthError(errorMessage);
      setIsAuthenticated(false);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reconnect to Spotify",
        message: "Please try again or check your internet connection.",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return {
    isAuthenticated,
    isInitializing,
    lastAuthError,
    reAuthenticate,
  };
}
