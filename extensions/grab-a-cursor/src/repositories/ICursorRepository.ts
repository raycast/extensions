import {
  CursorMetadata,
  CursorCategoryMap,
  CursorUsageStats,
} from "../types/cursor";

export interface ICursorRepository {
  loadCursorsByCategory(): Promise<CursorCategoryMap>;
  getCursorUsageStats(): Promise<CursorUsageStats>;
  trackCursorUsage(cursorName: string): Promise<void>;
  getMostUsedCursors(
    allCursors: CursorCategoryMap,
    usageStats: CursorUsageStats,
  ): Record<string, CursorMetadata>;
  getFavoriteCursors(): Promise<string[]>;
  favoriteCursor(cursorId: string): Promise<void>;
  removeFavorite(cursorId: string): Promise<void>;
  resetUsageStats(): Promise<void>;
}
