import { useCallback, useEffect, useState } from "react";
import { hasStoredTeakSession } from "./oauth";
import { getPreferences } from "./preferences";

export interface TeakAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Resolve whether the extension has usable credentials. A grandfathered API key
 * (from preferences) is used as-is; otherwise we check for an already-stored
 * OAuth session WITHOUT starting sign-in. Opening a command therefore never
 * launches the browser OAuth overlay on its own — the visible "Sign in with
 * Browser" action is the explicit entry point, and callers re-check via
 * `refresh()` after it completes. Callers render a loading state while
 * `isLoading` is true.
 */
export function useTeakAuth(): TeakAuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const refresh = useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      setIsLoading(true);

      // Grandfathered API key takes precedence — no browser sign-in needed.
      if (getPreferences().apiKey?.trim()) {
        if (active) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        return;
      }

      let authorized = false;
      try {
        // Read-only: reports an existing stored session without prompting, so
        // navigation never triggers the OAuth overlay as a side effect.
        authorized = await hasStoredTeakSession();
      } catch {
        authorized = false;
      }

      if (active) {
        setIsAuthenticated(authorized);
        setIsLoading(false);
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [reloadNonce]);

  return { isAuthenticated, isLoading, refresh };
}
