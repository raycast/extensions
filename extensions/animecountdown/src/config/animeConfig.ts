import { AnimeService } from "../services/AnimeService";
import { AnimeCountdownAdapter } from "../adapters/AnimeCountdownAdapter";
import { CONSTANTS } from "./constants";

/**
 * Application configuration and dependency injection manager.
 * Centralized place to handle site constants, networking defaults,
 * and service singletons.
 */
export class AnimeConfig {
  /** Base URL for the animecountdown website. */
  static readonly BASE_URL = CONSTANTS.SITE.BASE_URL;

  /**
   * Mimic a modern browser user agent to ensure the site
   * serves the correct HTML and avoids simple bot blocks.
   */
  static readonly USER_AGENT = CONSTANTS.SITE.USER_AGENT;

  private static animeService: AnimeService | null = null;

  /**
   * Gets or creates the AnimeService singleton.
   * Automatically initializes the service with a default AnimeCountdownAdapter.
   * @returns The global AnimeService instance.
   */
  static getAnimeService(): AnimeService {
    if (!this.animeService) {
      const adapter = new AnimeCountdownAdapter();
      this.animeService = new AnimeService(adapter);
    }
    return this.animeService;
  }

  /**
   * Resets the cached service instance.
   * Primary use cases: unit testing or forcing a refresh of the adapter.
   */
  static resetService(): void {
    this.animeService = null;
  }
}
