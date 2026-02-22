import * as cheerio from "cheerio";
import { CONSTANTS } from "../config/constants";
import { AnimeItem } from "../models/AnimeItem";

/**
 * Specialized parser for animecountdown.com HTML.
 * Decouples parsing logic from networking (SRP).
 * Uses cheerio for DOM traversal and regex for data extraction.
 */
export class AnimeCountdownParser {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - The base URL of the site, used for normalizing relative links.
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Parses HTML content and extracts an array of AnimeItem instances.
   * Iterates over items matching the configured selector and handles individual parsing errors.
   * @param html - The raw HTML string to parse.
   * @returns An array of successfully parsed AnimeItem instances.
   */
  public parseHTML(html: string): AnimeItem[] {
    const $ = cheerio.load(html);
    const items: AnimeItem[] = [];
    const { SELECTORS } = CONSTANTS;

    const elements = $(SELECTORS.ANIME_COUNTDOWN.ITEM);

    elements.each((_, element) => {
      try {
        const $el = $(element);
        const animeItem = this.parseAnimeElement($el);

        if (animeItem) {
          items.push(animeItem);
        }
      } catch (error) {
        // Silently continue for individual items to ensure partial availability
      }
    });

    return items;
  }

  /**
   * Parses a single anime DOM element and converts it to an AnimeItem model.
   * Extracts ID, slug, title, episode, timer, and metadata from data attributes.
   * @param $el - The cheerio element representing one anime item.
   * @returns A populated AnimeItem instance or null if critical data is missing.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAnimeElement($el: cheerio.Cheerio<any>): AnimeItem | null {
    const { SELECTORS } = CONSTANTS;
    const href = $el.attr("href") || "";
    if (!href) return null;

    const hrefMatch = href.match(/\/(\d+)\/(.+)/);
    if (!hrefMatch) return null;

    const id = hrefMatch[1];
    const slug = hrefMatch[2];

    const title = $el.find(SELECTORS.ANIME_COUNTDOWN.TITLE).text().trim();
    if (!title) return null;

    const episode = $el
      .find(SELECTORS.ANIME_COUNTDOWN.DESCRIPTION)
      .text()
      .trim();
    const countdownEl = $el.find(SELECTORS.ANIME_COUNTDOWN.COUNTDOWN);
    const countdownSeconds = parseInt(countdownEl.attr("data-time") || "0", 10);

    const posterUrl = this.normalizePosterUrl($el.attr("data-poster") || "");
    const hotPercentage = parseInt($el.attr("data-hot-percentage") || "0", 10);
    const url = `${this.baseUrl}${href}`;

    return new AnimeItem(
      id,
      slug,
      title,
      episode,
      countdownSeconds,
      posterUrl,
      hotPercentage,
      url,
    );
  }

  /**
   * Normalizes poster URLs to ensure they are absolute and use HTTPS.
   * Handles protocol-relative links and site-relative links.
   * @param posterUrl - The raw URL extracted from the HTML.
   * @returns An absolute, valid HTTPS URL.
   */
  private normalizePosterUrl(posterUrl: string): string {
    if (!posterUrl) return "";
    if (posterUrl.startsWith("//")) return `https:${posterUrl}`;
    if (posterUrl.startsWith("http://") || posterUrl.startsWith("https://"))
      return posterUrl;
    return `${this.baseUrl}${posterUrl.startsWith("/") ? "" : "/"}${posterUrl}`;
  }
}
