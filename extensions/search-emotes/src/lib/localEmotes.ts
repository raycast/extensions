import { LocalStorage, showToast, Toast } from '@raycast/api';
import type { Emote, EmoteSource } from '../types/emote';

const FAVS_KEY = 'emote-favorites';
const RECENT_KEY = 'emote-recents';

/**
 * Get all favorite emotes from local storage.
 * @throws {Error} If storage is unavailable or data is corrupted
 */
export async function getAllFavs(): Promise<Emote[]> {
  try {
    const favs = await LocalStorage.getItem<string>(FAVS_KEY);
    return favs ? (JSON.parse(favs) as Emote[]) : [];
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to load favorites',
      message: 'Please try again later',
    });
    throw new Error('Failed to load favorites');
  }
}

export async function getAllFavIds(): Promise<string[]> {
  const favs = await getAllFavs();
  return favs.map((emote) => emote.id);
}

/**
 * Get all recent emotes from local storage.
 * @throws {Error} If storage is unavailable or data is corrupted
 */
export async function getAllRecents(): Promise<Emote[]> {
  try {
    const recents = await LocalStorage.getItem<string>(RECENT_KEY);
    return recents ? (JSON.parse(recents) as Emote[]) : [];
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to load recent emotes',
      message: 'Please try again later',
    });
    throw new Error('Failed to load recent emotes');
  }
}

export async function getAllRecentIds(): Promise<string[]> {
  const recents = await getAllRecents();
  return recents.map((emote) => emote.id);
}

/**
 * Save an emote to favorites or recents.
 * @throws {Error} If storage is unavailable
 */
export async function save(emote: Emote, source: EmoteSource, type: 'favs' | 'recent'): Promise<void> {
  const key = type === 'favs' ? FAVS_KEY : RECENT_KEY;
  try {
    const existing = await LocalStorage.getItem<string>(key);
    const items: Emote[] = existing ? JSON.parse(existing) : [];
    const newItems = [{ ...emote, source }, ...items.filter((item) => item.id !== emote.id || item.source !== source)];
    await LocalStorage.setItem(key, JSON.stringify(newItems));
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to save ${type === 'favs' ? 'favorite' : 'recent'} emote`,
      message: 'Please try again later',
    });
    throw new Error(`Failed to save ${type === 'favs' ? 'favorite' : 'recent'} emote`);
  }
}

/**
 * Remove an emote from favorites or recents.
 * @throws {Error} If storage is unavailable
 */
export async function remove(emote: Emote, source: EmoteSource, type: 'favs' | 'recent'): Promise<void> {
  const key = type === 'favs' ? FAVS_KEY : RECENT_KEY;
  try {
    const existing = await LocalStorage.getItem<string>(key);
    if (existing) {
      const items: Emote[] = JSON.parse(existing);
      const newItems = items.filter((item) => item.id !== emote.id || item.source !== source);
      await LocalStorage.setItem(key, JSON.stringify(newItems));
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to remove ${type === 'favs' ? 'favorite' : 'recent'} emote`,
      message: 'Please try again later',
    });
    throw new Error(`Failed to remove ${type === 'favs' ? 'favorite' : 'recent'} emote`);
  }
}
