import { LocalStorage } from "@raycast/api";
import type { Emote, EmoteSource } from "../types/emote";

const FAVS_KEY = "favs";
const RECENT_KEY = "recent";

export async function getAllFavs(): Promise<Emote[]> {
  try {
    const favs = await LocalStorage.getItem<string>(FAVS_KEY);
    if (favs) {
      return JSON.parse(favs);
    }
    return [];
  } catch {
    return [];
  }
}

export async function getAllFavIds(): Promise<string[]> {
  const favs = await getAllFavs();
  return favs.map((emote) => emote.id);
}

export async function getAllRecentIds(): Promise<string[]> {
  try {
    const recent = await LocalStorage.getItem<string>(RECENT_KEY);
    if (recent) {
      const parsed = JSON.parse(recent) as Emote[];
      return parsed.map((emote) => emote.id);
    }
    return [];
  } catch {
    return [];
  }
}

export async function save(
  emote: Emote,
  source: EmoteSource,
  type: "favs" | "recent"
): Promise<void> {
  const key = type === "favs" ? FAVS_KEY : RECENT_KEY;
  try {
    const existing = await LocalStorage.getItem<string>(key);
    const items = existing ? JSON.parse(existing) : [];
    const newItems = [
      { ...emote, source },
      ...items.filter((item: Emote) => item.id !== emote.id || item.source !== source),
    ];
    await LocalStorage.setItem(key, JSON.stringify(newItems));
  } catch {
    // Error handling removed
  }
}

export async function remove(
  emote: Emote,
  source: EmoteSource,
  type: "favs" | "recent"
): Promise<void> {
  const key = type === "favs" ? FAVS_KEY : RECENT_KEY;
  try {
    const existing = await LocalStorage.getItem<string>(key);
    if (existing) {
      const items = JSON.parse(existing) as Emote[];
      const newItems = items.filter((item) => item.id !== emote.id || item.source !== source);
      await LocalStorage.setItem(key, JSON.stringify(newItems));
    }
  } catch {
    // Error handling removed
  }
}
