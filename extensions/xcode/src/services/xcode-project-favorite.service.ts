import { XcodeProject } from "../models/xcode-project/xcode-project.model";
import { LocalStorage } from "@raycast/api";

/**
 * XcodeProjectFavoriteService
 */
export class XcodeProjectFavoriteService {
  /**
   * The LocalStorage Key
   */
  private static localStorageKey = "xcode-project-favorites";

  /**
   * Retrieve favorites Xcode Project file paths
   */
  static async favorites(): Promise<string[]> {
    const favoritesItem: string | undefined = await LocalStorage.getItem(XcodeProjectFavoriteService.localStorageKey);
    if (favoritesItem) {
      return JSON.parse(favoritesItem) as string[];
    } else {
      return [];
    }
  }

  /**
   * Add Xcode Project to favorites
   * @param project The XcodeProject that should be added to favorites
   */
  static async addToFavorites(project: XcodeProject) {
    const favorites = await XcodeProjectFavoriteService.favorites();
    favorites.push(project.filePath);
    await XcodeProjectFavoriteService.saveFavorites(favorites);
  }

  /**
   * Remove Xcode Project from favorites
   * @param project The XcodeProject that should be removed from favorites
   */
  static async removeFromFavorites(project: XcodeProject) {
    let favorites = await XcodeProjectFavoriteService.favorites();
    favorites = favorites.filter((favorite) => favorite !== project.filePath);
    await XcodeProjectFavoriteService.saveFavorites(favorites);
  }

  /**
   * Save favorite Xcode Project file paths
   * @param favorites The Xcode Project file paths that should be saved
   */
  private static async saveFavorites(favorites: string[]) {
    await LocalStorage.setItem(XcodeProjectFavoriteService.localStorageKey, JSON.stringify(favorites));
  }
}
