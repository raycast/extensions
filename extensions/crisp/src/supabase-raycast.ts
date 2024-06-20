import { LocalStorage, environment } from "@raycast/api";
import { createClient, Session } from "@supabase/supabase-js";

export const supabaseRef = "cqsizljceopjyurqfajr";

const supabaseUrl = `https://${supabaseRef}.supabase.co`;

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxc2l6bGpjZW9wanl1cnFmYWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg0NzQ3ODksImV4cCI6MjAzNDA1MDc4OX0.WZp3Q348EpXX_v0MQuapin170EdasNFL82SytLkf5Fw";

function getContextSession() {
  if (!environment.launchContext) {
    return;
  }
  try {
    const session = environment.launchContext?.session as Session;
    return session;
  } catch (error) {
    console.error("Failed to parse launch context", error);
  }
  return;
}
async function getStorageSession() {
  const rawSession = await LocalStorage.getItem("session");
  try {
    const session: Session = rawSession ? JSON.parse(String(rawSession)) : undefined;
    return session;
  } catch (error) {
    console.error("Failed to parse session", error);
  }
}

export async function getSupabaseWithSession() {
  const session = getContextSession() || (await getStorageSession());

  if (session) {
    const { data, error } = await supabase.auth.setSession(session);
    if (error) {
      return { session: null, user: null, error };
    }
    await LocalStorage.setItem("session", JSON.stringify(data.session));
    // console.log("saved session", session);
    return { session, user: data.user, error };
  } else {
    return { session: null, user: null, error: null };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      async getItem(key: string) {
        return (await LocalStorage.getItem<string>(key)) || null;
      },

      async removeItem(key: string) {
        await LocalStorage.removeItem(key);
      },

      async setItem(key: string, value: string) {
        await LocalStorage.setItem(key, value);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
