/**
 * Centralized session manager with refresh mutex.
 *
 * This module provides a singleton session manager that prevents race conditions
 * when multiple components try to refresh the session simultaneously.
 *
 * @module lib/session-manager
 */

import { refreshSession as performRefresh, performFullSetup } from "../api/auth";
import { getSessionToken, getUserId, getAllCredentials } from "./storage";
import { BunqApiError } from "../api/client";
import { logger } from "./logger";

/**
 * Session credentials returned after a successful refresh.
 */
export interface SessionCredentials {
  sessionToken: string;
  userId: string;
  privateKey: string;
}

/**
 * Internal state for the session manager.
 */
let refreshPromise: Promise<SessionCredentials> | null = null;
let setupPromise: Promise<SessionCredentials> | null = null;
let lastRefreshTime = 0;

// Minimum time between refreshes to prevent rapid-fire refresh attempts (5 seconds)
const MIN_REFRESH_INTERVAL_MS = 5000;

/**
 * Refreshes the session with mutex protection.
 *
 * If a refresh is already in progress, this will return the same promise
 * rather than starting a new refresh. This prevents multiple components
 * from triggering simultaneous session refreshes.
 *
 * @returns Promise resolving to the new session credentials
 */
export async function refreshSessionWithMutex(): Promise<SessionCredentials> {
  const now = Date.now();

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    logger.debug("Session refresh already in progress, waiting for it");
    return refreshPromise;
  }

  // If we just refreshed, return current credentials to prevent rapid refreshes
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL_MS) {
    logger.debug("Session was recently refreshed, returning current credentials");
    const credentials = await getAllCredentials();
    return {
      sessionToken: credentials.sessionToken || "",
      userId: credentials.userId || "",
      privateKey: credentials.rsaPrivateKey || "",
    };
  }

  // Start a new refresh with mutex lock
  logger.info("Starting session refresh with mutex lock");

  refreshPromise = (async () => {
    try {
      await performRefresh();

      const [newToken, newUserId] = await Promise.all([getSessionToken(), getUserId()]);
      const credentials = await getAllCredentials();

      lastRefreshTime = Date.now();

      logger.info("Session refresh completed successfully");

      return {
        sessionToken: newToken || "",
        userId: newUserId || "",
        privateKey: credentials.rsaPrivateKey || "",
      };
    } finally {
      // Clear the promise so future refreshes can proceed
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Refreshes the session with automatic fallback to full setup on 401.
 *
 * This wraps refreshSessionWithMutex and handles 401 errors by attempting
 * a full setup (re-registration) before retrying.
 *
 * @returns Promise resolving to the new session credentials
 * @throws Error if both refresh and full setup fail
 */
/**
 * Checks if an error indicates we need to do a full fresh setup.
 * 401 = Unauthorized (token expired/invalid)
 * 403 = Forbidden/Insufficient authentication (credentials mismatch)
 * 466 = Request signature required (installation invalidated, signature can't be verified)
 */
function needsFullSetup(err: unknown): boolean {
  if (err instanceof BunqApiError) {
    return err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 466;
  }
  return false;
}

export async function refreshSessionWithFallback(): Promise<SessionCredentials> {
  try {
    return await refreshSessionWithMutex();
  } catch (err) {
    if (needsFullSetup(err)) {
      const statusCode = err instanceof BunqApiError ? err.statusCode : "unknown";
      logger.warn(`Session refresh failed with ${statusCode}, attempting full setup`);

      // Clear the mutex and try full setup
      refreshPromise = null;

      // Lock with a new promise for full setup
      // Create promise in local variable first, then assign to avoid race condition
      const setupPromise = (async () => {
        try {
          await performFullSetup();

          const credentials = await getAllCredentials();
          lastRefreshTime = Date.now();

          logger.info(`Full setup completed after ${statusCode}`);

          return {
            sessionToken: credentials.sessionToken || "",
            userId: credentials.userId || "",
            privateKey: credentials.rsaPrivateKey || "",
          };
        } finally {
          refreshPromise = null;
        }
      })();
      refreshPromise = setupPromise;

      return setupPromise;
    }
    throw err;
  }
}

/**
 * Performs full setup with mutex protection.
 *
 * Prevents concurrent full setup calls (e.g., from React double-mount)
 * from racing on device registration and causing 409 conflicts.
 *
 * @returns Promise resolving to the new session credentials
 */
export async function performFullSetupWithMutex(): Promise<SessionCredentials> {
  if (setupPromise) {
    logger.debug("Full setup already in progress, waiting for it");
    return setupPromise;
  }

  logger.info("Starting full setup with mutex lock");

  setupPromise = (async () => {
    try {
      await performFullSetup();

      const credentials = await getAllCredentials();
      lastRefreshTime = Date.now();

      logger.info("Full setup completed successfully");

      return {
        sessionToken: credentials.sessionToken || "",
        userId: credentials.userId || "",
        privateKey: credentials.rsaPrivateKey || "",
      };
    } finally {
      setupPromise = null;
    }
  })();

  return setupPromise;
}

/**
 * Resets the session manager state.
 *
 * Call this after clearing credentials to ensure fresh state.
 */
export function resetSessionManager(): void {
  refreshPromise = null;
  setupPromise = null;
  lastRefreshTime = 0;
  logger.debug("Session manager state reset");
}
