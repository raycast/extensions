import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { ICursorRepository } from "./ICursorRepository";
import {
  CursorMetadata,
  CursorCategoryMap,
  CursorUsageStats,
} from "../types/cursor";
import {
  USAGE_STATS_KEY,
  SVG_FILE_EXTENSION,
  PATHS,
  DISPLAY_SIZE_TO_ITEMS,
} from "../constants";

interface DisplayPreferences {
  displaySize: "small" | "medium" | "large";
}

const FAVORITE_CURSORS_KEY = "favorite-cursors";

export class FilesystemCursorRepository implements ICursorRepository {
  private readonly cursorsRootPath: string;

  constructor() {
    this.cursorsRootPath = path.join(
      environment.assetsPath,
      PATHS.CURSORS_ROOT,
    );
  }

  async loadCursorsByCategory(): Promise<CursorCategoryMap> {
    const categoryFolders = await this.getCategoryFolders();
    const categorizedCursors: CursorCategoryMap = {};
    const favoriteCursors = await this.getFavoriteCursors();

    for (const categoryName of categoryFolders) {
      const categoryPath = path.join(this.cursorsRootPath, categoryName);
      const svgFiles = await this.getSvgFiles(categoryPath);

      categorizedCursors[categoryName] = this.createCursorMetadata(
        categoryName,
        categoryPath,
        svgFiles,
        favoriteCursors,
      );
    }

    return categorizedCursors;
  }

  private async getCategoryFolders(): Promise<string[]> {
    try {
      const folders = fs.readdirSync(this.cursorsRootPath);
      return folders.filter((folder) =>
        fs.statSync(path.join(this.cursorsRootPath, folder)).isDirectory(),
      );
    } catch (error) {
      console.error("Error reading category folders:", error);
      return [];
    }
  }

  private async getSvgFiles(categoryPath: string): Promise<string[]> {
    try {
      const files = fs.readdirSync(categoryPath);
      return files.filter((file) => file.endsWith(SVG_FILE_EXTENSION));
    } catch (error) {
      console.error(`Error reading SVG files from ${categoryPath}:`, error);
      return [];
    }
  }

  private createCursorMetadata(
    categoryName: string,
    categoryPath: string,
    svgFiles: string[],
    favoriteCursors: string[],
  ): Record<string, CursorMetadata> {
    return svgFiles.reduce(
      (metadata, svgFile) => {
        const cursorName = svgFile.replace(SVG_FILE_EXTENSION, "");
        const svgFilePath = path.join(categoryPath, svgFile);
        const cursorId = `${categoryName}-${cursorName}`;

        try {
          metadata[cursorName] = {
            filePath: svgFilePath,
            svgContent: fs.readFileSync(svgFilePath, "utf-8"),
            categoryName,
            isFavorited: favoriteCursors.includes(cursorId),
          };
        } catch (error) {
          console.error(`Error reading SVG file ${svgFilePath}:`, error);
        }

        return metadata;
      },
      {} as Record<string, CursorMetadata>,
    );
  }

  async getCursorUsageStats(): Promise<CursorUsageStats> {
    try {
      const storedStats = await LocalStorage.getItem<string>(USAGE_STATS_KEY);
      return storedStats ? JSON.parse(storedStats) : {};
    } catch (error) {
      console.error("Error reading cursor usage stats:", error);
      return {};
    }
  }

  async trackCursorUsage(cursorName: string): Promise<void> {
    try {
      const usageStats = await this.getCursorUsageStats();
      usageStats[cursorName] = (usageStats[cursorName] || 0) + 1;
      await LocalStorage.setItem(USAGE_STATS_KEY, JSON.stringify(usageStats));
    } catch (error) {
      console.error("Error tracking cursor usage:", error);
    }
  }

  getMostUsedCursors(
    allCursors: CursorCategoryMap,
    usageStats: CursorUsageStats,
  ): Record<string, CursorMetadata> {
    const { displaySize } = getPreferenceValues<DisplayPreferences>();
    const limit = DISPLAY_SIZE_TO_ITEMS[displaySize];

    const flattenedCursors = Object.values(allCursors).reduce(
      (accumulated, category) => ({ ...accumulated, ...category }),
      {},
    );

    return Object.entries(usageStats)
      .sort(([, usageCountA], [, usageCountB]) => usageCountB - usageCountA)
      .slice(0, limit)
      .reduce(
        (popularCursors, [cursorName, usageCount]) => {
          if (flattenedCursors[cursorName]) {
            popularCursors[cursorName] = {
              ...flattenedCursors[cursorName],
              timesUsed: usageCount,
            };
          }
          return popularCursors;
        },
        {} as Record<string, CursorMetadata>,
      );
  }

  async getFavoriteCursors(): Promise<string[]> {
    try {
      const storedFavorites =
        await LocalStorage.getItem<string>(FAVORITE_CURSORS_KEY);
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
      console.error("Error reading favorite cursors:", error);
      return [];
    }
  }

  async favoriteCursor(cursorId: string): Promise<void> {
    try {
      const favoriteCursors = await this.getFavoriteCursors();
      if (!favoriteCursors.includes(cursorId)) {
        favoriteCursors.push(cursorId);
        await LocalStorage.setItem(
          FAVORITE_CURSORS_KEY,
          JSON.stringify(favoriteCursors),
        );
      }
    } catch (error) {
      console.error("Error favoriting cursor:", error);
    }
  }

  async removeFavorite(cursorId: string): Promise<void> {
    try {
      const favoriteCursors = await this.getFavoriteCursors();
      const updatedFavoriteCursors = favoriteCursors.filter(
        (id) => id !== cursorId,
      );
      await LocalStorage.setItem(
        FAVORITE_CURSORS_KEY,
        JSON.stringify(updatedFavoriteCursors),
      );
    } catch (error) {
      console.error("Error removing cursor from favorites:", error);
    }
  }

  async resetUsageStats(): Promise<void> {
    try {
      await LocalStorage.setItem(USAGE_STATS_KEY, JSON.stringify({}));
    } catch (error) {
      console.error("Error resetting cursor usage stats:", error);
    }
  }
}
