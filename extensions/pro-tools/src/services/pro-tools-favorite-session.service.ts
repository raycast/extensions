import { ProToolsSession } from "../models/pro-tools-session.model";
import { LocalStorage } from "@raycast/api";

export class ProToolsFavoriteSessionService {
  private static localStorageKey = "pro-tools-session-favorite";

  static async favorites(): Promise<string[]> {
    const favoriteItem: string | undefined = await LocalStorage.getItem(
      ProToolsFavoriteSessionService.localStorageKey,
    );
    if (favoriteItem) {
      return JSON.parse(favoriteItem) as string[];
    } else {
      return [];
    }
  }

  static async addToFavorites(session: ProToolsSession) {
    const favorites = await ProToolsFavoriteSessionService.favorites();
    favorites.push(session.filePath);
    await ProToolsFavoriteSessionService.saveFavorites(favorites);
  }

  static async removeFromFavorites(session: ProToolsSession) {
    let favorites = await ProToolsFavoriteSessionService.favorites();
    favorites = favorites.filter((item) => item !== session.filePath);
    await ProToolsFavoriteSessionService.saveFavorites(favorites);
  }

  private static async saveFavorites(favorites: string[]) {
    await LocalStorage.setItem(
      ProToolsFavoriteSessionService.localStorageKey,
      JSON.stringify(favorites),
    );
  }
}
