import { AnimeItem } from "../models/AnimeItem";
import { AnimeViewType } from "../types/anime";

export { AnimeViewType };

/**
 * Adapter interface for fetching anime data from different sources
 * Implements the Adapter pattern to allow multiple data sources
 */
export interface IAnimeAdapter {
  /**
   * Fetch anime data for a specific view type
   * @param viewType - Type of view (trending or upcoming)
   * @returns Promise resolving to array of AnimeItem instances
   * @throws Error if fetch fails
   */
  fetchAnime(viewType: AnimeViewType): Promise<AnimeItem[]>;

  /**
   * Get the name/identifier of this adapter
   * @returns Adapter name
   */
  getName(): string;

  /**
   * Check if adapter is available/healthy
   * @returns Promise resolving to true if adapter is available
   */
  isAvailable(): Promise<boolean>;
}
