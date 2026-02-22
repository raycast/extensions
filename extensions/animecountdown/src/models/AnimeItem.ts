/**
 * AnimeItem Model
 * Represents an anime entry with countdown information.
 * Encapsulates all data related to a single anime item including its metadata,
 * countdown status, and formatting logic.
 */
export class AnimeItem {
  private _id: string;
  private _slug: string;
  private _title: string;
  private _episode: string;
  private _countdownSeconds: number;
  private _fetchedAt: number;
  private _posterUrl: string;
  private _hotPercentage: number;
  private _url: string;

  /**
   * Creates a new AnimeItem instance.
   * @param id - Unique identifier for the anime.
   * @param slug - URL-friendly name.
   * @param title - Display title of the anime.
   * @param episode - Episode information string (e.g., "Episode 12").
   * @param countdownSeconds - Initial countdown time in seconds from fetching.
   * @param posterUrl - URL to the anime's poster image.
   * @param hotPercentage - Trending percentage (hype score).
   * @param url - Full URL to the anime page.
   * @param fetchedAt - Timestamp when the data was originally fetched.
   */
  constructor(
    id: string,
    slug: string,
    title: string,
    episode: string,
    countdownSeconds: number,
    posterUrl: string,
    hotPercentage: number,
    url: string,
    fetchedAt?: number,
  ) {
    this._id = id;
    this._slug = slug;
    this._title = title;
    this._episode = episode;
    this._countdownSeconds = countdownSeconds;
    this._posterUrl = posterUrl;
    this._hotPercentage = hotPercentage;
    this._url = url;
    this._fetchedAt = fetchedAt ?? Date.now();
  }

  /** @returns The unique identifier for the anime. */
  get id(): string {
    return this._id;
  }

  /** @returns The URL-friendly identifier for the anime. */
  get slug(): string {
    return this._slug;
  }

  /** @returns The display title of the anime. */
  get title(): string {
    return this._title;
  }

  /** @returns The episode number or description string. */
  get episode(): string {
    return this._episode;
  }

  /** @returns The initial countdown in seconds at the time of fetch. */
  get countdownSeconds(): number {
    return this._countdownSeconds;
  }

  /** @returns The timestamp (ms) when this item was fetched. */
  get fetchedAt(): number {
    return this._fetchedAt;
  }

  /** @returns The URL for the anime's poster image. */
  get posterUrl(): string {
    return this._posterUrl;
  }

  /** @returns The trending percentage (0-100). */
  get hotPercentage(): number {
    return this._hotPercentage;
  }

  /** @returns The full web URL for this anime on animecountdown.com. */
  get url(): string {
    return this._url;
  }

  /**
   * Calculate remaining seconds until the next episode airs.
   * Account for elapsed time since the data was originally fetched.
   * @param currentTime - Current timestamp in milliseconds.
   * @returns Remaining seconds (0 if already aired).
   */
  getRemainingSeconds(currentTime: number): number {
    const elapsed = Math.floor((currentTime - this._fetchedAt) / 1000);
    return Math.max(0, this._countdownSeconds - elapsed);
  }

  /**
   * Format the countdown as a human-readable string.
   * Logic:
   * - If > 1 day: "Xd Xh"
   * - If < 1 day, > 1 hour: "Xh Xm"
   * - If < 1 hour: "Xm"
   * - If <= 0: "Airing now"
   * @param currentTime - Current timestamp in milliseconds.
   * @returns Formatted countdown string.
   */
  getFormattedCountdown(currentTime: number): string {
    const remainingSeconds = this.getRemainingSeconds(currentTime);

    if (remainingSeconds <= 0) {
      return "Airing now";
    }

    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Check if the anime is currently airing based on its countdown.
   * @param currentTime - Current timestamp in milliseconds.
   * @returns True if the countdown has reached zero.
   */
  isAiring(currentTime: number): boolean {
    return this.getRemainingSeconds(currentTime) <= 0;
  }

  /**
   * Check if the anime is trending (has a hot percentage greater than 0).
   * @returns True if hot percentage > 0.
   */
  isTrending(): boolean {
    return this._hotPercentage > 0;
  }

  /**
   * Convert the class instance to a plain JSON-serializable object.
   * Useful for storing in Raycast's CachedState.
   * @returns Plain object representation.
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      slug: this._slug,
      title: this._title,
      episode: this._episode,
      countdownSeconds: this._countdownSeconds,
      fetchedAt: this._fetchedAt,
      posterUrl: this._posterUrl,
      hotPercentage: this._hotPercentage,
      url: this._url,
    };
  }

  /**
   * Creates a new AnimeItem instance from a plain JSON object.
   * Static factory method for hydration from cache.
   * @param data - Plain object data.
   * @returns New functional AnimeItem instance.
   */
  static fromJSON(data: Record<string, unknown>): AnimeItem {
    return new AnimeItem(
      data.id as string,
      data.slug as string,
      data.title as string,
      data.episode as string,
      data.countdownSeconds as number,
      data.posterUrl as string,
      data.hotPercentage as number,
      data.url as string,
      data.fetchedAt as number,
    );
  }
}
