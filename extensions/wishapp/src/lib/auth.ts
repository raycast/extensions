import { LocalStorage } from "@raycast/api";
import { API_BASE } from "./types";

const TOKEN_KEY = "wishapp-bearer-token";

export async function getToken(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await LocalStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await LocalStorage.removeItem(TOKEN_KEY);
}

export async function signOut(): Promise<void> {
  // Better Auth's /api/auth/sign-out expects a cookie session and 500s on a
  // bearer-only request, so we just clear the local token. The server session
  // will expire naturally on its own (default 7d, see Better Auth session config).
  await clearToken();
}

export async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Node fetch sends Sec-Fetch-* headers which triggers Better Auth's CSRF
      // middleware. Without an Origin header it returns MISSING_OR_NULL_ORIGIN.
      // Sending the API origin makes it pass the trustedOrigins check (same-origin).
      Origin: API_BASE,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Sign-in failed (${res.status})`);
  }

  const token = res.headers.get("set-auth-token");
  if (!token) {
    throw new Error("No auth token in response. Have you verified your email?");
  }

  await setToken(token);
  return token;
}
