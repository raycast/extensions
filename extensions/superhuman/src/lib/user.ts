import { LocalStorage } from "@raycast/api";
import { getAccessToken, getUserInfoEndpoint } from "./auth";

/**
 * Resolve the signed-in user's email address. Used to build clickable
 * Superhuman thread URLs (`https://mail.superhuman.com/<email>/thread/<id>#app`)
 * that the AI surfaces to the user.
 *
 * Resolution chain:
 *   1. LocalStorage cache (30-day TTL)
 *   2. OIDC userinfo endpoint (single HTTP request, cached for next time)
 *   3. Stale cache on remote failure
 *   4. `null` (caller skips URL injection)
 *
 * Never throws — returning null means "skip the URL field, fall back to
 * bracketed thread ID".
 */

interface CachedEmail {
  email: string;
  cached_at: number;
}

export const USER_EMAIL_CACHE_KEY = "superhuman.user_email.v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function loadCache(): Promise<CachedEmail | null> {
  const raw = await LocalStorage.getItem<string>(USER_EMAIL_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedEmail;
  } catch {
    return null;
  }
}

async function saveCache(entry: CachedEmail): Promise<void> {
  await LocalStorage.setItem(USER_EMAIL_CACHE_KEY, JSON.stringify(entry));
}

function fresh(entry: CachedEmail): boolean {
  return Date.now() - entry.cached_at < TTL_MS;
}

async function fetchUserInfoEmail(): Promise<string | null> {
  const endpoint = await getUserInfoEndpoint();
  if (!endpoint) return null;
  try {
    const token = await getAccessToken();
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return typeof data?.email === "string" && data.email.includes("@") ? data.email : null;
  } catch {
    return null;
  }
}

export async function getUserEmail(): Promise<string | null> {
  const cached = await loadCache();
  if (cached && fresh(cached)) return cached.email;

  const email = await fetchUserInfoEmail();
  if (email) {
    await saveCache({ email, cached_at: Date.now() });
    return email;
  }

  // Network failed, but we have a stale cache — better than nothing.
  if (cached) return cached.email;
  return null;
}

/** Construct the Superhuman web URL for a thread. */
export function threadUrl(email: string, threadId: string): string {
  const safeEmail = encodeURIComponent(email);
  return `https://mail.superhuman.com/${safeEmail}/thread/${threadId}#app`;
}

/**
 * Walk an MCP response, deep-clone, and inject a `url` field next to any
 * object that has a `thread_id` (or `threadId`). Skips when the user's
 * email can't be resolved — the response is returned untouched.
 */
export async function injectThreadUrls<T>(data: T): Promise<T> {
  const email = await getUserEmail();
  if (!email) return data;
  return walk(data, email);
}

function walk<T>(node: T, email: string): T {
  if (Array.isArray(node)) {
    return node.map((n) => walk(n, email)) as unknown as T;
  }
  if (node && typeof node === "object") {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      obj[key] = walk(value, email);
    }
    const tid = obj.thread_id ?? obj.threadId;
    if (typeof tid === "string" && /^[a-f0-9]{16}$/.test(tid) && typeof obj.url !== "string") {
      obj.url = threadUrl(email, tid);
    }
    return obj as unknown as T;
  }
  return node;
}
