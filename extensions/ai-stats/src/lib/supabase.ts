import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export type Prefs = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (client) return client;
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getPreferenceValues<Prefs>();
  // Fallback to hosted read-only project if preferences are not set
  const DEFAULT_URL = "https://bgbqdzmgxkwstjihgeef.supabase.co";
  const DEFAULT_ANON = "sb_publishable_i_viL-n7Gd7C9ijmmHtj5g_BgLbFmuf";

  const url = SUPABASE_URL?.trim() || DEFAULT_URL;
  const key = SUPABASE_ANON_KEY?.trim() || DEFAULT_ANON;

  if (!url || !key) {
    void showToast({
      style: Toast.Style.Failure,
      title: "Missing Supabase configuration",
      message: "Open Raycast Preferences for this extension and set SUPABASE_URL and SUPABASE_ANON_KEY.",
    });
    throw new Error("Missing Supabase configuration");
  }
  client = createClient(url, key);
  return client;
}
