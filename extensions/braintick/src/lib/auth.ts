import { LocalStorage, getPreferenceValues } from "@raycast/api";

const API_URL = "https://braintick.coolify.samarpit.dev";

interface ExtensionPreferences {
  email?: string;
  password?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  try {
    console.log("[API]", API_URL);

    const response = await fetch(`${API_URL}/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const token = response.headers.get("set-auth-token");
    const data = (await response.json()) as
      | {
          token: string;
          user: {
            id: string;
            email: string;
            name?: string;
          };
        }
      | {
          message: string;
        };

    if (response.ok && "token" in data) {
      return {
        success: true,
        token: token || "",
        user: data.user,
      };
    }

    return {
      success: false,
      error: "message" in data ? data.message : "Authentication failed",
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await LocalStorage.getItem<string>("auth-token");
    return token || null;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const existingToken = await getAuthToken();
  if (existingToken) return true;

  // Try to authenticate using preferences
  try {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    if (prefs.email && prefs.password) {
      const result = await authenticate(prefs.email, prefs.password);
      if (result.success) {
        await LocalStorage.setItem("auth-token", result.token || "");
        await LocalStorage.setItem("user-email", prefs.email || "");
        return true;
      }
    }
  } catch {
    // ignore, fall through to false
  }

  return false;
}

export async function logout(): Promise<void> {
  await LocalStorage.removeItem("auth-token");
  await LocalStorage.removeItem("user-email");
}

export async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // Ensure we have a token, try preferences-based login if missing
  let token = await getAuthToken();
  if (!token) {
    const ok = await isAuthenticated();
    token = ok ? await getAuthToken() : null;
  }

  if (!token) {
    throw new Error("Not authenticated");
  }

  const doFetch = async (): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  let response = await doFetch();

  // If unauthorized, try to re-auth with preferences once and retry
  if (response.status === 401) {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    if (prefs.email && prefs.password) {
      const result = await authenticate(prefs.email, prefs.password);
      if (result.success) {
        token = result.token || "";
        await LocalStorage.setItem("auth-token", token);
        response = await doFetch();
      }
    }
  }

  return response;
}
