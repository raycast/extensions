import { LocalStorage, getPreferenceValues } from "@raycast/api";

const BASE = "https://api2.openreview.net";
const KEY = "openreview-auth";
const WEEK = 7 * 24 * 3600 * 1000;

interface Prefs {
  username: string;
  password: string;
}

interface Cached {
  token: string;
  profileId: string;
  expiresAt: number;
}

async function login(): Promise<Cached> {
  const { username, password } = getPreferenceValues<Prefs>();
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: username, password, expiresIn: WEEK / 1000 }),
  });
  if (!res.ok) {
    throw new Error(
      `OpenReview login failed (${res.status}). Check your email/password in extension preferences.`,
    );
  }
  const data = (await res.json()) as { token: string; user: { id: string } };
  const cached: Cached = {
    token: data.token,
    profileId: data.user.id,
    expiresAt: Date.now() + WEEK - 60_000,
  };
  await LocalStorage.setItem(KEY, JSON.stringify(cached));
  return cached;
}

export async function getAuth(): Promise<Cached> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (raw) {
    const c = JSON.parse(raw) as Cached;
    if (c.expiresAt > Date.now() && c.token && c.profileId) return c;
  }
  return login();
}

export { BASE };
