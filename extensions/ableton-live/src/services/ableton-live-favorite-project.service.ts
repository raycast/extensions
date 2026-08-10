import { AbletonLiveProject } from "../models/ableton-live-project.model";
import { LocalStorage } from "@raycast/api";

export class AbletonLiveFavoriteProjectService {
  private static localStorageKey = "ableton-live-project-favorite";

  static async favorites(): Promise<string[]> {
    const favoriteItem: string | undefined = await LocalStorage.getItem(
      AbletonLiveFavoriteProjectService.localStorageKey
    );
    if (favoriteItem) {
      return JSON.parse(favoriteItem) as string[];
    } else {
      return [];
    }
  }

  static async addToFavorites(project: AbletonLiveProject) {
    const favorites = await AbletonLiveFavoriteProjectService.favorites();
    favorites.push(project.filePath);
    await AbletonLiveFavoriteProjectService.saveFavorites(favorites);
  }

  static async removeFromFavorites(project: AbletonLiveProject) {
    let favorites = await AbletonLiveFavoriteProjectService.favorites();
    favorites = favorites.filter((item) => item !== project.filePath);
    await AbletonLiveFavoriteProjectService.saveFavorites(favorites);
  }

  private static async saveFavorites(favorites: string[]) {
    await LocalStorage.setItem(AbletonLiveFavoriteProjectService.localStorageKey, JSON.stringify(favorites));
  }
}
