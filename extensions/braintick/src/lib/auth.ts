import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface Preferences {
  apiUrl: string;
}

const preferences = getPreferenceValues<Preferences>();
const API_URL = preferences.apiUrl || "http://localhost:3003";

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
    const data = await response.json();
    console.log("got resp from api ", data, token);

    if (response.ok && data.token) {
      return {
        success: true,
        token: token || "",
        user: data.user,
      };
    }

    return {
      success: false,
      error: data.message || "Authentication failed",
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
  const token = await getAuthToken();
  return !!token;
}

export async function logout(): Promise<void> {
  await LocalStorage.removeItem("auth-token");
  await LocalStorage.removeItem("user-email");
}

export async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
