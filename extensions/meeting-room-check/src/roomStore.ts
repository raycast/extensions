import { LocalStorage } from "@raycast/api";
import { ROOMS as MITO_DEFAULT_ROOMS } from "./rooms";

const STORAGE_KEY = "room-block-rooms-v1";
const EMAIL_CACHE_KEY = "room-block-user-email-v1";

/**
 * A room, once resolved for this install. `floor`/`capacity`/`equipment`
 * are optional because the two ways we can discover a room without Admin
 * SDK access (calendar-history scan, manual entry) don't have access to
 * that metadata — only the Directory API (admin-only) provides it. The UI
 * degrades gracefully when these are missing (see list-rooms.tsx).
 */
export type Room = {
  id: string;
  name: string;
  calendarId: string;
  floor?: string;
  capacity?: number;
  equipment?: string[];
};

export async function getStoredRooms(): Promise<Room[] | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Room[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveRooms(rooms: Room[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export async function clearRooms(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns this install's room list, seeding it first if needed:
 * - If a list is already saved (from onboarding, import, or manual edits),
 *   use it.
 * - Otherwise, if this is a @mito.hu account AND the bundled default list
 *   is non-empty, auto-seed it (secure because the email comes from
 *   Google's own OAuth token response, not user input — see
 *   getCachedUserEmail below). The bundled list ships empty in the public
 *   Store version (see rooms.ts) — Ticsi's real list lives only in his own
 *   LocalStorage, distributed to teammates via Export/Import, never in
 *   public source. So in practice this branch only ever fires for Ticsi's
 *   own local dev build, if he intentionally re-populates rooms.ts there.
 * - Otherwise return null, which tells the caller to run onboarding.
 */
export async function loadOrSeedRooms(
  email: string | undefined,
): Promise<Room[] | null> {
  const stored = await getStoredRooms();
  if (stored) return stored;

  if (
    email &&
    email.toLowerCase().endsWith("@mito.hu") &&
    MITO_DEFAULT_ROOMS.length > 0
  ) {
    await saveRooms(MITO_DEFAULT_ROOMS);
    return MITO_DEFAULT_ROOMS;
  }

  return null;
}

/**
 * Fetches the signed-in Google account's email once (via the userinfo
 * endpoint, using the `email` scope granted in google.ts) and caches it
 * locally — it doesn't change for a given login, no need to refetch every
 * time the command opens.
 */
export async function getCachedUserEmail(
  token: string,
): Promise<string | undefined> {
  const cached = await LocalStorage.getItem<string>(EMAIL_CACHE_KEY);
  if (cached) return cached;

  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { email?: string };
    if (data.email) {
      await LocalStorage.setItem(EMAIL_CACHE_KEY, data.email);
      return data.email;
    }
  } catch {
    // Non-fatal — worst case, onboarding runs for a mito.hu account too,
    // which just means going through the calendar-scan flow instead of
    // getting the bundled default. Not worth surfacing as an error.
  }
  return undefined;
}
