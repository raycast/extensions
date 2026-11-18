import { TraktShowDetailedProgress } from "../lib/schema";
import { identifyTraktIdKinds, resolveShow } from "./resolve-media";
import { executeToolCallAllowingNotFound, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the TV show.
   * If you don't know the ID, provide the `title` instead.
   */
  traktId?: number;
  /**
   * The title of the TV show (e.g. "Severance", "Breaking Bad").
   * Used to resolve the show ID if `traktId` is not specified.
   */
  title?: string;
  /**
   * Optional first-air year, to disambiguate shows that share a title.
   */
  year?: number;
};

type Output = {
  found: boolean;
  message?: string;
  show?: {
    traktId: number;
    title: string;
  };
  progress?: {
    aired: number;
    completed: number;
    completionPercentage: number;
    lastWatchedAt?: string | null;
    nextEpisode?: {
      season: number;
      number: number;
      title?: string | null;
      traktId: number;
      firstAired?: string | null;
    } | null;
    lastEpisode?: {
      season: number;
      number: number;
      title?: string | null;
      traktId: number;
    } | null;
    seasons?: {
      seasonNumber: number;
      title?: string | null;
      aired: number;
      completed: number;
    }[];
  };
};

/**
 * Get detailed watched progress for a TV show, including aired vs completed episode counts,
 * percentage completed, the next unwatched episode, and per-season completion stats.
 */
export default async function tool(input: Input): Promise<Output> {
  let resolvedId = input.traktId;
  let resolvedTitle = input.title ?? "TV Show";
  let resolutionWarning: string | undefined;

  if (!resolvedId) {
    if (!input.title) {
      return {
        found: false,
        message: "Please provide either a `traktId` or a `title` to find show progress.",
      };
    }

    const match = await resolveShow(input.title, input.year);
    if (!match) {
      return {
        found: false,
        message: `No TV show found matching "${input.title}".`,
      };
    }

    resolvedId = match.traktId;
    resolvedTitle = match.title;

    if (!match.matchedYear) {
      resolutionWarning =
        `No TV show named "${input.title}" from ${input.year} was found; ` +
        `showing "${match.title}"${match.year ? ` (${match.year})` : ""} instead. Confirm this is the right show.`;
    } else if (!match.titleMatched) {
      resolutionWarning =
        `No TV show is titled exactly "${input.title}"; showing "${match.title}"` +
        `${match.year ? ` (${match.year})` : ""} instead. Confirm this is the right show.`;
    }
  }

  const progressResponse = await executeToolCallAllowingNotFound(
    (signal) =>
      toolTraktClient.shows.getShowProgress({
        params: {
          showid: resolvedId!,
        },
        query: {
          extended: "full",
        },
        fetchOptions: { signal },
      }),
    `Failed to fetch progress for show ID ${resolvedId}`,
  );

  if (!progressResponse) {
    if (input.traktId !== undefined) {
      const kinds = await identifyTraktIdKinds(input.traktId);
      if (kinds.includes("movie") && !kinds.includes("show")) {
        return {
          found: false,
          message:
            `Trakt ID ${input.traktId} is a movie, not a TV show. Use \`get-history\` with \`type: "movies"\`, ` +
            `or look the show up with \`search-shows\`.`,
        };
      }
    }
    return {
      found: false,
      message: `No TV show exists with Trakt ID ${resolvedId}.`,
    };
  }

  const p = progressResponse.body as TraktShowDetailedProgress;
  const aired = p.aired ?? 0;
  const completed = p.completed ?? 0;
  const completionPercentage = aired > 0 ? Math.round((completed / aired) * 100) : 0;

  return {
    found: true,
    message: resolutionWarning,
    show: {
      traktId: resolvedId,
      title: resolvedTitle,
    },
    progress: {
      aired,
      completed,
      completionPercentage,
      lastWatchedAt: p.last_watched_at,
      nextEpisode: p.next_episode
        ? {
            season: p.next_episode.season,
            number: p.next_episode.number,
            title: p.next_episode.title,
            traktId: p.next_episode.ids.trakt,
            firstAired: p.next_episode.first_aired,
          }
        : null,
      lastEpisode: p.last_episode
        ? {
            season: p.last_episode.season,
            number: p.last_episode.number,
            title: p.last_episode.title,
            traktId: p.last_episode.ids.trakt,
          }
        : null,
      seasons: p.seasons?.map((s) => ({
        seasonNumber: s.number,
        title: s.title,
        aired: s.aired,
        completed: s.completed,
      })),
    },
  };
}
