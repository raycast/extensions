import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { supabase } from "./supabase";

export function useAuth() {
  const { data, isLoading } = useCachedPromise(async () => {
    const preferences = getPreferenceValues<Preferences>();

    return await supabase.auth.signInWithPassword({
      email: preferences.email,
      password: preferences.password,
    });
  });

  return { data: data?.data, error: data?.error, isLoading };
}
