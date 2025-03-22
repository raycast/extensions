import { LocalStorage, environment } from "@raycast/api";
import { Session, createClient } from "@supabase/supabase-js";

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

export async function getSupabaseWithSession() {
  const contextSession = getContextSession();
  if (contextSession) {
    const { error } = await supabase.auth.setSession(contextSession);
    if (error) {
      throw error;
    }
  }
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return { session, error };
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
