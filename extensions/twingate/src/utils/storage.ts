import { LocalStorage } from "@raycast/api";
import { Favorite, RecentResource, UserPreferences } from "../types";

export class TwingateStorage {
  private static readonly FAVORITES_KEY = "twingate-favorites";
  private static readonly RECENT_RESOURCES_KEY = "twingate-recent-resources";
  private static readonly USER_PREFERENCES_KEY = "twingate-user-preferences";

  // Favorites
  static async getFavorites(): Promise<Favorite[]> {
    try {
      const favorites = await LocalStorage.getItem<string>(this.FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  }

  static async addFavorite(id: string, name: string): Promise<void> {
    const favorites = await this.getFavorites();
    const existing = favorites.find((f) => f.id === id);
    if (!existing) {
      favorites.push({ id, name, timestamp: Date.now() });
      await LocalStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    }
  }

  static async removeFavorite(id: string): Promise<void> {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter((f) => f.id !== id);
    await LocalStorage.setItem(this.FAVORITES_KEY, JSON.stringify(filtered));
  }

  static async isFavorite(id: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some((f) => f.id === id);
  }

  // Recent Resources
  static async getRecentResources(): Promise<RecentResource[]> {
    try {
      const recent = await LocalStorage.getItem<string>(
        this.RECENT_RESOURCES_KEY,
      );
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }

  static async addRecentResource(
    id: string,
    name: string,
    url: string,
    address: string,
    networkName: string,
    alias?: string,
  ): Promise<void> {
    const recent = await this.getRecentResources();
    const filtered = recent.filter((r) => r.id !== id);
    filtered.unshift({
      id,
      name,
      url,
      address,
      networkName,
      alias,
      timestamp: Date.now(),
    });

    // Keep only 50 most recent
    const trimmed = filtered.slice(0, 50);
    await LocalStorage.setItem(
      this.RECENT_RESOURCES_KEY,
      JSON.stringify(trimmed),
    );
  }

  // User Preferences
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const prefs = await LocalStorage.getItem<string>(
        this.USER_PREFERENCES_KEY,
      );
      return prefs ? JSON.parse(prefs) : { debugMode: false };
    } catch {
      return { debugMode: false };
    }
  }

  static async updateUserPreferences(
    updates: Partial<UserPreferences>,
  ): Promise<void> {
    const current = await this.getUserPreferences();
    const updated = { ...current, ...updates };
    await LocalStorage.setItem(
      this.USER_PREFERENCES_KEY,
      JSON.stringify(updated),
    );
  }

  // Data management
  static async clearAllData(): Promise<void> {
    await LocalStorage.removeItem(this.FAVORITES_KEY);
    await LocalStorage.removeItem(this.RECENT_RESOURCES_KEY);
    await LocalStorage.removeItem(this.USER_PREFERENCES_KEY);
  }
}
