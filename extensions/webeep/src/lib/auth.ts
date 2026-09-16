import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import { LAUNCH_ENDPOINT, MOBILE_SERVICE, TOKEN_STORAGE_PREFIX } from "./constants";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const SESSION_EXPIRED_MESSAGE =
  "Log in to webeep.polimi.it in your browser, copy the value of the MoodleSession cookie (developer tools → cookies) and paste it in the extension preferences. This is needed only once every few months.";

const TOKEN_RE = /^[a-f0-9]{32}$/i;

/** A Moodle web service token is a 32-char hex string; a session cookie is not. */
export function looksLikeToken(value: string): boolean {
  return TOKEN_RE.test(value.trim());
}

/**
 * Parses the `Location` header produced by Moodle's mobile launch endpoint
 * (`moodlemobile://token=<base64(passport:::token:::privatetoken)>`) and returns the token.
 */
export function parseLaunchLocation(location: string): string {
  const match = /^moodlemobile:\/\/token=([A-Za-z0-9+/=]+)/.exec(location.trim());
  if (!match) throw new AuthError(`WeBeep did not return a token. ${SESSION_EXPIRED_MESSAGE}`);
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const parts = decoded.split(":::");
  const token = parts[1];
  if (!token || !looksLikeToken(token)) throw new AuthError("WeBeep returned a malformed token.");
  return token;
}

export function storageKeyFor(cookie: string): string {
  const digest = createHash("sha256").update(cookie).digest("hex").slice(0, 16);
  return `${TOKEN_STORAGE_PREFIX}.${digest}`;
}

/**
 * Accepts the bare cookie value, `MoodleSession=value`, or a whole cookie header
 * (`a=1; MoodleSession=value; b=2`) as copied from the browser developer tools.
 */
export function extractSessionCookie(input: string): string {
  const trimmed = input.trim();
  const named = /(?:^|;\s*)MoodleSession=([^;\s]+)/i.exec(trimmed);
  if (named) return named[1];
  return trimmed.split(";")[0].trim();
}

function getSessionCookie(): string {
  const { sessionCookie } = getPreferenceValues<Preferences>();
  const value = extractSessionCookie(sessionCookie ?? "");
  if (!value) throw new AuthError(`No MoodleSession cookie configured. ${SESSION_EXPIRED_MESSAGE}`);
  return value;
}

/** Exchanges a browser session cookie for a mobile web service token. */
export async function exchangeCookieForToken(cookie: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const passport = Math.random().toString(36).slice(2);
  const url = `${LAUNCH_ENDPOINT}?service=${MOBILE_SERVICE}&passport=${passport}&urlscheme=moodlemobile`;
  const response = await fetchImpl(url, {
    redirect: "manual",
    headers: { Cookie: `MoodleSession=${cookie}` },
  });
  const location = response.headers.get("location") ?? "";
  if (!location.startsWith("moodlemobile://")) {
    throw new AuthError(`The MoodleSession cookie is expired or invalid. ${SESSION_EXPIRED_MESSAGE}`);
  }
  return parseLaunchLocation(location);
}

/**
 * Returns a usable web service token: the preference value itself when it already is a token,
 * otherwise the cached token obtained from the cookie (exchanging it on first use).
 */
export async function getToken(options: { forceRefresh?: boolean } = {}): Promise<string> {
  const cookie = getSessionCookie();
  if (looksLikeToken(cookie)) return cookie;

  const key = storageKeyFor(cookie);
  if (!options.forceRefresh) {
    const cached = await LocalStorage.getItem<string>(key);
    if (cached) return cached;
  }
  const token = await exchangeCookieForToken(cookie);
  await LocalStorage.setItem(key, token);
  return token;
}

export async function clearStoredToken(): Promise<void> {
  const cookie = getSessionCookie();
  if (!looksLikeToken(cookie)) await LocalStorage.removeItem(storageKeyFor(cookie));
}
