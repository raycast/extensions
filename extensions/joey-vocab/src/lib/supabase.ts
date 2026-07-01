import { LocalStorage } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";

/**
 * Supabase auth storage backed by Raycast's {@link LocalStorage}.
 *
 * Supabase persists the session here so it survives across command launches,
 * and `autoRefreshToken` uses it to keep the access token fresh.
 */
const localStorageAdapter = {
  getItem: (key: string) => LocalStorage.getItem<string>(key).then((value) => value ?? null),
  setItem: (key: string, value: string) => LocalStorage.setItem(key, value),
  removeItem: (key: string) => LocalStorage.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
