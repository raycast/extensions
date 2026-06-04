/**
 * React hook for managing bunq session state.
 *
 * This hook handles the complete session lifecycle:
 * - Initial setup on first use
 * - Session refresh for returning users
 * - Automatic retry on authentication failures
 * - Session reset/disconnect functionality
 *
 * @module hooks/useBunqSession
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { hasCompletedSetup, clearAll, credentialsMatchPreferences } from "../lib/storage";
import { refreshSessionWithFallback, performFullSetupWithMutex, resetSessionManager } from "../lib/session-manager";
import { BunqApiError } from "../api/client";
import { RequestOptions } from "../api/client";
import { logger } from "../lib/logger";

/**
 * The bunq session state and methods.
 */
export interface BunqSession {
  /** Whether the session is currently loading */
  isLoading: boolean;
  /** Whether the session is configured and ready for API calls */
  isConfigured: boolean;
  /** Whether the user has logged out (credentials cleared, not reconnecting) */
  isLoggedOut: boolean;
  /** The current session token (undefined if not authenticated) */
  sessionToken: string | undefined;
  /** The current user ID (undefined if not authenticated) */
  userId: string | undefined;
  /** The RSA private key for request signing */
  privateKey: string | undefined;
  /** Any error that occurred during session management */
  error: Error | undefined;
  /** Refreshes the current session */
  refresh: () => Promise<void>;
  /** Logs out by clearing all credentials (does NOT auto-reconnect) */
  logout: () => Promise<void>;
  /** Reconnects by clearing credentials and performing fresh setup */
  reconnect: () => Promise<void>;
  /** Gets the request options for API calls */
  getRequestOptions: () => RequestOptions;
}

/**
 * Hook for managing bunq session state.
 *
 * Automatically initializes the session on mount, handling both first-time
 * setup and session refresh for returning users.
 *
 * @returns The session state and methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const session = useBunqSession();
 *
 *   if (session.isLoading) {
 *     return <List isLoading />;
 *   }
 *
 *   if (session.error) {
 *     return <ErrorView error={session.error} onRetry={session.refresh} />;
 *   }
 *
 *   // Use session.userId, session.getRequestOptions(), etc.
 * }
 * ```
 */
