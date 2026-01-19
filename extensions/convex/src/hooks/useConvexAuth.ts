/**
 * useConvexAuth - Authentication hook for Convex
 *
 * Handles loading session, authentication state, and logout.
 * Supports both OAuth (BigBrain) and deploy key authentication modes.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  loadSession,
  clearSession,
  authenticate,
  isSessionExpired,
  loadSelectedContext,
  saveSelectedContext,
  type ConvexSession,
  type SelectedContext,
} from "../lib/auth";
import { getDeployKeyConfig, type DeployKeyConfig } from "../lib/deployKeyAuth";

export interface UseConvexAuthReturn {
  /** The current session (OAuth or deploy key) */
  session: ConvexSession | null;
  /** Whether the auth state is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated (either via OAuth or deploy key) */
  isAuthenticated: boolean;
  /** Selected team/project/deployment context */
  selectedContext: SelectedContext;
  /** Whether using deploy key mode (vs OAuth) */
  isDeployKeyMode: boolean;
  /** Deploy key configuration (if in deploy key mode) */
  deployKeyConfig: DeployKeyConfig | null;
  /** Login function (no-op in deploy key mode) */
  login: () => Promise<void>;
  /** Logout function (no-op in deploy key mode) */
  logout: () => Promise<void>;
  /** Update selected context (limited in deploy key mode) */
  setSelectedContext: (context: Partial<SelectedContext>) => Promise<void>;
}

export function useConvexAuth(): UseConvexAuthReturn {
  const [session, setSession] = useState<ConvexSession | null>(null);
  const [selectedContext, setSelectedContextState] = useState<SelectedContext>({
    teamId: null,
    teamSlug: null,
    projectId: null,
    projectSlug: null,
    deploymentName: null,
    deploymentType: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check deploy key mode on mount (sync, from preferences)
  const deployKeyConfig = useMemo(() => getDeployKeyConfig(), []);
  const usingDeployKey = deployKeyConfig !== null;

  // Load session on mount
  useEffect(() => {
    async function loadAuthState() {
      try {
        // If using deploy key mode, skip OAuth session loading
        if (usingDeployKey && deployKeyConfig) {
          // Create a synthetic session from deploy key
          setSession({
            accessToken: deployKeyConfig.deployKey,
            tokenType: "DeployKey",
            // Deploy keys don't expire
            expiresAt: undefined,
          });

          // Set context from deploy key config
          setSelectedContextState({
            teamId: null,
            teamSlug: null,
            projectId: null,
            projectSlug: null,
            deploymentName: deployKeyConfig.deploymentName,
            deploymentType: "prod", // Assume prod for deploy key mode
          });

          setIsLoading(false);
          return;
        }

        // OAuth mode: load from storage
        const [savedSession, savedContext] = await Promise.all([
          loadSession(),
          loadSelectedContext(),
        ]);

        if (savedSession && !isSessionExpired(savedSession)) {
          setSession(savedSession);
        }

        setSelectedContextState(savedContext);
      } catch (error) {
        console.error("Failed to load auth state:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAuthState();
  }, [usingDeployKey, deployKeyConfig]);

  const login = useCallback(async () => {
    // No-op in deploy key mode
    if (usingDeployKey) {
      console.log("Login skipped: using deploy key mode");
      return;
    }

    try {
      const newSession = await authenticate();
      setSession(newSession);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, [usingDeployKey]);

  const logout = useCallback(async () => {
    // No-op in deploy key mode
    if (usingDeployKey) {
      console.log("Logout skipped: using deploy key mode");
      return;
    }

    await clearSession();
    setSession(null);
    setSelectedContextState({
      teamId: null,
      teamSlug: null,
      projectId: null,
      projectSlug: null,
      deploymentName: null,
      deploymentType: null,
    });
  }, [usingDeployKey]);

  const updateSelectedContext = useCallback(
    async (context: Partial<SelectedContext>) => {
      // In deploy key mode, don't allow changing deployment
      if (usingDeployKey && deployKeyConfig) {
        // Only allow updating non-deployment fields
        const restrictedContext = {
          ...context,
          // Force deployment to stay the same
          deploymentName: deployKeyConfig.deploymentName,
        };
        const newContext = { ...selectedContext, ...restrictedContext };
        setSelectedContextState(newContext);
        return;
      }

      const newContext = { ...selectedContext, ...context };
      setSelectedContextState(newContext);
      await saveSelectedContext(newContext);
    },
    [selectedContext, usingDeployKey, deployKeyConfig],
  );

  // Determine authentication status
  const isAuthenticated = usingDeployKey
    ? true // Deploy key mode is always "authenticated" if configured
    : !!session && !isSessionExpired(session);

  return {
    session,
    isLoading,
    isAuthenticated,
    selectedContext,
    isDeployKeyMode: usingDeployKey,
    deployKeyConfig,
    login,
    logout,
    setSelectedContext: updateSelectedContext,
  };
}
