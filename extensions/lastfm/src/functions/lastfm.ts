import { createHash } from "crypto";
import { LocalStorage, open } from "@raycast/api";

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const SESSION_KEY_STORAGE = "lastfm-session-key";
const PENDING_TOKEN_STORAGE = "lastfm-pending-token";

function md5(str: string): string {
  return createHash("md5").update(str, "utf8").digest("hex");
}

function signRequest(params: Record<string, string>, apiSecret: string): string {
  const str =
    Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("") + apiSecret;
  return md5(str);
}

async function get(params: Record<string, string>): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ ...params, format: "json" }).toString();
  const res = await fetch(`${BASE_URL}?${query}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function post(params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, format: "json" }).toString(),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthState = "none" | "pending" | "connected";

export async function getAuthState(): Promise<AuthState> {
  const sk = await LocalStorage.getItem<string>(SESSION_KEY_STORAGE);
  if (sk) return "connected";
  const token = await LocalStorage.getItem<string>(PENDING_TOKEN_STORAGE);
  if (token) return "pending";
  return "none";
}

export async function getSessionKey(): Promise<string | null> {
  const val = await LocalStorage.getItem<string>(SESSION_KEY_STORAGE);
  return val ?? null;
}

export async function clearSessionKey(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY_STORAGE);
  await LocalStorage.removeItem(PENDING_TOKEN_STORAGE);
}

/** Step 1: get a token and open Last.fm's auth page in the browser. */
export async function startAuth(apiKey: string, apiSecret: string): Promise<void> {
  const params = { method: "auth.getToken", api_key: apiKey };
  const data = await get({ ...params, api_sig: signRequest(params, apiSecret) });

  if (data.error) throw new Error((data.message as string) ?? "Failed to get auth token");

  const token = data.token as string;
  await LocalStorage.setItem(PENDING_TOKEN_STORAGE, token);
  await open(`https://www.last.fm/api/auth/?api_key=${apiKey}&token=${token}`);
}

/** Step 2: exchange the authorized token for a session key. */
export async function completeAuth(apiKey: string, apiSecret: string): Promise<string> {
  const token = await LocalStorage.getItem<string>(PENDING_TOKEN_STORAGE);
  if (!token) throw new Error("No pending authorization found. Please start the connection again.");

  const params = { method: "auth.getSession", api_key: apiKey, token };
  const data = await get({ ...params, api_sig: signRequest(params, apiSecret) });

  if (data.error) {
    if ((data.error as number) === 14) {
      throw new Error("Not authorized yet. Please allow access on Last.fm first, then try again.");
    }
    throw new Error((data.message as string) ?? "Failed to complete authentication");
  }

  const sessionKey = (data.session as Record<string, string>).key;
  await LocalStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
  await LocalStorage.removeItem(PENDING_TOKEN_STORAGE);
  return sessionKey;
}

// ── Track actions ─────────────────────────────────────────────────────────────

export async function loveTrack(
  artist: string,
  track: string,
  apiKey: string,
  apiSecret: string,
  sessionKey: string,
): Promise<void> {
  const params: Record<string, string> = {
    method: "track.love",
    artist,
    track,
    api_key: apiKey,
    sk: sessionKey,
  };
  const data = await post({ ...params, api_sig: signRequest(params, apiSecret) });
  if (data.error) {
    if (data.error === 9) await clearSessionKey();
    throw new Error((data.message as string) ?? "Failed to love track");
  }
}

export async function unloveTrack(
  artist: string,
  track: string,
  apiKey: string,
  apiSecret: string,
  sessionKey: string,
): Promise<void> {
  const params: Record<string, string> = {
    method: "track.unlove",
    artist,
    track,
    api_key: apiKey,
    sk: sessionKey,
  };
  const data = await post({ ...params, api_sig: signRequest(params, apiSecret) });
  if (data.error) {
    if (data.error === 9) await clearSessionKey();
    throw new Error((data.message as string) ?? "Failed to unlove track");
  }
}

export async function getTrackLoved(artist: string, track: string, username: string, apiKey: string): Promise<boolean> {
  const data = await get({
    method: "track.getInfo",
    artist,
    track,
    username,
    api_key: apiKey,
  });
  const info = data.track as Record<string, unknown> | undefined;
  return info?.userloved === "1";
}
