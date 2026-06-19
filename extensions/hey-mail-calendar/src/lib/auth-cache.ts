import { LocalStorage } from "@raycast/api";

const AUTH_CACHE_KEY = "hey-auth-verified-at";
const AUTH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function isAuthCached(): Promise<boolean> {
  const value = await LocalStorage.getItem(AUTH_CACHE_KEY);
  if (!value) {
    return false;
  }

  const verifiedAt = Number(value);
  if (Number.isNaN(verifiedAt)) {
    return false;
  }

  return Date.now() - verifiedAt < AUTH_CACHE_TTL_MS;
}

export async function markAuthVerified(): Promise<void> {
  await LocalStorage.setItem(AUTH_CACHE_KEY, String(Date.now()));
}

export async function clearAuthVerified(): Promise<void> {
  await LocalStorage.removeItem(AUTH_CACHE_KEY);
}
