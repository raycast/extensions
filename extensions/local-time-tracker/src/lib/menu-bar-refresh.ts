import { LocalStorage } from "@raycast/api";

const DISPLAY_REFRESH_KEY = "menuBarDisplayRefreshUntil";
const DISPLAY_REFRESH_WINDOW_MS = 10000;

export async function markMenuBarDisplayRefresh(now = Date.now()): Promise<void> {
  await LocalStorage.setItem(DISPLAY_REFRESH_KEY, now + DISPLAY_REFRESH_WINDOW_MS);
}

export async function isMenuBarDisplayRefresh(now = Date.now()): Promise<boolean> {
  const expiresAt = await LocalStorage.getItem<number>(DISPLAY_REFRESH_KEY);
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return false;
  const remaining = expiresAt - now;
  // Expire automatically, including after a clock rollback: scheduled reminder
  // checks must never be disabled by a stale display-only refresh request.
  return remaining >= 0 && remaining <= DISPLAY_REFRESH_WINDOW_MS;
}
