import { LocalStorage, getPreferenceValues } from "@raycast/api";
import type { AuthSession, Preferences } from "../types";

const SSO_KEY_STORAGE = "bookface_sso_key";
const ALGOLIA_KEY_STORAGE = "bookface_algolia_key";
const SESSION_STORAGE = "bookface_session";

function extractSetCookie(headers: Headers, name: string): string | undefined {
  const all = headers.getSetCookie?.() ?? [];
  for (const sc of all) {
    const [pair] = sc.split(";");
    const [key, ...rest] = pair.split("=");
    if (key.trim() === name) return rest.join("=").trim();
  }
  return undefined;
}

async function fetchCsrfToken(): Promise<{
  csrfToken: string;
  cookies: string;
}> {
  const url =
    "https://account.ycombinator.com/?continue=https%3A%2F%2Fbookface.ycombinator.com%2F";
  const res = await fetch(url, { redirect: "manual" });

  const xsrf = extractSetCookie(res.headers, "XSRF-TOKEN");
  const bfSession = extractSetCookie(res.headers, "_bf_session_key");

  if (!xsrf) throw new Error("Failed to get CSRF token from YC login page");

  const cookieParts = [`XSRF-TOKEN=${xsrf}`];
  if (bfSession) cookieParts.push(`_bf_session_key=${bfSession}`);

  return { csrfToken: xsrf, cookies: cookieParts.join("; ") };
}

async function login(ycid: string, password: string): Promise<string> {
  const { csrfToken, cookies } = await fetchCsrfToken();

  const res = await fetch("https://account.ycombinator.com/sign_in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      ycid,
      password,
      captcha: null,
      totp: "",
      continue: "https://bookface.ycombinator.com/",
    }),
    redirect: "manual",
  });

  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }

  const ssoKey = extractSetCookie(res.headers, "_sso.key");
  if (!ssoKey)
    throw new Error("Login succeeded but no _sso.key cookie returned");

  return ssoKey;
}

async function extractAlgoliaKey(ssoKey: string): Promise<string> {
  const res = await fetch("https://bookface.ycombinator.com/home", {
    headers: { Cookie: `_sso.key=${ssoKey}` },
    redirect: "follow",
  });

  if (res.status !== 200)
    throw new Error(`Failed to load Bookface (${res.status})`);

  const html = await res.text();
  const match = html.match(/"key":"([A-Za-z0-9+/=]{50,})"/);
  if (!match)
    throw new Error("Could not extract Algolia key from Bookface page");

  return match[1];
}

export async function getSession(): Promise<AuthSession | null> {
  const raw = await LocalStorage.getItem<string>(SESSION_STORAGE);
  if (!raw) return null;

  const session: AuthSession = JSON.parse(raw);
  if (Date.now() > session.expiresAt) {
    await clearSession();
    return null;
  }

  return session;
}

async function saveSession(session: AuthSession): Promise<void> {
  await LocalStorage.setItem(SESSION_STORAGE, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_STORAGE);
  await LocalStorage.removeItem(SSO_KEY_STORAGE);
  await LocalStorage.removeItem(ALGOLIA_KEY_STORAGE);
}

export async function authenticate(): Promise<AuthSession> {
  // Check for cached session
  const existing = await getSession();
  if (existing) return existing;

  // Get credentials from preferences
  const { ycid, password } = getPreferenceValues<Preferences>();
  if (!ycid || !password) {
    throw new Error(
      "YC credentials not configured. Set them in extension preferences.",
    );
  }

  // Login
  const ssoKey = await login(ycid, password);

  // Extract Algolia key
  let algoliaKey: string | undefined;
  try {
    algoliaKey = await extractAlgoliaKey(ssoKey);
  } catch (e) {
    console.warn("Could not extract Algolia key:", e);
  }

  // Cache session (expire in 364 days to be safe -actual _sso.key is valid for 1 year)
  const session: AuthSession = {
    ssoKey,
    algoliaKey,
    expiresAt: Date.now() + 364 * 24 * 60 * 60 * 1000,
  };
  await saveSession(session);

  return session;
}

export function hasCredentials(): boolean {
  const { ycid, password } = getPreferenceValues<Preferences>();
  return Boolean(ycid && password);
}
