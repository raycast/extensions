import { IAnimeAdapter, AnimeViewType } from "../adapters/IAnimeAdapter";
import { AnimeItem } from "../models/AnimeItem";

/**
 * Service layer for anime data operations.
 * Coordinates between adapters and provides a unified interface for the UI.
 * Handles validation and categorization of anime items.
 */
export class AnimeService {
  private adapter: IAnimeAdapter;

  /**
   * @param adapter - Initial adapter instance to use for data fetching.
   */
  constructor(adapter: IAnimeAdapter) {
    this.adapter = adapter;
  }

  /**
   * Sets a new adapter instance at runtime.
   * Useful for supporting multiple data providers or fallback mechanisms.
   * @param adapter - New adapter to use.
   */
  setAdapter(adapter: IAnimeAdapter): void {
    this.adapter = adapter;
  }

  /**
   * @returns The current active adapter instance.
   */
  getAdapter(): IAnimeAdapter {
    return this.adapter;
  }

  /**
   * Fetches anime data via the configured adapter and performs validation.
   * @param viewType - The specific category (Trending or Upcoming) to fetch.
   * @returns Promise resolving to an array of valid AnimeItem instances.
   * @throws Error if the fetch operation fails.
   */
  async fetchAnime(viewType: AnimeViewType): Promise<AnimeItem[]> {
    // Skip availability check to avoid extra requests (adapter will handle errors)
    // Availability check can cause rate limiting issues

    try {
      const items = await this.adapter.fetchAnime(viewType);
      // Validate and return items
      return this.validateAnimeItems(items);
    } catch (error) {
      if (error instanceof Error) {
        // Preserve original error message (already formatted by adapter)
        throw error;
      }
      throw new Error("Failed to fetch anime: Unknown error occurred");
    }
  }

  /**
   * Shorthand method to fetch trending anime.
   * @returns Promise resolving to array of AnimeItem instances.
   */
  async fetchTrending(): Promise<AnimeItem[]> {
    return this.fetchAnime(AnimeViewType.TRENDING);
  }

  /**
   * Shorthand method to fetch upcoming anime.
   * @returns Promise resolving to array of AnimeItem instances.
   */
  async fetchUpcoming(): Promise<AnimeItem[]> {
    return this.fetchAnime(AnimeViewType.UPCOMING);
  }

  /**
   * Validates anime items and filters out any that are missing critical data.
   * Ensures ID, title, URL, and non-negative countdown are present.
   * @param items - Array of anime items to validate.
   * @returns Array containing only valid anime items.
   */
  validateAnimeItems(items: AnimeItem[]): AnimeItem[] {
    return items.filter((item) => {
      // Basic validation - ensure required fields are present
      return item.id && item.title && item.url && item.countdownSeconds >= 0;
    });
  }
}
