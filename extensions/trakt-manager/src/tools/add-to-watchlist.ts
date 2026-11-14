import { Action, Tool } from "@raycast/api";
import { addMovieIdToWatchlist, addShowIdToWatchlist } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncAdded, readSyncWrite } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to add to the watchlist: "movie" or "show".
   */
  type: "movie" | "show";
  /**
   * The unique Trakt ID of the movie or TV show.
   * Obtain this first by calling `search-movies` or `search-shows`.
   */
  traktId: number;
  /**
   * Optional title of the movie or show. Ignored: confirmation and success always use
   * the title Trakt holds for `traktId`.
   */
  title?: string;
};

type Output = {
  success: boolean;
  /**
   * True when Trakt already had this title on the watchlist. The write did not add a second copy.
   */
  alreadyPresent?: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const verified = await describeMedia(input.type, input.traktId);

  return {
    style: Action.Style.Regular,
    message: `Add ${verified} to your Trakt watchlist?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: input.type === "movie" ? "Movie" : "TV Show" },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Add a movie or TV show to your Trakt watchlist.
 * Requires a valid `traktId` obtained from `search-movies` or `search-shows`.
 * A confirmation dialog is shown to the user before adding the item.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId } = input;
  const verified = await describeMedia(type, traktId);
  const kind = type === "movie" ? "movies" : "shows";

  const response = await executeToolCall(
    (signal) =>
      type === "movie"
        ? addMovieIdToWatchlist(toolTraktClient, traktId, { signal })
        : addShowIdToWatchlist(toolTraktClient, traktId, { signal }),
    `Failed to add ${verified} (ID: ${traktId}) to watchlist`,
  );
  const result = readSyncWrite(response.body, kind);

  if (result.known && result.existing > 0 && result.added === 0) {
    return {
      success: true,
      alreadyPresent: true,
      message: `${verified} was already in your Trakt watchlist. Nothing was added.`,
    };
  }

  assertSyncAdded(result, verified);

  return {
    success: true,
    alreadyPresent: false,
    message: `${verified} has been successfully added to your Trakt watchlist.`,
  };
}
