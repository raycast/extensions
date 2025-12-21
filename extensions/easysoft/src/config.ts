import { getPreferenceValues, LocalStorage } from "@raycast/api";

export interface Preferences {
  backendUrl: string;
}

export function getBackendUrl(): string {
  try {
    const preferences = getPreferenceValues<Preferences>();
    let url = preferences.backendUrl || "https://easysoft-one.vercel.app";

    // Trim whitespace
    url = url.trim();

    // Validate URL has a scheme
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.error("[CONFIG] Invalid backend URL (missing http:// or https://):", url);
      throw new Error(`Invalid backend URL: "${url}". Must start with http:// or https://`);
    }

    // Remove trailing slash if present
    url = url.replace(/\/$/, "");

    console.log("[CONFIG] Backend URL:", url);
    return url;
  } catch (error) {
    console.error("[CONFIG] Error getting backend URL:", error);
    // Fallback to default
    const defaultUrl = "https://easysoft-one.vercel.app";
    console.log("[CONFIG] Using default backend URL:", defaultUrl);
    return defaultUrl;
  }
}

const SESSION_KEY = "jsessionid";
const CSRF_TOKEN_KEY = "csrf_token";
const CREDENTIALS_KEY = "stored_credentials";

export interface StoredCredentials {
  username: string;
  password: string;
}

export async function getStoredSession(): Promise<string | null> {
  try {
    const session = await LocalStorage.getItem<string>(SESSION_KEY);
    return session || null;
  } catch {
    return null;
  }
}

export async function setStoredSession(sessionId: string): Promise<void> {
  await LocalStorage.setItem(SESSION_KEY, sessionId);
}

export async function clearStoredSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
}

export async function getStoredCSRFToken(): Promise<string | null> {
  try {
    const token = await LocalStorage.getItem<string>(CSRF_TOKEN_KEY);
    return token || null;
  } catch {
    return null;
  }
}

export async function setStoredCSRFToken(token: string): Promise<void> {
  await LocalStorage.setItem(CSRF_TOKEN_KEY, token);
}

export async function clearStoredCSRFToken(): Promise<void> {
  await LocalStorage.removeItem(CSRF_TOKEN_KEY);
}

export async function getStoredCredentials(): Promise<StoredCredentials | null> {
  try {
    const credentials = await LocalStorage.getItem<string>(CREDENTIALS_KEY);
    if (!credentials) {
      return null;
    }
    return JSON.parse(credentials) as StoredCredentials;
  } catch {
    return null;
  }
}

export async function setStoredCredentials(credentials: StoredCredentials): Promise<void> {
  await LocalStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function clearStoredCredentials(): Promise<void> {
  await LocalStorage.removeItem(CREDENTIALS_KEY);
}
