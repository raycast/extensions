import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";

// These are not sensitive. Has access to public operations, like auth.
const supabaseUrl = "https://nswbygdrtmlsfuyqsokv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zd2J5Z2RydG1sc2Z1eXFzb2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzU1MjMxNzQsImV4cCI6MTk5MTA5OTE3NH0.RIVAaGlB8z6ycyeaEecG2g8vwblcYbZCsHLUUoUC2xQ";

class Storage {
  async getItem(key: string) {
    return await LocalStorage.getItem<string>(key);
  }

  async removeItem(key: string) {
    await LocalStorage.removeItem(key);
  }

  async setItem(key: string, value: string) {
    await LocalStorage.setItem(key, value);
  }
}

export async function authorize() {
  const rawSession = await LocalStorage.getItem("session");
  const session = rawSession ? JSON.parse(String(rawSession)) : null;
  const { email, password } = getPreferenceValues<Preferences>();

  if (session && email === session.user?.email) {
    const { data, error } = await supabase.auth.setSession(session);
    LocalStorage.setItem("session", JSON.stringify(data.session));
    return { user: data.user, error };
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    LocalStorage.setItem("session", JSON.stringify(data.session));
    return { user: data.user, error };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // @ts-expect-error -- No idea
    storage: new Storage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
