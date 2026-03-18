/**
 * FavoritesService.ts
 *
 * Persists a set of pinned / favourite URLs in Raycast's LocalStorage.
 * Favourite URLs are shown at the top of the home screen for one-click
 * re-testing.
 */

import { LocalStorage } from "@raycast/api";

export class FavoritesService {
  private readonly STORAGE_KEY = "favourite_urls_v1";

  // ── Public API ──────────────────────────────────────────────────

  /** Adds a URL (moves to top if already present). */
  async add(url: string): Promise<void> {
    const current = await this.getAll();
    const updated = [url, ...current.filter((u) => u !== url)];
    await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /** Removes a URL. No-op if not present. */
  async remove(url: string): Promise<void> {
    const current = await this.getAll();
    const updated = current.filter((u) => u !== url);
    await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Toggles the favourite state.
   * Returns true when added, false when removed.
   */
  async toggle(url: string): Promise<boolean> {
    const favourited = await this.isFavorite(url);
    if (favourited) {
      await this.remove(url);
      return false;
    }
    await this.add(url);
    return true;
  }

  /** Returns all favourited URLs, most-recently added first. */
  async getAll(): Promise<string[]> {
    const raw = await LocalStorage.getItem<string>(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  async isFavorite(url: string): Promise<boolean> {
    const all = await this.getAll();
    return all.includes(url);
  }

  async clear(): Promise<void> {
    await LocalStorage.removeItem(this.STORAGE_KEY);
  }
}
