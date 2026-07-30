import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "room-block-rooms-v1";

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
 * Returns this install's saved room list, or null if none is saved yet
 * (which tells the caller to run onboarding: calendar scan, import, or
 * manual entry — see onboarding.tsx).
 */
export async function loadOrSeedRooms(): Promise<Room[] | null> {
  return getStoredRooms();
}
