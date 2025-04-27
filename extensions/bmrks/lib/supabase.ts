import { createClient } from "@supabase/supabase-js";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

// These are not sensitive. Has access to public operations, like auth.
const supabaseUrl = "https://nswbygdrtmlsfuyqsokv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zd2J5Z2RydG1sc2Z1eXFzb2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzU1MjMxNzQsImV4cCI6MTk5MTA5OTE3NH0.RIVAaGlB8z6ycyeaEecG2g8vwblcYbZCsHLUUoUC2xQ";

// Custom storage implementation for Raycast's LocalStorage
class RaycastStorage {
  async getItem(key: string): Promise<string | null> {
    return await LocalStorage.getItem<string>(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    await LocalStorage.removeItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  }
}

export async function authorize() {
  try {
    const rawSession = await LocalStorage.getItem("session");
    const session = rawSession ? JSON.parse(String(rawSession)) : null;
    
    // Get preferences, log email (not password for security)
    const prefs = getPreferenceValues<Preferences>();
    console.log("Auth using email:", prefs.email ? "✓ Email provided" : "✗ No email");
    
    if (!prefs.email || !prefs.password) {
      return { 
        user: null, 
        error: { message: "Missing email or password in preferences" } 
      };
    }

    // Try to restore session if it exists and email matches
    if (session && prefs.email === session.user?.email) {
      console.log("Attempting to restore existing session");
      const { data, error } = await supabase.auth.setSession(session);
      
      if (error) {
        console.error("Session restore failed:", error.message);
        // Session invalid - try login with password
        const loginResult = await supabase.auth.signInWithPassword({ 
          email: prefs.email, 
          password: prefs.password 
        });
        
        await LocalStorage.setItem("session", JSON.stringify(loginResult.data.session));
        console.log("Login result:", loginResult.error ? "Failed" : "Success");
        return { user: loginResult.data.user, error: loginResult.error };
      }
      
      await LocalStorage.setItem("session", JSON.stringify(data.session));
      console.log("Session restored successfully");
      return { user: data.user, error };
    } else {
      // No valid session - sign in with password
      console.log("No valid session, signing in with password");
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: prefs.email, 
        password: prefs.password 
      });
      
      if (data.session) {
        await LocalStorage.setItem("session", JSON.stringify(data.session));
      }
      
      console.log("Login result:", error ? "Failed" : "Success");
      return { user: data.user, error };
    }
  } catch (err) {
    console.error("Authentication error:", err);
    return { 
      user: null, 
      error: { message: err instanceof Error ? err.message : "Unknown authentication error" } 
    };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new RaycastStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
