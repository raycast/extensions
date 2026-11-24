import { LocalStorage } from "@raycast/api";
import { MeetingId, isMeetingId } from "../data/meetings";

export const FAVORITES_KEY = "favorites";

export function parseFavorites(value: unknown): MeetingId[] {
  return Array.isArray(value) ? [...new Set(value.filter(isMeetingId))] : [];
}

export async function getFavorites(): Promise<MeetingId[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (stored === undefined) return [];
  return parseFavorites(JSON.parse(stored));
}

/** Sets the desired state so retrying an AI call never toggles it back. */
export async function setFavorite(id: MeetingId, favorite: boolean): Promise<MeetingId[]> {
  const favorites = await getFavorites();
  const next = favorite ? [...new Set([...favorites, id])] : favorites.filter((item) => item !== id);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}
