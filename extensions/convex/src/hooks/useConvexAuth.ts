/**
 * useConvexAuth - Authentication hook for Convex
 *
 * Handles loading session, authentication state, and logout.
 * Supports both OAuth (BigBrain) and deploy key authentication modes.
 */

import { useEffect, useState, useCallback } from "react";
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
import {
  getDeployKeyConfigAsync,
  extractDeploymentTypeFromKey,
  type DeployKeyConfig,
} from "../lib/deployKeyAuth";

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
    deploymentUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deployKeyConfig, setDeployKeyConfig] =
    useState<DeployKeyConfig | null>(null);
  const usingDeployKey = deployKeyConfig !== null;

  // Load session on mount
  useEffect(() => {
    async function loadAuthState() {
      try {
        // Deploy key mode: checks LocalStorage (Configure Deploy Key command)
        // first, then extension preferences
        const config = await getDeployKeyConfigAsync();
        if (config) {
          setDeployKeyConfig(config);

          // Create a synthetic session from deploy key
          setSession({
            accessToken: config.deployKey,
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
            deploymentName: config.deploymentName,
            deploymentType:
              extractDeploymentTypeFromKey(config.deployKey) ?? "prod",
            deploymentUrl: config.deploymentUrl,
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
  }, []);

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
    const clearedContext: SelectedContext = {
      teamId: null,
      teamSlug: null,
      projectId: null,
      projectSlug: null,
      deploymentName: null,
      deploymentType: null,
      deploymentUrl: null,
    };
    setSelectedContextState(clearedContext);
    // Persist the cleared selection: a later sign-in (possibly a different
    // account) must not inherit the previous deployment context
    await saveSelectedContext(clearedContext);
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
          deploymentUrl: deployKeyConfig.deploymentUrl,
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
