import { IAnimeAdapter, AnimeViewType } from "./IAnimeAdapter";
import { AnimeItem } from "../models/AnimeItem";
import { retryWithBackoff } from "../utils/retry";
import { CONSTANTS } from "../config/constants";
import { AnimeCountdownParser } from "./AnimeCountdownParser";

/**
 * Adapter for animecountdown.com.
 * Implements the IAnimeAdapter interface to fetch anime data.
 * This class handles the networking layer, including retries and request headers,
 * and delegates the HTML parsing to the AnimeCountdownParser.
 */
export class AnimeCountdownAdapter implements IAnimeAdapter {
  private readonly baseUrl = CONSTANTS.SITE.BASE_URL;
  private readonly userAgent = CONSTANTS.SITE.USER_AGENT;
  private readonly parser: AnimeCountdownParser;

  /**
   * Initializes the adapter with a dedicated parser.
   */
  constructor() {
    this.parser = new AnimeCountdownParser(this.baseUrl);
  }

  /**
   * @returns The human-readable name of this adapter.
   */
  getName(): string {
    return "AnimeCountdown";
  }

  /**
   * Checks if the service is available.
   * Currently always returns true as availability is handled during fetch.
   * @returns Promise resolving to true.
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Fetches anime data for a specific category (Trending or Upcoming).
   * Implements retry logic with exponential backoff for resilience.
   * @param viewType - The category of anime to fetch.
   * @returns Promise resolving to an array of AnimeItem instances.
   * @throws Error if the view type is invalid or the network request fails repeatedly.
   */
  async fetchAnime(viewType: AnimeViewType): Promise<AnimeItem[]> {
    const { NETWORK } = CONSTANTS;

    if (
      !viewType ||
      (viewType !== AnimeViewType.TRENDING &&
        viewType !== AnimeViewType.UPCOMING)
    ) {
      throw new Error(`Invalid view type: ${viewType}`);
    }

    const path = viewType === AnimeViewType.TRENDING ? "trending" : "upcoming";
    const baseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    const url = `${baseUrl}/${path}`;

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          headers: {
            accept: "text/html",
            "user-agent": this.userAgent,
          },
        });

        if (!res.ok) {
          const error = new Error(
            `Failed to fetch ${viewType} anime: ${res.status} ${res.statusText}`,
          ) as Error & { status?: number };
          error.status = res.status;
          throw error;
        }

        return res;
      }, NETWORK.RETRY);

      const html = await response.text();
      return this.parser.parseHTML(html);
    } catch (error) {
      throw new Error(
        `AnimeCountdownAdapter error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
