import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { supabase } from "./supabase";

export function useAuth() {
  const { email, password } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useCachedPromise(
    async (email, password) => {
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    },
    [email, password],
  );

  return { data: data?.data, error: data?.error, isLoading };
}
