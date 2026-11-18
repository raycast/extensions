import { LocalStorage } from "@raycast/api";
import { ReferenceId } from "../types";

const FAVORITES_KEY = "favorites";
const RECENTS_KEY = "recents";
const RECENT_LIMIT = 40;

export class PreferenceStore {
  async toggleFavorite(id: ReferenceId): Promise<boolean> {
    const favorites = await this.getFavorites();
    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }

    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    return favorites.has(id);
  }

  async addRecent(id: ReferenceId): Promise<void> {
    const recents = await this.getRecents();
    const next = [id, ...recents.filter((item) => item !== id)].slice(
      0,
      RECENT_LIMIT,
    );
    await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  async getFavorites(): Promise<Set<ReferenceId>> {
    const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw) as ReferenceId[];
      return new Set(parsed);
    } catch {
      return new Set();
    }
  }

  async getRecents(): Promise<ReferenceId[]> {
    const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ReferenceId[];
    } catch {
      return [];
    }
  }
}