export function useBunqSession(): BunqSession {
  const [isLoading, setIsLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const [privateKey, setPrivateKey] = useState<string | undefined>();
  const [error, setError] = useState<Error | undefined>();

  // Refs for immediate access to credentials (bypasses async React state)
  const sessionTokenRef = useRef<string | undefined>(undefined);
  const privateKeyRef = useRef<string | undefined>(undefined);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      setLoggedOut(false);

      logger.debug("Loading session");

      // Check if preferences (API key or environment) have changed since last setup
      const preferencesMatch = await credentialsMatchPreferences();
      if (!preferencesMatch) {
        logger.info("Preferences changed, clearing old credentials");
        await clearAll();
        resetSessionManager();
      }

      // Check if we have completed initial setup (API key, installation, device)
      const hasSetup = await hasCompletedSetup();

      if (hasSetup) {
        // Have installation - always refresh to get a fresh session token
        // (stored session tokens may be expired)
        logger.info("Refreshing session to get fresh token");
        await showToast({
          style: Toast.Style.Animated,
          title: "Connecting to bunq...",
        });

        // Use mutex-protected refresh with automatic 401 fallback
        const credentials = await refreshSessionWithFallback();

        // Update refs immediately for sync access
        sessionTokenRef.current = credentials.sessionToken;
        privateKeyRef.current = credentials.privateKey;
        // Update state for React re-renders
        setSessionToken(credentials.sessionToken);
        setUserId(credentials.userId);
        setPrivateKey(credentials.privateKey);
        setConfigured(true);

        await showToast({
          style: Toast.Style.Success,
          title: "Connected to bunq",
        });
      } else {
        // First time - perform full setup (mutex-protected against React double-mount)
        logger.info("Performing first-time setup");
        await showToast({
          style: Toast.Style.Animated,
          title: "Setting up bunq connection...",
        });

        const credentials = await performFullSetupWithMutex();

        // Update refs immediately for sync access
        sessionTokenRef.current = credentials.sessionToken;
        privateKeyRef.current = credentials.privateKey;
        // Update state for React re-renders
        setSessionToken(credentials.sessionToken);
        setUserId(credentials.userId);
        setPrivateKey(credentials.privateKey);
        setConfigured(true);

        await showToast({
          style: Toast.Style.Success,
          title: "Connected to bunq",
          message: "Setup complete",
        });
      }
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      logger.error("Session load failed", errorInstance);
      setError(errorInstance);
      setConfigured(false);

      await showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: errorInstance.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refreshes the current session.
   *
   * Uses mutex-protected refresh to prevent race conditions when multiple
   * components try to refresh simultaneously. If refresh fails with 401,
   * automatically attempts a full setup.
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      logger.info("Refreshing session (mutex-protected)");

      // Use the mutex-protected refresh with automatic 401 fallback
      const credentials = await refreshSessionWithFallback();

      // Update refs FIRST for immediate sync access (critical for withSessionRefresh)
      sessionTokenRef.current = credentials.sessionToken;
      privateKeyRef.current = credentials.privateKey;

      // Update state for React re-renders
      setSessionToken(credentials.sessionToken);
      setUserId(credentials.userId);
      setPrivateKey(credentials.privateKey);
      setConfigured(true);

      logger.info("Session refresh completed, state updated");
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      logger.error("Session refresh failed", errorInstance);
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logs out by clearing all stored credentials.
   *
   * Prompts for confirmation before clearing. Does NOT auto-reconnect.
   * The user will need to manually reconnect or re-open the extension.
   */
  const logout = async () => {
    const confirmed = await confirmAlert({
      title: "Logout from bunq",
      message: "This will clear all stored credentials. You will need to reconnect to use the extension. Continue?",
      primaryAction: {
        title: "Logout",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);

      logger.info("Logging out");
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging out...",
      });

      // Clear all stored credentials and reset session manager
      await clearAll();
      resetSessionManager();

      // Clear refs immediately
      sessionTokenRef.current = undefined;
      privateKeyRef.current = undefined;
      // Reset state
      setSessionToken(undefined);
      setUserId(undefined);
      setPrivateKey(undefined);
      setConfigured(false);
      setLoggedOut(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Logged out",
        message: "Credentials cleared successfully",
      });
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      logger.error("Logout failed", errorInstance);
      setError(errorInstance);

      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: errorInstance.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reconnects by clearing all stored credentials and performing fresh setup.
   *
   * Prompts for confirmation before clearing.
   */
  const reconnect = async () => {
    const confirmed = await confirmAlert({
      title: "Reconnect to bunq",
      message: "This will clear all stored credentials and create a new connection. Continue?",
      primaryAction: {
        title: "Reconnect",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      setLoggedOut(false);

      logger.info("Reconnecting");
      await showToast({
        style: Toast.Style.Animated,
        title: "Reconnecting...",
      });

      // Clear all stored credentials and reset session manager
      await clearAll();
      resetSessionManager();

      // Clear refs immediately
      sessionTokenRef.current = undefined;
      privateKeyRef.current = undefined;
      // Reset state
      setSessionToken(undefined);
      setUserId(undefined);
      setPrivateKey(undefined);
      setConfigured(false);

      // Perform fresh setup (mutex-protected)
      const credentials = await performFullSetupWithMutex();

      // Update refs immediately for sync access
      sessionTokenRef.current = credentials.sessionToken;
      privateKeyRef.current = credentials.privateKey;
      // Update state for React re-renders
      setSessionToken(credentials.sessionToken);
      setUserId(credentials.userId);
      setPrivateKey(credentials.privateKey);
      setConfigured(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: "Successfully reconnected to bunq",
      });
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      logger.error("Reconnect failed", errorInstance);
      setError(errorInstance);

      await showToast({
        style: Toast.Style.Failure,
        title: "Reconnect failed",
        message: errorInstance.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gets the request options for making API calls.
   *
   * Uses refs for immediate access to credentials after refresh,
   * avoiding race conditions with async React state updates.
   *
   * @returns RequestOptions object with auth token and private key
   */
  const getRequestOptions = useCallback((): RequestOptions => {
    const options: RequestOptions = {};
    if (sessionTokenRef.current) options.authToken = sessionTokenRef.current;
    if (privateKeyRef.current) options.privateKey = privateKeyRef.current;
    return options;
  }, []);

  useEffect(() => {
    loadSession();
  }, []);

  return {
    isLoading,
    isConfigured: configured,
    isLoggedOut: loggedOut,
    sessionToken,
    userId,
    privateKey,
    error,
    refresh,
    logout,
    reconnect,
    getRequestOptions,
  };
}

/**
 * Wraps an async operation with automatic session refresh on 401 errors.
 *
 * If the operation fails with a 401 Unauthorized error, this function
 * will refresh the session and retry the operation once.
 *
 * @param session - The bunq session from useBunqSession
 * @param operation - The async operation to perform
 * @returns The result of the operation
 * @throws The original error if retry also fails
 *
 * @example
 * ```tsx
 * const result = await withSessionRefresh(session, () =>
 *   getPayments(session.userId!, accountId, session.getRequestOptions())
 * );
 * ```
 */
export async function withSessionRefresh<T>(session: BunqSession, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof BunqApiError && err.statusCode === 401) {
      logger.info("Operation failed with 401, refreshing session and retrying");
      await session.refresh();
      return await operation();
    }
    throw err;
  }
}
