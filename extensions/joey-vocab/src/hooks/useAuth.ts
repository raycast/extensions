import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { signIn } from "../lib/auth";
import type { User } from "@supabase/supabase-js";

/**
 * Hook that signs in with the email/password stored in Raycast preferences.
 * Always calls signIn to ensure the Supabase client has an active session.
 */
export function useAuth() {
  const { email, password } = getPreferenceValues<Preferences>();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    signIn(email, password)
      .then((authenticatedUser) => {
        setUser(authenticatedUser);
        setIsLoading(false);
      })
      .catch((authError: Error) => {
        setError(authError);
        setIsLoading(false);
      });
  }, [email, password]);

  return { user, isLoading, error, email };
}
