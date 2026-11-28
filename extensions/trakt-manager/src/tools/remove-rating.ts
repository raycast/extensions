import { Action, Tool } from "@raycast/api";
import { removeMediaRating } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncFound, readSyncWrite, syncKindForMedia } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media whose rating should be removed: "movie", "show", or "episode".
   * Seasons are not supported: Trakt's ID lookup does not return them.
   */
  type: "movie" | "show" | "episode";
  /**
   * The unique Trakt ID of the media item.
   * Obtain this first from `get-ratings` (movie, show, or episode rows only),
   * `search-movies`, `search-shows`, or `get-season-episodes`. Season ratings
   * from `get-ratings` cannot be removed here.
   */
  traktId: number;
  /**
   * Optional title of the movie, TV show, or episode. Ignored: confirmation always uses
   * the title Trakt holds for `traktId`.
   */
  title?: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const typeMap: Record<string, string> = {
    movie: "Movie",
    show: "TV Show",
    episode: "Episode",
  };

  const verified = await describeMedia(input.type, input.traktId);

  return {
    style: Action.Style.Destructive,
    message: `Remove your rating for ${verified} on Trakt?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: typeMap[input.type] ?? input.type },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Remove your rating for a movie, TV show, or episode on Trakt.
 * Requires a valid `traktId`.
 * A destructive confirmation dialog is shown to the user before removing the rating.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId } = input;
  const verified = await describeMedia(type, traktId);

  const response = await executeToolCall(
    (signal) =>
      removeMediaRating(
        toolTraktClient,
        {
          type,
          traktId,
        },
        { signal },
      ),
    `Failed to remove rating for ${verified} (ID: ${traktId})`,
  );
  const result = readSyncWrite(response.body, syncKindForMedia(type));
  assertSyncFound(result, verified);

  if (result.known && result.deleted === 0) {
    return {
      success: true,
      message: `${verified} had no rating on Trakt. Nothing was removed.`,
    };
  }

  return {
    success: true,
    message: `Successfully removed your rating for ${verified}.`,
  };
}
