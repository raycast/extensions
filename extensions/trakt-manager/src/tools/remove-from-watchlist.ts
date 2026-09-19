import { Action, Tool } from "@raycast/api";
import { removeMovieIdFromWatchlist, removeShowIdFromWatchlist } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncFound, readSyncWrite } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to remove from the watchlist: "movie" or "show".
   */
  type: "movie" | "show";
  /**
   * The unique Trakt ID of the movie or TV show.
   * Obtain this first from `get-watchlist`, `search-movies`, or `search-shows`.
   */
  traktId: number;
  /**
   * Optional title of the movie or show. Ignored: confirmation always uses the title
   * Trakt holds for `traktId`.
   */
  title?: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const verified = await describeMedia(input.type, input.traktId);

  return {
    style: Action.Style.Destructive,
    message: `Remove ${verified} from your Trakt watchlist?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: input.type === "movie" ? "Movie" : "TV Show" },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Remove a movie or TV show from your Trakt watchlist.
 * Requires a valid `traktId`.
 * A destructive confirmation dialog is shown to the user before removing the item.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId } = input;
  const verified = await describeMedia(type, traktId);
  const kind = type === "movie" ? "movies" : "shows";

  const response = await executeToolCall(
    (signal) =>
      type === "movie"
        ? removeMovieIdFromWatchlist(toolTraktClient, traktId, { signal })
        : removeShowIdFromWatchlist(toolTraktClient, traktId, { signal }),
    `Failed to remove ${verified} (ID: ${traktId}) from watchlist`,
  );
  const result = readSyncWrite(response.body, kind);
  assertSyncFound(result, verified);

  if (result.known && result.deleted === 0) {
    return {
      success: true,
      message: `${verified} was not in your Trakt watchlist. Nothing was removed.`,
    };
  }

  return {
    success: true,
    message: `${verified} has been successfully removed from your Trakt watchlist.`,
  };
}
