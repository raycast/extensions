import { Action, Tool } from "@raycast/api";
import { rateMedia } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncAdded, readSyncWrite, syncKindForMedia } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to rate: "movie", "show", or "episode".
   * Seasons are not supported: Trakt's ID lookup does not return them.
   */
  type: "movie" | "show" | "episode";
  /**
   * The unique Trakt ID of the media item to rate.
   * Obtain this first from `search-movies`, `search-shows`, `get-up-next`, `get-watchlist`,
   * or `get-season-episodes` (episode IDs).
   */
  traktId: number;
  /**
   * Optional title of the movie, TV show, or episode. Ignored: confirmation
   * always uses the title Trakt holds for `traktId`.
   */
  title?: string;
  /**
   * Rating score as a whole number from 1 to 10.
   * 1 is weakest, 10 is highest. Decimal values are rejected, so round before calling.
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

/**
 * Trakt only stores whole-number ratings. A decimal is rejected instead of rounded so that
 * the score shown in the confirmation is always the score that gets saved.
 */
function assertIntegerRating(rating: number): number {
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new Error(`Rating must be a whole number between 1 and 10 (received ${rating}).`);
  }

  return rating;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const rating = assertIntegerRating(input.rating);
  const verified = await describeMedia(input.type, input.traktId);

  const typeMap: Record<string, string> = {
    movie: "Movie",
    show: "TV Show",
    episode: "Episode",
  };

  return {
    style: Action.Style.Regular,
    message: `Rate ${verified} ${rating}/10 on Trakt?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: typeMap[input.type] ?? input.type },
      { name: "Rating", value: `${rating} / 10` },
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
  const { type, traktId, rating, ratedAt } = input;
  const validRating = assertIntegerRating(rating);
  const verified = await describeMedia(type, traktId);

  const response = await executeToolCall(
    (signal) => rateMedia(toolTraktClient, { type, traktId, rating: validRating, ratedAt }, { signal }),
    `Failed to rate ${verified} (ID: ${traktId})`,
  );
  assertSyncAdded(readSyncWrite(response.body, syncKindForMedia(type)), verified);

  return {
    success: true,
    message: `Successfully rated ${verified} ${validRating}/10 on Trakt.`,
    rating: validRating,
  };
}
