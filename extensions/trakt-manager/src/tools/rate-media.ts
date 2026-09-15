import { Action, Tool } from "@raycast/api";
import { rateMedia } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to rate: "movie", "show", or "episode".
   */
  type: "movie" | "show" | "episode";
  /**
   * The unique Trakt ID of the media item to rate.
   * Obtain this first from `search-movies`, `search-shows`, `get-up-next`, or `get-watchlist`.
   */
  traktId: number;
  /**
   * The title of the movie, TV show, or episode being rated.
   * Required for the confirmation dialog presented to the user.
   */
  title: string;
  /**
   * Rating score from 1 to 10 (integer).
   * 1 is weakest, 10 is highest.
   */
  rating: number;
  /**
   * Optional rating date in ISO format (e.g. "2026-09-15T12:00:00Z").
   */
  ratedAt?: string;
};

type Output = {
  success: boolean;
  message: string;
  rating: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const typeMap: Record<string, string> = {
    movie: "Movie",
    show: "TV Show",
    episode: "Episode",
  };

  return {
    style: Action.Style.Regular,
    message: `Rate "${input.title}" ${input.rating}/10 on Trakt?`,
    info: [
      { name: "Title", value: input.title },
      { name: "Type", value: typeMap[input.type] ?? input.type },
      { name: "Rating", value: `${input.rating} / 10` },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Rate a movie, TV show, or episode on Trakt (rating score between 1 and 10).
 * Requires a valid `traktId`.
 * A confirmation dialog is shown to the user before recording the rating.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId, title, rating, ratedAt } = input;

  const intRating = Math.round(rating);
  if (intRating < 1 || intRating > 10) {
    throw new Error(`Rating must be an integer between 1 and 10 (received ${rating}).`);
  }

  await executeToolCall(
    (signal) => rateMedia(toolTraktClient, { type, traktId, rating: intRating, ratedAt }, { signal }),
    `Failed to rate ${type} "${title}" (ID: ${traktId})`,
  );

  return {
    success: true,
    message: `Successfully rated "${title}" ${intRating}/10 on Trakt.`,
    rating: intRating,
  };
}
