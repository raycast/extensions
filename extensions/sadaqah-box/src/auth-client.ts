import { createAuthClient } from "better-auth/client";
import { apiKeyClient } from "@better-auth/api-key/client";
import { getPreferenceValues } from "@raycast/api";
import { sanitizeUrl } from "./utils/security";

// Re-export types from better-auth
export type { AuthClient } from "better-auth/client";

function getAuthBaseUrl(): string {
  const { apiHost } = getPreferenceValues<{ apiHost: string }>();
  return `${sanitizeUrl(apiHost)}/api/auth`;
}

// Create the auth client with API key plugin, recreating if apiHost changes
let cachedBaseUrl: string | null = null;
let cachedAuthClient: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  const baseURL = getAuthBaseUrl();
  if (!cachedAuthClient || cachedBaseUrl !== baseURL) {
    cachedBaseUrl = baseURL;
    cachedAuthClient = createAuthClient({
      baseURL,
      plugins: [apiKeyClient()],
    });
  }
  return cachedAuthClient;
}

// Session management functions
export async function getSession() {
  const client = getAuthClient();
  const result = await client.getSession();
  if (result.error) {
    throw new Error(result.error.message || "Failed to get session");
  }
  return result.data;
}

export async function signInWithEmail(email: string, password: string, rememberMe?: boolean) {
  const client = getAuthClient();
  const result = await client.signIn.email({
    email,
    password,
    rememberMe,
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to sign in");
  }
  return result.data;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const client = getAuthClient();
  const result = await client.signUp.email({
    email,
    password,
    name,
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to sign up");
  }
  return result.data;
}

export async function signOut() {
  const client = getAuthClient();
  const result = await client.signOut();
  if (result.error) {
    throw new Error(result.error.message || "Failed to sign out");
  }
  return result.data;
}
