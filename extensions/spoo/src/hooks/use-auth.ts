import { useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import { z } from "zod";
import {
  getStoredTokens,
  signIn as signInApi,
  signOut as signOutApi,
} from "@/api/auth";
import { apiFetch } from "@/api/client";
import { UserProfileSchema, type UserProfile } from "@/schemas/auth";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}

const AuthMeSchema = z.object({ user: UserProfileSchema });

async function loadAuthState(): Promise<AuthState> {
  const tokens = await getStoredTokens();
  if (!tokens?.accessToken) return { user: null, isAuthenticated: false };

  try {
    const { user } = await apiFetch("/auth/me", { schema: AuthMeSchema });
    return { user, isAuthenticated: true };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

export function useAuth() {
  const { data, isLoading, revalidate } = useCachedPromise(loadAuthState, [], {
    initialData: { user: null, isAuthenticated: false },
    keepPreviousData: true,
  });

  const signIn = useCallback(async () => {
    await signInApi();
    await revalidate();
  }, [revalidate]);

  const signOut = useCallback(async () => {
    await signOutApi();
    await revalidate();
  }, [revalidate]);

  return {
    user: data?.user ?? null,
    isAuthenticated: data?.isAuthenticated ?? false,
    isLoading,
    signIn,
    signOut,
  };
}
