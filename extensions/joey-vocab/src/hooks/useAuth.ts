import { useEffect, useState } from "react";
import { signOutUser } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Hook that restores and tracks the persisted Supabase session.
 *
 * Searching is free and requires no account, so a missing session resolves to a
 * logged-out state rather than an error. The session is rehydrated from
 * Raycast's LocalStorage on mount (and auto-refreshed by Supabase), and kept in
 * sync via `onAuthStateChange`.
 *
 * @returns The current user, loading/error state, and `refresh`/`signOut` helpers
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function refresh() {
    setIsLoading(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      setUser(data.session?.user ?? null);
      setError(null);
    } catch (sessionError) {
      setError(sessionError as Error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await signOutUser();
    setUser(null);
  }

  useEffect(() => {
    refresh();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { user, isLoading, error, refresh, signOut };
}
