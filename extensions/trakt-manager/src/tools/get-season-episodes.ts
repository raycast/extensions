import { CompactEpisode, toCompactEpisode } from "./compact-media";
import { resolveShow } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the TV show.
   * Provide this if already known, or supply `showTitle`.
   */
  showTraktId?: number;
  /**
   * The title of the TV show (e.g. "Severance", "Breaking Bad").
   * Used to resolve the show ID if `showTraktId` is omitted.
   */
  showTitle?: string;
  /**
   * Optional first-air year, to disambiguate shows that share a title.
   */
  showYear?: number;
  /**
   * The season number (e.g. 1, 2).
   */
  seasonNumber: number;
};

type Output = {
  showTitle?: string;
  showTraktId: number;
  seasonNumber: number;
  totalEpisodes: number;
  episodes: CompactEpisode[];
  /**
   * Set when the requested year could not be honoured and another show was used instead.
   */
  warning?: string;
};

/**
 * Get all episodes for a specific TV show season with titles, air dates, overviews, and ratings.
 */
export default async function tool(input: Input): Promise<Output> {
  const { seasonNumber, showYear } = input;
  let { showTraktId, showTitle } = input;
  let warning: string | undefined;

  if (typeof seasonNumber !== "number" || seasonNumber < 0) {
    throw new Error("A valid season number is required.");
  }

  // Resolve show ID if not provided
  if (!showTraktId) {
    if (!showTitle) {
      throw new Error("Either showTraktId or showTitle must be provided.");
    }

    const match = await resolveShow(showTitle, showYear);
    if (!match) {
      throw new Error(`TV show "${showTitle}" could not be found on Trakt.`);
    }

    if (!match.matchedYear) {
      warning =
        `No TV show named "${showTitle}" from ${showYear} was found; ` +
        `using "${match.title}"${match.year ? ` (${match.year})` : ""} instead.`;
    }

    showTraktId = match.traktId;
    showTitle = match.title;
  }

  const episodesRes = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.getEpisodes({
        params: {
          showid: showTraktId as number,
          seasonNumber,
        },
        query: {
          extended: "full",
        },
        fetchOptions: { signal },
      }),
    `Failed to fetch episodes for season ${seasonNumber}`,
  );

  const episodes = episodesRes.body.map(toCompactEpisode);

  return {
    showTitle,
    showTraktId,
    seasonNumber,
    totalEpisodes: episodes.length,
    episodes,
    warning,
  };
}
