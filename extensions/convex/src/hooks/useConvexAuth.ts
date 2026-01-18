/**
 * useConvexAuth - Authentication hook for Convex
 *
 * Handles loading session, authentication state, and logout.
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

export interface UseConvexAuthReturn {
  session: ConvexSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedContext: SelectedContext;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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

  // Load session on mount
  useEffect(() => {
    async function loadAuthState() {
      try {
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
    try {
      const newSession = await authenticate();
      setSession(newSession);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
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
  }, []);

  const updateSelectedContext = useCallback(
    async (context: Partial<SelectedContext>) => {
      const newContext = { ...selectedContext, ...context };
      setSelectedContextState(newContext);
      await saveSelectedContext(newContext);
    },
    [selectedContext],
  );

  return {
    session,
    isLoading,
    isAuthenticated: !!session && !isSessionExpired(session),
    selectedContext,
    login,
    logout,
    setSelectedContext: updateSelectedContext,
  };
}
